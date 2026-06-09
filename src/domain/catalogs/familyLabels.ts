/**
 * ============================================================================
 * ETIQUETAS LEGIBLES DE LOS ENUMS DE DOMINIO FAMILIAR
 * ============================================================================
 * Mapas valor-enum → texto en español para usar en las pantallas de admin.
 * Centralizar las etiquetas evita textos divergentes entre vistas.
 * ============================================================================
 */

export const PARTY_ROLE_LABELS: Record<string, string> = {
  VICTIMA: 'Víctima',
  AGRESOR: 'Presunto agresor',
  NNA: 'Niño, niña o adolescente',
  TESTIGO: 'Testigo',
  DENUNCIANTE: 'Denunciante',
  INTERVINIENTE: 'Interviniente',
};

export const VIOLENCE_TYPE_LABELS: Record<string, string> = {
  FISICA: 'Física',
  PSICOLOGICA: 'Psicológica',
  SEXUAL: 'Sexual',
  ECONOMICA: 'Económica',
  PATRIMONIAL: 'Patrimonial',
  NEGLIGENCIA: 'Negligencia',
  ABANDONO: 'Abandono',
};

export const CASE_MODALITY_LABELS: Record<string, string> = {
  VIOLENCIA_INTRAFAMILIAR: 'Violencia intrafamiliar',
  CONFLICTO_FAMILIAR: 'Conflicto familiar',
  CUSTODIA_ALIMENTOS_VISITAS: 'Custodia, alimentos y visitas',
  MEDIDA_PROTECCION_NNA: 'Medida de protección NNA',
  PARD: 'Restablecimiento de derechos (PARD)',
  CONCILIACION_FAMILIAR: 'Conciliación familiar',
  ORIENTACION_JURIDICA: 'Orientación jurídica',
};

export const PROTECTION_MEASURE_TYPE_LABELS: Record<string, string> = {
  MEDIDA_POLICIA: 'Auxilio policial',
  CENTROS_REFUGIO: 'Remisión a casa de refugio',
  PROHIBICION_APROXIMACION: 'Prohibición de aproximación',
  SUSPENSION_CONVIVENCIA: 'Suspensión de convivencia',
  REINTEGRO_AL_HOGAR: 'Reintegro al hogar',
  TRATAMIENTO_REEDUCATIVO: 'Tratamiento reeducativo',
  MEDIDA_NNA: 'Medida de protección NNA',
  ALIMENTOS_PROVISIONALES: 'Alimentos provisionales',
  MEDIDA_REPARACION: 'Medida de reparación',
  OTRA: 'Otra',
};

export const MEASURE_STATUS_LABELS: Record<string, string> = {
  VIGENTE: 'Vigente',
  INCUMPLIDA: 'Incumplida',
  REVOCADA: 'Revocada',
  VENCIDA: 'Vencida',
  CUMPLIDA: 'Cumplida',
};

export const HEARING_TYPE_LABELS: Record<string, string> = {
  CONCILIACION: 'Conciliación',
  NOTIFICACION: 'Notificación',
  DESCARGOS: 'Descargos',
  FALLO: 'Fallo',
  SEGUIMIENTO: 'Seguimiento',
  VERIFICACION: 'Verificación',
  RESTABLECIMIENTO: 'Restablecimiento (PARD)',
  INCUMPLIMIENTO: 'Incumplimiento',
};

export const ASSESSMENT_TYPE_LABELS: Record<string, string> = {
  PSICOLOGICA: 'Psicológica',
  TRABAJO_SOCIAL: 'Trabajo social',
  JURIDICA: 'Jurídica',
  MEDICA: 'Médica / forense',
  INTERDISCIPLINARIA: 'Interdisciplinaria',
  RIESGO: 'Valoración de riesgo',
};

export const PARD_STAGE_LABELS: Record<string, string> = {
  APERTURA: 'Apertura',
  DEFINICION_MEDIDAS: 'Definición de medidas',
  SEGUIMIENTO: 'Seguimiento',
  CIERRE: 'Cierre',
};

export const RISK_LEVEL_LABELS: Record<string, string> = {
  BAJO: 'Bajo',
  MEDIO: 'Medio',
  ALTO: 'Alto',
  EXTREMO: 'Extremo',
};

/** Valores de enum como arrays (para selects/checkboxes). */
export const PARTY_ROLES = Object.keys(PARTY_ROLE_LABELS);
export const VIOLENCE_TYPES = Object.keys(VIOLENCE_TYPE_LABELS);
