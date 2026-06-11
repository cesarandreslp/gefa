/**
 * Helper compartido para diligenciar un instrumento y dejarlo como `Assessment`
 * (valoración confidencial). Lo usan tanto `instrumentos/aplicar` (aplicación
 * directa) como `atenciones/[id]/finalizar` ("Guardar y terminar" del turno,
 * RF‑14), para que el cálculo de puntaje y la creación no diverjan.
 */

import { AssessmentType, RiskLevel, type PrismaClient } from '@prisma/client';
import { computeInstrumentoScore } from '@/lib/instrumentoScoring';

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

export interface AplicarInstrumentoOpts {
  tenantId: string;
  caseId: string;
  instrumentoId: string;
  respuestas: Record<string, unknown>;
  assessedPersonId?: string | null;
  assessorUserId: string;
  /** Profesión del usuario que aplica (para el RBAC por profesión). null = sin restricción (comisario). */
  assessorProfesion?: string | null;
}

export interface AplicarInstrumentoResult {
  ok: boolean;
  status?: number;
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assessment?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  score?: any;
}

/**
 * Carga el instrumento, valida profesión y persona, calcula el puntaje y crea el
 * `Assessment`. Devuelve `{ ok, assessment, score }` o `{ ok:false, status, error }`.
 */
export async function aplicarInstrumentoEnCaso(
  db: PrismaClient,
  opts: AplicarInstrumentoOpts
): Promise<AplicarInstrumentoResult> {
  const instrumento = await db.instrumento.findFirst({
    where: { id: opts.instrumentoId, isActive: true },
    include: { campos: true },
  });
  if (!instrumento) {
    return { ok: false, status: 404, error: 'Instrumento no encontrado o inactivo' };
  }

  // RBAC por profesión: un funcionario con profesión solo aplica instrumentos de
  // su profesión o de AMBOS. El comisario (sin profesión) no tiene restricción.
  if (opts.assessorProfesion && instrumento.profesion !== 'AMBOS' && instrumento.profesion !== opts.assessorProfesion) {
    return {
      ok: false,
      status: 403,
      error: `Este instrumento es de ${instrumento.profesion}; su perfil profesional (${opts.assessorProfesion}) no puede aplicarlo.`,
    };
  }

  if (opts.assessedPersonId) {
    const person = await db.person.findFirst({
      where: { id: opts.assessedPersonId, tenantId: opts.tenantId },
      select: { id: true },
    });
    if (!person) {
      return { ok: false, status: 404, error: 'La persona valorada no existe en la entidad' };
    }
  }

  const score = computeInstrumentoScore(
    instrumento.campos.map((c) => ({ code: c.code, tipo: c.tipo, peso: c.peso, esCritico: c.esCritico, opciones: c.opciones })),
    opts.respuestas,
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
      tenantId: opts.tenantId,
      caseId: opts.caseId,
      assessmentType: (instrumento.assessmentType as AssessmentType) ?? AssessmentType.INTERDISCIPLINARIA,
      findings,
      riskLevel: nivelToRiskLevel(score.nivelCalculado),
      assessedPersonId: opts.assessedPersonId || null,
      assessorUserId: opts.assessorUserId,
      conductedAt: new Date(),
      isConfidential: true,
      instrumentoId: instrumento.id,
      respuestas: opts.respuestas as never,
      scoreDirecto: score.scoreDirecto,
      scorePonderado: score.scorePonderado,
      nivelCalculado: score.nivelCalculado,
    },
    include: {
      assessor: { select: { id: true, fullName: true } },
      instrumento: { select: { id: true, name: true, norma: true, code: true } },
    },
  });

  return { ok: true, assessment, score };
}
