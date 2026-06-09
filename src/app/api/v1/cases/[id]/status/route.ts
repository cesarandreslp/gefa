/**
 * PUT /api/v1/cases/[id]/status
 * 
 * FASE 3: Cambio de estado con validación avanzada
 * 
 * Protegido: Solo funcionarios autenticados
 * Auditoría: Cada cambio se registra
 * Validación: StateMachineService valida transiciones por rol
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { caseStateService, CASE_STATE_CODES } from '@/services/CaseStateService';
import { stateMachineService, StateCode, Role } from '@/services/StateMachineService';
import { protectAPIRoute } from '@/lib/auth';
import { getClientIp, getUserAgent } from '@/lib/validation';

// Schema de validación
const changeStateSchema = z.object({
  newStateCode: z.enum([
    CASE_STATE_CODES.RADICADO,
    CASE_STATE_CODES.EN_ESTUDIO,
    CASE_STATE_CODES.REQUIERE_INFORMACION,
    CASE_STATE_CODES.RESUELTO,
    CASE_STATE_CODES.CERRADO,
  ]),
  comment: z.string().max(500).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verificar autenticación
    const auth = await protectAPIRoute(request, ['ADMIN', 'FUNCIONARIO', 'SUPERVISOR']);

    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    // 2. Validar body
    const body = await request.json();
    const validationResult = changeStateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Datos inválidos',
            details: validationResult.error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
        },
        { status: 400 }
      );
    }

    const { newStateCode, comment } = validationResult.data;
    const caseId = params.id;

    // 3. Obtener caso actual para validar transición
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

    // 4. FASE 3: Validar transición con StateMachineService
    const validation = stateMachineService.validateTransition({
      currentState: currentCase.state.code as StateCode,
      targetState: newStateCode as StateCode,
      userRole: auth.user.roleCode as Role,
      comment,
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TRANSITION',
            message: validation.error || 'Transición no permitida',
            requiresComment: validation.requiresComment,
            requiresSupervisor: validation.requiresSupervisor,
          },
        },
        { status: 403 }
      );
    }

    // 5. Cambiar estado (ya validado)
    const result = await caseStateService.changeState({
      tenantId: auth.user.tenantId,
      caseId,
      newStateCode,
      userId: auth.user.userId,
      userEmail: auth.user.email,
      userRole: auth.user.roleCode,
      comment,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'STATE_CHANGE_FAILED',
            message: result.error || 'No se pudo cambiar el estado',
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          case: result.case,
          message: `Estado cambiado a ${newStateCode}`,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error en cambio de estado:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error interno del servidor',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/cases/[id]/status
 * 
 * Obtiene el historial de estados del caso
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const auth = await protectAPIRoute(request, ['ADMIN', 'FUNCIONARIO']);

    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const caseId = params.id;

    // Obtener historial
    const result = await caseStateService.getStateHistory(auth.user.tenantId, caseId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'HISTORY_FETCH_FAILED',
            message: result.error || 'No se pudo obtener el historial',
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          history: result.history,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al obtener historial:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error interno del servidor',
        },
      },
      { status: 500 }
    );
  }
}
