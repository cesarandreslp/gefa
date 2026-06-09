/**
 * InboxService - FASE 3 MÓDULO 3
 * 
 * Servicio para bandejas de trabajo institucionales
 * 
 * Reglas por rol:
 * - FUNCIONARIO: Solo expedientes asignados
 * - SUPERVISOR/ADMIN: Todos los expedientes
 * 
 * Bandejas:
 * 1. Personal (/admin/inbox) - Expedientes del usuario o todos
 * 2. Pendientes (/admin/inbox/pending) - No cerrados
 * 3. Vencidos (/admin/inbox/overdue) - Fecha límite superada
 */

import { prisma } from '@/lib/prisma';
import { Prisma, SLAStatus } from '@prisma/client';

export interface InboxFilters {
  stateCode?: string;
  filedFrom?: string;
  filedTo?: string;
  assignedTo?: string; // Solo para SUPERVISOR/ADMIN
}

export interface CaseInboxItem {
  id: string;
  filingNumber: string;
  subject: string;
  citizenName: string;
  stateCode: string;
  stateName: string;
  stateColor: string;
  assignedTo: string | null;
  dueDate: Date;
  isOverdue: boolean;
  filedAt: Date;
  slaStatus: 'green' | 'yellow' | 'red';
}

export class InboxService {
  /**
   * Mapea el estado SLA de BD al formato visual
   */
  private mapSLAStatus(slaStatus: SLAStatus): 'green' | 'yellow' | 'red' {
    switch (slaStatus) {
      case 'ON_TIME':
        return 'green';
      case 'WARNING':
        return 'yellow';
      case 'OVERDUE':
        return 'red';
      default:
        return 'green';
    }
  }

  /**
   * Formatea un caso para la bandeja
   */
  private formatCaseForInbox(caseData: {
    id: string;
    filingNumber: string;
    subject: string;
    dueDate: Date;
    isOverdue: boolean;
    filedAt: Date;
    slaStatus: SLAStatus;
    citizen: { firstName: string; firstLastName: string };
    state: { code: string; name: string; color: string };
    assignments?: Array<{ user: { fullName: string } }>;
  }): CaseInboxItem {
    const assignedUser = caseData.assignments?.[0]?.user;
    const assignedName = assignedUser ? assignedUser.fullName : null;

    return {
      id: caseData.id,
      filingNumber: caseData.filingNumber,
      subject: caseData.subject,
      citizenName: `${caseData.citizen.firstName} ${caseData.citizen.firstLastName}`,
      stateCode: caseData.state.code,
      stateName: caseData.state.name,
      stateColor: caseData.state.color,
      assignedTo: assignedName,
      dueDate: caseData.dueDate,
      isOverdue: caseData.isOverdue,
      filedAt: caseData.filedAt,
      slaStatus: this.mapSLAStatus(caseData.slaStatus),
    };
  }

  /**
   * Construye el WHERE clause según rol y filtros
   */
  private buildWhereClause(
    userId: string,
    userRole: string,
    filters: InboxFilters,
    onlyOverdue: boolean = false,
    onlyActive: boolean = false
  ): Prisma.CaseWhereInput {
    const where: Prisma.CaseWhereInput = {};

    // 1. Filtro por rol
    if (userRole === 'FUNCIONARIO') {
      // Solo casos asignados al funcionario
      where.assignments = {
        some: {
          userId,
          status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
        },
      };
    }
    // SUPERVISOR y ADMIN ven todos

    // 2. Filtro de vencidos
    if (onlyOverdue) {
      where.isOverdue = true;
      where.state = { code: { not: 'CERRADO' } };
    }

    // 3. Filtro de activos (no cerrados)
    if (onlyActive) {
      where.state = { code: { not: 'CERRADO' } };
    }

    // 4. Filtros adicionales
    if (filters.stateCode) {
      where.state = { code: filters.stateCode };
    }

    if (filters.filedFrom || filters.filedTo) {
      where.filedAt = {};
      if (filters.filedFrom) {
        where.filedAt.gte = new Date(filters.filedFrom);
      }
      if (filters.filedTo) {
        where.filedAt.lte = new Date(filters.filedTo);
      }
    }

    // 5. Filtro por asignado (solo SUPERVISOR/ADMIN)
    if (filters.assignedTo && (userRole === 'SUPERVISOR' || userRole === 'ADMIN' || userRole === 'DIRECTOR')) {
      where.assignments = {
        some: {
          userId: filters.assignedTo,
          status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
        },
      };
    }

    return where;
  }

  /**
   * Bandeja Personal - /admin/inbox
   * FUNCIONARIO: Solo asignados
   * SUPERVISOR/ADMIN: Todos
   */
  async getPersonalInbox(
    userId: string,
    userRole: string,
    filters: InboxFilters = {}
  ): Promise<{
    success: boolean;
    cases: CaseInboxItem[];
    error?: string;
  }> {
    try {
      const where = this.buildWhereClause(userId, userRole, filters);

      const cases = await prisma.case.findMany({
        where,
        include: {
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
              color: true,
            },
          },
          assignments: {
            where: {
              status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
            },
            include: {
              user: {
                select: {
                  fullName: true,
                  
                },
              },
            },
            orderBy: { assignedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: [
          { isOverdue: 'desc' }, // Vencidos primero
          { dueDate: 'asc' }, // Luego por fecha límite
        ],
        take: 100, // Límite razonable
      });

      return {
        success: true,
        cases: cases.map((c) => this.formatCaseForInbox(c)),
      };
    } catch (error) {
      console.error('Error en getPersonalInbox:', error);
      return {
        success: false,
        cases: [],
        error: 'Error al obtener bandeja personal',
      };
    }
  }

  /**
   * Bandeja Pendientes - /admin/inbox/pending
   * Expedientes no cerrados
   */
  async getPendingInbox(
    userId: string,
    userRole: string,
    filters: InboxFilters = {}
  ): Promise<{
    success: boolean;
    cases: CaseInboxItem[];
    error?: string;
  }> {
    try {
      const where = this.buildWhereClause(userId, userRole, filters, false, true);

      const cases = await prisma.case.findMany({
        where,
        include: {
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
              color: true,
            },
          },
          assignments: {
            where: {
              status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
            },
            include: {
              user: {
                select: {
                  fullName: true,
                  
                },
              },
            },
            orderBy: { assignedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: [
          { dueDate: 'asc' }, // Por fecha límite
          { filedAt: 'asc' }, // Luego por fecha de radicación
        ],
        take: 100,
      });

      return {
        success: true,
        cases: cases.map((c) => this.formatCaseForInbox(c)),
      };
    } catch (error) {
      console.error('Error en getPendingInbox:', error);
      return {
        success: false,
        cases: [],
        error: 'Error al obtener bandeja de pendientes',
      };
    }
  }

  /**
   * Bandeja Vencidos - /admin/inbox/overdue
   * Expedientes con fecha límite superada
   */
  async getOverdueInbox(
    userId: string,
    userRole: string,
    filters: InboxFilters = {}
  ): Promise<{
    success: boolean;
    cases: CaseInboxItem[];
    error?: string;
  }> {
    try {
      const where = this.buildWhereClause(userId, userRole, filters, true, false);

      const cases = await prisma.case.findMany({
        where,
        include: {
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
              color: true,
            },
          },
          assignments: {
            where: {
              status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
            },
            include: {
              user: {
                select: {
                  fullName: true,
                  
                },
              },
            },
            orderBy: { assignedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: [
          { dueDate: 'asc' }, // Los más vencidos primero
        ],
        take: 100,
      });

      return {
        success: true,
        cases: cases.map((c) => this.formatCaseForInbox(c)),
      };
    } catch (error) {
      console.error('Error en getOverdueInbox:', error);
      return {
        success: false,
        cases: [],
        error: 'Error al obtener bandeja de vencidos',
      };
    }
  }
}

// Singleton
export const inboxService = new InboxService();
