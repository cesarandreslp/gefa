/**
 * Pre-informe consolidado por IA del caso (Fase C4). Integra los informes
 * preliminares de los instrumentos diligenciados (Fase C3) y sus puntajes/niveles
 * en un BORRADOR único del caso. Se ANONIMIZA antes de enviar a la IA. El borrador
 * NO tiene peso procesal: lo edita el equipo y lo aprueba la autoridad (Fase C5).
 */
import { PrismaClient } from '@prisma/client';
import { callAI, aiIsConfigured } from './aiClient';
import { anonymize } from '@/lib/anonymize';

const SYSTEM_PROMPT = `Eres el equipo interdisciplinario de una comisaría de familia en Colombia. Tu tarea es redactar un PRE-INFORME CONSOLIDADO (borrador) del caso, integrando los informes preliminares y los resultados de los distintos instrumentos de valoración ya diligenciados.

Reglas estrictas:
- Básate ÚNICAMENTE en los insumos provistos; NO inventes hechos, antecedentes ni cifras.
- NO incluyas datos identificables (nombres, documentos, direcciones, teléfonos); usa "la persona valorada", "el presunto agresor", "los NNA", etc.
- Integra el RELATO inicial (descripción preliminar, versión del querellante y descargos del querellado) con los hallazgos de los instrumentos del equipo (psicología, trabajo social, jurídico); contrasta AMBAS versiones y señala convergencias y discrepancias en el nivel de riesgo.
- Respeta el debido proceso y la presunción: presenta los descargos del querellado de forma objetiva; no afirmes responsabilidades como hechos probados.
- Lenguaje técnico, claro y respetuoso, con enfoque de género, diferencial y de derechos.
- Estructura el pre-informe en: (1) Síntesis integral del caso, (2) Nivel de riesgo consolidado y su justificación, (3) Factores de riesgo y factores protectores, (4) Recomendaciones de protección, atención y seguimiento.
- Cierra indicando que es un BORRADOR consolidado, sin peso procesal, sujeto a revisión y aprobación de la autoridad competente (comisario/a de familia).`;

export async function generateConsolidatedReport(
  db: PrismaClient,
  caseId: string,
  tenantId: string
): Promise<{ ok: boolean; draft?: string; error?: string }> {
  const caseRow = await db.case.findFirst({
    where: { id: caseId, tenantId },
    select: { id: true, description: true, descripcionPreliminar: true, descargosQuerellado: true },
  });
  if (!caseRow) return { ok: false, error: 'Caso no encontrado' };

  // Config IA del tenant
  const settings = await db.tenantSettings.findUnique({
    where: { tenantId },
    select: { aiProvider: true, aiApiKey: true, aiModel: true, groqApiKey: true },
  });
  const cfg = {
    provider: settings?.aiProvider, apiKey: settings?.aiApiKey,
    model: settings?.aiModel, groqApiKey: settings?.groqApiKey,
  };
  if (!aiIsConfigured(cfg)) {
    return { ok: false, error: 'IA no configurada para esta entidad. Configure el proveedor y la API key en Entidad → Integración IA.' };
  }

  // Valoraciones con instrumento aplicado (las que aportan puntaje/nivel/informe)
  const assessments = await db.assessment.findMany({
    where: { caseId, tenantId, instrumentoId: { not: null } },
    include: { instrumento: { select: { name: true, norma: true } } },
    orderBy: { conductedAt: 'asc' },
  });
  if (assessments.length === 0) {
    return { ok: false, error: 'No hay valoraciones con instrumento aplicado para consolidar. Aplique al menos un instrumento (C2) antes de consolidar.' };
  }

  // Nombres de las partes para anonimizar el contenido enviado
  const parties = await db.caseParty.findMany({
    where: { caseId, tenantId },
    include: { person: { select: { firstName: true, secondName: true, firstLastName: true, secondLastName: true } } },
  });
  const nombres = parties.flatMap((p) => [p.person?.firstName, p.person?.secondName, p.person?.firstLastName, p.person?.secondLastName].filter(Boolean) as string[]);

  const bloques = assessments.map((a, i) => {
    const partes = [
      `Instrumento ${i + 1}: ${a.instrumento?.name ?? '—'} (${a.instrumento?.norma ?? 's/n'})`,
      `Puntaje directo: ${a.scoreDirecto ?? 0} · ponderado: ${a.scorePonderado ?? 0} · nivel: ${a.nivelCalculado ?? 'continuo (sin bandas fijas)'} · riesgo registrado: ${a.riskLevel}`,
    ];
    if (a.informePreliminar) partes.push(`Informe preliminar del instrumento:\n${a.informePreliminar}`);
    else partes.push(`Hallazgos: ${a.findings}`);
    return partes.join('\n');
  });

  // Relato inicial (paso 1): descripción preliminar del auxiliar + descripción de los hechos.
  const relato: string[] = [];
  if (caseRow.descripcionPreliminar?.trim()) relato.push(`Descripción preliminar (primer contacto, paso 1):\n${caseRow.descripcionPreliminar.trim()}`);
  if (caseRow.description?.trim()) relato.push(`Descripción de los hechos / versión del querellante:\n${caseRow.description.trim()}`);
  // Versión del querellado (descargos) — debido proceso: el informe contempla ambas partes.
  if (caseRow.descargosQuerellado?.trim()) relato.push(`Descargos / versión del querellado:\n${caseRow.descargosQuerellado.trim()}`);
  const bloqueRelato = relato.length ? `RELATO INICIAL DEL CASO (ambas partes):\n\n${relato.join('\n\n')}\n\n---\n\n` : '';

  const userPrompt = anonymize(
    `${bloqueRelato}INSUMOS DEL EQUIPO (${assessments.length} instrumento(s) diligenciado(s)):\n\n${bloques.join('\n\n---\n\n')}\n\nRedacta el pre-informe consolidado del caso integrando el relato inicial con los hallazgos del equipo.`,
    nombres
  );

  try {
    const draft = await callAI(cfg, { system: SYSTEM_PROMPT, user: userPrompt, maxTokens: 2000 });
    if (!draft) return { ok: false, error: 'La IA no devolvió contenido' };
    return { ok: true, draft };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error al generar el pre-informe' };
  }
}
