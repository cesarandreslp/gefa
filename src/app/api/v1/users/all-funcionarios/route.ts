/**
 * GET /api/v1/users/all-funcionarios
 * 
 * Obtiene TODOS los funcionarios activos para reasignación manual
 * Incluye REVISOR_MUNICIPAL, FUNCIONARIO, SUPERVISOR, ADMIN
 * 
 * Usado en: Cambio de asignación de peticiones
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request);

    if (!auth.authorized || !auth.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const db = auth.db;
    // Obtener todos los usuarios activos con rol FUNCIONARIO (85) o DIRECTOR (100, solo DIRECTOR)
    // Excluir ADMIN, ASIGNACION_DE_CASOS, VENTANILLA_UNICA, AUXILIAR_ATENCION_USUARIO
    const users = await db.user.findMany({
      where: {
        tenantId: auth.user.tenantId,
        isActive: true,
        role: {
          OR: [
            { level: 85 },           // FUNCIONARIO
            { code: 'DIRECTOR' },    // Director como autoridad asignable
          ],
        },
      },
      include: {
        role: true
      },
      orderBy: [
        { fullName: 'asc' }
      ],
    });

    console.log('Usuarios encontrados para reasignación:', users.length);

    const funcionarios = users.map(u => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: {
        name: u.role?.name || 'Sin rol',
        code: u.role?.code || ''
      }
    }));

    return NextResponse.json({
      success: true,
      funcionarios
    });
  } catch (error) {
    console.error('Error al obtener funcionarios:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
