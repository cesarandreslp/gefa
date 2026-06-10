/**
 * Cálculo de puntaje y nivel de riesgo de un instrumento diligenciado (Fase C2).
 * Reglas (del manual Res. 0362/2026 y formatos ICBF):
 *  - score directo  = nº de respuestas afirmativas ("Sí") en campos BOOLEANO.
 *  - score ponderado= suma de `peso` por afirmativo (BOOLEANO) + `score` de la
 *    opción elegida (SELECCION/ESCALA).
 *  - nivel: si hay `cutoffs`, se ubica el score directo en la banda (FIR-R usa la
 *    sumatoria de "Sí"); si `criticalToHigh` y algún ítem `esCritico` es afirmativo,
 *    se eleva a `highLevel`. Sin cutoffs (DA-R/C2) → continuo (nivel null).
 */

type Campo = {
  code: string;
  tipo: string;
  peso: number | null;
  esCritico: boolean;
  opciones: unknown;
};

type Cutoff = { level: string; min: number; max: number };
type ScoringConfig = {
  maxScore?: number;
  criticalToHigh?: boolean;
  highLevel?: string;
  cutoffs?: Cutoff[];
} | null | undefined;

export interface InstrumentoScore {
  scoreDirecto: number;
  scorePonderado: number;
  nivelCalculado: string | null;
  criticosActivos: string[]; // codes de ítems críticos afirmativos
}

function esAfirmativo(value: unknown): boolean {
  return value === true || value === 'true' || value === 'SI' || value === 'Sí' || value === 'si';
}

function optionScore(opciones: unknown, value: unknown): number | null {
  if (!Array.isArray(opciones)) return null;
  const opt = (opciones as Array<{ value?: string; score?: number }>).find((o) => o?.value === value);
  return typeof opt?.score === 'number' ? opt.score : null;
}

export function computeInstrumentoScore(
  campos: Campo[],
  respuestas: Record<string, unknown>,
  scoringConfig: ScoringConfig
): InstrumentoScore {
  let scoreDirecto = 0;
  let scorePonderado = 0;
  const criticosActivos: string[] = [];

  for (const campo of campos) {
    const value = respuestas[campo.code];
    if (value === undefined || value === null || value === '') continue;

    if (campo.tipo === 'BOOLEANO') {
      if (esAfirmativo(value)) {
        scoreDirecto += 1;
        scorePonderado += campo.peso ?? 1;
        if (campo.esCritico) criticosActivos.push(campo.code);
      }
    } else if (campo.tipo === 'SELECCION' || campo.tipo === 'ESCALA') {
      const s = optionScore(campo.opciones, value);
      if (s !== null) {
        scorePonderado += s;
        if (s > 0) scoreDirecto += 1;
      }
    }
  }

  let nivelCalculado: string | null = null;
  const cutoffs = scoringConfig?.cutoffs;
  if (Array.isArray(cutoffs) && cutoffs.length > 0) {
    // FIR-R: la banda se ubica por la sumatoria de "Sí" (score directo == ponderado si peso=1).
    const base = scorePonderado;
    const band = cutoffs.find((c) => base >= c.min && base <= c.max);
    nivelCalculado = band?.level ?? null;
    if (scoringConfig?.criticalToHigh && criticosActivos.length > 0) {
      nivelCalculado = scoringConfig.highLevel ?? 'ALTO';
    }
  }

  return { scoreDirecto, scorePonderado, nivelCalculado, criticosActivos };
}
