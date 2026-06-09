import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { EmailService } from '@/services/EmailService';
import { protectAPIRoute } from '@/lib/auth';
import { prisma as mainPrisma } from '@/lib/prisma';

// Map de tipos de respuesta a estados
const RESPONSE_TYPE_TO_STATE: Record<string, string> = {
  'SOLICITAR_INFO': 'REQUIERE_INFORMACION',
  'ESCALAR': 'ESCALADO_A_OTRA_DEPENDENCIA',
  'RECHAZAR': 'REMITIDO_POR_COMPETENCIA',
  'CIERRE': 'CERRADO',
  'NO_REQUIERE': 'CERRADO'
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 Iniciando POST /responder para caso:', params?.id);

    // Verificar autenticación - todos los funcionarios pueden responder
    const authResult = await protectAPIRoute(request);
    if (!authResult.authorized || !authResult.user) {
      return authResult.response || NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const db = authResult.db;
    const userId = authResult.user!.userId;
    const { id } = params;
    const body = await request.json();
    const {
      respuesta,
      tipoRespuesta,
      soloEntidad: soloEntidadRaw = false,
      selectedEmails = [],
      requiereDias = false,
      diasRespuesta = null,
      escalationReason = null,
      ciudadanoPuedeResponder = true,
    } = body;

    const soloEntidad = soloEntidadRaw;

    if (tipoRespuesta !== 'NO_REQUIERE' && (!respuesta || !respuesta.trim())) {
      return NextResponse.json(
        { error: 'La respuesta es requerida' },
        { status: 400 }
      );
    }

    if (!tipoRespuesta || !RESPONSE_TYPE_TO_STATE[tipoRespuesta]) {
      return NextResponse.json(
        { error: 'El tipo de respuesta es requerido y debe ser válido' },
        { status: 400 }
      );
    }

    const nuevoEstadoCode = RESPONSE_TYPE_TO_STATE[tipoRespuesta];

    console.log('📧 Respondiendo caso:', id, 'con tipo de respuesta:', tipoRespuesta);

    // Verificar que el caso existe y obtener su estado actual
    const caso = await db.case.findUnique({
      where: { id },
      include: {
        state: true,
        caseType: true,
      }
    });

    if (!caso) {
      console.log('❌ Caso no encontrado:', id);
      return NextResponse.json(
        { error: 'Caso no encontrado' },
        { status: 404 }
      );
    }

    console.log('✅ Caso encontrado:', { codigo: caso.filingNumber, estadoActual: caso.state.code });

    // Obtener el nuevo estado
    const nuevoEstado = await db.caseState.findUnique({
      where: { code: nuevoEstadoCode }
    });

    if (!nuevoEstado) {
      console.error('❌ No se encontró el estado:', nuevoEstadoCode);
      return NextResponse.json(
        { error: 'No se pudo encontrar el estado para el tipo de respuesta' },
        { status: 500 }
      );
    }

    console.log('✅ Nuevo estado encontrado:', { code: nuevoEstado.code, name: nuevoEstado.name });

    // Obtener información del tenant (desde BD principal, no la del tenant)
    const tenant = await mainPrisma.tenant.findUnique({
      where: { id: caso.tenantId },
      include: { settings: true, institutionType: true }
    });
    const tenantName = tenant?.name || 'GEFA — Gestión Familiar';
    const tenantType = (tenant as { institutionType?: { name?: string } })?.institutionType?.name || undefined;
    const tenantEmail = tenant?.settings?.institutionalEmail || tenant?.institutionalEmail || undefined;
    const tenantPhone = tenant?.settings?.phone || tenant?.phone || undefined;

    // Obtener información del ciudadano para enviar el email
    const ciudadano = await db.citizen.findUnique({
      where: { id: caso.citizenId }
    });

    if (!ciudadano || !ciudadano.email) {
      console.log('⚠️ Ciudadano sin email registrado (posiblemente anónimo). Se omitirá el envío de email.');
    }

    // Preparar datos del ciudadano
    const esAnonimo = ciudadano?.isAnonymous === true;
    const nombreCompleto = !ciudadano
      ? 'Anónimo'
      : esAnonimo
        ? 'Anónimo'
        : `${ciudadano.firstName} ${ciudadano.firstLastName}`.trim();

    // ESCALAR siempre genera token para que la dependencia/entidad pueda responder via portal
    const externalToken = tipoRespuesta === 'ESCALAR' ? randomUUID() : null;

    let emailSent = false;

    // Intentar enviar email (no bloquea la actualización del caso si falla)
    if (tipoRespuesta !== 'NO_REQUIERE') {
      try {
        let sentToCitizen = false;
        let sentToEntities = false;

        // 1. Enviar al ciudadano si NO está activado "soloEntidad" Y tiene email
        if (!soloEntidad && ciudadano?.email) {
          console.log('📧 Intentando enviar email a:', ciudadano.email);
          console.log('📄 Caso:', caso.filingNumber);
          console.log('📝 Respuesta:', respuesta.substring(0, 100) + '...');
          sentToCitizen = await EmailService.sendCaseResponseEmail(
            tenantName,
            ciudadano.email,
            nombreCompleto,
            caso.filingNumber,
            respuesta.trim(),
            nuevoEstadoCode,
            requiereDias ? diasRespuesta : undefined,
            caso.tenantId
          );
          if (sentToCitizen) {
            console.log('✅ Email enviado exitosamente al ciudadano:', ciudadano.email);
            emailSent = true;
          } else {
            console.log('❌ No se pudo enviar el email al ciudadano');
          }
        } else if (!ciudadano?.email) {
          console.log('🔹 Ciudadano sin email. Continuando sin envío de email al ciudadano.');
          emailSent = true;
        } else {
          console.log('🔹 "soloEntidad" está activado. Verificando si es primera vez para notificar al ciudadano.');
          if (ciudadano?.email) {
            const yaNotificadoReserva = await db.caseStateHistory.findFirst({
              where: { caseId: id, isInternal: true },
              select: { id: true },
            });
            if (!yaNotificadoReserva) {
              await EmailService.sendEscalationNoticeToCitizen(
                tenantName,
                ciudadano.email,
                nombreCompleto,
                caso.filingNumber,
                caso.tenantId,
                escalationReason || undefined,
              );
            } else {
              console.log('🔹 Ya se envió notificación de reserva anteriormente. Se omite.');
            }
          }
          emailSent = true;
        }

        // 2. Enviar a entidades externas/dependencias si se seleccionaron correos
        if (selectedEmails && selectedEmails.length > 0) {
          const origin = request.headers.get('origin');
          const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
          const proto = request.headers.get('x-forwarded-proto') || 'https';
          const baseUrl = origin || (host ? `${proto}://${host}` : await EmailService.getBaseUrlForTenant(caso.tenantId));

          sentToEntities = await EmailService.sendEntityEmail(
            tenantName,
            selectedEmails,
            caso.filingNumber,
            respuesta.trim(),
            nuevoEstado.name,
            {
              ciudadanoNombre: nombreCompleto,
              ciudadanoDocumento: ciudadano?.documentNumber || undefined,
              ciudadanoEmail: ciudadano?.email || undefined,
              ciudadanoTelefono: ciudadano?.phone || undefined,
              tipoCaso: (caso as { caseType?: { name?: string } }).caseType?.name || undefined,
              asunto: caso.subject || undefined,
              fechaRadicado: caso.filedAt
                ? new Date(caso.filedAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
                : undefined,
              baseUrl,
              tenantEmail,
              tenantPhone,
              tenantType,
              externalToken: externalToken || undefined,
              tenantId: caso.tenantId,
            }
          );
          if (sentToEntities) {
            console.log('✅ Email enviado exitosamente a dependencias/entidades:', selectedEmails);
            emailSent = true;
          } else {
            console.log('❌ No se pudo enviar el email a dependencias/entidades');
          }
        }

        if (!emailSent) {
          console.warn('⚠️ No se pudo enviar email, pero se continuará actualizando el caso.');
        }

      } catch (emailError) {
        console.error('❌ Excepción al intentar enviar email (no bloquea actualización):', emailError);
      }
    } else {
      console.log('🔹 Caso finalizado sin respuesta, no se enviará email.');
      emailSent = true;
    }

    // Actualizar el estado del caso y registrar en historial (siempre, independientemente del email)
    await db.$transaction(async (tx) => {
      // 1. Calcular dueDate si requiere días
      let newDueDate = caso.dueDate;
      if (requiereDias && diasRespuesta && diasRespuesta > 0) {
        newDueDate = new Date(Date.now() + diasRespuesta * 24 * 60 * 60 * 1000);
      }

      // 2. Actualizar el estado del caso y metadata si es NO_REQUIERE
      let newMetadata = caso.metadata ? (typeof caso.metadata === 'string' ? JSON.parse(caso.metadata) : caso.metadata) : {};
      
      if (tipoRespuesta === 'NO_REQUIERE') {
        newMetadata = { ...newMetadata, revisorClassification: 'LEIDO' };
      }

      if (tipoRespuesta === 'SOLICITAR_INFO') {
        newMetadata = { ...newMetadata, bloquearRespuestaCiudadano: !ciudadanoPuedeResponder };
      }

      // Añadir al historial internamente en metadatos para rastrear cuándo se pidió la info (opcional, pero útil)
      if (requiereDias && diasRespuesta) {
        newMetadata = { 
          ...newMetadata, 
          ultimaSolicitudDias: diasRespuesta,
          ultimaSolicitudFecha: new Date().toISOString()
        };
      }

      await tx.case.update({
        where: { id },
        data: {
          stateId: nuevoEstado.id,
          metadata: Object.keys(newMetadata).length > 0 ? newMetadata : undefined,
          dueDate: newDueDate,
          respondedAt: new Date(), // Registrar fecha de respuesta del funcionario
          updatedAt: new Date()
        }
      });

      // 3. Registrar en historial de estados
      let expiresAt: Date | null = null;
      if (requiereDias && diasRespuesta && diasRespuesta > 0) {
        expiresAt = new Date(Date.now() + diasRespuesta * 24 * 60 * 60 * 1000);
      }

      await tx.caseStateHistory.create({
        data: {
          tenantId: authResult.user!.tenantId,
          caseId: id,
          fromStateId: caso.stateId,
          toStateId: nuevoEstado.id,
          changedBy: userId,
          comment: respuesta.trim(),
          expiresAt: expiresAt,
          isInternal: soloEntidad,
          externalToken: externalToken ?? undefined,
          reason: tipoRespuesta === 'ESCALAR' && escalationReason ? escalationReason : undefined,
        }
      });

      // 3. Registrar en log de acciones
      await tx.actionLog.create({
        data: {
          caseId: id,
          userId: userId,
          userEmail: authResult.user!.email,
          userRole: authResult.user!.roleCode,
          action: 'CASE_RESPONDED',
          entityType: 'Case',
          entityId: id,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          metadata: {
            fromState: caso.state.code,
            fromStateName: caso.state.name,
            toState: nuevoEstado.code,
            toStateName: nuevoEstado.name,
            responseType: tipoRespuesta,
            response: respuesta.substring(0, 200), // Solo primeros 200 caracteres
          },
          checksum: Buffer.from(JSON.stringify({
            userId,
            action: 'CASE_RESPONDED',
            caseId: id,
            timestamp: new Date().toISOString()
          })).toString('base64').substring(0, 64)
        }
      });
    });

    // Registrar token en índice global para que el portal pueda resolver la BD
    // sin depender del subdominio del request (alcaldiaguacari.ossprobe.store, etc.)
    if (externalToken && tenant?.databaseUrl) {
      await mainPrisma.externalTokenRoute.create({
        data: {
          token: externalToken,
          tenantId: caso.tenantId,
          databaseUrl: tenant.databaseUrl,
          caseId: id,
        }
      });
    }

    console.log('✅ Caso actualizado a estado:', nuevoEstado.name, '- Radicado:', caso.filingNumber);

    return NextResponse.json({
      success: true,
      message: emailSent
        ? `Caso actualizado a ${nuevoEstado.name} y email enviado al ciudadano`
        : `Caso actualizado a ${nuevoEstado.name}. No se pudo enviar el email de notificación.`,
      emailSent,
      newState: nuevoEstado.name,
      newStateCode: nuevoEstado.code
    });

  } catch (error) {
    console.error('❌ Error al finalizar caso:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
