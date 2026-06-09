/**
 * GET /api/v1/cases/[id]/available-states
 * 
 * FASE 3: Obtiene estados disponibles según el estado actual y rol
 * 
 * Protegido: Solo usuarios autenticados
 * Respeta: Permisos por rol (FUNCIONARIO, SUPERVISOR, ADMIN)
 */

import { NextRequest, NextResponse } from 'next/server';
import { stateMachineService, Role, StateCode } from '@/services/StateMachineService';
import { caseStateService } from '@/services/CaseStateService';
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

    // 2. Obtener estado actual del caso
    const currentCase = await caseStateService.getCurrentState(auth.user.tenantId, caseId);

    if (!currentCase.success || !currentCase.state) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CASE_NOT_FOUND',
            message: 'Expediente no encontrado',
          },
        },
        { status: 404 }
      );
    }

    // 3. Obtener estados disponibles según rol
    const availableStates = await stateMachineService.getAvailableStates(
      currentCase.state.code as StateCode,
      auth.user.roleCode as Role
    );

    return NextResponse.json({
      success: true,
      data: {
        currentState: {
          code: currentCase.state.code,
          name: currentCase.state.name,
        },
        availableStates: availableStates.states,
        userRole: auth.user.roleCode,
        isFinalState: stateMachineService.isFinalState(currentCase.state.code as StateCode),
      },
    });
  } catch (error) {
    console.error('Error getting available states:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error al obtener estados disponibles',
        },
      },
      { status: 500 }
    );
  }
}
