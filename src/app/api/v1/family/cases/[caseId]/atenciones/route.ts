/**
 * Turnos de atención de un caso (RF‑12).
 *  - POST: la recepción ASIGNA un turno a un profesional libre del equipo.
 *  - GET:  lista los turnos del caso (para el expediente).
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_DISPATCH_ROLES, FAMILY_READ_ROLES, findCaseInTenant, auditFamily } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// GET /api/v1/family/cases/[caseId]/atenciones
export async function GET(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_READ_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const caseRow = await findCaseInTenant(db, params.caseId, auth.user.tenantId);
    if (!caseRow) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });

    const atenciones = await db.atencion.findMany({
      where: { caseId: params.caseId, tenantId: auth.user.tenantId },
      select: {
        id: true, estado: true, profesion: true, startedAt: true, endedAt: true,
        profesional: { select: { id: true, fullName: true } },
        instrumento: { select: { id: true, name: true } },
        assessmentId: true,
      },
      orderBy: { startedAt: 'desc' },
    });
    return NextResponse.json({ data: atenciones });
  } catch (error) {
    console.error('Error listando atenciones:', error);
    return NextResponse.json({ error: 'Error al listar los turnos' }, { status: 500 });
  }
}

// POST /api/v1/family/cases/[caseId]/atenciones
export async function POST(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_DISPATCH_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const caseRow = await findCaseInTenant(db, params.caseId, auth.user.tenantId);
    if (!caseRow) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });

    const body = await request.json();
    const { profesionalUserId, instrumentoId, assessedPersonId } = body;
    if (!profesionalUserId) {
      return NextResponse.json({ error: 'profesionalUserId es obligatorio' }, { status: 400 });
    }

    // El profesional debe existir en el tenant, estar activo y tener profesión
    // (solo el equipo interdisciplinario atiende turnos del paso 2).
    const prof = await db.user.findFirst({
      where: { id: profesionalUserId, tenantId: auth.user.tenantId, isActive: true },
      select: { id: true, fullName: true, profesion: true },
    });
    if (!prof) {
      return NextResponse.json({ error: 'El profesional no existe o está inactivo en la entidad' }, { status: 404 });
    }
    if (!prof.profesion) {
      return NextResponse.json({ error: 'El usuario seleccionado no tiene profesión (psicología / trabajo social / jurídico).' }, { status: 400 });
    }

    // Disponibilidad: un profesional no puede tener dos turnos en curso a la vez.
    const ocupado = await db.atencion.findFirst({
      where: { profesionalUserId, estado: 'EN_CURSO' },
      select: { id: true },
    });
    if (ocupado) {
      return NextResponse.json({ error: 'Ese profesional ya está atendiendo otro turno (OCUPADO).' }, { status: 409 });
    }

    const atencion = await db.atencion.create({
      data: {
        tenantId: auth.user.tenantId,
        caseId: params.caseId,
        profesionalUserId: prof.id,
        profesion: prof.profesion,
        asignadoPorUserId: auth.user.userId,
        estado: 'EN_CURSO',
        instrumentoId: instrumentoId || null,
        assessedPersonId: assessedPersonId || null,
      },
      select: {
        id: true, estado: true, profesion: true, startedAt: true,
        profesional: { select: { id: true, fullName: true } },
      },
    });

    await auditFamily(db, request, auth.user, 'FAMILY_ATENCION_ABIERTA', 'Atencion', atencion.id, {
      caseId: params.caseId,
      metadata: { profesionalUserId: prof.id, profesion: prof.profesion },
    });

    return NextResponse.json(atencion, { status: 201 });
  } catch (error) {
    console.error('Error abriendo atención:', error);
    return NextResponse.json({ error: 'Error al asignar el turno' }, { status: 500 });
  }
}
