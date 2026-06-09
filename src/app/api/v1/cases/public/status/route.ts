/**
 * API Endpoint - Consulta Pública de Estado de Caso
 * 
 * GET /api/v1/cases/public/status?filingNumber=PER-2026-00001
 * 
 * Permite a los ciudadanos consultar el estado de sus solicitudes
 * sin necesidad de autenticación
 * 
 * Etapa 2 - Prompt 1
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantFromRequest } from '@/lib/tenantResolver';
import { getTenantPrisma } from '@/lib/tenantDb';
import { prisma as mainPrisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const tenant = await getTenantFromRequest(request);
  const dbUrl = (tenant as { databaseUrl?: string })?.databaseUrl;
  let db = dbUrl ? getTenantPrisma(dbUrl) : mainPrisma;
  try {
    // Obtener parámetro de búsqueda
    const { searchParams } = new URL(request.url);
    const filingNumber = searchParams.get('filingNumber');

    // Validar que se proporcione el número de radicado
    if (!filingNumber) {
      return NextResponse.json(
        errorResponse(
          'VALIDATION_ERROR',
          'Debe proporcionar un número de radicado'
        ),
        { status: 400 }
      );
    }

    // Validación básica del radicado (permitir cualquier formato que genere el sistema)
    const trimmedFilingNumber = filingNumber.trim().toUpperCase();
    if (trimmedFilingNumber.length < 5) {
      return NextResponse.json(
        errorResponse(
          'VALIDATION_ERROR',
          'El número de radicado ingresado es demasiado corto'
        ),
        { status: 400 }
      );
    }

    // Si no se identificó tenant por subdominio, inferirlo desde la sigla del radicado
    // Formato: {SIGLA}-{AÑO}-{NRO} → ej. PMGUC-2026-000009
    if (!tenant) {
      const siglaMatch = trimmedFilingNumber.match(/^([A-Z]+)-/);
      if (siglaMatch) {
        const sigla = siglaMatch[1];
        const tenantBySigla = await mainPrisma.tenant.findFirst({
          where: { sigla: { equals: sigla, mode: 'insensitive' } },
          select: { databaseUrl: true },
        }) as { databaseUrl?: string } | null;
        if (tenantBySigla?.databaseUrl) {
          db = getTenantPrisma(tenantBySigla.databaseUrl);
        }
      }
    }

    // Buscar el caso en la base de datos
    const caseData = await db.case.findUnique({
      where: {
        filingNumber: trimmedFilingNumber
      },
      select: {
        id: true,
        filingNumber: true,
        subject: true,
        state: {
          select: {
            code: true,
            name: true
          }
        },
        metadata: true,
        createdAt: true,
        filedAt: true,
        citizen: {
          select: {
            firstName: true,
            firstLastName: true,
          }
        },
        assignments: {
          where: {
            status: 'IN_PROGRESS'
          },
          select: {
            user: {
              select: {
                fullName: true,
                role: {
                  select: {
                    name: true
                  }
                }
              }
            }
          },
          take: 1
        },
        stateHistory: {
          where: {
            comment: { not: null }
          },
          select: {
            id: true,
            timestamp: true,
            comment: true,
            reason: true,
            expiresAt: true,
            isInternal: true,
            changedBy: true,
            toState: {
              select: {
                code: true,
                name: true
              }
            },
            changedByUser: {
              select: {
                id: true,
                fullName: true,
                role: {
                  select: {
                    code: true,
                    name: true
                  }
                }
              }
            }
          },
          orderBy: {
            timestamp: 'asc'
          }
        },
        documents: {
          where: {
            isInternal: false,
          },
          select: {
            id: true,
            fileName: true,
            originalName: true,
            fileUrl: true,
            fileSize: true,
            mimeType: true,
            uploadedAt: true,
            description: true,
            uploadedByType: true,
          },
          orderBy: { uploadedAt: 'asc' }
        }
      }
    });

    // Si no se encuentra el caso
    if (!caseData) {
      return NextResponse.json(
        errorResponse(
          'NOT_FOUND',
          'No se encontró ninguna solicitud con ese número de radicado.'
        ),
        { status: 404 }
      );
    }

    // Determinar corte temporal: primer mensaje interno creado por un funcionario (changedBy !== null).
    // Las respuestas de entidad tienen changedBy=null y no deben ser tomadas como corte,
    // incluso si quedaron guardadas con isInternal=true por el bug previo al fix 58.
    const primeraEntradaInterna = caseData.stateHistory.find(h => h.isInternal === true && h.changedBy !== null);
    const fechaCorte = primeraEntradaInterna?.timestamp ?? null;

    // Incluir la primera entrada interna (aviso de escalamiento) pero ocultar las siguientes.
    // Las respuestas de entidad guardadas antes del fix (isInternal=false) también se ocultan
    // cuando hay un escalamiento activo, usando el prefijo del comentario como señal.
    const historialVisible = caseData.stateHistory.filter(h => {
      if (h.isInternal) {
        return primeraEntradaInterna !== undefined && h.id === primeraEntradaInterna.id;
      }
      if (
        fechaCorte !== null &&
        (h.comment?.startsWith('[ENTIDAD_EXTERNA:') || h.comment?.startsWith('Respuesta de entidad externa:'))
      ) {
        return false;
      }
      return true;
    });

    const REASON_LABELS: Record<string, string> = {
      'PROCESO_DISCIPLINARIO': 'proceso disciplinario — reserva de la etapa de instrucción (Art. 115 Ley 1952/2019)',
      'ANALISIS_PRUEBAS': 'análisis de pruebas — recaudo y valoración de material probatorio',
      'COMPETENCIA_EXTERNA': 'competencia externa — traslado a autoridad competente para su definición',
    };
    const nombreCiudadano = caseData.citizen
      ? `${caseData.citizen.firstName} ${caseData.citizen.firstLastName}`.trim()
      : 'ciudadano(a)';
    const razonCode = primeraEntradaInterna?.reason ?? null;
    const razonTexto = razonCode ? (REASON_LABELS[razonCode] || razonCode) : null;
    const AVISO_ESCALAMIENTO_CIUDADANO =
      `Estimado(a) ${nombreCiudadano}:\n\n` +
      `Le informamos que su solicitud ha sido remitida a la etapa de Escalamiento. ` +
      `De acuerdo con la normativa vigente sobre el derecho de petición y la protección de datos (Ley 1712 de 2014), ` +
      `se le informa que esta etapa del proceso se encuentra bajo reserva administrativa` +
      (razonTexto ? ` debido a ${razonTexto}` : '') +
      `. Una vez se produzca una decisión de fondo o se levante la reserva por parte de la dependencia competente, ` +
      `usted será notificado a través de este mismo medio.\n\n` +
      `Estado actual: En trámite interno.`;

    // Si el funcionario ya envió un mensaje al ciudadano después del escalamiento,
    // el caso ya no está "en gestión interna" — el ciudadano debe poder responder.
    const hayMensajePostEscalamiento = fechaCorte !== null && caseData.stateHistory.some(h =>
      !h.isInternal &&
      h.timestamp >= fechaCorte! &&
      !h.comment?.startsWith('[ENTIDAD_EXTERNA:') &&
      !h.comment?.startsWith('Respuesta de entidad externa:') &&
      !h.comment?.startsWith('Respuesta del ciudadano:')
    );
    const bloquearPorFuncionario = (caseData.metadata as Record<string, unknown>)?.bloquearRespuestaCiudadano === true;
    const casoEnGestion = (fechaCorte !== null && !hayMensajePostEscalamiento) || bloquearPorFuncionario;

    // Preparar respuesta pública (sin información sensible)
    const publicCaseInfo = {
      id: caseData.id,
      filingNumber: caseData.filingNumber,
      subject: caseData.subject,
      state: caseData.state.code,
      createdAt: caseData.createdAt.toISOString(),
      filedAt: caseData.filedAt.toISOString(),
      assignedToDepartment: caseData.assignments[0]?.user?.role?.name || null,
      assignedToOfficial: caseData.assignments[0]?.user?.fullName || null,
      casoEnGestion,
      documents: caseData.documents.map(doc => ({
        id: doc.id,
        fileName: doc.originalName || doc.fileName,
        fileUrl: doc.fileUrl,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        uploadedAt: doc.uploadedAt.toISOString(),
        description: doc.description || null,
        uploadedBy: doc.uploadedByType === 'CITIZEN' ? 'Ciudadano' : 'Funcionario',
      })),
      responseHistory: historialVisible.map((history) => {
        // Extraer respuesta del ciudadano si existe
        let ciudadanoRespondio = false;
        let respuestaCiudadano = null;
        let mensajeFuncionario: string | null = null;

        const esAvisoEscalamiento = primeraEntradaInterna !== undefined && history.id === primeraEntradaInterna.id;

        // Detectar si es una respuesta de entidad externa
        let esMensajeEntidad = false;
        let entidadEmail = '';
        if (!esAvisoEscalamiento && history.comment?.startsWith('[ENTIDAD_EXTERNA:')) {
          esMensajeEntidad = true;
          const match = history.comment.match(/^\[ENTIDAD_EXTERNA:([^\]]+)\]\s*/);
          if (match) {
            entidadEmail = match[1];
          }
        }

        // Detectar si es una respuesta del ciudadano (standalone o embebida)
        let esMensajeCiudadano = false;
        if (!esAvisoEscalamiento && !esMensajeEntidad && history.comment) {
          const comentarioParts = history.comment.split('--- Respuesta del ciudadano ---');
          if (comentarioParts.length > 1) {
            // Respuesta embebida: primera parte es del funcionario, segunda del ciudadano
            ciudadanoRespondio = true;
            mensajeFuncionario = comentarioParts[0].trim();
            respuestaCiudadano = comentarioParts[1].trim();
          } else if (history.comment.startsWith('Respuesta del ciudadano:')) {
            // Entry standalone del ciudadano
            esMensajeCiudadano = true;
            ciudadanoRespondio = true;
            respuestaCiudadano = history.comment.replace('Respuesta del ciudadano:', '').trim();
          }
        }

        const messageText = esAvisoEscalamiento
          ? AVISO_ESCALAMIENTO_CIUDADANO
          : esMensajeEntidad
            ? history.comment!.replace(/^\[ENTIDAD_EXTERNA:[^\]]+\]\s*/, '')
            : esMensajeCiudadano
              ? respuestaCiudadano || ''
              : mensajeFuncionario || history.comment || '';

        // Determinar autor de la entrada
        let authorType: 'FUNCIONARIO' | 'CIUDADANO' | 'SISTEMA' | 'ENTIDAD' = 'SISTEMA';
        let authorLabel = 'Sistema';

        if (esMensajeEntidad) {
          authorType = 'ENTIDAD';
          authorLabel = `Entidad externa`;
        } else if (esMensajeCiudadano) {
          authorType = 'CIUDADANO';
          authorLabel = 'Ciudadano';
        } else if (esAvisoEscalamiento) {
          authorType = 'SISTEMA';
          authorLabel = 'Notificación del sistema';
        } else if (history.toState.code === 'RADICADO') {
          authorType = 'SISTEMA';
          authorLabel = 'Sistema';
        } else if (history.changedByUser) {
          authorType = 'FUNCIONARIO';
          authorLabel = 'Funcionario';
        }

        return {
          id: history.id,
          date: history.timestamp.toISOString(),
          message: messageText,
          state: history.toState.code,
          stateName: history.toState.name,
          authorType,
          authorLabel,
          expiresAt: history.expiresAt?.toISOString() || null,
          ciudadanoRespondio: esMensajeCiudadano ? false : ((caseData.metadata as Record<string, unknown>)?.ciudadanoRespondio === false ? false : ciudadanoRespondio),
          respuestaCiudadano: esMensajeCiudadano ? null : respuestaCiudadano
        };
      })
    };

    return NextResponse.json(
      successResponse(publicCaseInfo),
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error('Error fetching public case status:', error);

    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    return NextResponse.json(
      errorResponse(
        'INTERNAL_ERROR',
        'Error al consultar el estado de la solicitud',
        process.env.NODE_ENV === 'development' ? errorMessage : undefined
      ),
      { status: 500 }
    );
  }
}
