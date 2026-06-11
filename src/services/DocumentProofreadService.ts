/**
 * Corrección de redacción/gramática/ortografía de un documento del despacho por IA.
 * Reutiliza el cliente IA multiproveedor y la config por tenant (igual que
 * InstrumentReportService). A diferencia del informe de instrumento, aquí NO se
 * anonimiza: el documento jurídico lleva nombres y datos reales y deben conservarse.
 * Tratamiento de datos: corre con el proveedor que el tenant configuró (Ley 1581).
 *
 * Regla dura: la IA corrige FORMA, nunca el FONDO. No agrega ni quita hechos,
 * cifras, nombres, fechas ni efectos jurídicos; preserva la estructura HTML.
 */
import { PrismaClient } from '@prisma/client';
import { callAI, aiIsConfigured } from './aiClient';

const SYSTEM_PROMPT = `Eres un corrector de estilo de documentos jurídicos de una comisaría de familia en Colombia. Recibes el contenido de un documento en HTML y devuelves el MISMO documento con la redacción, gramática y ortografía corregidas.

Reglas estrictas:
- Corrige SOLO la forma: ortografía, tildes, puntuación, concordancia, conectores y claridad.
- NO cambies el sentido jurídico, NI agregues o elimines hechos, nombres, cifras, fechas, artículos de ley ni decisiones.
- NO inventes contenido ni completes vacíos. Si algo está incompleto, déjalo como está.
- CONSERVA las etiquetas HTML y la estructura (párrafos, listas, negritas, saltos). No agregues estilos nuevos.
- Conserva los marcadores entre corchetes como [algo] tal cual (son campos sin diligenciar).
- Mantén el registro formal y el enfoque de derechos.
- Devuelve ÚNICAMENTE el HTML corregido, sin explicaciones, sin envolverlo en bloques de código.`;

export async function proofreadDocumentHtml(
  db: PrismaClient,
  tenantId: string,
  html: string
): Promise<{ ok: boolean; corrected?: string; error?: string }> {
  if (!html || !html.trim()) return { ok: false, error: 'El documento está vacío' };

  const settings = await db.tenantSettings.findUnique({
    where: { tenantId },
    select: { aiProvider: true, aiApiKey: true, aiModel: true, groqApiKey: true },
  });
  const cfg = {
    provider: settings?.aiProvider, apiKey: settings?.aiApiKey,
    model: settings?.aiModel, groqApiKey: settings?.groqApiKey,
  };
  if (!aiIsConfigured(cfg)) {
    return { ok: false, error: 'IA no configurada para esta entidad. Configúrela en Entidad → Integración IA.' };
  }

  try {
    const corrected = await callAI(cfg, {
      system: SYSTEM_PROMPT,
      user: `Corrige este documento (devuelve solo el HTML corregido):\n\n${html}`,
      maxTokens: 4000,
      temperature: 0.2,
    });
    if (!corrected) return { ok: false, error: 'La IA no devolvió contenido' };
    return { ok: true, corrected: stripCodeFence(corrected) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error al corregir el documento' };
  }
}

/** Quita un eventual ```html ... ``` que algunos modelos añaden pese a la instrucción. */
function stripCodeFence(s: string): string {
  const trimmed = s.trim();
  const fence = /^```(?:html)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fence ? fence[1].trim() : trimmed;
}
