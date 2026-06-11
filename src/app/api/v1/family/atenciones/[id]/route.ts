/**
 * Turno de atención individual (RF‑13).
 *  - GET:   restaura el borrador (al recargar tras corte de red/luz).
 *  - PATCH: autoguardado del borrador del instrumento en curso.
 * Solo el profesional asignado (o ADMIN/DIRECTOR) opera su turno.
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute, getBaseRoleCode } from '@/lib/auth';
import { FAMILY_CONFIDENTIAL_ROLES } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

const SUPERVISOR_ROLES = ['ADMIN', 'DIRECTOR'];

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_CONFIDENTIAL_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const atencion = await db.atencion.findFirst({
      where: { id: params.id, tenantId: auth.user.tenantId },
      select: {
        id: true, caseId: true, estado: true, profesionalUserId: true, profesion: true,
        instrumentoId: true, assessedPersonId: true, borrador: true, lastAutosaveAt: true,
        startedAt: true, endedAt: true, assessmentId: true,
      },
    });
    if (!atencion) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });

    const roleCode = getBaseRoleCode(auth.user.roleCode);
    const esDueno = atencion.profesionalUserId === auth.user.userId;
    if (!esDueno && !SUPERVISOR_ROLES.includes(roleCode)) {
      return NextResponse.json({ error: 'Este turno pertenece a otro profesional.' }, { status: 403 });
    }

    return NextResponse.json({ data: atencion });
  } catch (error) {
    console.error('Error obteniendo atención:', error);
    return NextResponse.json({ error: 'Error al obtener el turno' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_CONFIDENTIAL_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const atencion = await db.atencion.findFirst({
      where: { id: params.id, tenantId: auth.user.tenantId },
      select: { id: true, estado: true, profesionalUserId: true },
    });
    if (!atencion) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });

    // Autoguardado: solo el profesional asignado, y solo si el turno sigue en curso.
    if (atencion.profesionalUserId !== auth.user.userId) {
      return NextResponse.json({ error: 'Este turno pertenece a otro profesional.' }, { status: 403 });
    }
    if (atencion.estado !== 'EN_CURSO') {
      return NextResponse.json({ error: 'El turno ya está finalizado.' }, { status: 409 });
    }

    const body = await request.json();
    const { borrador, instrumentoId, assessedPersonId } = body;

    const updated = await db.atencion.update({
      where: { id: params.id },
      data: {
        ...(borrador !== undefined ? { borrador: borrador as never } : {}),
        ...(instrumentoId !== undefined ? { instrumentoId: instrumentoId || null } : {}),
        ...(assessedPersonId !== undefined ? { assessedPersonId: assessedPersonId || null } : {}),
        lastAutosaveAt: new Date(),
      },
      select: { id: true, lastAutosaveAt: true },
    });

    return NextResponse.json({ ok: true, lastAutosaveAt: updated.lastAutosaveAt });
  } catch (error) {
    console.error('Error autoguardando atención:', error);
    return NextResponse.json({ error: 'Error al guardar el borrador' }, { status: 500 });
  }
}
