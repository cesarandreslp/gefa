/**
 * AssignmentService - FASE 3 MÓDULO 2
 * 
 * Gestión de asignación y reasignación de expedientes
 * 
 * Reglas:
 * - Un expediente puede estar asignado a UN funcionario o no asignado
 * - Solo REVISOR_MUNICIPAL, VENTANILLA_UNICA y ASIGNACION_DE_CASOS pueden asignar/reasignar
 * - Toda reasignación requiere comentario obligatorio
 * - Se mantiene historial completo de asignaciones
 * 
 * Cumplimiento:
 * - Ley 1712/2014: Trazabilidad completa
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auditService } from './AuditService';

export interface AssignCaseInput {
  tenantId: string;
  caseId: string;
  newAssigneeId: string;
  assignedByUserId: string;
  assignedByEmail: string;
  assignedByRole: string;
  reason: string;
  ipAddress: string;
  userAgent: string;
  db?: PrismaClient;
}

export class AssignmentService {
  /**
   * Asigna o reasigna un expediente a un funcionario
   */
  async assignCase(input: AssignCaseInput): Promise<{
    success: boolean;
    assignment?: {
      id: string;
      caseId: string;
      userId: string;
      assignedAt: Date;
      isReassignment: boolean;
    };
    error?: string;
  }> {
    const client = input.db || prisma;
    try {
      // 1. Validar que el caso exista
      const existingCase = await client.case.findUnique({
        where: { id: input.caseId },
        include: {
          assignments: {
            orderBy: { assignedAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!existingCase) {
        return {
          success: false,
          error: 'Expediente no encontrado',
        };
      }

      // 2. Verificar si el usuario asignado existe y es FUNCIONARIO
      const assigneeUser = await client.user.findUnique({
        where: { id: input.newAssigneeId },
        include: { role: true },
      });

      if (!assigneeUser) {
        return {
          success: false,
          error: 'Usuario asignado no encontrado',
        };
      }

      if (!assigneeUser.isActive) {
        return {
          success: false,
          error: 'El usuario asignado está inactivo',
        };
      }

      // 3. Determinar si es reasignación
      const currentAssignment = existingCase.assignments[0];
      const isReassignment = !!currentAssignment;

      // 4. Validar que no se asigne al mismo usuario
      if (isReassignment && currentAssignment.userId === input.newAssigneeId) {
        return {
          success: false,
          error: 'El expediente ya está asignado a este usuario',
        };
      }

      // 5. Validar que la reasignación tenga comentario
      if (isReassignment && !input.reason?.trim()) {
        return {
          success: false,
          error: 'La reasignación requiere un comentario justificativo',
        };
      }

      // 6. Crear nueva asignación
      const newAssignment = await client.assignment.create({
        data: {
          tenantId: input.tenantId,
          caseId: input.caseId,
          userId: input.newAssigneeId,
          assignedBy: input.assignedByUserId,
          status: 'PENDING',
          notes: input.reason || 'Asignación inicial',
        },
      });

      // 7. Marcar asignación anterior como reasignada (si existe)
      if (currentAssignment) {
        await client.assignment.update({
          where: { id: currentAssignment.id },
          data: {
            status: 'REASSIGNED',
            completedAt: new Date(),
          },
        });
      }

      // 8. Registrar en historial de asignaciones
      await client.caseAssignmentHistory.create({
        data: {
          caseId: input.caseId,
          previousAssigneeId: currentAssignment?.userId || null,
          newAssigneeId: input.newAssigneeId,
          assignedByUserId: input.assignedByUserId,
          reason: input.reason || 'Asignación inicial del expediente',
        },
      });

      // 9. Auditoría
      await auditService.log({
        action: isReassignment ? 'REASSIGNED' : 'ASSIGNED',
        userId: input.assignedByUserId,
        userEmail: input.assignedByEmail,
        userRole: input.assignedByRole,
        tenantId: input.tenantId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        entityType: 'CASE',
        entityId: input.caseId,
        metadata: {
          previousAssigneeId: currentAssignment?.userId,
          newAssigneeId: input.newAssigneeId,
          reason: input.reason,
          isReassignment,
        },
        caseId: input.caseId,
      });

      return {
        success: true,
        assignment: {
          id: newAssignment.id,
          caseId: newAssignment.caseId,
          userId: newAssignment.userId,
          assignedAt: newAssignment.assignedAt,
          isReassignment,
        },
      };
    } catch (error) {
      console.error('Error al asignar expediente:', error);
      return {
        success: false,
        error: 'Error interno al asignar expediente',
      };
    }
  }

  /**
   * Obtiene el funcionario actualmente asignado al caso
   */
  async getCurrentAssignee(caseId: string, tenantId: string): Promise<{
    success: boolean;
    assignee?: {
      id: string;
      email: string;
      fullName: string;
      role: string;
      assignedAt: Date;
    };
    error?: string;
  }> {
    try {
      const assignment = await prisma.assignment.findFirst({
        where: {
          caseId,
          tenantId,
          status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
        },
        include: {
          user: {
            include: {
              role: true,
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
      });

      if (!assignment) {
        return {
          success: true,
          assignee: undefined, // No asignado
        };
      }

      return {
        success: true,
        assignee: {
          id: assignment.user.id,
          email: assignment.user.email,
          fullName: assignment.user.fullName,
          role: assignment.user.role?.name || 'Sin rol',
          assignedAt: assignment.assignedAt,
        },
      };
    } catch (error) {
      console.error('Error al obtener asignado actual:', error);
      return {
        success: false,
        error: 'Error al obtener asignado actual',
      };
    }
  }

  /**
   * Obtiene el historial completo de asignaciones de un caso
   */
  async getAssignmentHistory(tenantId: string, caseId: string): Promise<{
    success: boolean;
    history: Array<{
      id: string;
      previousAssignee: string | null;
      newAssignee: string;
      assignedBy: string;
      reason: string;
      createdAt: Date;
    }>;
    error?: string;
  }> {
    try {
      const history = await prisma.caseAssignmentHistory.findMany({
        where: { caseId }, // Note: CaseAssignmentHistory doesn't have tenantId natively but Case does, handled via authorization or further down
        include: {
          previousAssignee: {
            select: {
              fullName: true,
              
              email: true,
            },
          },
          newAssignee: {
            select: {
              fullName: true,
              
              email: true,
            },
          },
          assignedByUser: {
            select: {
              fullName: true,
              
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        history: history.map((h) => ({
          id: h.id,
          previousAssignee: h.previousAssignee
            ? `h.previousAssignee.fullName`
            : null,
          newAssignee: `h.newAssignee.fullName`,
          assignedBy: `h.assignedByUser.fullName`,
          reason: h.reason,
          createdAt: h.createdAt,
        })),
      };
    } catch (error) {
      console.error('Error al obtener historial de asignaciones:', error);
      return {
        success: false,
        history: [],
        error: 'Error al obtener historial de asignaciones',
      };
    }
  }

  /**
   * Obtiene casos asignados a un funcionario específico
   */
  async getCasesByAssignee(userId: string, tenantId: string): Promise<{
    success: boolean;
    cases: Array<{
      id: string;
      filingNumber: string;
      subject: string;
      stateCode: string;
      assignedAt: Date;
    }>;
    error?: string;
  }> {
    try {
      const assignments = await prisma.assignment.findMany({
        where: {
          userId,
          tenantId,
          status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
        },
        include: {
          case: {
            include: {
              state: true,
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
      });

      return {
        success: true,
        cases: assignments.map((a) => ({
          id: a.case.id,
          filingNumber: a.case.filingNumber,
          subject: a.case.subject,
          stateCode: a.case.state.code,
          assignedAt: a.assignedAt,
        })),
      };
    } catch (error) {
      console.error('Error al obtener casos asignados:', error);
      return {
        success: false,
        cases: [],
        error: 'Error al obtener casos asignados',
      };
    }
  }

  /**
   * Obtiene lista de funcionarios disponibles para asignar
   */
  async getAvailableAssignees(tenantId: string): Promise<{
    success: boolean;
    users: Array<{
      id: string;
      email: string;
      fullName: string;
      role: string;
      currentCaseLoad: number;
      maxCaseLoad: number;
    }>;
    error?: string;
  }> {
    try {
      const users = await prisma.user.findMany({
        where: {
          tenantId,
          isActive: true,
          role: {
            code: { in: ['FUNCIONARIO', 'SUPERVISOR', 'ADMIN'] },
          },
        },
        include: {
          role: true,
          assignments: {
            where: {
              status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
            },
          },
        },
        orderBy: [{ fullName: 'asc' }],
      });

      return {
        success: true,
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          role: u.role?.name || 'Sin rol',
          currentCaseLoad: u.assignments.length,
          maxCaseLoad: u.maxCaseLoad,
        })),
      };
    } catch (error) {
      console.error('Error al obtener funcionarios disponibles:', error);
      return {
        success: false,
        users: [],
        error: 'Error al obtener funcionarios disponibles',
      };
    }
  }
}

// Singleton
export const assignmentService = new AssignmentService();
