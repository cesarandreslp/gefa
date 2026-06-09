import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { EmailService } from '@/services/EmailService';

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

    console.log('🔍 Buscando propuesta con ID:', peticionId);

    // Buscar la acción de propuesta de reasignación (desde VU o desde Funcionario)
    const propuesta = await db.actionLog.findFirst({
      where: {
        id: peticionId,
        action: { in: ['REASSIGNMENT_PROPOSED', 'REASSIGNMENT_REQUESTED'] }
      },
      include: {
        case: true
      }
    });

    console.log('📋 Propuesta encontrada:', propuesta ? 'SÍ' : 'NO');
    if (propuesta) {
      console.log('📦 Metadata:', JSON.stringify(propuesta.metadata, null, 2));
      console.log('📂 CaseId:', propuesta.caseId);
    }

    if (!propuesta) {
      console.error('❌ Propuesta no encontrada');
      return NextResponse.json(
        { success: false, error: 'Propuesta no encontrada' },
        { status: 404 }
      );
    }

    if (!propuesta.caseId) {
      console.log('⚠️ caseId es null, intentando buscar por caseCode en metadata');
      const metadata = propuesta.metadata as { caseCode?: string };

      if (metadata?.caseCode) {
        const caso = await db.case.findFirst({
          where: { filingNumber: metadata.caseCode }
        });

        if (caso) {
          console.log('✅ Caso encontrado por caseCode:', caso.id);
          // Actualizar el actionLog con el caseId correcto
          await db.actionLog.update({
            where: { id: peticionId },
            data: { caseId: caso.id }
          });
          propuesta.caseId = caso.id;
        } else {
          console.error('❌ No se encontró caso con filingNumber:', metadata.caseCode);
          return NextResponse.json(
            { success: false, error: 'No se encontró el caso asociado' },
            { status: 400 }
          );
        }
      } else {
        console.error('❌ No hay caseCode en metadata');
        return NextResponse.json(
          { success: false, error: 'La propuesta no tiene un caso asociado' },
          { status: 400 }
        );
      }
    }

    // Crear la acción de aprobación
    const propuestaMetadata = (propuesta.metadata as Record<string, unknown>) || {};
    await db.actionLog.create({
      data: {
        caseId: propuesta.caseId,
        userId: auth.user.userId,
        userEmail: auth.user.email,
        userRole: auth.user.roleCode,
        action: 'REASSIGNMENT_APPROVED',
        entityType: 'Case',
        entityId: propuesta.caseId,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        checksum: '',
        metadata: {
          proposalId: peticionId,
          ...propuestaMetadata
        }
      }
    });

    // Reasignar el caso al funcionario propuesto
    const metadata = propuestaMetadata as { funcionarioPropuestoId?: string };
    if (metadata?.funcionarioPropuestoId) {
      // Completar la asignación anterior
      await db.assignment.updateMany({
        where: {
          caseId: propuesta.caseId,
          status: {
            in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS']
          }
        },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      // Crear nueva asignación marcada como final (no reasignable)
      await db.assignment.create({
        data: {
          tenantId: auth.user.tenantId,
          caseId: propuesta.caseId,
          userId: metadata.funcionarioPropuestoId,
          assignedBy: auth.user.userId,
          status: 'IN_PROGRESS',
          isFinalAssignment: true, // Marcar como asignación final aprobada por el revisor
          acceptedAt: new Date()
        }
      });

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
            comment: 'Cambio de estado a Nuevo/Radicado por aprobación de reasignación'
          }
        });
      }

      console.log('✅ Reasignación aprobada y caso reasignado a:', metadata.funcionarioPropuestoId);

      // Enviar email de notificación al ciudadano (en background, no bloquea)
      try {
        const casoConCiudadano = await db.case.findUnique({
          where: { id: propuesta.caseId! },
          include: { citizen: true }
        });
        const nuevoFuncionario = await db.user.findUnique({
          where: { id: metadata.funcionarioPropuestoId }
        });

        if (casoConCiudadano?.citizen?.email && casoConCiudadano.filingNumber) {
          const citizenName = `${casoConCiudadano.citizen.firstName} ${casoConCiudadano.citizen.firstLastName}`;
          const officialName = nuevoFuncionario?.fullName || 'Funcionario asignado';

          const tenant = await db.tenant.findUnique({ where: { id: auth.user.tenantId } });
          const tenantName = tenant?.name || 'GEFA — Gestión Familiar';

          EmailService.sendCitizenReassignmentEmail(
            tenantName,
            casoConCiudadano.citizen.email,
            citizenName,
            casoConCiudadano.filingNumber,
            officialName,
            auth.user.tenantId
          ).catch(err => console.error('⚠️ Error enviando email de reasignación al ciudadano:', err));

          console.log(`📧 Email de reasignación enviado a ${casoConCiudadano.citizen.email}`);
        } else {
          console.log('⚠️ No se pudo enviar email: ciudadano sin email o caso sin radicado');
        }
      } catch (emailError) {
        console.error('⚠️ Error preparando email de reasignación:', emailError);
        // No bloquear la respuesta de la API por un error de email
      }

      // Notificar al nuevo funcionario asignado por email
      try {
        const { NotificationHooks } = await import('@/services/NotificationHooks');
        const casoInfo = await db.case.findUnique({
          where: { id: propuesta.caseId! },
          include: { caseType: true, citizen: true }
        });
        const funcAsignado = await db.user.findUnique({
          where: { id: metadata.funcionarioPropuestoId }
        });

        if (casoInfo && funcAsignado) {
          await NotificationHooks.onCaseAssigned({
            caseId: propuesta.caseId!,
            filingNumber: casoInfo.filingNumber,
            userId: funcAsignado.id,
            userName: funcAsignado.fullName || funcAsignado.email,
            userEmail: funcAsignado.email,
            citizenName: casoInfo.citizen ? `${casoInfo.citizen.firstName} ${casoInfo.citizen.firstLastName}` : 'Ciudadano',
            caseType: casoInfo.caseType?.name || 'General',
            dueDate: casoInfo.dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          tenantId: auth.user.tenantId,
          });
          console.log(`📧 Notificación de reasignación enviada al nuevo funcionario: ${funcAsignado.email}`);
        }
      } catch (notifFuncError) {
        console.error('⚠️ Error enviando notificación al funcionario (no crítico):', notifFuncError);
      }
    } else {
      console.error('❌ No se encontró funcionarioPropuestoId en metadata');
      return NextResponse.json(
        { success: false, error: 'No se encontró el funcionario propuesto' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Reasignación aprobada exitosamente'
    });
  } catch (error) {
    console.error('Error al aprobar reasignación:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
