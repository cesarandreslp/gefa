import { NextRequest, NextResponse } from 'next/server';
import { MeasureStatus } from '@prisma/client';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_WRITE_ROLES, isValidEnum, auditFamily } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// PATCH /api/v1/family/measures/[id]
// Actualiza el estado/vigencia de una medida: incumplimiento, revocación,
// renovación, notificación policial. Roles con efecto jurídico.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_WRITE_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const existing = await db.protectionMeasure.findFirst({
      where: { id: params.id, tenantId: auth.user.tenantId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Medida no encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!isValidEnum(MeasureStatus, body.status)) {
        return NextResponse.json(
          { error: `status inválido. Valores: ${Object.values(MeasureStatus).join(', ')}` },
          { status: 400 }
        );
      }
      data.status = body.status;
      // Marcar fecha de incumplimiento automáticamente
      if (body.status === MeasureStatus.INCUMPLIDA && body.violatedAt === undefined) {
        data.violatedAt = new Date();
      }
    }

    if (body.violationNotes !== undefined) data.violationNotes = body.violationNotes || null;
    if (body.violatedAt !== undefined) data.violatedAt = body.violatedAt ? new Date(body.violatedAt) : null;
    if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (body.policeStation !== undefined) data.policeStation = body.policeStation || null;

    // Renovación
    if (body.renew === true) {
      data.renewedAt = new Date();
      data.status = MeasureStatus.VIGENTE;
      if (body.renewalNotes !== undefined) data.renewalNotes = body.renewalNotes || null;
      if (body.expiresAt) data.expiresAt = new Date(body.expiresAt);
    }

    // Notificación policial
    if (body.policeNotified === true) {
      data.policeNotifiedAt = new Date();
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No hay cambios para aplicar' }, { status: 400 });
    }

    const measure = await db.protectionMeasure.update({
      where: { id: params.id },
      data,
      include: { issuedBy: { select: { id: true, fullName: true } } },
    });

    await auditFamily(db, request, auth.user, 'FAMILY_MEASURE_UPDATED', 'ProtectionMeasure', measure.id, { caseId: measure.caseId, metadata: { status: measure.status } });

    return NextResponse.json(measure);
  } catch (error) {
    console.error('Error actualizando medida de protección:', error);
    return NextResponse.json({ error: 'Error al actualizar la medida' }, { status: 500 });
  }
}
