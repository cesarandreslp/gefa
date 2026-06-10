import { NextRequest, NextResponse } from 'next/server';
import { AssessmentType, RiskLevel } from '@prisma/client';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_CONFIDENTIAL_ROLES, findCaseInTenant, auditFamily } from '@/lib/familyApi';
import { computeInstrumentoScore } from '@/lib/instrumentoScoring';

export const dynamic = 'force-dynamic';

// Nivel propio del instrumento (BAJO/MODERADO/ALTO) → enum RiskLevel del expediente.
function nivelToRiskLevel(nivel: string | null): RiskLevel {
  switch (nivel) {
    case 'ALTO': return RiskLevel.ALTO;
    case 'EXTREMO': return RiskLevel.EXTREMO;
    case 'MODERADO':
    case 'MEDIO': return RiskLevel.MEDIO;
    case 'BAJO': return RiskLevel.BAJO;
    default: return RiskLevel.BAJO;
  }
}

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

    const instrumento = await db.instrumento.findFirst({
      where: { id: instrumentoId, isActive: true },
      include: { campos: true },
    });
    if (!instrumento) {
      return NextResponse.json({ error: 'Instrumento no encontrado o inactivo' }, { status: 404 });
    }

    if (assessedPersonId) {
      const person = await db.person.findFirst({
        where: { id: assessedPersonId, tenantId: auth.user.tenantId },
        select: { id: true },
      });
      if (!person) {
        return NextResponse.json({ error: 'La persona valorada no existe en la entidad' }, { status: 404 });
      }
    }

    const score = computeInstrumentoScore(
      instrumento.campos.map((c) => ({ code: c.code, tipo: c.tipo, peso: c.peso, esCritico: c.esCritico, opciones: c.opciones })),
      respuestas as Record<string, unknown>,
      instrumento.scoringConfig as never
    );

    const max = (instrumento.scoringConfig as { maxScore?: number } | null)?.maxScore;
    const findings =
      `Instrumento aplicado: ${instrumento.name} (${instrumento.norma}). ` +
      `Puntaje directo: ${score.scoreDirecto} · ponderado: ${score.scorePonderado}${max ? `/${max}` : ''}` +
      `${score.nivelCalculado ? ` · nivel: ${score.nivelCalculado}` : ' · interpretación de continuo'}.` +
      `${score.criticosActivos.length > 0 ? ` Ítems críticos afirmativos: ${score.criticosActivos.length}.` : ''}`;

    const assessment = await db.assessment.create({
      data: {
        tenantId: auth.user.tenantId,
        caseId: params.caseId,
        assessmentType: (instrumento.assessmentType as AssessmentType) ?? AssessmentType.INTERDISCIPLINARIA,
        findings,
        riskLevel: nivelToRiskLevel(score.nivelCalculado),
        assessedPersonId: assessedPersonId || null,
        assessorUserId: auth.user.userId,
        conductedAt: new Date(),
        isConfidential: true,
        instrumentoId: instrumento.id,
        respuestas: respuestas as never,
        scoreDirecto: score.scoreDirecto,
        scorePonderado: score.scorePonderado,
        nivelCalculado: score.nivelCalculado,
      },
      include: {
        assessor: { select: { id: true, fullName: true } },
        instrumento: { select: { id: true, name: true, norma: true } },
      },
    });

    await auditFamily(db, request, auth.user, 'FAMILY_INSTRUMENT_APPLIED', 'Assessment', assessment.id, {
      caseId: params.caseId,
      metadata: { instrumento: instrumento.code, scorePonderado: score.scorePonderado, nivel: score.nivelCalculado },
    });

    return NextResponse.json(assessment, { status: 201 });
  } catch (error) {
    console.error('Error aplicando instrumento:', error);
    return NextResponse.json({ error: 'Error al aplicar el instrumento' }, { status: 500 });
  }
}
