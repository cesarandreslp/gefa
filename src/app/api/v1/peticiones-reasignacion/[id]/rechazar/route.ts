import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await protectAPIRoute(request);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const db = auth.db;
    const peticionId = params.id;
    const body = await request.json();
    const { motivo } = body;

    if (!motivo) {
      return NextResponse.json(
        { success: false, error: 'El motivo es requerido' },
        { status: 400 }
      );
    }

    // Buscar la acción de propuesta de reasignación
    const propuesta = await db.actionLog.findFirst({
      where: {
        id: peticionId,
        action: { in: ['REASSIGNMENT_PROPOSED', 'REASSIGNMENT_REQUESTED'] }
      },
      include: {
        case: true
      }
    });

    if (!propuesta) {
      return NextResponse.json(
        { success: false, error: 'Propuesta no encontrada' },
        { status: 404 }
      );
    }

    if (!propuesta.caseId) {
      return NextResponse.json(
        { success: false, error: 'La propuesta no tiene un caso asociado' },
        { status: 400 }
      );
    }

    // Actualizar la asignación actual para que vuelva al inbox y no se pueda volver a pedir reasignación
    const asignacionActual = await db.assignment.findFirst({
      where: {
        caseId: propuesta.caseId,
        status: { in: ['REASSIGNED', 'IN_PROGRESS', 'ACCEPTED', 'PENDING'] }
      },
      orderBy: {
        assignedAt: 'desc'
      }
    });

    if (asignacionActual) {
      await db.assignment.update({
        where: { id: asignacionActual.id },
        data: {
          isFinalAssignment: true,
          status: 'IN_PROGRESS' // Devolver el estado a En Progreso para que aparezca en la bandeja
        }
      });
    }

    // Actualizar el estado del caso a RADICADO para que aparezca en "Nuevos" del funcionario
    const estadoRadicado = await db.caseState.findFirst({
      where: { code: 'RADICADO' }
    });

    if (estadoRadicado) {
      const casoAnterior = await db.case.findUnique({ where: { id: propuesta.caseId } });
      await db.case.update({
        where: { id: propuesta.caseId },
        data: { stateId: estadoRadicado.id }
      });

      // Registrar el cambio de estado en el historial
      await db.caseStateHistory.create({
        data: {
          tenantId: auth.user.tenantId,
          caseId: propuesta.caseId,
          fromStateId: casoAnterior?.stateId || 'unknown',
          toStateId: estadoRadicado.id,
          comment: 'Cambio de estado a Nuevo/Radicado por rechazo de reasignación'
        }
      });
    }

    // Crear la acción de rechazo
    const propuestaMetadata = (propuesta.metadata as Record<string, unknown>) || {};
    await db.actionLog.create({
      data: {
        caseId: propuesta.caseId,
        userId: auth.user.userId,
        userEmail: auth.user.email,
        userRole: auth.user.roleCode,
        action: 'REASSIGNMENT_REJECTED',
        entityType: 'Case',
        entityId: propuesta.caseId,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        checksum: '',
        metadata: {
          proposalId: peticionId,
          motivo,
          ...propuestaMetadata
        }
      }
    });

    // Notificar al funcionario asignado (al que se le devolvió el caso) por email
    if (asignacionActual?.userId) {
      try {
        const { NotificationHooks } = await import('@/services/NotificationHooks');
        const caseInfo = await db.case.findUnique({
          where: { id: propuesta.caseId },
          include: { caseType: true, citizen: true }
        });
        const funcionario = await db.user.findUnique({
          where: { id: asignacionActual.userId }
        });

        if (caseInfo && funcionario) {
          await NotificationHooks.onCaseAssigned({
            caseId: propuesta.caseId,
            filingNumber: caseInfo.filingNumber,
            userId: funcionario.id,
            userName: funcionario.fullName || funcionario.email,
            userEmail: funcionario.email,
            citizenName: caseInfo.citizen ? `${caseInfo.citizen.firstName} ${caseInfo.citizen.firstLastName}` : 'Ciudadano',
            caseType: caseInfo.caseType?.name || 'General',
            dueDate: caseInfo.dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          tenantId: auth.user.tenantId,
          });
          console.log(`📧 Notificación de reasignación (rechazo) enviada a ${funcionario.email}`);
        }
      } catch (notifError) {
        console.error('⚠️ Error enviando notificación de asignación (no crítico):', notifError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Reasignación rechazada'
    });
  } catch (error) {
    console.error('Error al rechazar reasignación:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
