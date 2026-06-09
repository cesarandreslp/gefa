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

    // Solo ADMIN y REVISOR_MUNICIPAL pueden ver productividad
    if (roleCode !== 'ADMIN' && roleCode !== 'DIRECTOR') {
      return NextResponse.json([]);
    }

    // Obtener usuarios delegados (excluyendo ADMIN, IA, VENTANILLA_UNICA)
    const delegados = await db.user.findMany({
      where: {
        isActive: true,
        role: {
          code: {
            notIn: ['ADMIN', 'ASIGNACION_DE_CASOS', 'VENTANILLA_UNICA']
          }
        }
      },
      include: {
        role: true,
        assignments: {
          include: {
            case: {
              include: {
                state: true
              }
            }
          }
        }
      }
    });

    const productividad = delegados.map(delegado => {
      const casosTotal = delegado.assignments.length;
      
      // Casos cerrados/finalizados
      const casosAtendidos = delegado.assignments.filter(assignment => 
        assignment.case.state?.code === 'CERRADO' || 
        assignment.case.state?.code === 'FINALIZADO'
      ).length;

      const porcentaje = casosTotal > 0 
        ? Math.round((casosAtendidos / casosTotal) * 100)
        : 0;

      return {
        nombre: delegado.fullName,
        porcentaje,
        casosAtendidos,
        casosTotal
      };
    }).sort((a, b) => b.porcentaje - a.porcentaje);

    return NextResponse.json(productividad);

  } catch (error) {
    console.error('Error obteniendo productividad:', error);
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
