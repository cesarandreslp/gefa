/**
 * Turnos de atención de un caso (RF‑12).
 *  - POST: la recepción ASIGNA un turno a un profesional libre del equipo.
 *  - GET:  lista los turnos del caso (para el expediente).
 */

import { NextRequest, NextResponse } from 'next/server';
import { ProfesionInstrumento } from '@prisma/client';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_DISPATCH_ROLES, FAMILY_READ_ROLES, findCaseInTenant, auditFamily } from '@/lib/familyApi';
import { seleccionarProfesionalAuto, siguienteNumeroTurno, bogotaDateString } from '@/lib/despacho';

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
    const tenantId = auth.user.tenantId;
    const caseRow = await db.case.findFirst({
      where: { id: params.caseId, tenantId },
      select: { id: true, comisariaId: true, filingNumber: true },
    });
    if (!caseRow) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const { profesionalUserId, instrumentoId, assessedPersonId } = body;
    // Modo automático: sin profesional explícito o con `auto:true`, el sistema lo elige
    // siguiendo el ciclo rotativo (psico→social→jurídico).
    const modoAuto = body.auto === true || !profesionalUserId;

    let prof: { id: string; fullName: string; profesion: ProfesionInstrumento };

    if (modoAuto) {
      const sel = await seleccionarProfesionalAuto(db, { tenantId, comisariaId: caseRow.comisariaId });
      if (!sel.ok) {
        const msg = sel.reason === 'FUERA_HORARIO'
          ? 'Fuera de la jornada laboral: no hay atención disponible en este momento.'
          : 'No hay profesionales libres en este momento (todo el equipo está ocupado o no disponible).';
        return NextResponse.json({ error: msg, reason: sel.reason }, { status: 409 });
      }
      prof = { id: sel.profesionalUserId, fullName: sel.fullName, profesion: sel.profesion };
    } else {
      // Modo manual: el profesional debe existir, estar activo y tener profesión.
      const u = await db.user.findFirst({
        where: { id: profesionalUserId, tenantId, isActive: true },
        select: { id: true, fullName: true, profesion: true },
      });
      if (!u) return NextResponse.json({ error: 'El profesional no existe o está inactivo en la entidad' }, { status: 404 });
      if (!u.profesion) return NextResponse.json({ error: 'El usuario seleccionado no tiene profesión (psicología / trabajo social / jurídico).' }, { status: 400 });
      const ocupado = await db.atencion.findFirst({ where: { profesionalUserId, estado: 'EN_CURSO' }, select: { id: true } });
      if (ocupado) return NextResponse.json({ error: 'Ese profesional ya está atendiendo otro turno (OCUPADO).' }, { status: 409 });
      prof = { id: u.id, fullName: u.fullName, profesion: u.profesion };
    }

    // Número de turno diario (1‑999) que enmascara el radicado — reinicia por día.
    const turnoFecha = bogotaDateString();

    // Crear el turno y reservar el número en una transacción (reduce colisiones de número).
    const atencion = await db.$transaction(async (tx) => {
      // Recomprobar OCUPADO dentro de la transacción (carrera de dos asignaciones).
      const ya = await tx.atencion.findFirst({ where: { profesionalUserId: prof.id, estado: 'EN_CURSO' }, select: { id: true } });
      if (ya) throw new Error('OCUPADO');
      const numeroTurno = await siguienteNumeroTurno(tx as unknown as typeof db, { tenantId, comisariaId: caseRow.comisariaId, turnoFecha });
      return tx.atencion.create({
        data: {
          tenantId,
          caseId: params.caseId,
          profesionalUserId: prof.id,
          profesion: prof.profesion,
          asignadoPorUserId: auth.user!.userId,
          estado: 'EN_CURSO',
          numeroTurno,
          turnoFecha,
          instrumentoId: instrumentoId || null,
          assessedPersonId: assessedPersonId || null,
        },
        select: {
          id: true, estado: true, profesion: true, startedAt: true, numeroTurno: true, turnoFecha: true,
          profesional: { select: { id: true, fullName: true } },
        },
      });
    }).catch((e: unknown) => {
      if (e instanceof Error && e.message === 'OCUPADO') return null;
      throw e;
    });

    if (!atencion) {
      return NextResponse.json({ error: 'Ese profesional acaba de ocuparse. Intente asignar de nuevo.' }, { status: 409 });
    }

    await auditFamily(db, request, auth.user, 'FAMILY_ATENCION_ABIERTA', 'Atencion', atencion.id, {
      caseId: params.caseId,
      metadata: { profesionalUserId: prof.id, profesion: prof.profesion, modoAuto, numeroTurno: atencion.numeroTurno },
    });

    return NextResponse.json({ ...atencion, filingNumber: caseRow.filingNumber }, { status: 201 });
  } catch (error) {
    console.error('Error abriendo atención:', error);
    return NextResponse.json({ error: 'Error al asignar el turno' }, { status: 500 });
  }
}
