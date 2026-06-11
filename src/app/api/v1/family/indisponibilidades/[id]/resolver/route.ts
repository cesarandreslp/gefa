/**
 * POST /api/v1/family/indisponibilidades/[id]/resolver  (RF‑19).
 * El comisario (DIRECTOR) o el ADMIN AUTORIZA o RECHAZA una solicitud de
 * indisponibilidad. Solo así un profesional queda NO_DISPONIBLE dentro de la
 * jornada. Queda trazado quién resolvió y cuándo.
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { auditFamily } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, ['ADMIN', 'DIRECTOR']);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const body = await request.json();
    const { autorizar, nota } = body;
    if (typeof autorizar !== 'boolean') {
      return NextResponse.json({ error: 'autorizar (boolean) es obligatorio' }, { status: 400 });
    }

    const indis = await db.indisponibilidad.findFirst({
      where: { id: params.id, tenantId: auth.user.tenantId },
      select: { id: true, estado: true, profesionalUserId: true },
    });
    if (!indis) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    if (indis.estado !== 'PENDIENTE') {
      return NextResponse.json({ error: 'La solicitud ya fue resuelta.' }, { status: 409 });
    }

    const updated = await db.indisponibilidad.update({
      where: { id: indis.id },
      data: {
        estado: autorizar ? 'AUTORIZADA' : 'RECHAZADA',
        resueltaPorUserId: auth.user.userId,
        resueltaAt: new Date(),
        notaResolucion: typeof nota === 'string' ? nota.trim() || null : null,
      },
    });

    await auditFamily(db, request, auth.user, autorizar ? 'FAMILY_INDISPONIBILIDAD_AUTORIZADA' : 'FAMILY_INDISPONIBILIDAD_RECHAZADA', 'Indisponibilidad', indis.id, {
      metadata: { profesionalUserId: indis.profesionalUserId },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error resolviendo indisponibilidad:', error);
    return NextResponse.json({ error: 'Error al resolver la solicitud' }, { status: 500 });
  }
}
