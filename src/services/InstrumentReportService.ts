/**
 * Generación del informe preliminar por IA a partir de un instrumento diligenciado
 * (Fase C3). Arma un resumen de respuestas + puntaje, lo ANONIMIZA y pide a la IA
 * un BORRADOR de informe. El borrador no tiene peso procesal: lo edita el
 * profesional y luego lo aprueba la autoridad (Fase C5).
 */
import { PrismaClient } from '@prisma/client';
import { callAI, aiIsConfigured } from './aiClient';
import { anonymize } from '@/lib/anonymize';

const SYSTEM_PROMPT = `Eres un profesional del equipo interdisciplinario de una comisaría de familia en Colombia (psicología / trabajo social). Tu tarea es redactar un INFORME PRELIMINAR (borrador) que interprete el resultado de un instrumento de valoración de riesgo YA diligenciado.

Reglas estrictas:
- Básate ÚNICAMENTE en los datos provistos; NO inventes hechos, antecedentes ni cifras.
- NO incluyas datos identificables (nombres, documentos, direcciones); usa "la persona valorada", "el presunto agresor", etc.
- Lenguaje técnico, claro y respetuoso, con enfoque de género y de derechos.
- Estructura el informe en: (1) Síntesis del resultado, (2) Factores de riesgo identificados, (3) Factores protectores, (4) Recomendaciones de protección y seguimiento.
- Cierra indicando que es un BORRADOR preliminar sujeto a revisión y aprobación de la autoridad competente (comisario/a de familia).`;

export async function generateInstrumentReport(
  db: PrismaClient,
  assessmentId: string,
  tenantId: string
): Promise<{ ok: boolean; draft?: string; error?: string }> {
  const a = await db.assessment.findFirst({
    where: { id: assessmentId, tenantId },
    include: { instrumento: { include: { campos: { orderBy: { orden: 'asc' } } } } },
  });
  if (!a) return { ok: false, error: 'Valoración no encontrada' };
  if (!a.instrumento) return { ok: false, error: 'La valoración no tiene un instrumento aplicado' };

  // Config IA del tenant
  const settings = await db.tenantSettings.findUnique({
    where: { tenantId },
    select: { aiProvider: true, aiApiKey: true, aiModel: true, groqApiKey: true, aiProviderSecondary: true, aiApiKeySecondary: true, aiModelSecondary: true },
  });
  const cfg = {
    provider: settings?.aiProvider, apiKey: settings?.aiApiKey,
    model: settings?.aiModel, groqApiKey: settings?.groqApiKey,
    providerSecondary: settings?.aiProviderSecondary, apiKeySecondary: settings?.aiApiKeySecondary, modelSecondary: settings?.aiModelSecondary,
  };
  if (!aiIsConfigured(cfg)) {
    return { ok: false, error: 'IA no configurada para esta entidad. Configure el proveedor y la API key en Entidad → Integración IA.' };
  }

  // Nombres de las partes para anonimizar el contenido enviado
  const parties = await db.caseParty.findMany({
    where: { caseId: a.caseId, tenantId },
    include: { person: { select: { firstName: true, secondName: true, firstLastName: true, secondLastName: true } } },
  });
  const nombres = parties.flatMap((p) => [p.person?.firstName, p.person?.secondName, p.person?.firstLastName, p.person?.secondLastName].filter(Boolean) as string[]);

  // Resumen de respuestas (campo → valor legible)
  const resp = (a.respuestas ?? {}) as Record<string, unknown>;
  const legible = (tipo: string, v: unknown) => {
    if (v === true || v === 'true') return 'Sí';
    if (v === false || v === 'false') return 'No';
    return String(v ?? '—');
  };
  const lineas = a.instrumento.campos
    .filter((c) => resp[c.code] !== undefined && resp[c.code] !== '' && resp[c.code] !== null)
    .map((c) => `- ${c.label}${c.esCritico ? ' (ítem crítico)' : ''}: ${legible(c.tipo, resp[c.code])}`);

  const max = (a.instrumento.scoringConfig as { maxScore?: number } | null)?.maxScore;
  const userPrompt = anonymize(
    `Instrumento: ${a.instrumento.name} (${a.instrumento.norma}).
Puntaje directo: ${a.scoreDirecto ?? 0} · ponderado: ${a.scorePonderado ?? 0}${max ? `/${max}` : ''}.
Nivel calculado: ${a.nivelCalculado ?? 'interpretación de continuo (sin bandas fijas)'}.

Respuestas registradas:
${lineas.join('\n')}

Redacta el informe preliminar.`,
    nombres
  );

  try {
    const draft = await callAI(cfg, { system: SYSTEM_PROMPT, user: userPrompt, maxTokens: 1400 });
    if (!draft) return { ok: false, error: 'La IA no devolvió contenido' };
    return { ok: true, draft };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error al generar el informe' };
  }
}
