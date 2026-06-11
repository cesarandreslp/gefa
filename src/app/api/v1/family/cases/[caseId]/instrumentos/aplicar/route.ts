import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_CONFIDENTIAL_ROLES, findCaseInTenant, auditFamily } from '@/lib/familyApi';
import { aplicarInstrumentoEnCaso } from '@/lib/instrumentoAssessment';

export const dynamic = 'force-dynamic';

// POST /api/v1/family/cases/[caseId]/instrumentos/aplicar
// Diligencia un instrumento del catálogo: calcula puntaje/nivel y lo guarda como
// Assessment (valoración confidencial). Lo aplica el equipo interdisciplinario.
export async function POST(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_CONFIDENTIAL_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const caseRow = await findCaseInTenant(db, params.caseId, auth.user.tenantId);
    if (!caseRow) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { instrumentoId, respuestas, assessedPersonId } = body;
    if (!instrumentoId || typeof respuestas !== 'object' || respuestas === null) {
      return NextResponse.json({ error: 'instrumentoId y respuestas son obligatorios' }, { status: 400 });
    }

    const me = await db.user.findUnique({ where: { id: auth.user.userId }, select: { profesion: true } });

    const result = await aplicarInstrumentoEnCaso(db, {
      tenantId: auth.user.tenantId,
      caseId: params.caseId,
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
    await auditFamily(db, request, auth.user, 'FAMILY_INSTRUMENT_APPLIED', 'Assessment', assessment.id, {
      caseId: params.caseId,
      metadata: { instrumento: assessment.instrumento?.code, scorePonderado: assessment.scorePonderado, nivel: assessment.nivelCalculado },
    });

    return NextResponse.json(assessment, { status: 201 });
  } catch (error) {
    console.error('Error aplicando instrumento:', error);
    return NextResponse.json({ error: 'Error al aplicar el instrumento' }, { status: 500 });
  }
}
