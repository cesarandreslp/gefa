import { NextResponse, NextRequest } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';

/**
 * GET /api/v1/funcionarios/disponibles
 * Obtiene lista de funcionarios y revisors disponibles para reasignación
 * Excluye al funcionario especificado en el query parameter
 */
export async function GET(request: NextRequest) {
  try {
    // Proteger la ruta
    const authResult = await protectAPIRoute(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
const db = authResult.db;

    const { searchParams } = new URL(request.url);
    const excluirUsuarioId = searchParams.get('excluir');

    // Obtener todos los usuarios activos con rol FUNCIONARIO o REVISOR_MUNICIPAL
    const funcionarios = await db.user.findMany({
      where: {
        isActive: true,
        role: {
          OR: [
            { level: 85 }, // Funcionarios/Delegados
            { 
              AND: [
                { level: 100 }, // Nivel 100
                { code: { not: 'ADMIN' } } // Pero no ADMIN
              ]
            }
          ]
        },
        ...(excluirUsuarioId && { id: { not: excluirUsuarioId } })
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: {
          select: {
            code: true,
            name: true,
            level: true
          }
        }
      },
      orderBy: [
        { role: { level: 'desc' } },
        { fullName: 'asc' }
      ]
    });

    return NextResponse.json(funcionarios);
  } catch (error) {
    console.error('Error obteniendo funcionarios:', error);
    return NextResponse.json(
      { error: 'Error al obtener funcionarios disponibles' },
      { status: 500 }
    );
  }
}
