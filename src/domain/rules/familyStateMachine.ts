/**
 * ============================================================================
 * MÁQUINA DE ESTADOS — WORKFLOW DE COMISARÍA DE FAMILIA (GEFA)
 * ============================================================================
 * Define las transiciones válidas del expediente de familia y su validación.
 * Independiente del StateMachineService heredado (que usa estados de petición).
 * Apoyado en el catálogo `FAMILY_CASE_STATES` para nombres y `requiresComment`.
 *
 * Flujo:
 *   RADICADO → EN_VALORACION → EN_AUDIENCIA → MEDIDA_ADOPTADA → EN_SEGUIMIENTO → CERRADO
 *   (REMITIDO es salida por falta de competencia; ambos finales son reabribles
 *    solo por ADMIN/DIRECTOR).
 * ============================================================================
 */

import { FAMILY_CASE_STATES } from '@/domain/catalogs/familyCaseStates';

/** Transiciones permitidas por estado de origen. */
export const FAMILY_TRANSITIONS: Record<string, string[]> = {
  RADICADO: ['EN_VALORACION', 'EN_AUDIENCIA', 'REMITIDO', 'CERRADO'],
  EN_VALORACION: ['EN_AUDIENCIA', 'MEDIDA_ADOPTADA', 'REMITIDO', 'CERRADO'],
  EN_AUDIENCIA: ['MEDIDA_ADOPTADA', 'EN_SEGUIMIENTO', 'REMITIDO', 'CERRADO'],
  MEDIDA_ADOPTADA: ['EN_SEGUIMIENTO', 'CERRADO'],
  EN_SEGUIMIENTO: ['MEDIDA_ADOPTADA', 'CERRADO'],
  REMITIDO: [],
  CERRADO: [],
};

/** Estados finales del workflow de familia. */
export const FAMILY_FINAL_STATES = ['REMITIDO', 'CERRADO'];

/** Roles que pueden reabrir un caso finalizado. */
export const FAMILY_REOPEN_ROLES = ['ADMIN', 'DIRECTOR'];

/** Estados a los que se puede reabrir un caso finalizado. */
export const FAMILY_REOPEN_TARGETS = ['EN_SEGUIMIENTO', 'EN_VALORACION'];

const STATE_BY_CODE = Object.fromEntries(FAMILY_CASE_STATES.map((s) => [s.code, s]));

export interface FamilyTransitionResult {
  valid: boolean;
  error?: string;
  requiresComment?: boolean;
  isReopen?: boolean;
}

/**
 * Valida una transición del workflow de familia.
 * @param fromCode estado actual
 * @param toCode estado destino
 * @param roleCode rol base del usuario (ADMIN, DIRECTOR, FUNCIONARIO, …)
 * @param comment comentario aportado (para validar los estados que lo exigen)
 */
export function validateFamilyTransition(
  fromCode: string,
  toCode: string,
  roleCode: string,
  comment?: string
): FamilyTransitionResult {
  if (!STATE_BY_CODE[fromCode]) {
    return { valid: false, error: `Estado actual desconocido: ${fromCode}` };
  }
  if (!STATE_BY_CODE[toCode]) {
    return { valid: false, error: `Estado destino desconocido: ${toCode}` };
  }
  if (fromCode === toCode) {
    return { valid: false, error: 'El caso ya está en ese estado' };
  }

  const isFromFinal = FAMILY_FINAL_STATES.includes(fromCode);
  const isReopen = isFromFinal;

  if (isFromFinal) {
    // Reapertura: solo ADMIN/DIRECTOR y a un estado permitido
    if (!FAMILY_REOPEN_ROLES.includes(roleCode)) {
      return { valid: false, error: 'Solo ADMIN o DIRECTOR pueden reabrir un caso finalizado.' };
    }
    if (!FAMILY_REOPEN_TARGETS.includes(toCode)) {
      return {
        valid: false,
        error: `Un caso finalizado solo puede reabrirse a: ${FAMILY_REOPEN_TARGETS.join(', ')}`,
      };
    }
  } else {
    // Transición normal según la matriz
    const allowed = FAMILY_TRANSITIONS[fromCode] || [];
    if (!allowed.includes(toCode)) {
      return { valid: false, error: `No se permite pasar de ${fromCode} a ${toCode}.` };
    }
  }

  // Comentario obligatorio: por metadata del estado destino o por reapertura
  const requiresComment = STATE_BY_CODE[toCode].requiresComment || isReopen;
  if (requiresComment && !comment?.trim()) {
    return { valid: false, error: 'Este cambio de estado requiere un comentario.', requiresComment: true, isReopen };
  }

  return { valid: true, requiresComment, isReopen };
}

/**
 * Estados disponibles desde el estado actual para un rol dado (para la UI).
 */
export function availableFamilyTransitions(
  fromCode: string,
  roleCode: string
): Array<{ code: string; name: string; requiresComment: boolean }> {
  let targets: string[];
  if (FAMILY_FINAL_STATES.includes(fromCode)) {
    targets = FAMILY_REOPEN_ROLES.includes(roleCode) ? FAMILY_REOPEN_TARGETS : [];
  } else {
    targets = FAMILY_TRANSITIONS[fromCode] || [];
  }
  return targets
    .filter((code) => STATE_BY_CODE[code])
    .map((code) => ({
      code,
      name: STATE_BY_CODE[code].name,
      requiresComment: STATE_BY_CODE[code].requiresComment || FAMILY_FINAL_STATES.includes(fromCode),
    }));
}
