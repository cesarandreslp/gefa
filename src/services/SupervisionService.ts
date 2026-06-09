/**
 * SupervisionService - FASE 3 MÓDULO 5
 * 
 * Panel de Supervisión Institucional (Solo Lectura)
 * 
 * Funcionalidades:
 * - Métricas operativas agregadas
 * - Lista de casos vencidos (SLA OVERDUE)
 * - Exportación CSV institucional
 * - Filtros globales aplicables
 * 
 * Cumplimiento:
 * - Ley 1712/2014: Transparencia y acceso a la información
 * - Solo lectura (sin acciones operativas)
 * - Backend como fuente de verdad
 */

import { prisma } from '@/lib/prisma';
import { SLAStatus, Prisma } from '@prisma/client';

export interface SupervisionMetrics {
  totalCases: number;
  casesByState: Array<{
    stateCode: string;
    stateName: string;
    count: number;
  }>;
  overdueCases: number;
  casesByAssignee: Array<{
    userId: string;
    userName: string;
    count: number;
  }>;
}

export interface OverdueCaseItem {
  id: string;
  fileNumber: string;
  citizenName: string;
  assigneeName: string | null;
  stateCode: string;
  stateName: string;
  dueDate: Date;
  daysOverdue: number;
  createdAt: Date;
}

export interface SupervisionFilters {
  tenantId: string;
  startDate?: Date;
  endDate?: Date;
  stateCode?: string;
  assigneeUserId?: string;
}

export class SupervisionService {
  /**
   * Obtiene métricas agregadas del sistema
   */
  async getMetrics(filters?: SupervisionFilters): Promise<{
    success: boolean;
    metrics?: SupervisionMetrics;
    error?: string;
  }> {
    try {
      // Construir filtros WHERE
      const where: Prisma.CaseWhereInput = {
        tenantId: filters?.tenantId,
      };

      if (filters?.startDate || filters?.endDate) {
        where.filedAt = {};
        if (filters.startDate) where.filedAt.gte = filters.startDate;
        if (filters.endDate) where.filedAt.lte = filters.endDate;
      }

      if (filters?.stateCode) {
        where.state = { code: filters.stateCode };
      }

      if (filters?.assigneeUserId) {
        where.assignmentHistory = {
          some: {
            newAssigneeId: filters.assigneeUserId,
          },
        };
      }

      // 1. Total de expedientes
      const totalCases = await prisma.case.count({ where });

      // 2. Expedientes por estado
      const casesByStateRaw = await prisma.case.groupBy({
        by: ['stateId'],
        _count: true,
        where,
      });

      // Obtener nombres de estados
      const stateIds = casesByStateRaw.map(g => g.stateId);
      const states = await prisma.caseState.findMany({
        where: { id: { in: stateIds } },
        select: { id: true, code: true, name: true },
      });

      const stateMap = new Map(states.map(s => [s.id, s]));

      const casesByState = casesByStateRaw.map(g => {
        const state = stateMap.get(g.stateId);
        return {
          stateCode: state?.code || 'UNKNOWN',
          stateName: state?.name || 'Desconocido',
          count: g._count,
        };
      });

      // 3. Expedientes vencidos (SLA OVERDUE)
      const overdueCases = await prisma.case.count({
        where: {
          ...where,
          slaStatus: SLAStatus.OVERDUE,
        },
      });

      // 4. Expedientes por funcionario
      const assignmentsRaw = await prisma.caseAssignmentHistory.groupBy({
        by: ['newAssigneeId'],
        _count: true,
        where: {
          caseId: {
            in: (await prisma.case.findMany({ where, select: { id: true } })).map(c => c.id)
          }
        },
      });

      // Obtener nombres de funcionarios
      const userIds = assignmentsRaw.map(a => a.newAssigneeId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          fullName: true,
          
        },
      });

      const userMap = new Map(users.map(u => [u.id, u]));

      const casesByAssignee = assignmentsRaw.map(a => {
        const user = userMap.get(a.newAssigneeId);
        return {
          userId: a.newAssigneeId,
          userName: user ? user.fullName : 'Desconocido',
          count: a._count,
        };
      });

      return {
        success: true,
        metrics: {
          totalCases,
          casesByState,
          overdueCases,
          casesByAssignee,
        },
      };
    } catch (error) {
      console.error('Error obteniendo métricas de supervisión:', error);
      return {
        success: false,
        error: 'Error al obtener métricas',
      };
    }
  }

  /**
   * Obtiene lista de casos vencidos (SLA OVERDUE)
   */
  async getOverdueCases(
    filters?: SupervisionFilters,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{
    success: boolean;
    cases?: OverdueCaseItem[];
    total?: number;
    error?: string;
  }> {
    try {
      // Construir filtros WHERE
      const where: Prisma.CaseWhereInput = {
        tenantId: filters?.tenantId,
        slaStatus: SLAStatus.OVERDUE,
      };

      if (filters?.startDate || filters?.endDate) {
        where.filedAt = {};
        if (filters.startDate) where.filedAt.gte = filters.startDate;
        if (filters.endDate) where.filedAt.lte = filters.endDate;
      }

      if (filters?.stateCode) {
        where.state = { code: filters.stateCode };
      }

      if (filters?.assigneeUserId) {
        where.assignmentHistory = {
          some: {
            newAssigneeId: filters.assigneeUserId,
          },
        };
      }

      // Contar total
      const total = await prisma.case.count({ where });

      // Obtener casos paginados
      const cases = await prisma.case.findMany({
        where,
        select: {
          id: true,
          filingNumber: true,
          dueDate: true,
          filedAt: true,
          citizen: {
            select: {
              firstName: true,
              firstLastName: true,
            },
          },
          state: {
            select: {
              code: true,
              name: true,
            },
          },
          assignments: {
            where: {
              status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
            },
            orderBy: { assignedAt: 'desc' },
            take: 1,
            select: {
              user: {
                select: {
                  fullName: true,
                  
                },
              },
            },
          },
        },
        orderBy: {
          dueDate: 'asc', // Más urgentes primero
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const now = new Date();

      const overdueCases: OverdueCaseItem[] = cases.map(c => {
        const assignee = c.assignments[0]?.user;
        const dueDate = c.dueDate || now;
        const daysOverdue = Math.floor(
          (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          id: c.id,
          fileNumber: c.filingNumber,
          citizenName: `${c.citizen.firstName} ${c.citizen.firstLastName}`,
          assigneeName: assignee ? assignee.fullName : null,
          stateCode: c.state.code,
          stateName: c.state.name,
          dueDate,
          daysOverdue,
          createdAt: c.filedAt,
        };
      });

      return {
        success: true,
        cases: overdueCases,
        total,
      };
    } catch (error) {
      console.error('Error obteniendo casos vencidos:', error);
      return {
        success: false,
        error: 'Error al obtener casos vencidos',
      };
    }
  }

  /**
   * Genera contenido CSV para exportación
   */
  async generateCSVExport(filters?: SupervisionFilters): Promise<{
    success: boolean;
    csv?: string;
    error?: string;
  }> {
    try {
      // Construir filtros WHERE
      const where: Prisma.CaseWhereInput = {
        tenantId: filters?.tenantId,
      };

      if (filters?.startDate || filters?.endDate) {
        where.filedAt = {};
        if (filters.startDate) where.filedAt.gte = filters.startDate;
        if (filters.endDate) where.filedAt.lte = filters.endDate;
      }

      if (filters?.stateCode) {
        where.state = { code: filters.stateCode };
      }

      if (filters?.assigneeUserId) {
        where.assignmentHistory = {
          some: {
            newAssigneeId: filters.assigneeUserId,
          },
        };
      }

      // Obtener todos los casos (sin paginación para exportación)
      const cases = await prisma.case.findMany({
        where,
        select: {
          filingNumber: true,
          filedAt: true,
          dueDate: true,
          slaStatus: true,
          caseType: {
            select: {
              name: true,
            },
          },
          state: {
            select: {
              name: true,
            },
          },
          assignmentHistory: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              newAssignee: {
                select: {
                  fullName: true,
                  
                },
              },
            },
          },
        },
        orderBy: {
          filedAt: 'desc',
        },
      });

      // Construir CSV
      const headers = [
        'Radicado',
        'Tipo de trámite',
        'Estado',
        'Funcionario',
        'Fecha radicación',
        'Fecha límite',
        'Estado SLA',
      ];

      const rows = cases.map(c => {
        const assignee = c.assignmentHistory[0]?.newAssignee;
        const assigneeName = assignee
          ? `assignee.fullName`
          : 'Sin asignar';

        return [
          c.filingNumber,
          c.caseType.name,
          c.state.name,
          assigneeName,
          c.filedAt.toISOString().split('T')[0],
          c.dueDate?.toISOString().split('T')[0] || 'N/A',
          c.slaStatus || 'N/A',
        ];
      });

      // Generar CSV
      const csvLines = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ];

      const csv = csvLines.join('\n');

      return {
        success: true,
        csv,
      };
    } catch (error) {
      console.error('Error generando exportación CSV:', error);
      return {
        success: false,
        error: 'Error al generar exportación',
      };
    }
  }
}

// Singleton
export const supervisionService = new SupervisionService();
