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
    const { funcionarioId, casoId } = await request.json();

    if (!funcionarioId || !casoId) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    const peticionId = params.id;

    // Verificar que la petición existe
    const actionLog = await db.actionLog.findUnique({
      where: { id: peticionId },
      include: {
        case: true
      }
    });

    if (!actionLog) {
      return NextResponse.json(
        { error: 'Petición no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el funcionario existe
    const funcionario = await db.user.findUnique({
      where: { id: funcionarioId },
      include: { role: true }
    });

    if (!funcionario) {
      return NextResponse.json(
        { error: 'Funcionario no encontrado' },
        { status: 404 }
      );
    }

    if (!funcionario.role) {
      return NextResponse.json(
        { error: 'El funcionario no tiene un rol asignado' },
        { status: 400 }
      );
    }

    // Crear acción de rechazo con metadata del nuevo funcionario
    await db.actionLog.create({
      data: {
        caseId: casoId,
        userId: auth.user.userId,
        userEmail: auth.user.email,
        userRole: auth.user.roleCode,
        action: 'REASSIGNMENT_REJECTED',
        entityType: 'Case',
        entityId: casoId,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        checksum: '',
        metadata: {
          proposalId: peticionId,
          nuevoFuncionarioId: funcionarioId,
          nuevoFuncionarioNombre: funcionario.fullName,
          nuevoFuncionarioRol: funcionario.role.name,
          motivo: `Reasignado a ${funcionario.fullName} (${funcionario.role.name})`
        }
      }
    });

    // Completar la asignación anterior
    await db.assignment.updateMany({
      where: {
        caseId: casoId,
        status: {
          in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'REASSIGNED']
        }
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    // Actualizar el caso con el nuevo funcionario asignado
    await db.assignment.create({
      data: {
        tenantId: auth.user.tenantId,
        caseId: casoId,
        userId: funcionarioId,
        assignedBy: auth.user.userId,
        status: 'IN_PROGRESS',
        isFinalAssignment: true, // Esto oculta el botón "Reasignar" permanentemente
        acceptedAt: new Date()
      }
    });

    // Actualizar el estado del caso a RADICADO para que aparezca en "Nuevos" del funcionario
    const estadoRadicado = await db.caseState.findFirst({
      where: { code: 'RADICADO' }
    });

    if (estadoRadicado) {
      await db.case.update({
        where: { id: casoId },
        data: { stateId: estadoRadicado.id }
      });

      // Registrar el cambio de estado en el historial
      await db.caseStateHistory.create({
        data: {
          tenantId: auth.user.tenantId,
          caseId: casoId,
          fromStateId: actionLog.case?.stateId || 'unknown', // Estado anterior seguro
          toStateId: estadoRadicado.id,
          comment: 'Cambio de estado a Nuevo/Radicado por reasignación desde la Entidad'
        }
      });
    }

    // Notificar al funcionario asignado por email
    try {
      const { NotificationHooks } = await import('@/services/NotificationHooks');

      const caseInfo = await db.case.findUnique({
        where: { id: casoId },
        include: { caseType: true, citizen: true }
      });

      if (caseInfo && funcionario) {
        await NotificationHooks.onCaseAssigned({
          caseId: casoId,
          filingNumber: caseInfo.filingNumber,
          userId: funcionario.id,
          userName: funcionario.fullName || funcionario.email,
          userEmail: funcionario.email,
          citizenName: caseInfo.citizen ? `${caseInfo.citizen.firstName} ${caseInfo.citizen.firstLastName}` : 'Ciudadano',
          caseType: caseInfo.caseType?.name || 'General',
          dueDate: caseInfo.dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        tenantId: auth.user.tenantId,
        });
        console.log(`📧 Notificación de reasignación enviada a ${funcionario.email}`);
      }
    } catch (notifError) {
      console.error('⚠️ Error enviando notificación de asignación (no crítico):', notifError);
    }

    return NextResponse.json({
      success: true,
      message: 'Reasignación cambiada exitosamente',
      nuevoFuncionario: {
        id: funcionario.id,
        nombre: funcionario.fullName,
        rol: funcionario.role.name
      }
    });

  } catch (error) {
    console.error('Error al cambiar asignación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
