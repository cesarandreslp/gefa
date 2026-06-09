import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const auth = await protectAPIRoute(request);

    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }
const db = auth.db;

    // Obtener los ActionLogs con solicitudes de reasignación
    const solicitudesReasignacion = await db.actionLog.findMany({
      where: {
        action: 'REASSIGNMENT_REQUESTED',
        entityType: 'Case'
      },
      orderBy: {
        timestamp: 'desc'
      },
      include: {
        user: {
          include: {
            role: true
          }
        }
      }
    });

    // Obtener los IDs de casos únicos
    const caseIds = [...new Set(solicitudesReasignacion.map(log => log.entityId))];

    // Obtener los casos completos
    const casos = await db.case.findMany({
      where: {
        tenantId: auth.user.tenantId,
        id: {
          in: caseIds
        }
      },
      include: {
        citizen: true,
        caseType: true,
        state: true,
        documents: {
          where: {
            documentType: {
              in: ['PETITION', 'SUPPORTING_DOC']
            }
          },
          orderBy: {
            uploadedAt: 'asc'
          }
        },
        assignments: {
          include: {
            user: {
              include: {
                role: true
              }
            }
          },
          orderBy: {
            assignedAt: 'desc'
          },
          take: 1
        }
      }
    });

    // Mapear con la información de la solicitud
    const casosConSolicitud = casos.map(caso => {
      const solicitud = solicitudesReasignacion.find(log => log.entityId === caso.id);
      const asignacionActual = caso.assignments[0];
      
      // Extraer metadata con tipo seguro
      const metadata = solicitud?.metadata as { reason?: string; previousAssignmentId?: string } | null;

      return {
        id: caso.id,
        codigo: caso.filingNumber,
        tipo: caso.caseType.name,
        asunto: caso.subject,
        ciudadano: {
          nombre: `${caso.citizen.firstName} ${caso.citizen.firstLastName}`,
          documento: caso.citizen.documentNumber
        },
        estado: caso.state.name,
        estadoReasignacion: 'PENDIENTE' as 'PENDIENTE' | 'PROPUESTA' | 'APROBADA' | 'RECHAZADA',
        fechaSolicitud: solicitud?.timestamp.toISOString(),
        solicitadoPor: {
          nombre: solicitud?.user?.fullName,
          rol: solicitud?.user?.role?.name,
          usuarioId: solicitud?.userId
        },
        motivo: metadata?.reason || 'Sin motivo',
        asignadoActualmente: asignacionActual ? {
          nombre: asignacionActual.user.fullName,
          rol: asignacionActual.user.role?.name
        } : null,
        documentos: caso.documents.map(doc => ({
          id: doc.id,
          fileName: doc.originalName,
          fileUrl: doc.fileUrl,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
          uploadedAt: doc.uploadedAt.toISOString()
        }))
      };
    });

    // Buscar si hay propuestas de reasignación relacionadas (REASSIGNMENT_PROPOSED)
    const propuestasReasignacion = await db.actionLog.findMany({
      where: {
        action: 'REASSIGNMENT_PROPOSED',
        entityId: { in: caseIds }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    // Buscar acciones de aprobación/rechazo
    const accionesRelacionadas = await db.actionLog.findMany({
      where: {
        action: { in: ['REASSIGNMENT_APPROVED', 'REASSIGNMENT_REJECTED'] },
        entityId: { in: caseIds }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    // Actualizar el estado de reasignación según las acciones encontradas
    casosConSolicitud.forEach(caso => {
      const propuesta = propuestasReasignacion.find(p => p.entityId === caso.id);
      
      if (propuesta) {
        // Si hay propuesta, verificar si fue aprobada o rechazada
        const accionRelacionada = accionesRelacionadas.find(accion => accion.entityId === caso.id);
        
        if (accionRelacionada) {
          if (accionRelacionada.action === 'REASSIGNMENT_APPROVED') {
            caso.estadoReasignacion = 'APROBADA';
          } else if (accionRelacionada.action === 'REASSIGNMENT_REJECTED') {
            caso.estadoReasignacion = 'RECHAZADA';
          }
        } else {
          // Si hay propuesta pero no hay decisión aún, marcar como PROPUESTA
          caso.estadoReasignacion = 'PROPUESTA';
        }
      }
    });

    return NextResponse.json(casosConSolicitud);

  } catch (error) {
    console.error('Error obteniendo solicitudes de reasignación:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error interno del servidor'
        }
      },
      { status: 500 }
    );
  }
}
