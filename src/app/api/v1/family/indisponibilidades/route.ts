/**
 * Indisponibilidades del equipo (RF‑18/19).
 *  - POST: un profesional SOLICITA quedar no-disponible (motivo + período). Queda PENDIENTE.
 *  - GET:  ADMIN/DIRECTOR ven todas (o por estado); el profesional ve solo las suyas.
 * Nadie se marca no-disponible a mano: requiere autorización del comisario (ver /resolver).
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute, getBaseRoleCode } from '@/lib/auth';
import { auditFamily } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

const SOLICITA_ROLES = ['DIRECTOR', 'FUNCIONARIO'];
const SUPERVISA_ROLES = ['ADMIN', 'DIRECTOR'];

export async function GET(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, [...SUPERVISA_ROLES, 'FUNCIONARIO']);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const roleCode = getBaseRoleCode(auth.user.roleCode);
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado')?.trim();

    const where: Record<string, unknown> = { tenantId: auth.user.tenantId };
    if (estado) where.estado = estado;
    // El profesional (sin supervisión) solo ve sus propias solicitudes.
    if (!SUPERVISA_ROLES.includes(roleCode)) where.profesionalUserId = auth.user.userId;

    const list = await db.indisponibilidad.findMany({ where, orderBy: { solicitadaAt: 'desc' }, take: 100 });

    const uids = [...new Set(list.flatMap((i) => [i.profesionalUserId, i.resueltaPorUserId].filter(Boolean) as string[]))];
    const users = uids.length ? await db.user.findMany({ where: { id: { in: uids } }, select: { id: true, fullName: true } }) : [];
    const nameById = new Map(users.map((u) => [u.id, u.fullName]));

    const data = list.map((i) => ({
      ...i,
      profesionalNombre: nameById.get(i.profesionalUserId) ?? '—',
      resueltaPorNombre: i.resueltaPorUserId ? (nameById.get(i.resueltaPorUserId) ?? '—') : null,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error listando indisponibilidades:', error);
    return NextResponse.json({ error: 'Error al listar las solicitudes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, SOLICITA_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const body = await request.json();
    const { motivo, desde, hasta } = body;

    if (!motivo?.trim() || !desde || !hasta) {
      return NextResponse.json({ error: 'motivo, desde y hasta son obligatorios' }, { status: 400 });
    }
    const d = new Date(desde);
    const h = new Date(hasta);
    if (isNaN(d.getTime()) || isNaN(h.getTime()) || d >= h) {
      return NextResponse.json({ error: 'El período es inválido (desde debe ser anterior a hasta).' }, { status: 400 });
    }

    const indis = await db.indisponibilidad.create({
      data: {
        tenantId: auth.user.tenantId,
        profesionalUserId: auth.user.userId,
        motivo: motivo.trim(),
        desde: d,
        hasta: h,
        estado: 'PENDIENTE',
      },
    });

    await auditFamily(db, request, auth.user, 'FAMILY_INDISPONIBILIDAD_SOLICITADA', 'Indisponibilidad', indis.id, {
      metadata: { desde, hasta },
    });

    return NextResponse.json(indis, { status: 201 });
  } catch (error) {
    console.error('Error creando indisponibilidad:', error);
    return NextResponse.json({ error: 'Error al crear la solicitud' }, { status: 500 });
  }
}
