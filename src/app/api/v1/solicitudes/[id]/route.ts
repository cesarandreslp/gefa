/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantFromRequest } from '@/lib/tenantResolver';
import { getTenantPrisma } from '@/lib/tenantDb';
import { prisma } from '@/lib/prisma';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildConversacion(caso: any) {
  const conversacion: Array<{
    id: string;
    fecha: string;
    mensaje: string;
    rol: 'FUNCIONARIO' | 'CIUDADANO' | 'ENTIDAD_EXTERNA';
    estado: string;
    emailEntidad?: string;
  }> = [];

  // 1. Agregar la solicitud original como primer mensaje del ciudadano
  conversacion.push({
    id: `filing-${caso.id}`,
    fecha: caso.filedAt.toISOString(),
    mensaje: caso.description || caso.subject || 'Solicitud radicada',
    rol: 'CIUDADANO',
    estado: 'RADICADO'
  });

  // 2. Recorrer historial de estados con comentarios
  for (const entry of caso.stateHistory) {
    if (!entry.comment) continue;

    const comment = entry.comment as string;
    const toStateCode = entry.toState?.code || '';

    // Detectar si es una respuesta del ciudadano embebida
    if (comment.includes('--- Respuesta del ciudadano ---')) {
      const parts = comment.split('--- Respuesta del ciudadano ---');
      // Parte del funcionario (si existe)
      const funcionarioPart = parts[0].trim();
      if (funcionarioPart) {
        conversacion.push({
          id: `${entry.id}-func`,
          fecha: entry.timestamp.toISOString(),
          mensaje: funcionarioPart,
          rol: 'FUNCIONARIO',
          estado: toStateCode
        });
      }
      // Parte del ciudadano
      if (parts[1]) {
        conversacion.push({
          id: `${entry.id}-ciud`,
          fecha: entry.timestamp.toISOString(),
          mensaje: parts[1].trim(),
          rol: 'CIUDADANO',
          estado: toStateCode
        });
      }
    } else if (comment.startsWith('Respuesta del ciudadano:')) {
      // Respuesta directa del ciudadano (formato de citizen-response con REQUIERE_INFORMACION)
      conversacion.push({
        id: entry.id,
        fecha: entry.timestamp.toISOString(),
        mensaje: comment.replace('Respuesta del ciudadano:', '').trim(),
        rol: 'CIUDADANO',
        estado: toStateCode
      });
    } else if (comment.startsWith('[ENTIDAD_EXTERNA:')) {
      // Respuesta de una entidad externa (formato nuevo con tag)
      const match = comment.match(/^\[ENTIDAD_EXTERNA:([^\]]+)\]\s*/);
      const emailEntidad = match ? match[1] : '';
      const mensajeLimpio = comment.replace(/^\[ENTIDAD_EXTERNA:[^\]]+\]\s*/, '').trim();
      conversacion.push({
        id: entry.id,
        fecha: entry.timestamp.toISOString(),
        mensaje: mensajeLimpio,
        rol: 'ENTIDAD_EXTERNA',
        estado: toStateCode,
        emailEntidad
      });
    } else if (comment.startsWith('Respuesta de entidad externa:')) {
      // Respuesta de entidad externa en formato antiguo (sin tag de email)
      conversacion.push({
        id: entry.id,
        fecha: entry.timestamp.toISOString(),
        mensaje: comment.replace('Respuesta de entidad externa:', '').trim(),
        rol: 'ENTIDAD_EXTERNA',
        estado: toStateCode
      });
    } else {
      // Es un mensaje del funcionario
      conversacion.push({
        id: entry.id,
        fecha: entry.timestamp.toISOString(),
        mensaje: comment,
        rol: 'FUNCIONARIO',
        estado: toStateCode
      });
    }
  }

  return conversacion;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const tenant = await getTenantFromRequest(request);
    const dbUrl = (tenant as any)?.databaseUrl;
    const db = dbUrl ? getTenantPrisma(dbUrl) : prisma;

    // Obtener la solicitud con información completa
    const caso = await db.case.findUnique({
      where: {
        id: id
      },
      include: {
        citizen: true,
        caseType: true,
        state: true,
        documents: {
          orderBy: {
            uploadedAt: 'asc'
          }
        },
        assignments: {
          include: {
            user: {
              include: { role: true }
            },
            assignedByUser: {
              include: { role: true }
            }
          },
          orderBy: { assignedAt: 'desc' }
        },
        stateHistory: {
          where: {
            comment: { not: null }
          },
          include: {
            toState: true,
            fromState: true
          },
          orderBy: {
            timestamp: 'asc'
          }
        }
      }
    });

    if (!caso) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    console.log(`[solicitudes/${id}] caso=${caso.filingNumber} documentos=${caso.documents.length} usandoTenantDB=${!!dbUrl}`);

    // Obtener el funcionario asignado: primero buscar asignación hecha por IA,
    // luego fallback a cualquier asignación que no sea VU/Admin/IA
    let asignacionFuncionario = caso.assignments.find(
      (a: any) => a.assignedByUser?.role?.code === 'ASIGNACION_DE_CASOS'
        && a.user?.role?.code !== 'VENTANILLA_UNICA'
    );

    // Fallback: si no se encuentra por IA, buscar cualquier asignación de un funcionario real
    if (!asignacionFuncionario) {
      asignacionFuncionario = caso.assignments.find(
        (a: any) => {
          const roleCode = a.user?.role?.code || '';
          return !['VENTANILLA_UNICA', 'ADMIN', 'ASIGNACION_DE_CASOS', 'DIRECTOR'].includes(roleCode);
        }
      );
    }

    // Formatear la solicitud para el frontend
    const solicitud = {
      id: caso.id,
      codigo: caso.filingNumber,
      tipo: caso.caseType.name || 'General',
      asunto: caso.subject || 'Sin asunto',
      descripcion: caso.description || '',
      ciudadano: {
        nombre: `${caso.citizen.firstName} ${caso.citizen.firstLastName}`,
        email: caso.citizen.email || 'N/A',
        documento: caso.citizen.documentNumber || 'N/A',
        telefono: caso.citizen.phone || 'N/A'
      },
      funcionarioAsignado: asignacionFuncionario ? {
        nombre: (asignacionFuncionario as any).user.fullName || (asignacionFuncionario as any).user.email,
        fechaAsignacion: asignacionFuncionario.assignedAt.toISOString()
      } : null,
      fechaCreacion: caso.filedAt.toISOString(),
      estado: caso.state.code.toLowerCase(),
      prioridad: caso.priority > 60 ? 'alta' : caso.priority > 40 ? 'media' : 'baja',
      documentos: caso.documents.map(doc => ({
        id: doc.id,
        fileName: doc.originalName,
        fileUrl: doc.fileUrl,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        uploadedAt: doc.uploadedAt.toISOString(),
        isInternal: doc.isInternal,
      })),
      // Construir la conversación completa a partir del historial de estados
      conversacion: buildConversacion(caso),
      metadata: caso.metadata ?? null,
    };

    return NextResponse.json(solicitud);
  } catch (error) {
    console.error('Error obteniendo solicitud:', error);
    return NextResponse.json(
      { error: 'Error al obtener la solicitud' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { metadata, ciudadanoRespondio, fechaRespuestaCiudadano } = body;

    const tenant = await getTenantFromRequest(request);
    const dbUrl = (tenant as any)?.databaseUrl;
    const db = dbUrl ? getTenantPrisma(dbUrl) : prisma;

    // Obtener el caso actual para fusionar metadata si es necesario
    const currentCase = await db.case.findUnique({
      where: { id },
      select: { metadata: true }
    });

    if (!currentCase) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    // Fusionar data adicional si existe en el body
    const finalMetadata: any = {
      ...(currentCase.metadata as object || {}),
      ...(metadata || {})
    };

    if (ciudadanoRespondio !== undefined) {
      finalMetadata.ciudadanoRespondio = ciudadanoRespondio;
    }

    if (fechaRespuestaCiudadano !== undefined) {
      finalMetadata.fechaRespuestaCiudadano = fechaRespuestaCiudadano;
    }

    // Actualizar metadata
    const updatedCase = await db.case.update({
      where: { id },
      data: {
        metadata: finalMetadata
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedCase
    });
  } catch (error) {
    console.error('Error actualizando solicitud:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la solicitud' },
      { status: 500 }
    );
  }
}
