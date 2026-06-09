/**
 * CaseStateService - Gestión del ciclo de vida del expediente
 * 
 * FASE 2: Estados y transiciones del expediente
 * 
 * Estados obligatorios (definidos en tabla CaseState):
 * - RADICADO: Estado inicial al radicar
 * - EN_ESTUDIO: Funcionario está analizando
 * - REQUIERE_INFORMACION: Se necesita información adicional
 * - RESUELTO: Caso resuelto pendiente de cierre
 * - CERRADO: Caso cerrado definitivamente
 * 
 * Cumplimiento:
 * - Ley 1437/2011 Art. 14: Términos procesales
 * - Ley 1755/2015: Derecho de petición
 */

import { prisma } from '@/lib/prisma';
import { auditService } from './AuditService';

// Códigos de estados (alineados con tabla CaseState)
export const CASE_STATE_CODES = {
  RADICADO: 'RADICADO',
  EN_ESTUDIO: 'EN_ESTUDIO',
  REQUIERE_INFORMACION: 'REQUIERE_INFORMACION',
  RESUELTO: 'RESUELTO',
  CERRADO: 'CERRADO',
} as const;

export type CaseStateCode = typeof CASE_STATE_CODES[keyof typeof CASE_STATE_CODES];

// Matriz de transiciones permitidas (por código de estado)
const ALLOWED_TRANSITIONS: Record<CaseStateCode, CaseStateCode[]> = {
  RADICADO: ['EN_ESTUDIO', 'CERRADO'],
  EN_ESTUDIO: ['REQUIERE_INFORMACION', 'RESUELTO', 'CERRADO'],
  REQUIERE_INFORMACION: ['EN_ESTUDIO', 'CERRADO'],
  RESUELTO: ['CERRADO', 'EN_ESTUDIO'],
  CERRADO: [],
};

export interface ChangeStateInput {
  tenantId: string;
  caseId: string;
  newStateCode: CaseStateCode;
  userId: string;
  userEmail: string;
  userRole: string;
  comment?: string;
  ipAddress: string;
  userAgent: string;
}

export class CaseStateService {
  /**
   * Inicializa los estados en la base de datos si no existen
   * Debe ejecutarse en el seed o al inicio de la app
   */
  async ensureStatesExist() {
    const states = [
      {
        code: 'RADICADO',
        name: 'Radicado',
        description: 'Solicitud recibida y radicada oficialmente',
        isInitial: true,
        isFinal: false,
        requiresComment: false,
        color: '#3B82F6',
        displayOrder: 1,
      },
      {
        code: 'EN_ESTUDIO',
        name: 'En Estudio',
        description: 'Funcionario está analizando el caso',
        isInitial: false,
        isFinal: false,
        requiresComment: false,
        color: '#F59E0B',
        displayOrder: 2,
      },
      {
        code: 'REQUIERE_INFORMACION',
        name: 'Requiere Información',
        description: 'Se necesita información adicional del ciudadano',
        isInitial: false,
        isFinal: false,
        requiresComment: true,
        color: '#EF4444',
        displayOrder: 3,
      },
      {
        code: 'RESUELTO',
        name: 'Resuelto',
        description: 'Caso resuelto, pendiente de cierre',
        isInitial: false,
        isFinal: false,
        requiresComment: false,
        color: '#10B981',
        displayOrder: 4,
      },
      {
        code: 'CERRADO',
        name: 'Cerrado',
        description: 'Caso cerrado definitivamente',
        isInitial: false,
        isFinal: true,
        requiresComment: true,
        color: '#6B7280',
        displayOrder: 5,
      },
    ];

    for (const state of states) {
      await prisma.caseState.upsert({
        where: { code: state.code },
        update: {},
        create: state,
      });
    }
  }

  /**
   * Valida si una transición de estado es permitida
   */
  private isTransitionAllowed(fromCode: string, toCode: CaseStateCode): boolean {
    const allowedNextStates = ALLOWED_TRANSITIONS[fromCode as CaseStateCode];
    return allowedNextStates ? allowedNextStates.includes(toCode) : false;
  }

  /**
   * Cambia el estado de un caso
   * Valida transiciones y registra en historial y auditoría
   */
  async changeState(input: ChangeStateInput): Promise<{
    success: boolean;
    case?: {
      id: string;
      stateCode: string;
      stateName: string;
      filingNumber: string;
    };
    error?: string;
  }> {
    try {
      // 1. Obtener caso actual con su estado
      const existingCase = await prisma.case.findFirst({
        where: { id: input.caseId, tenantId: input.tenantId },
        include: {
          state: true,
        },
      });

      if (!existingCase) {
        return {
          success: false,
          error: 'Caso no encontrado',
        };
      }

      // 2. Obtener nuevo estado por código
      const newState = await prisma.caseState.findUnique({
        where: { code: input.newStateCode },
      });

      if (!newState) {
        return {
          success: false,
          error: 'Estado no válido',
        };
      }

      // 3. Validar que no sea el mismo estado
      if (existingCase.state.code === input.newStateCode) {
        return {
          success: false,
          error: 'El caso ya está en ese estado',
        };
      }

      // 4. Validar transición permitida
      if (!this.isTransitionAllowed(existingCase.state.code, input.newStateCode)) {
        return {
          success: false,
          error: `Transición no permitida: ${existingCase.state.code} → ${input.newStateCode}`,
        };
      }

      // 5. Validar comentario si es requerido
      if (newState.requiresComment && !input.comment) {
        return {
          success: false,
          error: `El estado ${newState.name} requiere un comentario`,
        };
      }

      // 6. Actualizar estado del caso
      const updatedCase = await prisma.case.update({
        where: { id: input.caseId },
        data: {
          stateId: newState.id,
          updatedAt: new Date(),
          ...(input.newStateCode === 'CERRADO' && {
            closedAt: new Date(),
            closedBy: input.userId,
          }),
        },
        include: {
          state: true,
        },
      });

      // 7. Registrar en historial de estados
      await prisma.caseStateHistory.create({
        data: {
          tenantId: input.tenantId,
          caseId: input.caseId,
          fromStateId: existingCase.stateId,
          toStateId: newState.id,
          changedBy: input.userId,
          comment: input.comment,
          timestamp: new Date(),
        },
      });

      // 8. Registrar en auditoría
      await auditService.logStatusChanged(
        input.caseId,
        input.userId,
        input.userEmail,
        input.userRole,
        input.tenantId,
        input.ipAddress,
        input.userAgent,
        existingCase.state.code,
        input.newStateCode
      );

      return {
        success: true,
        case: {
          id: updatedCase.id,
          stateCode: updatedCase.state.code,
          stateName: updatedCase.state.name,
          filingNumber: updatedCase.filingNumber,
        },
      };
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      return {
        success: false,
        error: 'Error interno al cambiar estado',
      };
    }
  }

  /**
   * Obtiene el historial de estados de un caso
   */
  async getStateHistory(caseId: string, tenantId: string) {
    try {
      const history = await prisma.caseStateHistory.findMany({
        where: { caseId, tenantId },
        include: {
          fromState: true,
          toState: true,
          changedByUser: {
            select: {
              id: true,
              email: true,
              fullName: true,
              
            },
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      return {
        success: true,
        history,
      };
    } catch (error) {
      console.error('Error al obtener historial:', error);
      return {
        success: false,
        error: 'Error al obtener historial de estados',
        history: [],
      };
    }
  }

  /**
   * Obtiene los estados disponibles para un caso según su estado actual
   */
  async getAvailableStates(caseId: string, tenantId: string) {
    try {
      const existingCase = await prisma.case.findFirst({
        where: { id: caseId, tenantId },
        include: { state: true },
      });

      if (!existingCase) {
        return {
          success: false,
          error: 'Caso no encontrado',
          states: [],
        };
      }

      const allowedCodes = ALLOWED_TRANSITIONS[existingCase.state.code as CaseStateCode] || [];

      const availableStates = await prisma.caseState.findMany({
        where: {
          code: { in: allowedCodes },
          isActive: true,
        },
        orderBy: { displayOrder: 'asc' },
      });

      return {
        success: true,
        states: availableStates,
      };
    } catch (error) {
      console.error('Error al obtener estados disponibles:', error);
      return {
        success: false,
        error: 'Error al obtener estados disponibles',
        states: [],
      };
    }
  }

  /**
   * Obtiene estadísticas de casos por estado
   */
  async getStatsByState(tenantId?: string) {
    try {
      const stats = await prisma.case.groupBy({
        by: ['stateId'],
        where: tenantId ? { tenantId } : {},
        _count: {
          id: true,
        },
      });

      // Obtener nombres de estados
      const stateIds = stats.map((stat) => stat.stateId);
      const states = await prisma.caseState.findMany({
        where: { id: { in: stateIds } },
      });

      const stateMap = new Map(states.map((s) => [s.id, s]));

      return {
        success: true,
        stats: stats.map((stat) => {
          const state = stateMap.get(stat.stateId);
          return {
            stateId: stat.stateId,
            stateCode: state?.code || 'UNKNOWN',
            stateName: state?.name || 'Desconocido',
            count: stat._count.id,
          };
        }),
      };
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return {
        success: false,
        error: 'Error al obtener estadísticas',
        stats: [],
      };
    }
  }

  /**
   * Obtiene todos los estados disponibles
   */
  async getAllStates() {
    try {
      const states = await prisma.caseState.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      });

      return {
        success: true,
        states,
      };
    } catch (error) {
      console.error('Error al obtener estados:', error);
      return {
        success: false,
        error: 'Error al obtener estados',
        states: [],
      };
    }
  }

  /**
   * FASE 3: Obtiene el estado actual de un caso
   */
  async getCurrentState(caseId: string, tenantId: string): Promise<{
    success: boolean;
    state?: {
      id: string;
      code: string;
      name: string;
      description: string;
      requiresComment: boolean;
    };
    error?: string;
  }> {
    try {
      const existingCase = await prisma.case.findFirst({
        where: { id: caseId, tenantId },
        include: {
          state: true,
        },
      });

      if (!existingCase) {
        return {
          success: false,
          error: 'Caso no encontrado',
        };
      }

      return {
        success: true,
        state: {
          id: existingCase.state.id,
          code: existingCase.state.code,
          name: existingCase.state.name,
          description: existingCase.state.description,
          requiresComment: existingCase.state.requiresComment,
        },
      };
    } catch (error) {
      console.error('Error al obtener estado actual:', error);
      return {
        success: false,
        error: 'Error al obtener estado actual',
      };
    }
  }
}

// Singleton
export const caseStateService = new CaseStateService();
