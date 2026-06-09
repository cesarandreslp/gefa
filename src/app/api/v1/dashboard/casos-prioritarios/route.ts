import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute, getBaseRoleCode } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const auth = await protectAPIRoute(request);

    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const db = auth.db;

    // Obtener usuario con su rol
    const user = await db.user.findUnique({
      where: { id: auth.user.userId },
      include: { role: true }
    });

    if (!user || !user.isActive || !user.role) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Usuario no encontrado o inactivo'
          }
        },
        { status: 401 }
      );
    }

    const roleCode = getBaseRoleCode(user.role.code);
    const shouldSeeAllCases = roleCode === 'ADMIN' || roleCode === 'DIRECTOR';

    // Filtro base
    const baseFilter = shouldSeeAllCases ? {} : {
      assignments: {
        some: {
          userId: user.id
        }
      }
    };

    const now = new Date();

    // Obtener casos prioritarios (alta prioridad o próximos a vencer)
    // Para REVISOR_MUNICIPAL, obtener SOLO invitaciones
    let casos = [];

    if (roleCode === 'DIRECTOR') {
      casos = await db.case.findMany({
        where: {
          tenantId: auth.user.tenantId,
          metadata: {
            path: ['revisorClassification'],
            equals: 'INVITACION'
          }
        },
        include: {
          caseType: true,
          state: true
        },
        orderBy: {
          dueDate: 'asc'
        },
        take: 10
      });
    } else if (roleCode === 'FUNCIONARIO' || roleCode === 'SUPERVISOR') {
      const estadoRadicado = await db.caseState.findFirst({ where: { code: 'RADICADO' } });

      const assignments = await db.assignment.findMany({
        where: {
          userId: user.id,
          case: {
            stateId: estadoRadicado ? estadoRadicado.id : undefined
          }
        },
        include: {
          case: {
            include: {
              caseType: true,
              state: true
            }
          }
        },
        orderBy: {
          assignedAt: 'desc'
        }
      });

      const casosPorId = new Map<string, typeof assignments[0]>();
      for (const assignment of assignments) {
        if (!casosPorId.has(assignment.caseId)) {
          casosPorId.set(assignment.caseId, assignment);
        }
      }

      casos = Array.from(casosPorId.values())
        .sort((a, b) => new Date(b.case.filedAt).getTime() - new Date(a.case.filedAt).getTime())
        .slice(0, 3)
        .map(a => a.case);
    } else {
      casos = await db.case.findMany({
        where: {
          tenantId: auth.user.tenantId,
          ...baseFilter,
          OR: [
            { priority: { gte: 70 } }, // Prioridad alta (70-100)
            {
              dueDate: {
                lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // Próximos 7 días
              },
              stateId: {
                in: await db.caseState.findMany({
                  where: {
                    code: {
                      notIn: ['CERRADO', 'FINALIZADO']
                    }
                  },
                  select: { id: true }
                }).then(states => states.map(s => s.id))
              }
            }
          ]
        },
        include: {
          caseType: true,
          state: true
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' }
        ],
        take: 10
      });
    }

    const casosPrioritarios = casos.map(caso => {
      const diasRestantes = Math.ceil(
        (caso.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Convertir prioridad numérica a texto
      let prioridadTexto = 'MEDIA';
      if (caso.priority >= 70) prioridadTexto = 'ALTA';
      else if (caso.priority >= 40) prioridadTexto = 'MEDIA';
      else prioridadTexto = 'BAJA';

      // Semáforo de término
      const esEstadoFinal = ['CERRADO', 'FINALIZADO', 'RESUELTA', 'CERRADA', 'REMITIDO_POR_COMPETENCIA'].includes(caso.state.code);
      let semaforoTermino: 'verde' | 'amarillo' | 'rojo' | 'respondido' = 'verde';
      if (esEstadoFinal || caso.respondedAt) {
        semaforoTermino = 'respondido';
      } else if (now > caso.dueDate) {
        semaforoTermino = 'rojo';
      } else if (diasRestantes <= 3) {
        semaforoTermino = 'amarillo';
      }

      return {
        id: caso.id,
        codigo: caso.filingNumber,
        tipo: caso.caseType.name,
        estado: caso.state.name,
        prioridad: prioridadTexto,
        diasRestantes,
        semaforoTermino
      };
    });

    return NextResponse.json(casosPrioritarios);

  } catch (error) {
    console.error('Error obteniendo casos prioritarios:', error);
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
