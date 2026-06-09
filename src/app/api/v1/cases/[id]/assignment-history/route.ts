/**
 * GET /api/v1/cases/[id]/assignment-history
 * 
 * FASE 3 MÓDULO 2: Obtiene historial de asignaciones
 * 
 * Protegido: Solo usuarios autenticados
 * Solo lectura: Trazabilidad completa
 */

import { NextRequest, NextResponse } from 'next/server';
import { assignmentService } from '@/services/AssignmentService';
import { protectAPIRoute } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verificar autenticación
    const auth = await protectAPIRoute(request, ['ADMIN', 'FUNCIONARIO', 'SUPERVISOR']);

    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const caseId = params.id;

    // 2. Obtener historial de asignaciones
    const historyResult = await assignmentService.getAssignmentHistory(auth.user.tenantId, caseId);

    if (!historyResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'HISTORY_ERROR',
            message: historyResult.error || 'Error al obtener historial',
          },
        },
        { status: 500 }
      );
    }

    // 3. Obtener asignado actual
    const currentResult = await assignmentService.getCurrentAssignee(auth.user.tenantId, caseId);

    return NextResponse.json({
      success: true,
      data: {
        currentAssignee: currentResult.assignee || null,
        history: historyResult.history,
      },
    });
  } catch (error) {
    console.error('Error en endpoint assignment-history:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error al obtener historial de asignaciones',
        },
      },
      { status: 500 }
    );
  }
}
