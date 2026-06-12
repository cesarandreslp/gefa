/**
 * Informe final compilado (decisión del comisario). Integra en un solo informe el
 * pre-informe consolidado del equipo (que ya incluye el relato inicial y los
 * instrumentos) con la VERSIÓN DE LOS HECHOS del comisario. Reutiliza el cliente IA
 * y la config por tenant. No se anonimiza: es el informe oficial del comisario.
 */
import { PrismaClient } from '@prisma/client';
import { callAI, aiIsConfigured } from './aiClient';

const SYSTEM_PROMPT = `Eres el/la comisario/a de familia en Colombia. Tu tarea es redactar el INFORME FINAL del caso, compilando en un solo documento coherente dos insumos: (1) el pre-informe consolidado del equipo interdisciplinario y (2) la versión de los hechos del comisario.

Reglas estrictas:
- Básate ÚNICAMENTE en los dos insumos provistos; NO inventes hechos, antecedentes ni cifras.
- Integra ambas miradas: la técnica del equipo y la valoración de la autoridad; señala coincidencias y, si las hay, diferencias de criterio.
- Lenguaje jurídico-técnico, claro y respetuoso, con enfoque de género, diferencial y de derechos.
- Estructura: (1) Antecedentes y versión de los hechos, (2) Síntesis técnica del equipo y nivel de riesgo, (3) Valoración integral del comisario, (4) Determinaciones y recomendaciones de protección, atención y seguimiento.
- Es el informe de la autoridad; redáctalo en consecuencia, sin disclaimers de "borrador".`;

export async function compileFinalReport(
  db: PrismaClient,
  caseId: string,
  tenantId: string
): Promise<{ ok: boolean; report?: string; error?: string }> {
  const caseRow = await db.case.findFirst({
    where: { id: caseId, tenantId },
    select: { id: true, preInformeConsolidado: true, versionHechosComisario: true, preInformeEstado: true },
  });
  if (!caseRow) return { ok: false, error: 'Caso no encontrado' };
  if (!caseRow.preInformeConsolidado?.trim()) {
    return { ok: false, error: 'No hay pre-informe consolidado del equipo para compilar. Genérelo y apruébelo primero.' };
  }
  if (!caseRow.versionHechosComisario?.trim()) {
    return { ok: false, error: 'Registre primero la versión de los hechos del comisario.' };
  }

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
    return { ok: false, error: 'IA no configurada para esta entidad. Configúrela en Entidad → Integración IA.' };
  }

  const userPrompt = `INSUMO 1 — PRE-INFORME CONSOLIDADO DEL EQUIPO:\n\n${caseRow.preInformeConsolidado.trim()}\n\n---\n\nINSUMO 2 — VERSIÓN DE LOS HECHOS DEL COMISARIO:\n\n${caseRow.versionHechosComisario.trim()}\n\n---\n\nRedacta el informe final compilando ambos insumos.`;

  try {
    const report = await callAI(cfg, { system: SYSTEM_PROMPT, user: userPrompt, maxTokens: 2600, temperature: 0.3 });
    if (!report) return { ok: false, error: 'La IA no devolvió contenido' };
    return { ok: true, report };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error al compilar el informe final' };
  }
}
