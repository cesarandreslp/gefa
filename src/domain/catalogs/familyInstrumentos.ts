/**
 * ============================================================================
 * CATÁLOGO DE INSTRUMENTOS DE VALORACIÓN (Fase C1)
 * ============================================================================
 * Formatos normados que aplica el equipo interdisciplinario (psicología /
 * trabajo social). Catálogo GLOBAL (se siembra por `code`).
 *
 * ⚠️ CONFORMIDAD NORMATIVA:
 * - La batería Res. 0362/2026 está transcrita VERBATIM del manual oficial (Guía
 *   para la valoración de percepción del riesgo de feminicidio, Minjusticia V.1.0):
 *   sus 5 componentes — Caracterización (Módulo 1), Entrevista semiestructurada
 *   (Módulo 2), FIR-R, DA-R y C2 — están activos; el contenedor permanece inactivo.
 * - ICBF F3.G16.P (valoración psicológica) está transcrito VERBATIM del formato
 *   oficial v4 (21/04/2023). ICBF F5.G16.P (socio-familiar) sigue siendo una BASE
 *   DE TRABAJO y DEBE validarse contra el texto oficial antes de uso en producción.
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

export const FAMILY_INSTRUMENTOS: InstrumentoDef[] = [
  // ── ICBF — Valoración psicológica de verificación de derechos (F3.G16.P) ──────
  {
    code: 'ICBF_F3G16P',
    name: 'Informe de valoración psicológica de verificación de derechos',
    norma: 'ICBF F3.G16.P v4 (21/04/2023) — Proceso Protección, Restablecimiento de derechos (Ley 1098/2006)',
    version: 'v4.1',
    profesion: 'PSICOLOGIA',
    appliesTo: 'PARD',
    assessmentType: 'PSICOLOGICA',
    description: 'Formato oficial ICBF para conceptuar, desde la perspectiva psicológica, el estado de garantía de derechos del NNA en la verificación que ordena la autoridad administrativa (PARD). Informe descriptivo estructurado por niveles (microsistema/mesosistema/exosistema). No tiene alcance forense ni clínico.',
    isActive: true,
    displayOrder: 10,
    campos: [
      // Datos generales (estructura administrativa ICBF / SIM)
      { code: 'f3_regional', seccion: 'Datos generales (SIM)', label: 'Regional', tipo: 'TEXTO', orden: 1 },
      { code: 'f3_centro_zonal', seccion: 'Datos generales (SIM)', label: 'Centro Zonal', tipo: 'TEXTO', orden: 2 },
      { code: 'f3_peticion_sim', seccion: 'Datos generales (SIM)', label: 'N° de petición en el SIM', tipo: 'TEXTO', orden: 3 },
      { code: 'f3_autoridad', seccion: 'Datos generales (SIM)', label: 'Nombre de la autoridad administrativa', tipo: 'TEXTO', orden: 4 },
      { code: 'f3_autoridad_correo', seccion: 'Datos generales (SIM)', label: 'Correo electrónico de la autoridad administrativa', tipo: 'TEXTO', orden: 5 },
      // Datos del NNA (complementan la identificación del expediente)
      { code: 'f3_nna_etnia', seccion: 'Datos del NNA', label: 'Pertenencia étnica', tipo: 'SELECCION', opciones: [{ value: 'NINGUNA', label: 'Ninguna de las anteriores' }, { value: 'INDIGENA', label: 'Indígena (pueblo / comunidad)' }, { value: 'ROM', label: 'Rom o Gitano' }, { value: 'AFRO', label: 'Afrocolombiano' }, { value: 'PALENQUERO', label: 'Palenquero' }, { value: 'RAIZAL', label: 'Raizal' }], orden: 6 },
      { code: 'f3_nna_lengua', seccion: 'Datos del NNA', label: 'Lengua natal (y segunda lengua si es bilingüe)', tipo: 'TEXTO', orden: 7 },
      { code: 'f3_nna_discapacidad', seccion: 'Datos del NNA', label: 'Discapacidad', tipo: 'SELECCION', opciones: [{ value: 'NO', label: 'No' }, { value: 'FISICA', label: 'Física' }, { value: 'AUDITIVA', label: 'Auditiva' }, { value: 'VISUAL', label: 'Visual' }, { value: 'SORDOCEGUERA', label: 'Sordoceguera' }, { value: 'INTELECTUAL', label: 'Intelectual' }, { value: 'PSICOSOCIAL', label: 'Psicosocial' }, { value: 'MULTIPLE', label: 'Múltiple' }], orden: 8 },
      { code: 'f3_nna_enf_especial', seccion: 'Datos del NNA', label: 'Enfermedad de cuidado especial (¿cuál?)', tipo: 'TEXTO', orden: 9 },
      { code: 'f3_nna_spa', seccion: 'Datos del NNA', label: 'Consumo de SPA', tipo: 'SELECCION', opciones: [{ value: 'NO', label: 'No' }, { value: 'EXPERIMENTAL', label: 'Experimental' }, { value: 'SOCIAL', label: 'Social' }, { value: 'HABITUAL', label: 'Habitual' }, { value: 'PROBLEMATICO', label: 'Problemático' }], orden: 10 },
      { code: 'f3_nna_spa_tipo', seccion: 'Datos del NNA', label: 'Tipo de sustancia(s)', tipo: 'TEXTO', orden: 11 },
      { code: 'f3_nna_emergencia', seccion: 'Datos del NNA', label: 'Situación de emergencia', tipo: 'SELECCION', opciones: [{ value: 'SI', label: 'Sí' }, { value: 'NO', label: 'No' }, { value: 'ND', label: 'No definido' }], orden: 12 },
      { code: 'f3_nna_desplazamiento', seccion: 'Datos del NNA', label: 'Situación de desplazamiento', tipo: 'SELECCION', opciones: [{ value: 'SI', label: 'Sí' }, { value: 'NO', label: 'No' }, { value: 'ND', label: 'No definido' }], orden: 13 },
      { code: 'f3_nna_migracion', seccion: 'Datos del NNA', label: 'Situación de migración (¿cuál tipo?)', tipo: 'TEXTO', orden: 14 },
      { code: 'f3_nna_escolarizado', seccion: 'Datos del NNA', label: '¿Vinculado al servicio educativo (escolarizado)?', tipo: 'BOOLEANO', orden: 15 },
      { code: 'f3_nna_nivel_edu', seccion: 'Datos del NNA', label: 'Nivel educativo', tipo: 'SELECCION', opciones: [{ value: 'INICIAL', label: 'Educación inicial' }, { value: 'PREESCOLAR', label: 'Preescolar' }, { value: 'BASICA', label: 'Básica' }, { value: 'MEDIA', label: 'Media' }], orden: 16 },
      { code: 'f3_nna_jornada', seccion: 'Datos del NNA', label: 'Jornada', tipo: 'SELECCION', opciones: [{ value: 'MANANA', label: 'Mañana' }, { value: 'TARDE', label: 'Tarde' }, { value: 'NOCHE', label: 'Noche' }], orden: 17 },
      { code: 'f3_nna_institucion', seccion: 'Datos del NNA', label: 'Institución educativa (nombre, sede, naturaleza)', tipo: 'TEXTO', orden: 18 },
      { code: 'f3_nna_regimen_salud', seccion: 'Datos del NNA', label: 'Régimen de salud (SGSSS)', tipo: 'SELECCION', opciones: [{ value: 'CONTRIBUTIVO', label: 'Contributivo' }, { value: 'SUBSIDIADO', label: 'Subsidiado' }, { value: 'ESPECIAL', label: 'Especial' }, { value: 'NINGUNO', label: 'Ninguno' }, { value: 'SIN_INFO', label: 'Sin información' }], orden: 19 },
      { code: 'f3_nna_eps', seccion: 'Datos del NNA', label: 'EPS', tipo: 'TEXTO', orden: 20 },
      { code: 'f3_nna_convivientes', seccion: 'Datos del NNA', label: 'Personas con quienes convive en el hogar (nombre, parentesco/no pariente, sexo, edad, ocupación)', tipo: 'TEXTO_LARGO', orden: 21 },
      { code: 'f3_nna_contacto', seccion: 'Datos del NNA', label: 'Personas de contacto (nombre, parentesco o rol, teléfono y correo)', tipo: 'TEXTO_LARGO', orden: 22 },
      { code: 'f3_nna_ubicacion', seccion: 'Datos del NNA', label: 'Ubicación actual', tipo: 'SELECCION', opciones: [{ value: 'EMERGENCIA', label: 'Centro de emergencia' }, { value: 'HOGAR_PASO', label: 'Hogar de paso' }, { value: 'RECUP_NUTRICIONAL', label: 'Centro de recuperación nutricional' }, { value: 'INST_SALUD', label: 'Institución de salud' }, { value: 'FAMILIA_ORIGEN', label: 'Familia de origen' }, { value: 'FAMILIA_EXTENSA', label: 'Familia extensa' }, { value: 'FAMILIA_SOLIDARIA', label: 'Familia solidaria' }], orden: 23 },
      // Síntesis de la petición
      { code: 'f3_sintesis_peticion', seccion: 'Síntesis de la petición', label: 'Síntesis de la petición que fundamenta la solicitud de valoración', tipo: 'TEXTO_LARGO', ayuda: 'Se sugiere transcribir de forma textual la petición y los elementos del auto de trámite de la autoridad administrativa.', requerido: true, orden: 24 },
      // Metodología
      { code: 'f3_met_observacion', seccion: 'Metodología utilizada', label: 'Observación', tipo: 'BOOLEANO', orden: 25 },
      { code: 'f3_met_entrevista', seccion: 'Metodología utilizada', label: 'Entrevista psicológica', tipo: 'BOOLEANO', orden: 26 },
      { code: 'f3_met_entrevista_semi', seccion: 'Metodología utilizada', label: 'Entrevista semiestructurada', tipo: 'BOOLEANO', orden: 27 },
      { code: 'f3_met_pruebas', seccion: 'Metodología utilizada', label: 'Aplicación de pruebas psicológicas', tipo: 'BOOLEANO', orden: 28 },
      { code: 'f3_met_otras', seccion: 'Metodología utilizada', label: 'Otras técnicas', tipo: 'BOOLEANO', orden: 29 },
      { code: 'f3_met_otras_cuales', seccion: 'Metodología utilizada', label: 'Otras técnicas — ¿cuáles?', tipo: 'TEXTO', orden: 30 },
      { code: 'f3_met_info', seccion: 'Metodología utilizada', label: 'Información relevante sobre aspectos metodológicos (instrumentos, a quiénes, fechas)', tipo: 'TEXTO_LARGO', orden: 31 },
      // Factores de desarrollo y estado psicológico por niveles
      { code: 'f3_micro_examen_mental', seccion: 'Microsistema — desarrollo y salud psicológica', label: 'Examen mental', tipo: 'TEXTO_LARGO', ayuda: 'Porte y actitud, atención, conciencia, orientación, sensopercepción, memoria, lenguaje, pensamiento, afecto, juicio, prospección y sueño.', requerido: true, orden: 32 },
      { code: 'f3_micro_areas', seccion: 'Microsistema — desarrollo y salud psicológica', label: 'Valoración por áreas', tipo: 'TEXTO_LARGO', ayuda: 'Cognitiva/adaptativa, emocional-afectiva, sensorio-motriz, lenguaje, e identidad personal y social.', requerido: true, orden: 33 },
      { code: 'f3_meso', seccion: 'Mesosistema — familia y red vincular', label: 'Composición y funcionamiento familiar y red vincular de apoyo', tipo: 'TEXTO_LARGO', ayuda: 'Afrontamiento de situaciones problemáticas, pautas comunicacionales, vinculación afectiva, roles por subsistemas, relacionamiento con pares.', requerido: true, orden: 34 },
      { code: 'f3_exo', seccion: 'Exosistema — SNBF', label: 'Sectores y servicios del Sistema Nacional de Bienestar Familiar (educativo, recreativo, cultural)', tipo: 'TEXTO_LARGO', requerido: true, orden: 35 },
      // Concepto, derechos y acciones
      { code: 'f3_concepto', seccion: 'Concepto integrado', label: 'Concepto integrado de valoración psicológica', tipo: 'TEXTO_LARGO', ayuda: 'Triangular micro/meso/exo; impresión diagnóstica (DSM-5/CIE-10) si procede; factores de riesgo y protectores individuales, familiares y de contexto; contraste de hipótesis.', requerido: true, orden: 36 },
      { code: 'f3_derechos', seccion: 'Análisis de derechos', label: 'Análisis de derechos garantizados, amenazados y/o vulnerados desde la perspectiva psicológica', tipo: 'TEXTO_LARGO', requerido: true, orden: 37 },
      { code: 'f3_acciones', seccion: 'Acciones sugeridas', label: 'Acciones sugeridas por niveles', tipo: 'TEXTO_LARGO', ayuda: 'Indicar prioridad: urgente (corto plazo), importante (mediano plazo), necesario (durante el proceso), y responsable.', requerido: true, orden: 38 },
      // Profesional responsable
      { code: 'f3_prof_nombre', seccion: 'Profesional responsable', label: 'Nombre del profesional en psicología', tipo: 'TEXTO', orden: 39 },
      { code: 'f3_prof_registro', seccion: 'Profesional responsable', label: 'Tarjeta o registro profesional', tipo: 'TEXTO', orden: 40 },
      { code: 'f3_fecha_elaboracion', seccion: 'Profesional responsable', label: 'Fecha de elaboración del informe', tipo: 'FECHA', orden: 41 },
      { code: 'f3_fecha_entrega', seccion: 'Profesional responsable', label: 'Fecha de entrega del informe', tipo: 'FECHA', orden: 42 },
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

  // ── Módulo 1 — Formato de caracterización (Res. 0362/2026) ───────────────────
  // Se aplica a TODAS las mujeres mayores de 14 años que reporten violencia letal o
  // casi letal, ANTES de elegir el instrumento actuarial. Es descriptivo (sin
  // puntaje): caracteriza víctima, agresor/a, vínculo, violencia, contexto y
  // respuesta institucional, y orienta qué instrumento (FIR-R/DA-R/C2) aplicar
  // según el tipo de vínculo. Transcrito del manual oficial Minjusticia V.1.0.
  {
    code: 'RES0362_CARACTERIZACION',
    name: 'Módulo 1 — Formato de caracterización',
    norma: 'Res. 0362/2026 (Minjusticia), Módulo 1 — Ley 2126/2021',
    version: 'V.1.0',
    profesion: 'AMBOS',
    appliesTo: 'VIOLENCIA_INTRAFAMILIAR',
    assessmentType: 'INTERDISCIPLINARIA',
    description: 'Caracterización de la violencia letal o casi letal en el contexto familiar. Recoge datos de la víctima, del agresor/a, del vínculo, de los hechos de violencia, factores contextuales y respuesta institucional. Descriptivo (sin puntaje); orienta la selección del instrumento actuarial según el tipo de vínculo.',
    isActive: true,
    displayOrder: 31,
    parentCode: 'MINJUSTICIA_RES0362_2026',
    campos: [
      // Información personal de la víctima
      { code: 'v_nombre', seccion: 'Identificación de la víctima', label: 'Nombre y apellidos (como en el documento)', tipo: 'TEXTO', requerido: true, orden: 1 },
      { code: 'v_nombre_identitario', seccion: 'Identificación de la víctima', label: 'Nombres y apellidos identitarios (como prefiere ser nombrada)', tipo: 'TEXTO', orden: 2 },
      { code: 'v_fecha_nac', seccion: 'Identificación de la víctima', label: 'Fecha de nacimiento', tipo: 'FECHA', orden: 3 },
      { code: 'v_edad', seccion: 'Identificación de la víctima', label: 'Edad', tipo: 'NUMERO', orden: 4 },
      { code: 'v_tipo_doc', seccion: 'Identificación de la víctima', label: 'Tipo de documento de identificación', tipo: 'SELECCION', opciones: [
        { value: 'CC', label: 'Cédula de ciudadanía' }, { value: 'CE', label: 'Cédula de extranjería' }, { value: 'TI', label: 'Tarjeta de identidad' }, { value: 'PAS', label: 'Pasaporte' }, { value: 'PEP', label: 'PEP / PPT' }, { value: 'OTRO', label: 'Otro' },
      ], orden: 5 },
      { code: 'v_num_doc', seccion: 'Identificación de la víctima', label: 'Número de documento', tipo: 'TEXTO', orden: 6 },
      { code: 'v_celular', seccion: 'Identificación de la víctima', label: 'Número de celular principal', tipo: 'TEXTO', orden: 7 },
      { code: 'v_celular_alt', seccion: 'Identificación de la víctima', label: 'Número de celular alterno', tipo: 'TEXTO', orden: 8 },
      { code: 'v_correo', seccion: 'Identificación de la víctima', label: 'Correo electrónico', tipo: 'TEXTO', orden: 9 },
      { code: 'v_nacionalidad', seccion: 'Identificación de la víctima', label: 'Nacionalidad', tipo: 'SELECCION', opciones: [{ value: 'COL', label: 'Colombiana' }, { value: 'OTRA', label: 'Otra' }], orden: 10 },
      { code: 'v_departamento', seccion: 'Identificación de la víctima', label: 'Departamento de residencia', tipo: 'TEXTO', orden: 11 },
      { code: 'v_municipio', seccion: 'Identificación de la víctima', label: 'Municipio de residencia', tipo: 'TEXTO', orden: 12 },
      { code: 'v_sector', seccion: 'Identificación de la víctima', label: 'Sector de residencia', tipo: 'SELECCION', opciones: [{ value: 'URBANO', label: 'Urbano' }, { value: 'RURAL', label: 'Rural' }], orden: 13 },
      { code: 'v_direccion', seccion: 'Identificación de la víctima', label: 'Dirección de residencia', tipo: 'TEXTO', orden: 14 },
      { code: 'v_direccion_contacto', seccion: 'Identificación de la víctima', label: 'Dirección de un familiar o amigo/a donde pueda ser contactada', tipo: 'TEXTO', orden: 15 },
      { code: 'v_regimen_ss', seccion: 'Identificación de la víctima', label: 'Régimen de afiliación a seguridad social', tipo: 'SELECCION', opciones: [{ value: 'CONTRIBUTIVO', label: 'Contributivo' }, { value: 'SUBSIDIADO', label: 'Subsidiado' }, { value: 'NINGUNO', label: 'Ninguno' }], orden: 16 },
      { code: 'v_sexo', seccion: 'Identificación de la víctima', label: 'Sexo asignado al nacer', tipo: 'SELECCION', opciones: [{ value: 'HOMBRE', label: 'Hombre' }, { value: 'MUJER', label: 'Mujer' }, { value: 'INTERSEXUAL', label: 'Intersexual' }], orden: 17 },
      { code: 'v_identidad_genero', seccion: 'Identificación de la víctima', label: 'Identidad de género', tipo: 'SELECCION', opciones: [{ value: 'FEMENINA', label: 'Femenina' }, { value: 'MASCULINA', label: 'Masculina' }, { value: 'TRANS_MUJER', label: 'Mujer trans' }, { value: 'TRANS_HOMBRE', label: 'Hombre trans' }, { value: 'NO_BINARIO', label: 'No binario' }, { value: 'OTRO', label: 'Otro' }], orden: 18 },
      { code: 'v_orientacion', seccion: 'Identificación de la víctima', label: 'Orientación sexual', tipo: 'SELECCION', opciones: [{ value: 'HETERO', label: 'Heterosexual' }, { value: 'LESBIANA', label: 'Homosexual (lesbiana)' }, { value: 'BISEXUAL', label: 'Bisexual' }, { value: 'OTRO', label: 'Otro' }], orden: 19 },
      { code: 'v_etnia', seccion: 'Identificación de la víctima', label: 'Pertenencia étnica', tipo: 'SELECCION', opciones: [{ value: 'INDIGENA', label: 'Indígena' }, { value: 'RROM', label: 'Gitana o Rrom' }, { value: 'RAIZAL', label: 'Raizal (San Andrés y Providencia)' }, { value: 'PALENQUERA', label: 'Palenquera de San Basilio' }, { value: 'NARP', label: 'Negra, mulata, afrodescendiente o afrocolombiana' }, { value: 'NINGUNA', label: 'Ningún grupo étnico' }], orden: 20 },
      { code: 'v_discapacidad', seccion: 'Identificación de la víctima', label: 'Discapacidad', tipo: 'SELECCION', opciones: [{ value: 'NINGUNA', label: 'Ninguna' }, { value: 'FISICA', label: 'Física' }, { value: 'SENSORIAL', label: 'Sensorial (auditiva/visual)' }, { value: 'INTELECTUAL', label: 'Intelectual / cognitiva' }, { value: 'PSICOSOCIAL', label: 'Psicosocial / mental' }, { value: 'MULTIPLE', label: 'Múltiple' }], orden: 21 },
      { code: 'v_estado_civil', seccion: 'Identificación de la víctima', label: 'Estado civil', tipo: 'SELECCION', opciones: [{ value: 'SOLTERA', label: 'Soltera' }, { value: 'CASADA', label: 'Casada' }, { value: 'UNION_MENOS_2', label: 'Unión libre < 2 años' }, { value: 'UNION_MAS_2', label: 'Unión libre ≥ 2 años' }, { value: 'SEPARADA', label: 'Separada o divorciada' }, { value: 'VIUDA', label: 'Viuda' }], orden: 22 },
      { code: 'v_migracion', seccion: 'Identificación de la víctima', label: 'En situación de migración', tipo: 'SELECCION', opciones: [{ value: 'NO', label: 'No' }, { value: 'REGULAR', label: 'Sí — regular' }, { value: 'IRREGULAR', label: 'Sí — irregular' }], orden: 23 },
      { code: 'v_victima_conflicto', seccion: 'Identificación de la víctima', label: '¿Víctima del conflicto armado?', tipo: 'BOOLEANO', orden: 24 },
      { code: 'v_lideresa', seccion: 'Identificación de la víctima', label: '¿Lideresa o defensora de derechos humanos?', tipo: 'BOOLEANO', orden: 25 },
      { code: 'v_mujer_rural', seccion: 'Identificación de la víctima', label: '¿Mujer rural?', tipo: 'BOOLEANO', orden: 26 },
      { code: 'v_zona_bandas', seccion: 'Identificación de la víctima', label: '¿Reside en lugares con presencia de bandas delincuenciales?', tipo: 'BOOLEANO', orden: 27 },
      // Información del agresor/a (no obligatoria)
      { code: 'a_nombre', seccion: 'Identificación del agresor/a', label: 'Nombre y apellidos del agresor/a', tipo: 'TEXTO', ayuda: 'No es obligatorio. Si no se cuenta con el dato, registrar "No sabe".', orden: 28 },
      { code: 'a_fecha_nac', seccion: 'Identificación del agresor/a', label: 'Fecha de nacimiento del agresor/a', tipo: 'FECHA', orden: 29 },
      { code: 'a_edad', seccion: 'Identificación del agresor/a', label: 'Edad del agresor/a', tipo: 'NUMERO', orden: 30 },
      { code: 'a_tipo_doc', seccion: 'Identificación del agresor/a', label: 'Tipo de documento del agresor/a', tipo: 'SELECCION', opciones: [{ value: 'CC', label: 'Cédula de ciudadanía' }, { value: 'CE', label: 'Cédula de extranjería' }, { value: 'TI', label: 'Tarjeta de identidad' }, { value: 'OTRO', label: 'Otro' }, { value: 'NS', label: 'No sabe' }], orden: 31 },
      { code: 'a_num_doc', seccion: 'Identificación del agresor/a', label: 'Número de documento del agresor/a', tipo: 'TEXTO', orden: 32 },
      { code: 'a_celular', seccion: 'Identificación del agresor/a', label: 'Número de celular del agresor/a', tipo: 'TEXTO', orden: 33 },
      { code: 'a_municipio', seccion: 'Identificación del agresor/a', label: 'Municipio de residencia del agresor/a', tipo: 'TEXTO', orden: 34 },
      { code: 'a_sexo', seccion: 'Identificación del agresor/a', label: 'Sexo asignado al nacer del agresor/a', tipo: 'SELECCION', opciones: [{ value: 'HOMBRE', label: 'Hombre' }, { value: 'MUJER', label: 'Mujer' }, { value: 'INTERSEXUAL', label: 'Intersexual' }, { value: 'NS', label: 'No sabe' }], orden: 35 },
      { code: 'a_identidad_genero', seccion: 'Identificación del agresor/a', label: 'Identidad de género del agresor/a', tipo: 'SELECCION', opciones: [{ value: 'FEMENINA', label: 'Femenina' }, { value: 'MASCULINA', label: 'Masculina' }, { value: 'TRANS_MUJER', label: 'Mujer trans' }, { value: 'TRANS_HOMBRE', label: 'Hombre trans' }, { value: 'NO_BINARIO', label: 'No binario' }, { value: 'OTRO', label: 'Otro' }], orden: 36 },
      { code: 'a_estado_civil', seccion: 'Identificación del agresor/a', label: 'Estado civil del agresor/a', tipo: 'SELECCION', opciones: [{ value: 'SOLTERO', label: 'Soltero/a' }, { value: 'CASADO', label: 'Casado/a' }, { value: 'UNION_MENOS_2', label: 'Unión libre < 2 años' }, { value: 'UNION_MAS_2', label: 'Unión libre ≥ 2 años' }, { value: 'SEPARADO', label: 'Separado/a o divorciado/a' }, { value: 'VIUDO', label: 'Viudo/a' }], orden: 37 },
      // Historial de la relación con el agresor/a
      { code: 'rel_tipo', seccion: 'Historial de la relación', label: 'Tipo de relación o vínculo con el agresor/a', tipo: 'SELECCION', ayuda: 'Determina el instrumento actuarial a aplicar (FIR-R / DA-R / C2).', opciones: [
        { value: 'PAREJA_HETERO', label: 'Pareja/expareja heterosexual (novio, cónyuge, compañero permanente, ex/separado)' },
        { value: 'PAREJA_MUJERES', label: 'Pareja/expareja conformada solo por mujeres' },
        { value: 'PADRE_MADRE', label: 'Padre / madre / padrastro / madrastra' },
        { value: 'HIJO_HIJA', label: 'Hijo/a / hijastro/a' },
        { value: 'HERMANO', label: 'Hermano/a' },
        { value: 'OTRO_FAMILIAR', label: 'Otro familiar (tío/a, primo/a, abuelo/a, suegro/a, cuñado/a)' },
        { value: 'CUIDADO', label: 'Relación de cuidado (cuidador/a de NNA o de persona mayor)' },
        { value: 'COHABITACION', label: 'Cohabitación / convivencia sin vínculo familiar formal' },
        { value: 'OTRO', label: 'Otro' },
      ], requerido: true, orden: 38 },
      { code: 'rel_duracion', seccion: 'Historial de la relación', label: 'Duración de la relación o vínculo', tipo: 'TEXTO', ayuda: 'Indicar días, meses o años.', orden: 39 },
      { code: 'rel_reanudada', seccion: 'Historial de la relación', label: '¿La relación o vínculo se reanudó alguna vez?', tipo: 'BOOLEANO', orden: 40 },
      { code: 'rel_dep_econ_victima', seccion: 'Historial de la relación', label: '¿La víctima depende económicamente del agresor/a?', tipo: 'BOOLEANO', orden: 41 },
      { code: 'rel_dep_econ_agresor', seccion: 'Historial de la relación', label: '¿El agresor/a depende económicamente de la víctima?', tipo: 'BOOLEANO', orden: 42 },
      { code: 'rel_hijos_comun', seccion: 'Historial de la relación', label: '¿Hay hijos/as en común?', tipo: 'BOOLEANO', orden: 43 },
      { code: 'rel_num_hijos', seccion: 'Historial de la relación', label: 'Número de hijos/as en común', tipo: 'NUMERO', orden: 44 },
      // Detalles de la violencia
      { code: 'viol_antecedentes', seccion: 'Detalles de la violencia', label: '¿La víctima ha sufrido violencia previamente?', tipo: 'BOOLEANO', orden: 45 },
      { code: 'viol_tipo', seccion: 'Detalles de la violencia', label: 'Tipo(s) de violencia ejercida', tipo: 'SELECCION', opciones: [{ value: 'FISICA', label: 'Física' }, { value: 'PSICOLOGICA', label: 'Psicológica' }, { value: 'SEXUAL', label: 'Sexual' }, { value: 'ECONOMICA', label: 'Económica' }, { value: 'PATRIMONIAL', label: 'Patrimonial' }, { value: 'PREJUICIO', label: 'Por prejuicio' }, { value: 'MULTIPLE', label: 'Múltiple' }], orden: 46 },
      { code: 'viol_mismo_agresor', seccion: 'Detalles de la violencia', label: 'Los antecedentes de violencia ocurrieron con…', tipo: 'SELECCION', opciones: [{ value: 'MISMO', label: 'El mismo agresor/a' }, { value: 'OTRO', label: 'Otro agresor/a' }], orden: 47 },
      { code: 'viol_frecuencia', seccion: 'Detalles de la violencia', label: 'Frecuencia de los episodios de violencia', tipo: 'SELECCION', opciones: [{ value: 'DIARIA', label: 'Diaria' }, { value: 'SEMANAL', label: 'Semanal' }, { value: 'QUINCENAL', label: 'Quincenal' }, { value: 'MENSUAL', label: 'Mensual' }, { value: 'BIMENSUAL', label: 'Bimensual' }, { value: 'SEMESTRAL', label: 'Semestral' }, { value: 'ANUAL', label: 'Anual' }, { value: 'OTRA', label: 'Otra' }], orden: 48 },
      { code: 'viol_afectacion', seccion: 'Detalles de la violencia', label: 'Afectación causada por la violencia', tipo: 'SELECCION', opciones: [{ value: 'NINGUNA', label: 'Ninguna' }, { value: 'FISICA', label: 'Daños físicos' }, { value: 'PSICOLOGICA', label: 'Daños psicológicos' }, { value: 'SOCIOECONOMICA', label: 'Daños socioeconómicos' }], orden: 49 },
      { code: 'viol_heridas', seccion: 'Detalles de la violencia', label: 'Tipo de heridas físicas', tipo: 'TEXTO', ayuda: 'P. ej.: patadas, puños, cortes, quemaduras, fracturas, heridas de fuego/cortopunzantes, etc.', orden: 50 },
      { code: 'viol_armas', seccion: 'Detalles de la violencia', label: 'Tipo de armas utilizadas en la agresión', tipo: 'TEXTO', ayuda: 'Arma blanca (cuchillo, navaja, machete) / arma de fuego (pistola, revólver, etc.) / otra.', orden: 51 },
      { code: 'viol_spa', seccion: 'Detalles de la violencia', label: 'Consumo problemático de SPA por parte del agresor/a', tipo: 'SELECCION', opciones: [{ value: 'NO', label: 'No' }, { value: 'SI', label: 'Sí' }, { value: 'NS', label: 'No sabe / no tiene conocimiento' }], orden: 52 },
      { code: 'viol_vbg', seccion: 'Detalles de la violencia', label: 'Expresiones de violencia basada en género', tipo: 'TEXTO', ayuda: 'P. ej.: amenazas, intimidación, control, humillación, instrumentalización, incomunicación, supervisión, sometimiento.', orden: 53 },
      { code: 'viol_vbg_frecuencia', seccion: 'Detalles de la violencia', label: 'Frecuencia de las expresiones de violencia basada en género', tipo: 'SELECCION', opciones: [{ value: 'DIARIA', label: 'Diaria' }, { value: 'SEMANAL', label: 'Semanal' }, { value: 'QUINCENAL', label: 'Quincenal' }, { value: 'MENSUAL', label: 'Mensual' }, { value: 'BIMENSUAL', label: 'Bimensual' }, { value: 'SEMESTRAL', label: 'Semestral' }, { value: 'ANUAL', label: 'Anual' }, { value: 'OTRA', label: 'Otra' }], orden: 54 },
      // Factores contextuales
      { code: 'ctx_estresores', seccion: 'Factores contextuales', label: 'Factores estresantes externos presentes', tipo: 'TEXTO', ayuda: 'Ninguno / económicos / laborales / médicos / otro.', orden: 55 },
      { code: 'ctx_redes_apoyo', seccion: 'Factores contextuales', label: 'Redes de apoyo con que cuenta la víctima', tipo: 'TEXTO', ayuda: 'Ninguna / familia / amigos / organizaciones / comunidad / otra.', orden: 56 },
      { code: 'ctx_recursos_legales', seccion: 'Factores contextuales', label: 'Conocimiento y acceso a recursos legales', tipo: 'TEXTO', orden: 57 },
      // Solicitudes de ayuda y respuesta recibida
      { code: 'ayuda_medidas', seccion: 'Solicitudes de ayuda y respuesta', label: 'Medidas adoptadas por la víctima', tipo: 'TEXTO', ayuda: 'P. ej.: denuncia, búsqueda de apoyo, cambio de residencia/trabajo/ciudad.', orden: 58 },
      { code: 'ayuda_denuncias', seccion: 'Solicitudes de ayuda y respuesta', label: 'Número de denuncias formales presentadas', tipo: 'NUMERO', orden: 59 },
      { code: 'ayuda_denuncia_resultado', seccion: 'Solicitudes de ayuda y respuesta', label: 'Resultado de las denuncias', tipo: 'SELECCION', opciones: [{ value: 'ARCHIVADAS', label: 'Archivadas' }, { value: 'EN_PROCESO', label: 'En proceso' }, { value: 'CON_FALLO', label: 'Con fallo' }, { value: 'OTRO', label: 'Otro' }], orden: 60 },
      { code: 'ayuda_policiales', seccion: 'Solicitudes de ayuda y respuesta', label: 'Intervenciones policiales recibidas', tipo: 'TEXTO', ayuda: 'P. ej.: arresto, advertencia, anotación, rondas policiales.', orden: 61 },
      { code: 'ayuda_institucionales', seccion: 'Solicitudes de ayuda y respuesta', label: 'Intervenciones institucionales recibidas', tipo: 'TEXTO', ayuda: 'P. ej.: alojamiento, alimentación, atención psicosocial, asesoría legal, refugio.', orden: 62 },
      { code: 'ayuda_salud', seccion: 'Solicitudes de ayuda y respuesta', label: 'Intervenciones en salud física y mental', tipo: 'TEXTO', ayuda: 'P. ej.: consultas por lesiones, psicología, remisión a medicina legal.', orden: 63 },
      { code: 'ayuda_comunitarias', seccion: 'Solicitudes de ayuda y respuesta', label: 'Intervenciones comunitarias recibidas', tipo: 'TEXTO', orden: 64 },
      { code: 'ayuda_proceso_judicial', seccion: 'Solicitudes de ayuda y respuesta', label: '¿Existe proceso judicial en curso por los hechos actuales?', tipo: 'BOOLEANO', orden: 65 },
      { code: 'ayuda_medidas_proteccion', seccion: 'Solicitudes de ayuda y respuesta', label: 'Medidas de protección otorgadas (Ley 2126/2021)', tipo: 'TEXTO', ayuda: 'Indicar cuáles, o "Ninguna".', orden: 66 },
      { code: 'ayuda_incumplimiento', seccion: 'Solicitudes de ayuda y respuesta', label: '¿El agresor/a ha incumplido la(s) medida(s) de protección?', tipo: 'BOOLEANO', orden: 67 },
      { code: 'observaciones', seccion: 'Observaciones', label: 'Observaciones y comentarios', tipo: 'TEXTO_LARGO', orden: 68 },
    ],
  },

  // ── Módulo 2 — Entrevista semiestructurada (Res. 0362/2026) ──────────────────
  // Cualitativa (sin puntaje). Explora de forma contextual y sensible las dinámicas
  // de violencia. El profesional plantea cada ítem como punto de partida de una
  // conversación. Transcrita del manual oficial Minjusticia V.1.0.
  // Nota: el ítem 10 se reconstruye a partir de la estructura de la sección "Redes
  // de apoyo"; confirmar su enunciado exacto contra el formato Excel oficial.
  {
    code: 'RES0362_ENTREVISTA',
    name: 'Módulo 2 — Entrevista semiestructurada',
    norma: 'Res. 0362/2026 (Minjusticia), Módulo 2 — Ley 2126/2021',
    version: 'V.1.0',
    profesion: 'AMBOS',
    appliesTo: 'VIOLENCIA_INTRAFAMILIAR',
    assessmentType: 'INTERDISCIPLINARIA',
    description: 'Entrevista semiestructurada para explorar de forma contextual y sensible las dinámicas de violencia, las estrategias de afrontamiento, las redes de apoyo y la percepción del riesgo. Cualitativa (sin puntaje); cada ítem es punto de partida de la conversación.',
    isActive: true,
    displayOrder: 32,
    parentCode: 'MINJUSTICIA_RES0362_2026',
    campos: [
      { code: 'ent_01', seccion: 'Información sobre el hecho denunciado', label: '¿Podrías contarme, con tus propias palabras y a tu propio ritmo, qué situación te ha llevado a buscar ayuda hoy?', tipo: 'TEXTO_LARGO', requerido: true, orden: 1 },
      { code: 'ent_02', seccion: 'Historia familiar', label: '¿Cómo describirías las relaciones entre los miembros de tu familia durante tu infancia y adolescencia?', tipo: 'TEXTO_LARGO', orden: 2 },
      { code: 'ent_03', seccion: 'Historia familiar', label: '¿Cómo crees que tus experiencias familiares han influido en tu forma de ver las relaciones de pareja o tu rol como mujer en la sociedad?', tipo: 'TEXTO_LARGO', ayuda: 'Explorar relaciones de asimetría o desigualdad de poder.', orden: 3 },
      { code: 'ent_04', seccion: 'Historial de violencia', label: 'A lo largo de tu vida, ¿has experimentado situaciones de violencia en tus relaciones de pareja anteriores o en la actual?', tipo: 'TEXTO_LARGO', orden: 4 },
      { code: 'ent_05', seccion: 'Historial de violencia', label: 'A lo largo de tu vida, ¿has experimentado situaciones de violencia con las personas con las que cohabitas, convives o con las que has establecido una relación de cuidado?', tipo: 'TEXTO_LARGO', orden: 5 },
      { code: 'ent_06', seccion: 'Historial de violencia', label: '¿Has notado cambios en la frecuencia o intensidad de los actos violentos con el tiempo? Por ejemplo, ¿han aumentado?', tipo: 'TEXTO_LARGO', orden: 6 },
      { code: 'ent_07', seccion: 'Historial de violencia', label: 'Si has denunciado, ¿hubo alguna represalia o cambio en su comportamiento después de la denuncia?', tipo: 'TEXTO_LARGO', orden: 7 },
      { code: 'ent_08', seccion: 'Estrategias de afrontamiento', label: 'Cuando te has enfrentado a situaciones difíciles o de peligro en tu relación, ¿qué acciones has tomado para protegerte a ti misma o a tus seres queridos?', tipo: 'TEXTO_LARGO', orden: 8 },
      { code: 'ent_09', seccion: 'Estrategias de afrontamiento', label: '¿Has intentado acceder a servicios de apoyo institucional, como líneas de ayuda, centros de atención a mujeres o asesoría legal? Si es así, ¿cómo ha sido tu experiencia?', tipo: 'TEXTO_LARGO', orden: 9 },
      { code: 'ent_10', seccion: 'Redes de apoyo y acceso a servicios', label: '¿Con qué redes de apoyo (familiares, amigas, comunitarias o institucionales) cuentas actualmente a las que puedas acudir?', tipo: 'TEXTO_LARGO', ayuda: 'Reconstruido de la estructura de la sección — confirmar enunciado exacto contra el formato oficial.', orden: 10 },
      { code: 'ent_11', seccion: 'Redes de apoyo y acceso a servicios', label: '¿Te sentirías segura utilizando alguno de estos servicios?', tipo: 'TEXTO_LARGO', orden: 11 },
      { code: 'ent_12', seccion: 'Redes de apoyo y acceso a servicios', label: '¿Sientes que existen barreras que te dificultan buscar ayuda o acceder a servicios de apoyo?', tipo: 'TEXTO_LARGO', orden: 12 },
      { code: 'ent_13', seccion: 'Percepción del riesgo', label: '¿Qué tan grave crees que es el riesgo para tu vida en este momento?', tipo: 'TEXTO_LARGO', requerido: true, orden: 13 },
      { code: 'ent_14', seccion: 'Percepción del riesgo', label: 'Si las cosas siguen como están, ¿qué crees que podría suceder?', tipo: 'TEXTO_LARGO', requerido: true, orden: 14 },
      { code: 'ent_obs', seccion: 'Observaciones', label: 'Observaciones y comentarios', tipo: 'TEXTO_LARGO', orden: 15 },
    ],
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
    description: 'Pareja o expareja heterosexual. 22 ítems Sí/No agrupados en 3 factores. Población: mujeres (cis y trans) mayores de 18 años, o adolescentes mayores de 14 en condición de emancipación. Ítems críticos: 14, 15 y 18 (afirmativo → riesgo alto).',
    isActive: true,
    displayOrder: 33,
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
      // Composición de factores (manual oficial Res. 0362/2026, ficha técnica FIR-R):
      // Factor 1 — Victimización por violencia psicológica (control/coerción): ítems 3,4,6,7,8,9,11
      // Factor 2 — Riesgo contra sí misma y terceros (circunstancias amenazantes / violencia indirecta): ítems 1,2,5,10,13,19,20,21,22
      // Factor 3 — Victimización por violencia física y sexual: ítems 12,14,15,16,17,18
      // Ítems críticos (afirmativo → riesgo ALTO por override clínico): 14, 15, 18.
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
      { code: 'fir_12', seccion: 'Factor 3 — Violencia física y sexual', label: '¿El denunciado le ha amenazado o agredido con algún arma u objeto?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 12 },
      { code: 'fir_13', seccion: 'Factor 2 — Riesgo contra sí misma y terceros', label: '¿El denunciado ha sido violento o ha amenazado con hacerle daño a sus hijos, a sus seres queridos o a su mascota?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 13 },
      { code: 'fir_14', seccion: 'Factor 3 — Violencia física y sexual', label: '¿Alguna vez el denunciado la ha agredido físicamente ocasionándole heridas, dolores, morados, cortadas, fracturas o dificultad para moverse?', tipo: 'BOOLEANO', peso: 1, esCritico: true, requerido: true, orden: 14 },
      { code: 'fir_15', seccion: 'Factor 3 — Violencia física y sexual', label: '¿El denunciado ha intentado asfixiarla, ahogarla o ahorcarla?', tipo: 'BOOLEANO', peso: 1, esCritico: true, requerido: true, orden: 15 },
      { code: 'fir_16', seccion: 'Factor 3 — Violencia física y sexual', label: 'Durante las agresiones, ¿el denunciado la ha mordido, la ha quemado o ha intentado hacerlo?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 16 },
      { code: 'fir_17', seccion: 'Factor 3 — Violencia física y sexual', label: '¿El denunciado la ha forzado/obligado a mantener relaciones sexuales? (penetración, tocamientos, exposición a la pornografía, desnudez forzada, entre otros)', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 17 },
      { code: 'fir_18', seccion: 'Factor 3 — Violencia física y sexual', label: 'En los últimos hechos de agresión, ¿sufrió lesiones graves que pusieron su vida en peligro?', tipo: 'BOOLEANO', peso: 1, esCritico: true, requerido: true, orden: 18 },
      { code: 'fir_19', seccion: 'Factor 2 — Riesgo contra sí misma y terceros', label: 'En los últimos hechos de agresión, ¿recibió amenazas contra su vida?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 19 },
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
    displayOrder: 34,
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

  // ── C2 — Valoración de riesgo en contextos de cohabitación y cuidado ─────────
  // Hijo de la batería Res.0362/2026. Relaciones de cohabitación/cuidado (familiares
  // o no; agresor puede ser hombre o mujer). 34 ítems Sí/No, 4 subescalas.
  // Ponderado: críticos 16/17/26=4, 21/27=3, 14=2; resto=1. Máx 48. Continuo.
  // Suma directa 0–34; "sus agresores" puede ser una o varias personas. Último año.
  {
    code: 'RES0362_C2',
    name: 'C2 — Valoración de riesgo en contextos de cohabitación y cuidado',
    norma: 'Instrumento C2 (Res. 0362/2026 Minjusticia) — Ley 2126/2021',
    version: 'V.1.0',
    profesion: 'AMBOS',
    appliesTo: 'VIOLENCIA_INTRAFAMILIAR',
    assessmentType: 'RIESGO',
    description: 'Para relaciones de cohabitación y cuidado (familiares o no; agresor hombre o mujer). 34 ítems Sí/No en 4 subescalas. Referido al último año. Continuo: suma directa 0–34 y ponderada máx 48; a mayor puntaje, mayor riesgo.',
    isActive: true,
    displayOrder: 35,
    parentCode: 'MINJUSTICIA_RES0362_2026',
    scoringConfig: { maxScore: 48 }, // continuo; ítems críticos con mayor peso predictivo
    campos: [
      // Subescala 1 — Condiciones contextuales de vulnerabilidad
      { code: 'c2_01', seccion: 'Subescala 1 — Condiciones contextuales de vulnerabilidad', label: '¿En su comunidad se tolera la violencia contra las mujeres?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 1 },
      { code: 'c2_02', seccion: 'Subescala 1 — Condiciones contextuales de vulnerabilidad', label: '¿En su comunidad han ocurrido feminicidios o ataques a mujeres?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 2 },
      { code: 'c2_03', seccion: 'Subescala 1 — Condiciones contextuales de vulnerabilidad', label: '¿La presencia de grupos armados en su comunidad ha aumentado el riesgo de violencia contra usted?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 3 },
      { code: 'c2_04', seccion: 'Subescala 1 — Condiciones contextuales de vulnerabilidad', label: '¿Su familia le ha negado apoyo en situaciones de riesgo de violencia?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 4 },
      { code: 'c2_05', seccion: 'Subescala 1 — Condiciones contextuales de vulnerabilidad', label: '¿Su familia le ha negado ayuda económica cuando lo ha necesitado?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 5 },
      { code: 'c2_06', seccion: 'Subescala 1 — Condiciones contextuales de vulnerabilidad', label: '¿Ha carecido de orientación o consejos de su entorno para enfrentar las situaciones de riesgo de violencia?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 6 },
      { code: 'c2_07', seccion: 'Subescala 1 — Condiciones contextuales de vulnerabilidad', label: '¿Ha tenido dificultades para el acceso a organizaciones de apoyo a mujeres en riesgo de violencia?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 7 },
      { code: 'c2_08', seccion: 'Subescala 1 — Condiciones contextuales de vulnerabilidad', label: '¿Ha tenido dificultades para el acceso a atención y apoyo legal del Estado?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 8 },
      { code: 'c2_09', seccion: 'Subescala 1 — Condiciones contextuales de vulnerabilidad', label: '¿Sus condiciones de vivienda le dificultan escapar de situaciones de violencia que ha vivido?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 9 },
      { code: 'c2_10', seccion: 'Subescala 1 — Condiciones contextuales de vulnerabilidad', label: '¿Su condición de dependencia física ha aumentado su vulnerabilidad a sufrir violencia por parte de sus agresores?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 10 },
      { code: 'c2_11', seccion: 'Subescala 1 — Condiciones contextuales de vulnerabilidad', label: '¿Ha tenido conflictos con sus agresores debido a la falta de recursos económicos?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 11 },
      // Subescala 2 — Antecedentes de violencia y maltrato directo
      { code: 'c2_12', seccion: 'Subescala 2 — Antecedentes de violencia y maltrato directo', label: '¿Su salud se ha deteriorado por la falta de cuidados adecuados por parte de sus agresores?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 12 },
      { code: 'c2_13', seccion: 'Subescala 2 — Antecedentes de violencia y maltrato directo', label: '¿Sus agresores le han negado cuidados necesarios para su salud física o mental?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 13 },
      { code: 'c2_14', seccion: 'Subescala 2 — Antecedentes de violencia y maltrato directo', label: '¿Sus agresores han descuidado sus necesidades básicas (comida, higiene, salud)?', tipo: 'BOOLEANO', peso: 2, esCritico: true, requerido: true, orden: 14 },
      { code: 'c2_15', seccion: 'Subescala 2 — Antecedentes de violencia y maltrato directo', label: '¿Sus agresores la han humillado haciéndola sentir inferior, sin valor o atemorizada?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 15 },
      { code: 'c2_16', seccion: 'Subescala 2 — Antecedentes de violencia y maltrato directo', label: '¿Sus agresores la han golpeado causándole daño físico?', tipo: 'BOOLEANO', peso: 4, esCritico: true, requerido: true, orden: 16 },
      { code: 'c2_17', seccion: 'Subescala 2 — Antecedentes de violencia y maltrato directo', label: '¿Sus agresores han intentado asfixiarla o estrangularla?', tipo: 'BOOLEANO', peso: 4, esCritico: true, requerido: true, orden: 17 },
      // Subescala 3 — Control, coerción y dominación
      { code: 'c2_18', seccion: 'Subescala 3 — Control, coerción y dominación', label: '¿Sus agresores han controlado o intentado controlar constantemente sus actividades cotidianas?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 18 },
      { code: 'c2_19', seccion: 'Subescala 3 — Control, coerción y dominación', label: '¿Sus agresores la han aislado de familia, amigos o actividades sociales, laborales o educativas?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 19 },
      { code: 'c2_20', seccion: 'Subescala 3 — Control, coerción y dominación', label: '¿Sus agresores han usado sus recursos económicos sin su permiso?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 20 },
      { code: 'c2_21', seccion: 'Subescala 3 — Control, coerción y dominación', label: '¿Sus agresores usan su enfermedad o discapacidad como excusa para agredirla o controlarla?', tipo: 'BOOLEANO', peso: 3, esCritico: true, requerido: true, orden: 21 },
      { code: 'c2_22', seccion: 'Subescala 3 — Control, coerción y dominación', label: '¿Sus agresores le han impedido trabajar, estudiar o manejar su propio dinero?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 22 },
      { code: 'c2_23', seccion: 'Subescala 3 — Control, coerción y dominación', label: '¿La falta de dinero debida a sabotaje o control por parte de sus agresores le impide dejar la situación violenta?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 23 },
      { code: 'c2_24', seccion: 'Subescala 3 — Control, coerción y dominación', label: '¿Sus agresores han usado sus miedos para manipularla?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 24 },
      { code: 'c2_25', seccion: 'Subescala 3 — Control, coerción y dominación', label: '¿Sus agresores la han manipulado para hacerla sentir dependiente y controlar sus decisiones?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 25 },
      // Subescala 4 — Perfil y características del agresor
      { code: 'c2_26', seccion: 'Subescala 4 — Perfil y características del agresor', label: '¿Sus agresores tienen acceso a armas?', tipo: 'BOOLEANO', peso: 4, esCritico: true, requerido: true, orden: 26 },
      { code: 'c2_27', seccion: 'Subescala 4 — Perfil y características del agresor', label: '¿Sus agresores se vuelven más violentos cuando consumen alcohol o drogas o cuando no pueden hacerlo?', tipo: 'BOOLEANO', peso: 3, esCritico: true, requerido: true, orden: 27 },
      { code: 'c2_28', seccion: 'Subescala 4 — Perfil y características del agresor', label: '¿Sus agresores han tenido problemas legales debido a su agresividad y transgresión de normas?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 28 },
      { code: 'c2_29', seccion: 'Subescala 4 — Perfil y características del agresor', label: '¿Sus agresores justifican la violencia como algo "normal" en hombres?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 29 },
      { code: 'c2_30', seccion: 'Subescala 4 — Perfil y características del agresor', label: '¿Sus agresores han maltratado animales?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 30 },
      { code: 'c2_31', seccion: 'Subescala 4 — Perfil y características del agresor', label: '¿Sus agresores le dicen que son las mujeres quienes deben hacer tareas domésticas y de cuidado?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 31 },
      { code: 'c2_32', seccion: 'Subescala 4 — Perfil y características del agresor', label: '¿Sus agresores muestran agotamiento extremo frecuente?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 32 },
      { code: 'c2_33', seccion: 'Subescala 4 — Perfil y características del agresor', label: '¿Sus agresores reaccionan con violencia ante situaciones cotidianas?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 33 },
      { code: 'c2_34', seccion: 'Subescala 4 — Perfil y características del agresor', label: '¿Sus agresores desprecian, se burlan o tratan mal a las personas mayores o con discapacidad?', tipo: 'BOOLEANO', peso: 1, requerido: true, orden: 34 },
    ],
  },
];
