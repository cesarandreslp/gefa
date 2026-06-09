import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute, getBaseRoleCode } from '@/lib/auth';

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

    const now = new Date();
    const roleCode = getBaseRoleCode(user.role.code);

    // Filtro base: obtener solo casos asignados al usuario actual
    const baseFilter = {
      tenantId: auth.user.tenantId,
      assignments: {
        some: {
          userId: user.id
        }
      }
    };

    // Admin puede ver todos los casos. Revisor también, pero para ciertos contadores (como Nuevos) solo debe ver lo suyo asignado.
    const shouldSeeAllCases = roleCode === 'ADMIN'; // Quitamos REVISOR_MUNICIPAL de aquí para que use el filtro base por defecto en 'Nuevos'

    // Sin embargo, para los contadores personalizados de Revisor (Seguimiento, Invitaciones), usamos lógica específica abajo.

    // Casos nuevos (estado "Radicado")
    const casosNuevos = await db.case.count({
      where: {
        ...(shouldSeeAllCases ? { tenantId: auth.user.tenantId } : baseFilter),
        state: {
          code: 'RADICADO'
        }
      }
    });

    // Casos activos (estados "En Revisión" y "En Trámite")
    const casosActivos = await db.case.count({
      where: {
        ...(shouldSeeAllCases ? { tenantId: auth.user.tenantId } : baseFilter),
        state: {
          code: {
            in: ['EN_REVISION', 'EN_TRAMITE']
          }
        }
      }
    });

    // Casos vencidos (dueDate < now y no están cerrados)
    const casosVencidos = await db.case.count({
      where: {
        ...(shouldSeeAllCases ? { tenantId: auth.user.tenantId } : baseFilter),
        dueDate: {
          lt: now
        },
        state: {
          code: {
            notIn: ['CERRADO', 'FINALIZADO']
          }
        }
      }
    });

    // Próximos a vencer (dueDate en los próximos 3 días y no están cerrados)
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const casosProximosVencer = await db.case.count({
      where: {
        ...(shouldSeeAllCases ? { tenantId: auth.user.tenantId } : baseFilter),
        dueDate: {
          gte: now,
          lte: threeDaysFromNow
        },
        state: {
          code: {
            notIn: ['CERRADO', 'FINALIZADO']
          }
        }
      }
    });

    // Contadores específicos para Revisor
    let seguimientoCount = 0;
    let invitacionesCount = 0;
    let cierreCasosCount = 0;

    if (roleCode === 'DIRECTOR') {
      seguimientoCount = await db.case.count({
        where: {
          tenantId: auth.user.tenantId,
          metadata: {
            path: ['revisorClassification'],
            equals: 'SEGUIMIENTO'
          }
        }
      });

      invitacionesCount = await db.case.count({
        where: {
          tenantId: auth.user.tenantId,
          metadata: {
            path: ['revisorClassification'],
            equals: 'INVITACION'
          }
        }
      });

      cierreCasosCount = await db.case.count({
        where: {
          tenantId: auth.user.tenantId,
          metadata: {
            path: ['pendienteCierre'],
            equals: true
          }
        }
      });
    }

    return NextResponse.json({
      casosNuevos,
      casosActivos,
      casosVencidos,
      casosProximosVencer,
      seguimiento: seguimientoCount,
      invitaciones: invitacionesCount,
      cierreCasos: cierreCasosCount
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas del dashboard:', error);
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
