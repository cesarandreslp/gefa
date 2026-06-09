import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit } from '@/lib/rateLimit';
import { getTenantFromRequest } from '@/lib/tenantResolver';
import { getTenantPrisma } from '@/lib/tenantDb';
import { prisma as mainPrisma } from '@/lib/prisma';

/**
 * Endpoint para que un ciudadano responda a un caso rechazado por improcedencia
 * Si responde dentro de los 3 minutos, el caso se reactiva
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tenant = await getTenantFromRequest(request);
  const dbUrl = (tenant as any)?.databaseUrl as string | undefined;
  let db = dbUrl ? getTenantPrisma(dbUrl) : mainPrisma;
  try {
    // Rate limiting: 5 intentos por IP cada 15 minutos
    const rateLimitResult = applyRateLimit(request, {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    const { id: caseId } = params;
    const body = await request.json();
    const { message, filingNumber } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'El mensaje es requerido' },
        { status: 400 }
      );
    }

    // Validar longitud máxima del mensaje (prevenir abuso)
    if (message.length > 5000) {
      return NextResponse.json(
        { error: 'El mensaje no puede exceder 5000 caracteres' },
        { status: 400 }
      );
    }

    console.log(`📝 [citizen-response] caseId=${caseId} filingNumber=${filingNumber}`);
    console.log(`📝 [citizen-response] tenant resuelto por dominio: id=${tenant?.id} sigla=${(tenant as any)?.sigla}`);

    let tenantId = tenant?.id;

    // Fallback: si no se resolvió el tenant por dominio, inferirlo desde la sigla del radicado
    if (!tenantId && filingNumber) {
      const siglaMatch = (filingNumber as string).trim().toUpperCase().match(/^([A-Z]+)-/);
      if (siglaMatch) {
        const sigla = siglaMatch[1];
        const tenantBySigla = await mainPrisma.tenant.findFirst({
          where: { sigla: { equals: sigla, mode: 'insensitive' } },
          select: { id: true, databaseUrl: true },
        }) as { id: string; databaseUrl?: string } | null;
        if (tenantBySigla) {
          tenantId = tenantBySigla.id;
          if (tenantBySigla.databaseUrl) {
            db = getTenantPrisma(tenantBySigla.databaseUrl);
          }
        }
      }
    }

    console.log(`📝 [citizen-response] tenantId final: ${tenantId}`);

    if (!tenantId) {
      return NextResponse.json({ error: 'No se pudo determinar la entidad' }, { status: 500 });
    }

    // Verificar que el caso existe y está en un estado que permite respuesta externa
    const caso = await db.case.findFirst({
      where: { id: caseId, tenantId },
      include: {
        state: true,
        citizen: true,
        stateHistory: {
          where: {
            toState: {
              code: { in: ['REMITIDO_POR_COMPETENCIA', 'REQUIERE_INFORMACION'] }
            }
          },
          orderBy: {
            timestamp: 'desc'
          },
          take: 1
        }
      }
    });

    if (!caso) {
      console.log(`❌ [citizen-response] Caso no encontrado: caseId=${caseId} tenantId=${tenantId}`);
      // Intentar buscar sin filtro de tenantId para diagnóstico
      const casoDiag = await db.case.findUnique({ where: { id: caseId }, select: { id: true, tenantId: true, filingNumber: true } });
      console.log(`🔍 [citizen-response] Búsqueda sin tenantId: ${JSON.stringify(casoDiag)}`);
      return NextResponse.json(
        { error: 'Caso no encontrado' },
        { status: 404 }
      );
    }

    // Validar que el caso esté en estado permitido
    if (!['REMITIDO_POR_COMPETENCIA', 'REQUIERE_INFORMACION'].includes(caso.state.code)) {
      return NextResponse.json(
        { error: 'El caso no se encuentra en un estado que permita recibir respuestas' },
        { status: 400 }
      );
    }

    // Verificar si el caso tiene un historial de rechazo
    if (caso.stateHistory.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró historial de rechazo' },
        { status: 400 }
      );
    }

    const ultimoHistorial = caso.stateHistory[0];

    // Verificar si el caso ha expirado
    if (ultimoHistorial.expiresAt && new Date() > ultimoHistorial.expiresAt) {
      return NextResponse.json(
        {
          error: 'El tiempo para responder ha expirado',
          expired: true
        },
        { status: 400 }
      );
    }

    const currentState = caso.state.code;
    const isRequiereInformacion = currentState === 'REQUIERE_INFORMACION';
    await db.$transaction(async (tx) => {
      // 0. Obtener usuario del sistema (primer admin disponible en la entidad)
      const systemUser = await tx.user.findFirst({
        where: { isActive: true, tenantId },
        orderBy: { createdAt: 'asc' }
      });

      if (!systemUser) {
        throw new Error('No se encontró usuario del sistema');
      }

      // 1. Manejar el cambio de estado si es necesario
      let toStateId = caso.stateId;

      if (isRequiereInformacion) {
        // Encontrar el ID del estado EN_GESTION
        const enGestionState = await tx.caseState.findUnique({
          where: { code: 'EN_GESTION' }
        });

        if (enGestionState) {
          toStateId = enGestionState.id;
        }

        // Merge existing metadata with citizen response flags
        const existingMetadata = caso.metadata ? (typeof caso.metadata === 'string' ? JSON.parse(caso.metadata) : caso.metadata) : {};
        const updatedMetadata = {
          ...existingMetadata,
          ciudadanoRespondio: true,
          respuestaCiudadano: message.trim(),
          fechaRespuestaCiudadano: new Date().toISOString()
        };

        // Actualizar el caso
        await tx.case.update({
          where: { id: caseId },
          data: {
            stateId: toStateId,
            updatedAt: new Date(),
            metadata: updatedMetadata
          }
        });

        // Crear nuevo registro en el historial para el cambio a EN_GESTION
        await tx.caseStateHistory.create({
          data: {
            tenantId,
            caseId,
            fromStateId: caso.stateId,
            toStateId: toStateId,
            changedBy: systemUser.id,
            comment: `Respuesta del ciudadano: ${message.trim()}`
          }
        });

        // Solo actualizar el expiresAt del historial anterior
        await tx.caseStateHistory.update({
          where: { id: ultimoHistorial.id },
          data: { expiresAt: null }
        });

      } else {
        // Merge existing metadata with citizen response flags
        const existingMetadata2 = caso.metadata ? (typeof caso.metadata === 'string' ? JSON.parse(caso.metadata) : caso.metadata) : {};
        const updatedMetadata2 = {
          ...existingMetadata2,
          ciudadanoRespondio: true,
          respuestaCiudadano: message.trim(),
          fechaRespuestaCiudadano: new Date().toISOString()
        };

        // Lógica original para REMITIDO_POR_COMPETENCIA (permanece en el mismo estado)
        await tx.case.update({
          where: { id: caseId },
          data: { 
            updatedAt: new Date(),
            metadata: updatedMetadata2
          }
        });

        // Actualizar el historial existente agregando el comentario
        await tx.caseStateHistory.update({
          where: { id: ultimoHistorial.id },
          data: {
            expiresAt: null,
            comment: ultimoHistorial.comment
              ? `${ultimoHistorial.comment}\n\n--- Respuesta del ciudadano ---\n${message.trim()}`
              : `Respuesta del ciudadano: ${message.trim()}`
          }
        });
      }

      // 3. Registrar en log de acciones
      await tx.actionLog.create({
        data: {
          caseId,
          userId: systemUser.id,
          userEmail: caso.citizen.email || 'unknown@citizen',
          userRole: 'CITIZEN',
          action: 'CASE_CITIZEN_RESPONSE',
          entityType: 'Case',
          entityId: caseId,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          metadata: {
            state: caso.state.code,
            citizenMessage: message.substring(0, 200),
            respondedWithinTimeLimit: true,
            timerStopped: true
          },
          checksum: Buffer.from(JSON.stringify({
            action: 'CASE_CITIZEN_RESPONSE',
            caseId,
            timestamp: new Date().toISOString()
          })).toString('base64').substring(0, 64)
        }
      });
    });

    console.log(`✅ Caso ${caso.filingNumber} - ciudadano respondió, temporizador detenido`);

    return NextResponse.json({
      success: true,
      message: 'Su respuesta ha sido registrada. El caso permanece en evaluación y será revisado por el funcionario.',
      case: {
        filingNumber: caso.filingNumber,
        state: caso.state.code,
        timerStopped: true
      }
    });

  } catch (error) {
    console.error('❌ Error al procesar respuesta del ciudadano:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  } finally {
    await db.$disconnect();
  }
}
