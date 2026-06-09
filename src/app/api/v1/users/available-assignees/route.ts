/**
 * GET /api/v1/users/available-assignees
 * 
 * FASE 3 MÓDULO 2: Obtiene funcionarios disponibles para asignar
 * 
 * Protegido: Solo REVISOR_MUNICIPAL, VENTANILLA_UNICA y ASIGNACION_DE_CASOS
 * Muestra: Funcionarios activos con carga de trabajo
 */

import { NextRequest, NextResponse } from 'next/server';
import { assignmentService } from '@/services/AssignmentService';
import { protectAPIRoute } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 1. Verificar autenticación - Solo REVISOR_MUNICIPAL, VENTANILLA_UNICA y ASIGNACION_DE_CASOS
    const auth = await protectAPIRoute(request, ['REVISOR', 'VENTANILLA_UNICA', 'ASIGNACION_DE_CASOS']);

    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    // 2. Obtener funcionarios disponibles
    const result = await assignmentService.getAvailableAssignees(auth.user.tenantId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USERS_ERROR',
            message: result.error || 'Error al obtener funcionarios',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        users: result.users,
      },
    });
  } catch (error) {
    console.error('Error en endpoint available-assignees:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error al obtener funcionarios disponibles',
        },
      },
      { status: 500 }
    );
  }
}
