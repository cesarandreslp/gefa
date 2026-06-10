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

  // ── Minjusticia — Batería de valoración del riesgo de feminicidio (Res. 0362/2026) ──
  // Contenedor (sin campos). Los sub-instrumentos (FIR-R, DA-R, C2) son sus hijos; el
  // profesional aplica el que corresponda según el tipo de relación.
  {
    code: 'MINJUSTICIA_RES0362_2026',
    name: 'Valoración del riesgo de feminicidio en el contexto familiar (batería)',
    norma: 'Resolución 0362 de 2026 (Minjusticia) — Ley 2126 de 2021',
    version: 'V.1.0',
    profesion: 'AMBOS',
    appliesTo: 'VIOLENCIA_INTRAFAMILIAR',
    assessmentType: 'RIESGO',
    description: 'Batería oficial de Minjusticia para comisarías: Caracterización + entrevista semiestructurada + instrumento de riesgo según tipo de relación (FIR-R heterosexual / DA-R parejas de mujeres / C2 cohabitación-cuidado) + concepto técnico. Es contenedor: aplicar el sub-instrumento que corresponda.',
    isActive: false, // contenedor: no se diligencia directamente
    displayOrder: 30,
    campos: [],
  },

  // ── FIR-R — Formato de Identificación del Riesgo Revisado (Fiscalía) ─────────
  // Hijo de la batería Res.0362/2026. Pareja/expareja heterosexual. 22 ítems Sí/No
  // (1 punto por "Sí"); cortes: bajo 0–10, moderado 11–15, alto 16–22.
  // IP: derechos patrimoniales del FIR-R = Fiscalía General de la Nación (adoptado por la Res.).
  // PENDIENTE: el manual menciona "ítems críticos" (afirmativo → alto) pero no los enumera.
  {
    code: 'RES0362_FIRR',
    name: 'FIR-R — Formato de Identificación del Riesgo Revisado',
    norma: 'FIR-R (Fiscalía General de la Nación) — adoptado por Res. 0362/2026, Ley 2126/2021',
    version: 'Revisado',
    profesion: 'AMBOS',
    appliesTo: 'VIOLENCIA_INTRAFAMILIAR',
    assessmentType: 'RIESGO',
    description: 'Pareja o expareja heterosexual. 22 ítems Sí/No agrupados en 3 factores. Población: mujeres (cis y trans) mayores de 14 años.',
    isActive: true,
    displayOrder: 31,
    parentCode: 'MINJUSTICIA_RES0362_2026',
    scoringConfig: {
      maxScore: 22,
      criticalToHigh: true,
      highLevel: 'ALTO',
      cutoffs: [
        { level: 'BAJO', min: 0, max: 10 },
        { level: 'MODERADO', min: 11, max: 15 },
        { level: 'ALTO', min: 16, max: 22 },
      ],
    },
    campos: [
      // Factor 1 — Percepción de victimización por violencia psicológica (control/coerción): ítems 3,4,6,7,8,9,11
      // Factor 2 — Percepción de riesgo contra sí misma y terceros: ítems 1,2,5,10,12,13,20,21,22
      // Factor 3 — Percepción de victimización por violencia física y sexual: ítems 14,15,16,17,18,19
      { code: 'fir_01', seccion: 'Factor 2 — Riesgo contra sí misma y terceros', label: '¿El denunciado tiene consumo problemático de alcohol o de otras sustancias psicoactivas (marihuana, cocaína, anfetaminas, inhalantes, sedantes, alucinógenos, etc.)?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 1 },
      { code: 'fir_02', seccion: 'Factor 2 — Riesgo contra sí misma y terceros', label: '¿El denunciado tiene comportamientos violentos como gritos, insultos o golpes hacia otras personas?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 2 },
      { code: 'fir_03', seccion: 'Factor 1 — Violencia psicológica (control/coerción)', label: '¿El denunciado es una persona celosa o controladora con usted?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 3 },
      { code: 'fir_04', seccion: 'Factor 1 — Violencia psicológica (control/coerción)', label: '¿El denunciado hace o dice cosas para humillarla, ofenderla o ignorarla?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 4 },
      { code: 'fir_05', seccion: 'Factor 2 — Riesgo contra sí misma y terceros', label: '¿El denunciado posee armas de fuego o tiene acceso a ellas?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 5 },
      { code: 'fir_06', seccion: 'Factor 1 — Violencia psicológica (control/coerción)', label: '¿Ha tenido que cambiar o abandonar su hogar, sus actividades cotidianas, su número de teléfono, sus redes sociales o su trabajo por la situación de violencia que denuncia?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 6 },
      { code: 'fir_07', seccion: 'Factor 1 — Violencia psicológica (control/coerción)', label: '¿Usted le ha expresado al denunciado la intención de terminar su relación de pareja con él?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 7 },
      { code: 'fir_08', seccion: 'Factor 1 — Violencia psicológica (control/coerción)', label: '¿El denunciado la ha perseguido, espiado, acosado, le ha enviado mensajes intimidantes o la ha llamado cuando usted no quiere mantener el contacto?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 8 },
      { code: 'fir_09', seccion: 'Factor 1 — Violencia psicológica (control/coerción)', label: '¿El denunciado ha controlado sus actividades cotidianas, la manera en que usted ocupa su tiempo, el dinero, su forma de vestir o sus redes sociales?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 9 },
      { code: 'fir_10', seccion: 'Factor 2 — Riesgo contra sí misma y terceros', label: '¿El denunciado ha destruido o lanzado objetos durante una pelea o discusión?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 10 },
      { code: 'fir_11', seccion: 'Factor 1 — Violencia psicológica (control/coerción)', label: '¿El denunciado ha intentado o ha logrado interrumpir el contacto con su red de apoyo (familiares, amigas, compañeros de trabajo, terapeuta, abogado, etc.)?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 11 },
      { code: 'fir_12', seccion: 'Factor 2 — Riesgo contra sí misma y terceros', label: '¿El denunciado le ha amenazado o agredido con algún arma u objeto?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 12 },
      { code: 'fir_13', seccion: 'Factor 2 — Riesgo contra sí misma y terceros', label: '¿El denunciado ha sido violento o ha amenazado con hacerle daño a sus hijos, a sus seres queridos o a su mascota?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 13 },
      { code: 'fir_14', seccion: 'Factor 3 — Violencia física y sexual', label: '¿Alguna vez el denunciado la ha agredido físicamente ocasionándole heridas, dolores, morados, cortadas, fracturas o dificultad para moverse?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 14 },
      { code: 'fir_15', seccion: 'Factor 3 — Violencia física y sexual', label: '¿El denunciado ha intentado asfixiarla, ahogarla o ahorcarla?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 15 },
      { code: 'fir_16', seccion: 'Factor 3 — Violencia física y sexual', label: 'Durante las agresiones, ¿el denunciado la ha mordido, la ha quemado o ha intentado hacerlo?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 16 },
      { code: 'fir_17', seccion: 'Factor 3 — Violencia física y sexual', label: '¿El denunciado la ha forzado/obligado a mantener relaciones sexuales? (penetración, tocamientos, exposición a la pornografía, desnudez forzada, entre otros)', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 17 },
      { code: 'fir_18', seccion: 'Factor 3 — Violencia física y sexual', label: 'En los últimos hechos de agresión, ¿sufrió lesiones graves que pusieron su vida en peligro?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 18 },
      { code: 'fir_19', seccion: 'Factor 3 — Violencia física y sexual', label: 'En los últimos hechos de agresión, ¿recibió amenazas contra su vida?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 19 },
      { code: 'fir_20', seccion: 'Factor 2 — Riesgo contra sí misma y terceros', label: 'En los últimos hechos de agresión, ¿otras personas estuvieron en riesgo de ser agredidas?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 20 },
      { code: 'fir_21', seccion: 'Factor 2 — Riesgo contra sí misma y terceros', label: '¿Se han mantenido o han aumentado los comportamientos violentos del denunciado hacia usted en el último año?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 21 },
      { code: 'fir_22', seccion: 'Factor 2 — Riesgo contra sí misma y terceros', label: '¿Considera que el denunciado podría matarla?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 22 },
    ],
  },

  // ── DA-R — Danger Assessment-Revised (Glass et al., 2008) ────────────────────
  // Hijo de la batería Res.0362/2026. Parejas/exparejas conformadas por mujeres.
  // Ponderado: P1=4, P2=3, P3–P6=2 (críticos); P7–P17=1; P18 NO puntúa (cualitativa,
  // ideación/intento suicida). Máx 26. Interpretación de continuo (sin bandas fijas).
  {
    code: 'RES0362_DAR',
    name: 'DA-R — Danger Assessment-Revised',
    norma: 'Danger Assessment-Revised (Glass et al., 2008) — adoptado por Res. 0362/2026, Ley 2126/2021',
    version: 'Revised',
    profesion: 'AMBOS',
    appliesTo: 'VIOLENCIA_INTRAFAMILIAR',
    assessmentType: 'RIESGO',
    description: 'Para relaciones de pareja entre mujeres. 18 ítems Sí/No con ponderación; evalúa riesgo de reincidencia de violencia (no letalidad). Interpretación de continuo: a más puntaje/"Sí", mayor riesgo. "Ella" = su pareja o expareja.',
    isActive: true,
    displayOrder: 32,
    parentCode: 'MINJUSTICIA_RES0362_2026',
    scoringConfig: { maxScore: 26 }, // continuo: sin cortes fijos; los ítems críticos tienen mayor peso
    campos: [
      { code: 'dar_01', seccion: 'Factores de riesgo de reincidencia (DA-R)', label: '¿Ella es constantemente celosa y/o posesiva con usted?', tipo: 'BOOLEANO', peso: 4, esCritico: true, requerido: true, orden: 1 },
      { code: 'dar_02', seccion: 'Factores de riesgo de reincidencia (DA-R)', label: '¿Ella intenta aislarla socialmente?', tipo: 'BOOLEANO', peso: 3, esCritico: true, requerido: true, orden: 2 },
      { code: 'dar_03', seccion: 'Factores de riesgo de reincidencia (DA-R)', label: '¿La violencia física ha aumentado en severidad o frecuencia durante el último año?', tipo: 'BOOLEANO', peso: 2, esCritico: true, requerido: true, orden: 3 },
      { code: 'dar_04', seccion: 'Factores de riesgo de reincidencia (DA-R)', label: '¿Ella la ha amenazado con un arma de fuego en el último año?', tipo: 'BOOLEANO', peso: 2, esCritico: true, requerido: true, orden: 4 },
      { code: 'dar_05', seccion: 'Factores de riesgo de reincidencia (DA-R)', label: '¿Ha vivido con ella en el último año?', tipo: 'BOOLEANO', peso: 2, esCritico: true, requerido: true, orden: 5 },
      { code: 'dar_06', seccion: 'Factores de riesgo de reincidencia (DA-R)', label: '¿Ella alguna vez ha maltratado o amenazado con maltratar a una pareja íntima anterior, o a sus familiares o amigos?', tipo: 'BOOLEANO', peso: 2, esCritico: true, requerido: true, orden: 6 },
      { code: 'dar_07', seccion: 'Factores de riesgo de reincidencia (DA-R)', label: '¿Ella consume drogas ilegales (marihuana, cocaína, anfetaminas, inhalantes, sedantes, alucinógenos, etc.) o abusa de medicamentos recetados?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 7 },
      { code: 'dar_08', seccion: 'Factores de riesgo de reincidencia (DA-R)', label: '¿Ella es alcohólica o tiene problemas con la bebida?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 8 },
      { code: 'dar_09', seccion: 'Factores de riesgo de reincidencia (DA-R)', label: '¿Ella intenta controlar/limitar su religión/espiritualidad?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 9 },
      { code: 'dar_10', seccion: 'Factores de riesgo de reincidencia (DA-R)', label: '¿Ella constantemente la culpa y/o menosprecia?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 10 },
      { code: 'dar_11', seccion: 'Factores de riesgo de reincidencia (DA-R)', label: '¿Ella ha destruido o amenazado con destruir cosas que le pertenecen?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 11 },
      { code: 'dar_12', seccion: 'Factores de riesgo de reincidencia (DA-R)', label: '¿Ha amenazado con hacer daño a una mascota, familiar adulto mayor o a una persona con discapacidad a la que usted cuide?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 12 },
      { code: 'dar_13', seccion: 'Factores de riesgo de reincidencia (DA-R)', label: '¿Ella alguna vez ha violado una orden de restricción/alejamiento?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 13 },
      { code: 'dar_14', seccion: 'Factores de riesgo de reincidencia (DA-R)', label: '¿Ella la acosa, por ejemplo, la sigue o espía, deja notas o mensajes amenazantes en el celular, o la llama cuando no quiere que lo haga?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 14 },
      { code: 'dar_15', seccion: 'Factores de riesgo de reincidencia (DA-R)', label: 'Si estuviera siendo maltratada por ella y tratara de obtener ayuda, ¿la gente dudaría en creerle?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 15 },
      { code: 'dar_16', seccion: 'Factores de riesgo de reincidencia (DA-R)', label: 'Si estuviera siendo maltratada por ella, ¿el miedo a reforzar estereotipos negativos sobre las relaciones de pareja entre mujeres y/o ser discriminada le impediría buscar ayuda, por ejemplo, ayuda de amigos, profesionales de salud o ir a las autoridades competentes?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 16 },
      { code: 'dar_17', seccion: 'Factores de riesgo de reincidencia (DA-R)', label: 'Si tuviera serias dificultades con ella, ¿lo mantendría en secreto por miedo o vergüenza?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 17 },
      { code: 'dar_18', seccion: 'Evaluación cualitativa', label: '¿Ha amenazado o intentado matarse?', tipo: 'BOOLEANO', ayuda: 'No puntúa — se evalúa cualitativamente (ideación/intento suicida).', requerido: true, orden: 18 },
    ],
  },
];
