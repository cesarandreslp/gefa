import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { prisma as mainPrisma } from '@/lib/prisma';
import { EmailService } from '@/services/EmailService';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await protectAPIRoute(request, ['DIRECTOR', 'ADMIN']);
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const db = auth.db;
    const { id } = params;
    const body = await request.json();
    const { motivo } = body;

    if (!motivo || !motivo.trim()) {
      return NextResponse.json(
        { error: 'El motivo de rechazo es requerido' },
        { status: 400 }
      );
    }

    const caso = await db.case.findUnique({
      where: { id },
      select: {
        filingNumber: true,
        tenantId: true,
        metadata: true,
        assignments: {
          where: {
            status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
            user: { role: { level: 85 } },
          },
          select: {
            user: { select: { fullName: true, email: true } }
          },
          orderBy: { assignedAt: 'desc' },
          take: 1,
        }
      }
    });

    if (!caso) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    }

    const currentMeta = (caso.metadata as Record<string, unknown>) || {};
    await db.case.update({
      where: { id },
      data: {
        metadata: {
          ...currentMeta,
          pendienteCierre: false,
          motivoRechazo: motivo.trim(),
          cierreRechazado: true,
          cierreRechazadoLeido: false,
          fechaRechazoCierre: new Date().toISOString(),
        }
      }
    });

    const funcionario = caso.assignments?.[0]?.user;
    if (funcionario?.email) {
      const tenant = await mainPrisma.tenant.findUnique({
        where: { id: caso.tenantId },
        select: { name: true }
      });
      const tenantName = tenant?.name || 'GEFA — Gestión Familiar';
      const directorName = auth.user.email;

      await EmailService.sendEmail({
        to: funcionario.email,
        subject: `❌ Cierre rechazado — Radicado ${caso.filingNumber}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
  .content { background-color: #f9f9f9; padding: 25px; border: 1px solid #ddd; border-top: none; }
  .reason-box { background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; border-radius: 0 4px 4px 0; white-space: pre-wrap; }
  .footer { padding: 15px; background-color: #f0f0f0; font-size: 12px; border-top: 2px solid #dc2626; border-radius: 0 0 5px 5px; text-align: center; color: #6b7280; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1 style="margin:0;font-size:20px;">❌ Solicitud de Cierre Rechazada</h1>
    <p style="margin:6px 0 0;font-size:14px;opacity:0.9;">${tenantName}</p>
  </div>
  <div class="content">
    <p>Estimado/a <strong>${funcionario.fullName || funcionario.email}</strong>,</p>
    <p>El Director ha <strong>rechazado</strong> su solicitud de cierre para el caso con radicado <strong>${caso.filingNumber}</strong>.</p>
    <p style="font-weight:600;margin-bottom:4px;">Motivo del rechazo:</p>
    <div class="reason-box">${motivo.trim()}</div>
    <p>El caso continúa en gestión. Por favor revise las indicaciones del Director y continúe el trámite.</p>
  </div>
  <div class="footer">${tenantName} — Sistema de Gestión de Solicitudes</div>
</div>
</body>
</html>`,
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error rechazando cierre:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
