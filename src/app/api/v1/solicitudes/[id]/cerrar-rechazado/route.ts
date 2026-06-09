/**
 * API Endpoint - Cerrar Caso Rechazado después de respuesta del ciudadano
 * 
 * POST /api/v1/solicitudes/[id]/cerrar-rechazado
 * 
 * Cierra un caso rechazado por improcedencia después de que el ciudadano haya respondido
 */

import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/validation';
import { protectAPIRoute } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const authResult = await protectAPIRoute(request);
    if (!authResult.authorized || !authResult.user) {
      return NextResponse.json(
        errorResponse('UNAUTHORIZED', 'No autorizado'),
        { status: 401 }
      );
    }

    const db = authResult.db;
    const caseId = params.id;
    const userId = authResult.user.userId;
    const userEmail = authResult.user.email;
    const userRole = authResult.user.roleName;

    // Verificar que el caso existe y está rechazado
    const caso = await db.case.findUnique({
      where: { id: caseId },
      include: {
        state: true,
        stateHistory: {
          where: {
            toState: {
              code: 'REMITIDO_POR_COMPETENCIA'
            }
          },
          orderBy: {
            timestamp: 'desc'
          },
          take: 1
        }
      }
    });

    if (!caso) {
      return NextResponse.json(
        errorResponse('NOT_FOUND', 'Caso no encontrado'),
        { status: 404 }
      );
    }

    if (caso.state.code !== 'REMITIDO_POR_COMPETENCIA') {
      return NextResponse.json(
        errorResponse('INVALID_STATE', 'El caso no está en estado rechazado por improcedencia'),
        { status: 400 }
      );
    }

    // Verificar que el ciudadano haya respondido
    const rechazoHistorial = caso.stateHistory[0];
    if (!rechazoHistorial || !rechazoHistorial.comment) {
      return NextResponse.json(
        errorResponse('NO_RESPONSE', 'El ciudadano no ha respondido aún'),
        { status: 400 }
      );
    }

    // Verificar que el comentario contiene la respuesta del ciudadano
    const hasResponse = rechazoHistorial.comment.includes('--- Respuesta del ciudadano ---') ||
                       rechazoHistorial.comment.startsWith('Respuesta del ciudadano:');

    if (!hasResponse) {
      return NextResponse.json(
        errorResponse('NO_RESPONSE', 'El ciudadano no ha respondido aún'),
        { status: 400 }
      );
    }

    // Obtener el estado CERRADO
    const estadoCerrado = await db.caseState.findUnique({
      where: { code: 'CERRADO' }
    });

    if (!estadoCerrado) {
      return NextResponse.json(
        errorResponse('INTERNAL_ERROR', 'Estado CERRADO no encontrado en el sistema'),
        { status: 500 }
      );
    }

    // Actualizar el caso a CERRADO
    await db.$transaction(async (tx) => {
      // 1. Actualizar el estado del caso
      await tx.case.update({
        where: { id: caseId },
        data: {
          stateId: estadoCerrado.id,
          closedAt: new Date()
        }
      });

      // 2. Crear registro en historial
      await tx.caseStateHistory.create({
        data: {
          tenantId: authResult.user!.tenantId,
          caseId: caseId,
          fromStateId: caso.state.id,
          toStateId: estadoCerrado.id,
          comment: 'Caso cerrado después de recibir respuesta del ciudadano',
          timestamp: new Date()
        }
      });

      // 3. Registrar acción en el log
      await tx.actionLog.create({
        data: {
          userId: userId,
          userEmail: userEmail,
          userRole: userRole,
          action: 'CASE_CLOSED',
          entityType: 'Case',
          entityId: caseId,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          after: {
            from: caso.state.code,
            to: 'CERRADO',
            reason: 'Respuesta del ciudadano recibida'
          },
          checksum: 'auto-generated',
          caseId: caseId
        }
      });
    });

    console.log(`✅ Caso ${caso.filingNumber} cerrado exitosamente después de respuesta del ciudadano`);

    return NextResponse.json(
      successResponse({
        message: 'Caso cerrado exitosamente',
        caseId: caseId,
        filingNumber: caso.filingNumber
      }),
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error('Error cerrando caso rechazado:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    return NextResponse.json(
      errorResponse(
        'INTERNAL_ERROR',
        'Error al cerrar el caso',
        process.env.NODE_ENV === 'development' ? errorMessage : undefined
      ),
      { status: 500 }
    );
  }
}
