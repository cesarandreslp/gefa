import { NextRequest, NextResponse } from 'next/server';
import { HearingType } from '@prisma/client';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_WRITE_ROLES, isValidEnum } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// PATCH /api/v1/family/hearings/[id]
// Reprograma, registra la celebración (acta y resultado) o agenda la siguiente.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_WRITE_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const existing = await db.hearing.findFirst({
      where: { id: params.id, tenantId: auth.user.tenantId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Audiencia no encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.scheduledAt !== undefined) data.scheduledAt = new Date(body.scheduledAt);
    if (body.location !== undefined) data.location = body.location || null;
    if (body.isVirtual !== undefined) data.isVirtual = body.isVirtual === true;
    if (body.meetingUrl !== undefined) data.meetingUrl = body.meetingUrl || null;
    if (body.minutes !== undefined) data.minutes = body.minutes || null;
    if (body.outcome !== undefined) data.outcome = body.outcome || null;
    if (body.attendees !== undefined) data.attendees = body.attendees;
    if (body.presidedByUserId !== undefined) data.presidedByUserId = body.presidedByUserId || null;

    // Registrar realización
    if (body.wasHeld === true) {
      data.wasHeld = true;
      data.conductedAt = body.conductedAt ? new Date(body.conductedAt) : new Date();
    } else if (body.wasHeld === false) {
      data.wasHeld = false;
      if (body.notHeldReason !== undefined) data.notHeldReason = body.notHeldReason || null;
    }

    // Agendar siguiente audiencia
    if (body.nextHearingAt !== undefined) {
      data.nextHearingAt = body.nextHearingAt ? new Date(body.nextHearingAt) : null;
    }
    if (body.nextHearingType !== undefined) {
      if (body.nextHearingType !== null && !isValidEnum(HearingType, body.nextHearingType)) {
        return NextResponse.json(
          { error: `nextHearingType inválido. Valores: ${Object.values(HearingType).join(', ')}` },
          { status: 400 }
        );
      }
      data.nextHearingType = body.nextHearingType || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No hay cambios para aplicar' }, { status: 400 });
    }

    const hearing = await db.hearing.update({
      where: { id: params.id },
      data,
      include: { presidedBy: { select: { id: true, fullName: true } } },
    });

    return NextResponse.json(hearing);
  } catch (error) {
    console.error('Error actualizando audiencia:', error);
    return NextResponse.json({ error: 'Error al actualizar la audiencia' }, { status: 500 });
  }
}
