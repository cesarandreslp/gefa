/**
 * API Endpoint - Cambiar Estado de Caso
 * 
 * PATCH /api/v1/solicitudes/[id]/estado
 * 
 * Permite a los funcionarios cambiar el estado de un caso
 * con validación de transiciones permitidas y registro en historial
 * 
 * Etapa 3 - Prompt 1
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { z } from 'zod';
import { successResponse, errorResponse } from '@/lib/validation';

// Schema de validación
const changeStateSchema = z.object({
  newStateCode: z.string().min(1, 'Estado requerido'),
  comment: z.string().optional(),
});

// Transiciones permitidas
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'RADICADO': ['EN_ESTUDIO'],
  'EN_ESTUDIO': ['REQUIERE_INFORMACION', 'RESUELTO'],
  'REQUIERE_INFORMACION': ['EN_ESTUDIO'],
  'RESUELTO': ['CERRADO'],
  'CERRADO': [], // Estado final, no puede cambiar
};

// Estados que requieren comentario obligatorio
const STATES_REQUIRING_COMMENT = ['REQUIERE_INFORMACION', 'CERRADO'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación y autorización
    const authResult = await protectAPIRoute(request, ['ADMIN', 'FUNCIONARIO', 'SUPERVISOR']);
    const db = authResult.db;
    if (!authResult.authorized) {
      return authResult.response;
    }

    const userId = authResult.user!.userId;
    const caseId = params.id;

    // Validar body
    const body = await request.json();
    const validation = changeStateSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', validation.error.errors[0].message),
        { status: 400 }
      );
    }

    const { newStateCode, comment } = validation.data;

    // Obtener el caso actual con su estado
    const currentCase = await db.case.findUnique({
      where: { id: caseId },
      include: {
        state: true,
        citizen: {
          select: {
            firstName: true,
            email: true,
          }
        }
      }
    });

    if (!currentCase) {
      return NextResponse.json(
        errorResponse('NOT_FOUND', 'Caso no encontrado'),
        { status: 404 }
      );
    }

    const currentStateCode = currentCase.state.code;

    // Validar que la transición sea permitida
    const allowedNextStates = ALLOWED_TRANSITIONS[currentStateCode] || [];
    if (!allowedNextStates.includes(newStateCode)) {
      return NextResponse.json(
        errorResponse(
          'INVALID_TRANSITION',
          `No se puede cambiar de ${currentCase.state.name} a ${newStateCode}. Transiciones permitidas: ${allowedNextStates.join(', ')}`
        ),
        { status: 400 }
      );
    }

    // Validar comentario obligatorio
    if (STATES_REQUIRING_COMMENT.includes(newStateCode) && (!comment || comment.trim().length === 0)) {
      return NextResponse.json(
        errorResponse(
          'COMMENT_REQUIRED',
          `El cambio a estado "${newStateCode}" requiere un comentario obligatorio`
        ),
        { status: 400 }
      );
    }

    // Obtener el nuevo estado
    const newState = await db.caseState.findUnique({
      where: { code: newStateCode }
    });

    if (!newState) {
      return NextResponse.json(
        errorResponse('NOT_FOUND', 'Estado no encontrado'),
        { status: 404 }
      );
    }

    // Actualizar el caso y registrar en historial (transacción)
    const result = await db.$transaction(async (tx) => {
      // 1. Actualizar el estado del caso
      const updatedCase = await tx.case.update({
        where: { id: caseId },
        data: {
          stateId: newState.id,
        },
        include: {
          state: true,
          citizen: {
            select: {
              firstName: true,
            }
          }
        }
      });

      // 2. Registrar en historial de estados
      await tx.caseStateHistory.create({
        data: {
          tenantId: authResult.user!.tenantId,
          caseId: caseId,
          fromStateId: currentCase.stateId,
          toStateId: newState.id,
          changedBy: userId,
          comment: comment || null,
        }
      });

      // 3. Registrar en log de acciones
      await tx.actionLog.create({
        data: {
          caseId: caseId,
          userId: userId,
          userEmail: authResult.user!.email,
          userRole: authResult.user!.roleCode,
          action: 'STATE_CHANGED',
          entityType: 'Case',
          entityId: caseId,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          metadata: {
            fromState: currentCase.state.code,
            fromStateName: currentCase.state.name,
            toState: newState.code,
            toStateName: newState.name,
            comment: comment || null,
          },
          checksum: Buffer.from(JSON.stringify({
            userId,
            action: 'STATE_CHANGED',
            caseId,
            timestamp: new Date().toISOString()
          })).toString('base64').substring(0, 64)
        }
      });

      return updatedCase;
    });

    console.log(`✅ Estado del caso ${currentCase.filingNumber} cambiado: ${currentStateCode} → ${newStateCode}`);

    return NextResponse.json(
      successResponse({
        caseId: result.id,
        filingNumber: result.filingNumber,
        previousState: currentCase.state.name,
        newState: newState.name,
        message: `Estado actualizado exitosamente a ${newState.name}`,
      }),
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error('Error changing case state:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    return NextResponse.json(
      errorResponse(
        'INTERNAL_ERROR',
        'Error al cambiar el estado del caso',
        process.env.NODE_ENV === 'development' ? errorMessage : undefined
      ),
      { status: 500 }
    );
  }
}
