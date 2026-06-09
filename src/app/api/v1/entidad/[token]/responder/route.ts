import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@/lib/tenantDb';
import { prisma as mainPrisma } from '@/lib/prisma';
import { documentService } from '@/services/DocumentService';
import { verifySessionToken } from '@/lib/externalEntitySession';
import { EmailService } from '@/services/EmailService';

/**
 * POST /api/v1/entidad/[token]/responder
 * Recibe la respuesta de la entidad externa y la registra en el historial del caso.
 * Requiere sesión activa obtenida desde POST /api/v1/entidad/[token]/auth
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token || token.length < 10) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    // Validar sesión
    const authHeader = request.headers.get('authorization');
    const sessionToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const session = sessionToken ? verifySessionToken(sessionToken, token) : null;
    if (!session) {
      return NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 });
    }

    // Resolver BD del tenant desde el índice global
    const tokenRoute = await mainPrisma.externalTokenRoute.findUnique({ where: { token } });
    if (!tokenRoute) {
      return NextResponse.json(
        { error: 'El enlace de acceso no es válido o ha expirado.' },
        { status: 404 }
      );
    }
    const db = getTenantPrisma(tokenRoute.databaseUrl);

    // Validar token
    const historial = await db.caseStateHistory.findUnique({
      where: { externalToken: token },
      select: {
        id: true,
        externalTokenUsed: true,
        caseId: true,
        tenantId: true,
        isInternal: true,
        case: {
          select: {
            id: true,
            filingNumber: true,
            stateId: true,
            tenantId: true,
            subject: true,
            assignments: {
              where: { status: 'IN_PROGRESS' },
              select: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    fullName: true,
                  }
                }
              },
              take: 1
            }
          }
        },
        toState: {
          select: { id: true, code: true, name: true }
        }
      }
    });

    if (!historial) {
      return NextResponse.json(
        { error: 'El enlace de acceso no es válido o ha expirado.' },
        { status: 404 }
      );
    }

    // Verificar si el caso ya fue cerrado por el funcionario
    const currentState = await db.case.findUnique({
      where: { id: historial.caseId },
      select: { state: { select: { code: true } }, metadata: true }
    });
    const estadosCerrados = ['CERRADO', 'RESUELTO', 'ARCHIVADO'];
    if (currentState && estadosCerrados.includes(currentState.state.code)) {
      return NextResponse.json(
        { error: 'Este caso ya fue cerrado por el funcionario. No se pueden enviar más respuestas.', casoCerrado: true },
        { status: 410 }
      );
    }

    const formData = await request.formData();
    const respuesta = formData.get('respuesta') as string | null;
    const file = formData.get('file') as File | null;

    if (!respuesta || !respuesta.trim()) {
      return NextResponse.json({ error: 'La respuesta es requerida' }, { status: 400 });
    }

    const caseId = historial.caseId;
    const tenantId = historial.tenantId;
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const ua = request.headers.get('user-agent') || 'unknown';

    const estadoEnTramite = await db.caseState.findFirst({
      where: { code: 'EN_TRAMITE' }
    });

    // Prefijo identificador para que el timeline sepa que es de una entidad externa
    const commentText = `[ENTIDAD_EXTERNA:${session.email}] ${respuesta.trim()}`;

    await db.$transaction(async (tx) => {

      await tx.caseStateHistory.create({
        data: {
          tenantId,
          caseId,
          fromStateId: historial.case.stateId,
          toStateId: estadoEnTramite?.id ?? historial.toState.id,
          changedBy: null,
          comment: commentText,
          isInternal: historial.isInternal,
        }
      });

      if (estadoEnTramite) {
        await tx.case.update({
          where: { id: caseId },
          data: { stateId: estadoEnTramite.id, updatedAt: new Date() }
        });
      }

      await tx.actionLog.create({
        data: {
          tenantId,
          caseId,
          userId: null,
          userEmail: session.email,
          userRole: 'EXTERNAL',
          action: 'EXTERNAL_ENTITY_RESPONSE_SUBMITTED',
          entityType: 'Case',
          entityId: caseId,
          ipAddress: ip,
          userAgent: ua,
          metadata: { filingNumber: historial.case.filingNumber, responseLength: respuesta.trim().length },
          checksum: Buffer.from(JSON.stringify({
            action: 'EXTERNAL_ENTITY_RESPONSE_SUBMITTED',
            caseId,
            timestamp: new Date().toISOString(),
          })).toString('base64').substring(0, 64),
        },
      });
    });

    // Resetear flag de "entidad respondió leída" para que el badge vuelva a aparecer
    const currentMeta = (currentState?.metadata as Record<string, unknown>) || {};
    await db.case.update({
      where: { id: caseId },
      data: { metadata: { ...currentMeta, entidadRespLeida: false } }
    });

    if (file) {
      await documentService.uploadDocument({
        file,
        caseId,
        tenantId,
        userId: 'external-entity',
        userEmail: session.email,
        userRole: 'EXTERNAL',
        documentType: 'OFFICIAL_RESPONSE',
        description: 'Documento enviado por entidad externa',
        isInternal: true,
        ipAddress: ip,
        userAgent: ua,
        db: db as import('@prisma/client').PrismaClient,
      });
    }

    // Enviar notificación al funcionario asignado
    const funcionarioAsignado = historial.case.assignments?.[0]?.user;
    if (funcionarioAsignado?.email) {
      const tenant = await mainPrisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      });
      const tenantName = tenant?.name || 'GEFA — Gestión Familiar';

      try {
        const origin = request.headers.get('origin');
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
        const proto = request.headers.get('x-forwarded-proto') || 'https';
        const baseUrl = origin || (host ? `${proto}://${host}` : await EmailService.getBaseUrlForTenant(historial.tenantId));

        await EmailService.sendEmail({
          to: funcionarioAsignado.email,
          subject: `📬 Respuesta de entidad externa — Radicado ${historial.case.filingNumber}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #d97706; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background-color: #f9f9f9; padding: 25px; border: 1px solid #ddd; border-top: none; }
              .response-box { background-color: #fffbeb; border-left: 4px solid #d97706; padding: 15px; margin: 15px 0; border-radius: 0 4px 4px 0; white-space: pre-wrap; }
              .btn { display: inline-block; background-color: #d97706; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
              .footer { padding: 15px; background-color: #f0f0f0; font-size: 12px; border-top: 2px solid #d97706; border-radius: 0 0 5px 5px; text-align: center; }
            </style></head>
            <body>
            <div class="container">
              <div class="header">
                <h1 style="margin:0;font-size:20px;">🏢 Respuesta de Entidad Externa</h1>
                <p style="margin:6px 0 0;font-size:14px;opacity:0.9;">${tenantName}</p>
              </div>
              <div class="content">
                <p>Estimado/a <strong>${funcionarioAsignado.fullName}</strong>,</p>
                <p>La entidad externa (<strong>${session.email}</strong>) ha respondido al caso con radicado <strong>${historial.case.filingNumber}</strong>.</p>
                <div class="response-box">${respuesta.trim()}</div>
                <div style="text-align:center;margin:20px 0;">
                  <a href="${baseUrl}/home/bandeja-entrada" class="btn">Ver en Bandeja de Entrada →</a>
                </div>
              </div>
              <div class="footer">
                <p><strong>⚠️ Mensaje automático — no responder</strong></p>
                <p>${tenantName} — GEFA — Gestión Familiar</p>
              </div>
            </div>
            </body>
            </html>
          `,
          replyTo: false,
          tenantId,
        });
        console.log(`📧 ✅ Notificación de respuesta de entidad enviada a ${funcionarioAsignado.email}`);
      } catch (emailError) {
        console.error('📧 ❌ Error enviando notificación al funcionario:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Respuesta registrada exitosamente. El funcionario responsable ha sido notificado.'
    });

  } catch (error) {
    console.error('Error en POST /api/v1/entidad/[token]/responder:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
