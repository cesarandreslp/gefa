/**
 * API Endpoint - Auto-cambio de RADICADO a EN_ESTUDIO
 * 
 * PATCH /api/v1/solicitudes/[id]/auto-en-estudio
 * 
 * Cambia automáticamente un caso de RADICADO a EN_ESTUDIO
 * cuando un funcionario abre el caso por primera vez.
 * 
 * Etapa 3 - Prompt 2
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';

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

    // Obtener el caso actual con su estado
    const currentCase = await db.case.findUnique({
      where: { id: caseId },
      include: {
        state: true
      }
    });

    if (!currentCase) {
      return NextResponse.json(
        { success: false, error: 'Caso no encontrado' },
        { status: 404 }
      );
    }

    // Solo hacer el cambio si está en RADICADO
    if (currentCase.state.code !== 'RADICADO') {
      return NextResponse.json(
        { success: true, message: 'El caso no está en estado RADICADO', noChange: true },
        { status: 200 }
      );
    }

    // Obtener el estado EN_ESTUDIO
    const enEstudioState = await db.caseState.findUnique({
      where: { code: 'EN_ESTUDIO' }
    });

    if (!enEstudioState) {
      return NextResponse.json(
        { success: false, error: 'Estado EN_ESTUDIO no encontrado' },
        { status: 500 }
      );
    }

    // Actualizar el caso y registrar en historial (transacción)
    await db.$transaction(async (tx) => {
      // 1. Actualizar el estado del caso
      await tx.case.update({
        where: { id: caseId },
        data: {
          stateId: enEstudioState.id,
        }
      });

      // 2. Registrar en historial de estados
      await tx.caseStateHistory.create({
        data: {
          tenantId: authResult.user!.tenantId,
          caseId: caseId,
          fromStateId: currentCase.stateId,
          toStateId: enEstudioState.id,
          changedBy: userId,
          comment: 'Cambio automático al abrir el caso por primera vez',
        }
      });

      // 3. Registrar en log de acciones
      await tx.actionLog.create({
        data: {
          caseId: caseId,
          userId: userId,
          userEmail: authResult.user!.email,
          userRole: authResult.user!.roleCode,
          action: 'STATE_AUTO_CHANGED',
          entityType: 'Case',
          entityId: caseId,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          metadata: {
            fromState: currentCase.state.code,
            fromStateName: currentCase.state.name,
            toState: enEstudioState.code,
            toStateName: enEstudioState.name,
            automatic: true,
            reason: 'Caso abierto por primera vez'
          },
          checksum: Buffer.from(JSON.stringify({
            userId,
            action: 'STATE_AUTO_CHANGED',
            caseId,
            timestamp: new Date().toISOString()
          })).toString('base64').substring(0, 64)
        }
      });
    });

    console.log(`✅ Caso ${currentCase.filingNumber} cambiado automáticamente: RADICADO → EN_ESTUDIO`);

    return NextResponse.json({
      success: true,
      message: 'Estado actualizado automáticamente a EN_ESTUDIO',
      previousState: 'RADICADO',
      newState: 'EN_ESTUDIO'
    });

  } catch (error: unknown) {
    console.error('Error en auto-cambio de estado:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
