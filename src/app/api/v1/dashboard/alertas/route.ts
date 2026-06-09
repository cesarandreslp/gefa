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
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const alertas = [];

    // Alerta de casos vencidos
    const casosVencidos = await db.case.count({
      where: {
        tenantId: auth.user.tenantId,
        ...baseFilter,
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

    if (casosVencidos > 0) {
      alertas.push({
        id: 'vencidos',
        tipo: 'warning' as const,
        mensaje: `Tienes ${casosVencidos} caso${casosVencidos > 1 ? 's' : ''} vencido${casosVencidos > 1 ? 's' : ''} que requiere${casosVencidos > 1 ? 'n' : ''} atención inmediata`
      });
    }

    // Alerta de casos próximos a vencer
    const casosProximosVencer = await db.case.count({
      where: {
        tenantId: auth.user.tenantId,
        ...baseFilter,
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

    if (casosProximosVencer > 0) {
      alertas.push({
        id: 'proximos-vencer',
        tipo: 'info' as const,
        mensaje: `${casosProximosVencer} caso${casosProximosVencer > 1 ? 's' : ''} vence${casosProximosVencer > 1 ? 'n' : ''} en los próximos 3 días`
      });
    }

    // Alerta de casos nuevos sin revisar
    const casosNuevos = await db.case.count({
      where: {
        tenantId: auth.user.tenantId,
        ...baseFilter,
        state: {
          code: 'RADICADO'
        }
      }
    });

    if (casosNuevos > 0 && roleCode !== 'DIRECTOR') {
      alertas.push({
        id: 'nuevos',
        tipo: 'info' as const,
        mensaje: `Tienes ${casosNuevos} caso${casosNuevos > 1 ? 's' : ''} nuevo${casosNuevos > 1 ? 's' : ''} pendiente${casosNuevos > 1 ? 's' : ''} de revisión`
      });
    }

    return NextResponse.json(alertas);

  } catch (error) {
    console.error('Error obteniendo alertas:', error);
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
