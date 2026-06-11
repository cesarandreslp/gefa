/**
 * ============================================================================
 * MAPA DE CAMPOS CANÓNICOS DE INSTRUMENTOS (RF‑01)
 * ============================================================================
 * Asocia cada `campoCode` de un instrumento de valoración con el dato real que
 * ya vive estructurado en el expediente (`Person` de una parte, o el `Case`).
 * Es la fuente del PRELLENADO de lectura (RF‑02): al abrir un instrumento, sus
 * campos llegan precargados desde aquí — el profesional solo confirma/completa,
 * en vez de re-teclear identidad/vínculo/violencia que la recepción ya capturó.
 *
 * Solo se mapean campos con un origen canónico REAL hoy (lectura segura). Los
 * que no tienen contraparte estructurada (datos clínicos, secciones del NNA del
 * ICBF, dependencia económica) se dejan sin mapear hasta que exista el dato.
 * Ampliar este mapa NO requiere migración.
 * ============================================================================
 */

export type PartyRoleKey = 'VICTIMA' | 'AGRESOR' | 'NNA';

/** Campo de `Person` legible para prellenado. */
export type PersonField =
  | 'documentType' | 'documentNumber'
  | 'firstName' | 'secondName' | 'firstLastName' | 'secondLastName'
  | 'birthDate' | 'gender' | 'email' | 'phone' | 'address' | 'city' | 'department' | 'neighborhood';

/** Transformación aplicada al valor canónico antes de entregarlo al formato. */
export type PrefillTransform =
  | 'dateISO'                 // Date → 'YYYY-MM-DD' (campos FECHA)
  | 'age'                     // birthDate → edad en años (campos NUMERO)
  | 'docTypeCaracterizacion'  // documentType Person → opciones CC/CE/TI/PAS/PEP/OTRO
  | 'docTypeAgresor'          // documentType Person → opciones CC/CE/TI/OTRO/NS
  | 'sexo';                   // gender M/F → HOMBRE/MUJER

export type PrefillSource =
  | { role: PartyRoleKey; kind: 'field'; field: PersonField; transform?: PrefillTransform }
  | { role: PartyRoleKey; kind: 'fullName' }
  | { role: PartyRoleKey; kind: 'age' }
  | { kind: 'violenceSingle' };

/**
 * campoCode → de dónde se prellena. Cobertura inicial: caracterización de la
 * Res. 0362/2026 (víctima + agresor/a) y tipo de violencia. Es la mayor fuente
 * de re-tecleo y el formato que diligencia la recepción.
 */
export const INSTRUMENTO_PREFILL_MAP: Record<string, PrefillSource> = {
  // ── Caracterización — identificación de la víctima ──
  v_nombre:      { role: 'VICTIMA', kind: 'fullName' },
  v_fecha_nac:   { role: 'VICTIMA', kind: 'field', field: 'birthDate', transform: 'dateISO' },
  v_edad:        { role: 'VICTIMA', kind: 'age' },
  v_tipo_doc:    { role: 'VICTIMA', kind: 'field', field: 'documentType', transform: 'docTypeCaracterizacion' },
  v_num_doc:     { role: 'VICTIMA', kind: 'field', field: 'documentNumber' },
  v_celular:     { role: 'VICTIMA', kind: 'field', field: 'phone' },
  v_correo:      { role: 'VICTIMA', kind: 'field', field: 'email' },
  v_departamento:{ role: 'VICTIMA', kind: 'field', field: 'department' },
  v_municipio:   { role: 'VICTIMA', kind: 'field', field: 'city' },
  v_direccion:   { role: 'VICTIMA', kind: 'field', field: 'address' },
  v_sexo:        { role: 'VICTIMA', kind: 'field', field: 'gender', transform: 'sexo' },

  // ── Caracterización — identificación del agresor/a ──
  a_nombre:      { role: 'AGRESOR', kind: 'fullName' },
  a_fecha_nac:   { role: 'AGRESOR', kind: 'field', field: 'birthDate', transform: 'dateISO' },
  a_edad:        { role: 'AGRESOR', kind: 'age' },
  a_tipo_doc:    { role: 'AGRESOR', kind: 'field', field: 'documentType', transform: 'docTypeAgresor' },
  a_num_doc:     { role: 'AGRESOR', kind: 'field', field: 'documentNumber' },
  a_celular:     { role: 'AGRESOR', kind: 'field', field: 'phone' },
  a_municipio:   { role: 'AGRESOR', kind: 'field', field: 'city' },
  a_sexo:        { role: 'AGRESOR', kind: 'field', field: 'gender', transform: 'sexo' },

  // ── Caracterización — detalles de la violencia ──
  viol_tipo:     { kind: 'violenceSingle' },
};
