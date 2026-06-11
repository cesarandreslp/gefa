/**
 * POST /api/v1/family/atenciones/[id]/finalizar  — "Guardar y terminar" (RF‑14).
 * El profesional asignado cierra su turno: el instrumento diligenciado se promueve
 * a un `Assessment` definitivo, el turno queda FINALIZADO y el profesional se libera
 * (su disponibilidad vuelve a LIBRE porque ya no tiene atención EN_CURSO).
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_CONFIDENTIAL_ROLES, auditFamily } from '@/lib/familyApi';
import { aplicarInstrumentoEnCaso } from '@/lib/instrumentoAssessment';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_CONFIDENTIAL_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;

    const atencion = await db.atencion.findFirst({
      where: { id: params.id, tenantId: auth.user.tenantId },
      select: { id: true, caseId: true, estado: true, profesionalUserId: true },
    });
    if (!atencion) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
    if (atencion.profesionalUserId !== auth.user.userId) {
      return NextResponse.json({ error: 'Este turno pertenece a otro profesional.' }, { status: 403 });
    }
    if (atencion.estado !== 'EN_CURSO') {
      return NextResponse.json({ error: 'El turno ya está finalizado.' }, { status: 409 });
    }

    const body = await request.json();
    const { instrumentoId, respuestas, assessedPersonId } = body;
    if (!instrumentoId || typeof respuestas !== 'object' || respuestas === null) {
      return NextResponse.json({ error: 'instrumentoId y respuestas son obligatorios' }, { status: 400 });
    }

    const me = await db.user.findUnique({ where: { id: auth.user.userId }, select: { profesion: true } });

    const result = await aplicarInstrumentoEnCaso(db, {
      tenantId: auth.user.tenantId,
      caseId: atencion.caseId,
      instrumentoId,
      respuestas: respuestas as Record<string, unknown>,
      assessedPersonId,
      assessorUserId: auth.user.userId,
      assessorProfesion: me?.profesion ?? null,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    const assessment = result.assessment;
    const finalizada = await db.atencion.update({
      where: { id: atencion.id },
      data: {
        estado: 'FINALIZADA',
        endedAt: new Date(),
        assessmentId: assessment.id,
        instrumentoId,
        assessedPersonId: assessedPersonId || null,
      },
      select: { id: true, estado: true, endedAt: true, assessmentId: true },
    });

    await auditFamily(db, request, auth.user, 'FAMILY_ATENCION_FINALIZADA', 'Atencion', atencion.id, {
      caseId: atencion.caseId,
      metadata: { assessmentId: assessment.id, instrumento: assessment.instrumento?.code, nivel: assessment.nivelCalculado },
    });

    return NextResponse.json({ atencion: finalizada, assessment }, { status: 201 });
  } catch (error) {
    console.error('Error finalizando atención:', error);
    return NextResponse.json({ error: 'Error al finalizar el turno' }, { status: 500 });
  }
}
