/**
 * ============================================================================
 * CATÁLOGO DE INSTRUMENTOS DE VALORACIÓN (Fase C1)
 * ============================================================================
 * Formatos normados que aplica el equipo interdisciplinario (psicología /
 * trabajo social). Catálogo GLOBAL (se siembra por `code`).
 *
 * ⚠️ CONFORMIDAD NORMATIVA: la ESTRUCTURA de campos de los formatos ICBF aquí
 * definida es una BASE DE TRABAJO derivada de la verificación de garantía de
 * derechos; DEBE validarse y completarse contra el texto oficial de cada formato
 * (F3.G16.P, F5.G16.P) antes de uso en producción. El instrumento de Minjusticia
 * (Resolución 0362 de 2026) se incluye INACTIVO y SIN campos hasta transcribir su
 * estructura oficial. No tratar estos campos como el formato oficial verbatim.
 * ============================================================================
 */

export type CampoTipo = 'TEXTO' | 'TEXTO_LARGO' | 'SELECCION' | 'BOOLEANO' | 'ESCALA' | 'NUMERO' | 'FECHA';

export interface InstrumentoCampoDef {
  code: string;
  seccion: string;
  label: string;
  tipo: CampoTipo;
  opciones?: Array<{ value: string; label: string; score?: number }>;
  ayuda?: string;
  requerido?: boolean;
  orden: number;
  peso?: number;       // puntos si afirmativo (ítems BOOLEANO)
  esCritico?: boolean; // ítem crítico → puede remitir a riesgo alto
}

export interface ScoringCutoff {
  level: string; // BAJO | MEDIO | MODERADO | ALTO | EXTREMO
  min: number;
  max: number;
}

export interface ScoringConfig {
  maxScore?: number;
  criticalToHigh?: boolean; // un ítem crítico afirmativo remite a riesgo alto
  highLevel?: string;       // nivel al que remite un crítico (def. ALTO)
  cutoffs?: ScoringCutoff[];
}

export interface InstrumentoDef {
  code: string;
  name: string;
  norma: string;
  version?: string;
  profesion: 'PSICOLOGIA' | 'TRABAJO_SOCIAL' | 'AMBOS';
  appliesTo?: string | null; // CaseModality
  assessmentType?: string | null; // AssessmentType
  description?: string;
  isActive: boolean;
  displayOrder: number;
  parentCode?: string;          // si pertenece a una batería (code del padre)
  scoringConfig?: ScoringConfig;
  campos: InstrumentoCampoDef[];
}

const NIVEL_RIESGO = [
  { value: 'BAJO', label: 'Bajo' },
  { value: 'MEDIO', label: 'Medio' },
  { value: 'ALTO', label: 'Alto' },
  { value: 'EXTREMO', label: 'Extremo' },
];

export const FAMILY_INSTRUMENTOS: InstrumentoDef[] = [
  // ── ICBF — Valoración psicológica de verificación de derechos (F3.G16.P) ──────
  {
    code: 'ICBF_F3G16P',
    name: 'Valoración psicológica de verificación de derechos',
    norma: 'ICBF F3.G16.P — Verificación de garantía de derechos (Ley 1098/2006)',
    version: 'baseline',
    profesion: 'PSICOLOGIA',
    appliesTo: 'PARD',
    assessmentType: 'PSICOLOGICA',
    description: 'Formato ICBF para la valoración del estado psicológico y emocional del NNA en el marco del PARD. Estructura base — validar contra el formato oficial.',
    isActive: true,
    displayOrder: 10,
    campos: [
      { code: 'motivo', seccion: 'Identificación', label: 'Motivo de la valoración', tipo: 'TEXTO_LARGO', requerido: true, orden: 1 },
      { code: 'estado_emocional', seccion: 'Estado psicológico y emocional', label: 'Estado emocional observado', tipo: 'TEXTO_LARGO', requerido: true, orden: 2 },
      { code: 'afectacion', seccion: 'Estado psicológico y emocional', label: 'Afectación identificada', tipo: 'TEXTO_LARGO', orden: 3 },
      { code: 'vinculos', seccion: 'Dinámica y vínculos', label: 'Vínculos afectivos y dinámica relacional', tipo: 'TEXTO_LARGO', orden: 4 },
      { code: 'nivel_riesgo', seccion: 'Concepto', label: 'Nivel de riesgo', tipo: 'SELECCION', opciones: NIVEL_RIESGO, requerido: true, orden: 5 },
      { code: 'concepto', seccion: 'Concepto', label: 'Concepto profesional', tipo: 'TEXTO_LARGO', requerido: true, orden: 6 },
      { code: 'recomendaciones', seccion: 'Concepto', label: 'Recomendaciones', tipo: 'TEXTO_LARGO', requerido: true, orden: 7 },
    ],
  },

  // ── ICBF — Valoración socio-familiar de verificación de derechos (F5.G16.P) ───
  {
    code: 'ICBF_F5G16P',
    name: 'Valoración socio-familiar de verificación de derechos',
    norma: 'ICBF F5.G16.P — Verificación de garantía de derechos (Ley 1098/2006)',
    version: 'baseline',
    profesion: 'TRABAJO_SOCIAL',
    appliesTo: 'PARD',
    assessmentType: 'TRABAJO_SOCIAL',
    description: 'Formato ICBF para la valoración del contexto socio-familiar del NNA en el marco del PARD. Estructura base — validar contra el formato oficial.',
    isActive: true,
    displayOrder: 20,
    campos: [
      { code: 'composicion_familiar', seccion: 'Grupo familiar', label: 'Composición del grupo familiar', tipo: 'TEXTO_LARGO', requerido: true, orden: 1 },
      { code: 'vivienda', seccion: 'Condiciones socioeconómicas', label: 'Condiciones de habitabilidad / vivienda', tipo: 'TEXTO_LARGO', orden: 2 },
      { code: 'ingresos', seccion: 'Condiciones socioeconómicas', label: 'Fuente de ingresos del hogar', tipo: 'TEXTO', orden: 3 },
      { code: 'visita_realizada', seccion: 'Visita domiciliaria', label: '¿Se realizó visita domiciliaria?', tipo: 'BOOLEANO', orden: 4 },
      { code: 'visita_hallazgos', seccion: 'Visita domiciliaria', label: 'Hallazgos de la visita', tipo: 'TEXTO_LARGO', orden: 5 },
      { code: 'red_apoyo', seccion: 'Factores', label: 'Red de apoyo familiar y social', tipo: 'TEXTO_LARGO', orden: 6 },
      { code: 'factores_protectores', seccion: 'Factores', label: 'Factores protectores', tipo: 'TEXTO_LARGO', orden: 7 },
      { code: 'factores_riesgo', seccion: 'Factores', label: 'Factores de riesgo', tipo: 'TEXTO_LARGO', orden: 8 },
      { code: 'concepto', seccion: 'Concepto', label: 'Concepto profesional', tipo: 'TEXTO_LARGO', requerido: true, orden: 9 },
      { code: 'recomendaciones', seccion: 'Concepto', label: 'Recomendaciones', tipo: 'TEXTO_LARGO', requerido: true, orden: 10 },
    ],
  },

  // ── Minjusticia — Valoración del riesgo de feminicidio (Res. 0362 de 2026) ────
  // INACTIVO y SIN campos: pendiente de transcribir la estructura oficial.
  {
    code: 'MINJUSTICIA_RES0362_2026',
    name: 'Valoración del riesgo de feminicidio en el contexto familiar',
    norma: 'Resolución 0362 de 2026 (Minjusticia) — Ley 2126 de 2021',
    version: 'pendiente',
    profesion: 'AMBOS',
    appliesTo: 'VIOLENCIA_INTRAFAMILIAR',
    assessmentType: 'RIESGO',
    description: 'Instrumento de Minjusticia para comisarías de familia. PENDIENTE de transcribir la estructura oficial (Res. 0362/2026) antes de activarlo.',
    isActive: false,
    displayOrder: 30,
    campos: [],
  },
];
