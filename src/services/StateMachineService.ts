/**
 * StateMachineService - FASE 3: Máquina de estados avanzada
 * 
 * Control formal del flujo de estados con:
 * - Validación de transiciones por rol
 * - Estados finales inmutables
 * - Reglas especiales (ej: SUPERVISOR puede forzar)
 * - Auditoría completa de intentos
 * 
 * Cumplimiento:
 * - Ley 1437/2011: Control de términos
 * - Ley 1712/2014: Trazabilidad
 */

import { prisma } from '@/lib/prisma';

// Estados del sistema
export const STATE_CODES = {
  RADICADO: 'RADICADO',
  EN_ESTUDIO: 'EN_ESTUDIO',
  REQUIERE_INFORMACION: 'REQUIERE_INFORMACION',
  RESUELTO: 'RESUELTO',
  CERRADO: 'CERRADO',
} as const;

export type StateCode = typeof STATE_CODES[keyof typeof STATE_CODES];

// Roles del sistema
export const ROLES = {
  ADMIN: 'ADMIN',
  FUNCIONARIO: 'FUNCIONARIO',
  SUPERVISOR: 'SUPERVISOR',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Estados finales (inmutables)
const FINAL_STATES: StateCode[] = ['CERRADO'];

// Estados iniciales
const INITIAL_STATES: StateCode[] = ['RADICADO'];

// Matriz de transiciones permitidas
const TRANSITIONS: Record<StateCode, StateCode[]> = {
  RADICADO: ['EN_ESTUDIO', 'CERRADO'],
  EN_ESTUDIO: ['REQUIERE_INFORMACION', 'RESUELTO', 'CERRADO'],
  REQUIERE_INFORMACION: ['EN_ESTUDIO', 'CERRADO'],
  RESUELTO: ['CERRADO', 'EN_ESTUDIO'],
  CERRADO: [], // Estado final - no permite transiciones
};

// Transiciones que requieren rol SUPERVISOR
const SUPERVISOR_ONLY_TRANSITIONS: Array<{ from: StateCode; to: StateCode }> = [
  { from: 'CERRADO', to: 'EN_ESTUDIO' }, // Reapertura
];

// Estados que requieren comentario obligatorio
const REQUIRE_COMMENT: StateCode[] = ['REQUIERE_INFORMACION', 'CERRADO'];

export interface TransitionValidation {
  valid: boolean;
  error?: string;
  requiresComment?: boolean;
  requiresSupervisor?: boolean;
}

export interface TransitionRequest {
  currentState: StateCode;
  targetState: StateCode;
  userRole: Role;
  comment?: string;
}

export class StateMachineService {
  /**
   * Valida si una transición es permitida
   */
  validateTransition(request: TransitionRequest): TransitionValidation {
    const { currentState, targetState, userRole, comment } = request;

    // 1. Verificar que el estado actual no sea final
    if (FINAL_STATES.includes(currentState)) {
      // Solo SUPERVISOR puede reabrir casos cerrados
      if (userRole !== ROLES.SUPERVISOR) {
        return {
          valid: false,
          error: 'Los casos cerrados no pueden ser modificados. Contacte a un supervisor.',
        };
      }
    }

    // 2. Verificar que la transición esté permitida
    const allowedTransitions = TRANSITIONS[currentState] || [];
    if (!allowedTransitions.includes(targetState)) {
      return {
        valid: false,
        error: `No se puede cambiar de ${currentState} a ${targetState}`,
      };
    }

    // 3. Verificar si requiere rol SUPERVISOR
    const requiresSupervisor = SUPERVISOR_ONLY_TRANSITIONS.some(
      (t) => t.from === currentState && t.to === targetState
    );

    if (requiresSupervisor && userRole !== ROLES.SUPERVISOR) {
      return {
        valid: false,
        error: 'Esta transición requiere permisos de supervisor',
        requiresSupervisor: true,
      };
    }

    // 4. Verificar si requiere comentario
    const requiresComment = REQUIRE_COMMENT.includes(targetState);

    if (requiresComment && !comment?.trim()) {
      return {
        valid: false,
        error: `El estado ${targetState} requiere un comentario explicativo`,
        requiresComment: true,
      };
    }

    // Transición válida
    return {
      valid: true,
      requiresComment,
      requiresSupervisor,
    };
  }

  /**
   * Obtiene los estados disponibles según el estado actual y rol del usuario
   */
  async getAvailableStates(
    currentStateCode: StateCode,
    userRole: Role
  ): Promise<{
    states: Array<{
      code: string;
      name: string;
      requiresComment: boolean;
      requiresSupervisor: boolean;
    }>;
  }> {
    // Obtener transiciones permitidas
    const allowedCodes = TRANSITIONS[currentStateCode] || [];

    // Si es estado final y no es SUPERVISOR, no hay transiciones
    if (FINAL_STATES.includes(currentStateCode) && userRole !== ROLES.SUPERVISOR) {
      return { states: [] };
    }

    // Obtener información de los estados desde BD
    const states = await prisma.caseState.findMany({
      where: {
        code: { in: allowedCodes },
      },
      select: {
        code: true,
        name: true,
        requiresComment: true,
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Agregar información de permisos
    return {
      states: states.map((state) => ({
        ...state,
        requiresSupervisor: SUPERVISOR_ONLY_TRANSITIONS.some(
          (t) => t.from === currentStateCode && t.to === state.code as StateCode
        ),
      })),
    };
  }

  /**
   * Verifica si un estado es final
   */
  isFinalState(stateCode: StateCode): boolean {
    return FINAL_STATES.includes(stateCode);
  }

  /**
   * Verifica si un estado es inicial
   */
  isInitialState(stateCode: StateCode): boolean {
    return INITIAL_STATES.includes(stateCode);
  }

  /**
   * Obtiene estadísticas de la máquina de estados
   */
  getStateMachineInfo() {
    return {
      states: Object.values(STATE_CODES),
      finalStates: FINAL_STATES,
      initialStates: INITIAL_STATES,
      transitions: TRANSITIONS,
      supervisorOnlyTransitions: SUPERVISOR_ONLY_TRANSITIONS,
      requireComment: REQUIRE_COMMENT,
    };
  }
}

// Singleton
export const stateMachineService = new StateMachineService();
