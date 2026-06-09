import { NextResponse, NextRequest } from 'next/server';
import { protectAPIRoute, getBaseRoleCode } from '@/lib/auth';

/**
 * GET /api/v1/peticiones-reasignacion
 * Obtiene las peticiones de reasignación (de Ventanilla Única y de Funcionarios)
 * Solo accesible para REVISOR_MUNICIPAL
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await protectAPIRoute(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
const db = authResult.db;

    const { user } = authResult;

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario sea DIRECTOR
    const baseRole = getBaseRoleCode(user.roleCode);
    if (baseRole !== 'DIRECTOR') {
      return NextResponse.json(
        { error: 'No autorizado. Solo el Director puede ver estas peticiones.' },
        { status: 403 }
      );
    }

    // Obtener primero los IDs de casos de este tenant que tienen peticiones de reasignación
    const casosDelTenant = await db.case.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true }
    });
    const caseIdsDelTenant = casosDelTenant.map(c => c.id);

    // Obtener ActionLogs solo de casos de este tenant
    const peticiones = await db.actionLog.findMany({
      where: {
        action: { in: ['REASSIGNMENT_PROPOSED', 'REASSIGNMENT_REQUESTED'] },
        entityId: { in: caseIdsDelTenant }
      },
      include: {
        user: {
          include: {
            role: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    // Obtener IDs únicos de casos
    const caseIds = [...new Set(peticiones.map(p => p.entityId))];

    // Obtener información completa de los casos
    const casos = await db.case.findMany({
      where: {
        tenantId: user.tenantId,
        id: { in: caseIds }
      },
      include: {
        citizen: true,
        caseType: true,
        state: true,
        assignments: {
          where: {
            user: {
              role: {
                code: {
                  notIn: ['VENTANILLA_UNICA', 'ADMIN', 'ASIGNACION_DE_CASOS']
                }
              }
            }
          },
          include: {
            user: {
              include: {
                role: true
              }
            }
          },
          orderBy: {
            assignedAt: 'desc'
          }
        }
      }
    });

    // Mapear peticiones con información del caso
    const peticionesConCaso = peticiones.map(peticion => {
      const caso = casos.find(c => c.id === peticion.entityId);
      const metadata = peticion.metadata as {
        // Campos de REASSIGNMENT_PROPOSED (desde VU)
        proposedUserId?: string;
        proposedUserName?: string;
        proposedUserRole?: string;
        proposedBy?: string;
        proposedByName?: string;
        proposedByRole?: string;
        proposedAt?: string;
        caseCode?: string;
        caseSubject?: string;
        // Campos de REASSIGNMENT_REQUESTED (desde Funcionario)
        reason?: string;
        previousAssignmentId?: string;
        requestedAt?: string;
      } | null;

      // Determinar origen de la petición
      const esPeticionDirecta = peticion.action === 'REASSIGNMENT_REQUESTED';

      // Para peticiones directas de funcionario, el funcionario que pide reasignación
      // ES quien tenía el caso (propuestoPor = quien pide salir)
      // Y asignadoActualmente muestra la asignación actual del caso
      const asignacionActual = caso?.assignments[0] || null;

      return {
        id: peticion.id,
        casoId: caso?.id,
        codigo: caso?.filingNumber,
        tipo: caso?.caseType.name,
        asunto: caso?.subject,
        ciudadano: caso ? {
          nombre: `${caso.citizen.firstName} ${caso.citizen.firstLastName}`,
          documento: caso.citizen.documentNumber
        } : null,
        estado: caso?.state.name,
        estadoReasignacion: 'PENDIENTE' as 'PENDIENTE' | 'APROBADA' | 'RECHAZADA',
        origen: esPeticionDirecta ? 'FUNCIONARIO' : 'VENTANILLA_UNICA',
        motivoReasignacion: metadata?.reason || null,
        fechaPeticion: peticion.timestamp.toISOString(),
        propuestoPor: {
          nombre: peticion.user?.fullName ?? 'Desconocido',
          rol: peticion.user?.role?.name
        },
        funcionarioPropuesto: metadata?.proposedUserId ? {
          id: metadata.proposedUserId,
          nombre: metadata.proposedUserName,
          rol: metadata.proposedUserRole
        } : null,
        asignadoActualmente: asignacionActual ? {
          nombre: asignacionActual.user.fullName,
          rol: asignacionActual.user.role?.name
        } : null
      };
    });

    // Verificar si hay acciones posteriores de aprobación/rechazo para cada petición, ordenadas por más reciente
    const accionesRelacionadas = await db.actionLog.findMany({
      where: {
        action: { in: ['REASSIGNMENT_APPROVED', 'REASSIGNMENT_REJECTED'] },
        entityId: { in: caseIdsDelTenant }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    // Actualizar el estado de reasignación y obtener a quién fue reasignado
    const peticionesEnriquecidas = await Promise.all(peticionesConCaso.map(async (peticion) => {
      const accionRelacionada = accionesRelacionadas.find(accion => {
        const accionMetadata = accion.metadata as { proposalId?: string } | null;
        return accionMetadata?.proposalId === peticion.id;
      });

      let reasignadoA = null;
      let fechaReasignacion = null;

      if (accionRelacionada) {
        if (accionRelacionada.action === 'REASSIGNMENT_APPROVED') {
          peticion.estadoReasignacion = 'APROBADA';
        } else if (accionRelacionada.action === 'REASSIGNMENT_REJECTED') {
          peticion.estadoReasignacion = 'RECHAZADA';
        }

        // Recuperar la fecha exacta en la que se resolvió la reasignación
        fechaReasignacion = accionRelacionada.timestamp.toISOString();

        // Buscar a quién se le reasignó, puede venir como funcionarioPropuestoId (aprobar/cambiar), funcionarioId (cambiar) o nuevoFuncionarioId (rechazar)
        const meta = accionRelacionada.metadata as Record<string, string> | null;
        const nuevoAsignadoId = meta?.nuevoFuncionarioId || meta?.funcionarioPropuestoId || meta?.funcionarioId || meta?.userId;

        if (nuevoAsignadoId) {
          const usuarioDestino = await db.user.findUnique({
            where: { id: nuevoAsignadoId },
            include: { role: true }
          });
          if (usuarioDestino) {
            reasignadoA = {
              nombre: usuarioDestino.fullName || usuarioDestino.email,
              rol: usuarioDestino.role?.name || 'Funcionario'
            };
          }
        } else if (meta?.nuevoFuncionarioNombre) {
          // Fallback en caso de que solo tengamos el nombre guardado en los logs (como en rechazos antiguos)
          reasignadoA = {
            nombre: meta.nuevoFuncionarioNombre,
            rol: 'Funcionario'
          };
        }
      }

      return {
        ...peticion,
        fechaReasignacion,
        reasignadoA
      };
    }));

    return NextResponse.json(peticionesEnriquecidas);

  } catch (error) {
    console.error('Error obteniendo peticiones de reasignación:', error);
    return NextResponse.json(
      { error: 'Error al obtener peticiones de reasignación' },
      { status: 500 }
    );
  }
}
