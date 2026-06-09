/**
 * MÉTRICS SERVICE - FASE 4 MÓDULO 1
 * 
 * Servicio de indicadores de gestión institucional
 * Compatible con MiPG (Modelo Integrado de Planeación y Gestión)
 * 
 * Características:
 * - Cálculos en backend (BD como fuente de verdad)
 * - Indicadores auditables y determinísticos
 * - Filtros por fecha personalizables
 * - Solo acceso ADMIN/SUPERVISOR
 * 
 * @author Sistema Ventanilla Única
 * @date Enero 9, 2026
 */

import { prisma } from '@/lib/prisma';

export interface MetricsFilters {
  tenantId: string;
  from?: Date;
  to?: Date;
}

export interface SLAMetrics {
  totalCasesWithSLA: number;
  casesOnTime: number;
  casesWarning: number;
  casesOverdue: number;
  compliancePercentage: number; // % casos ON_TIME + WARNING
}

export interface TimeMetrics {
  averageResolutionDays: number; // Tiempo promedio cierre
  averageResolutionDaysByType: {
    caseTypeId: string;
    caseTypeName: string;
    averageDays: number;
  }[];
}

export interface CaseDistribution {
  totalCases: number;
  activeOverdue: number; // Casos activos vencidos
  byType: {
    caseTypeId: string;
    caseTypeName: string;
    count: number;
  }[];
  byState: {
    stateId: string;
    stateName: string;
    count: number;
  }[];
}

export interface UserMetrics {
  activeByUser: {
    userId: string;
    userName: string;
    count: number;
  }[];
  closedByUser: {
    userId: string;
    userName: string;
    count: number;
  }[];
}

export interface QualityMetrics {
  totalReopened: number;
  reopenedPercentage: number;
  casesWithCompleteTraceability: number;
  traceabilityPercentage: number;
}

export interface MonthlyTrend {
  month: string; // YYYY-MM
  filed: number;
  closed: number;
  overdue: number;
}

export interface InstitutionalMetrics {
  period: {
    from: Date;
    to: Date;
  };
  sla: SLAMetrics;
  time: TimeMetrics;
  distribution: CaseDistribution;
  users: UserMetrics;
  quality: QualityMetrics;
  trends: MonthlyTrend[];
}

export class MetricsService {
  /**
   * Obtiene todos los indicadores institucionales
   */
  static async getInstitutionalMetrics(
    filters: MetricsFilters
  ): Promise<InstitutionalMetrics> {
    const { tenantId } = filters;
    const from = filters.from || new Date(0); // Desde siempre
    const to = filters.to || new Date(); // Hasta ahora

    // Ejecutar cálculos en paralelo
    const [sla, time, distribution, users, quality, trends] = await Promise.all([
      this.calculateSLAMetrics(tenantId, from, to),
      this.calculateTimeMetrics(tenantId, from, to),
      this.calculateCaseDistribution(tenantId, from, to),
      this.calculateUserMetrics(tenantId, from, to),
      this.calculateQualityMetrics(tenantId, from, to),
      this.calculateMonthlyTrends(tenantId, from, to),
    ]);

    return {
      period: { from, to },
      sla,
      time,
      distribution,
      users,
      quality,
      trends,
    };
  }

  /**
   * 1. INDICADOR: % Cumplimiento SLA
   */
  private static async calculateSLAMetrics(
    tenantId: string,
    from: Date,
    to: Date
  ): Promise<SLAMetrics> {
    const totalCasesWithSLA = await prisma.case.count({
      where: {
        tenantId,
        filedAt: { gte: from, lte: to },
      },
    });

    const casesOnTime = await prisma.case.count({
      where: {
        tenantId,
        filedAt: { gte: from, lte: to },
        slaStatus: 'ON_TIME',
      },
    });

    const casesWarning = await prisma.case.count({
      where: {
        tenantId,
        filedAt: { gte: from, lte: to },
        slaStatus: 'WARNING',
      },
    });

    const casesOverdue = await prisma.case.count({
      where: {
        tenantId,
        filedAt: { gte: from, lte: to },
        slaStatus: 'OVERDUE',
      },
    });

    const compliancePercentage =
      totalCasesWithSLA > 0
        ? ((casesOnTime + casesWarning) / totalCasesWithSLA) * 100
        : 0;

    return {
      totalCasesWithSLA,
      casesOnTime,
      casesWarning,
      casesOverdue,
      compliancePercentage: parseFloat(compliancePercentage.toFixed(2)),
    };
  }

  /**
   * 2. INDICADOR: Tiempo promedio de atención
   */
  private static async calculateTimeMetrics(
    tenantId: string,
    from: Date,
    to: Date
  ): Promise<TimeMetrics> {
    // Casos cerrados en el período
    const closedCases = await prisma.case.findMany({
      where: {
        tenantId,
        filedAt: { gte: from, lte: to },
        closedAt: { not: null },
      },
      select: {
        filedAt: true,
        closedAt: true,
        caseTypeId: true,
        caseType: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Tiempo promedio general
    let totalDays = 0;
    closedCases.forEach((c: typeof closedCases[number]) => {
      if (c.closedAt) {
        const days = Math.ceil(
          (c.closedAt.getTime() - c.filedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        totalDays += days;
      }
    });

    const averageResolutionDays =
      closedCases.length > 0
        ? parseFloat((totalDays / closedCases.length).toFixed(2))
        : 0;

    // Tiempo promedio por tipo
    const byTypeMap = new Map<
      string,
      { name: string; totalDays: number; count: number }
    >();

    closedCases.forEach((c: typeof closedCases[number]) => {
      if (c.closedAt) {
        const days = Math.ceil(
          (c.closedAt.getTime() - c.filedAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (!byTypeMap.has(c.caseTypeId)) {
          byTypeMap.set(c.caseTypeId, {
            name: c.caseType.name,
            totalDays: 0,
            count: 0,
          });
        }

        const entry = byTypeMap.get(c.caseTypeId)!;
        entry.totalDays += days;
        entry.count += 1;
      }
    });

    const averageResolutionDaysByType = Array.from(byTypeMap.entries()).map(
      ([caseTypeId, data]) => ({
        caseTypeId,
        caseTypeName: data.name,
        averageDays: parseFloat((data.totalDays / data.count).toFixed(2)),
      })
    );

    return {
      averageResolutionDays,
      averageResolutionDaysByType,
    };
  }

  /**
   * 3. INDICADOR: Distribución de casos
   */
  private static async calculateCaseDistribution(
    tenantId: string,
    from: Date,
    to: Date
  ): Promise<CaseDistribution> {
    const totalCases = await prisma.case.count({
      where: {
        tenantId,
        filedAt: { gte: from, lte: to },
      },
    });

    // Casos activos vencidos
    const activeOverdue = await prisma.case.count({
      where: {
        tenantId,
        filedAt: { gte: from, lte: to },
        closedAt: null, // Activos
        slaStatus: 'OVERDUE',
      },
    });

    // Por tipo
    const byTypeRaw = await prisma.case.groupBy({
      by: ['caseTypeId'],
      where: {
        tenantId,
        filedAt: { gte: from, lte: to },
      },
      _count: true,
    });

    const caseTypes = await prisma.caseType.findMany({
      where: {
        id: { in: byTypeRaw.map((t: typeof byTypeRaw[number]) => t.caseTypeId) },
      },
      select: { id: true, name: true },
    });

    const caseTypeMap = new Map(caseTypes.map((ct: typeof caseTypes[number]) => [ct.id, ct.name]));

    const byType = byTypeRaw.map((item: typeof byTypeRaw[number]) => ({
      caseTypeId: item.caseTypeId,
      caseTypeName: caseTypeMap.get(item.caseTypeId) || 'Desconocido',
      count: item._count,
    }));

    // Por estado
    const byStateRaw = await prisma.case.groupBy({
      by: ['stateId'],
      where: {
        tenantId,
        filedAt: { gte: from, lte: to },
      },
      _count: true,
    });

    const states = await prisma.caseState.findMany({
      where: {
        id: { in: byStateRaw.map((s: typeof byStateRaw[number]) => s.stateId) },
      },
      select: { id: true, name: true },
    });

    const stateMap = new Map(states.map((s: typeof states[number]) => [s.id, s.name]));

    const byState = byStateRaw.map((item: typeof byStateRaw[number]) => ({
      stateId: item.stateId,
      stateName: stateMap.get(item.stateId) || 'Desconocido',
      count: item._count,
    }));

    return {
      totalCases,
      activeOverdue,
      byType,
      byState,
    };
  }

  /**
   * 4. INDICADOR: Métricas por usuario
   */
  private static async calculateUserMetrics(
    tenantId: string,
    from: Date,
    to: Date
  ): Promise<UserMetrics> {
    // Casos activos por funcionario
    const activeAssignments = await prisma.assignment.findMany({
      where: {
        tenantId,
        case: {
          filedAt: { gte: from, lte: to },
          closedAt: null, // Activos
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            
            role: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });

    // Filtrar solo FUNCIONARIO en código
    const funcionarioAssignments = activeAssignments.filter(
      (a) => a.user.role?.code === 'FUNCIONARIO'
    );

    const activeByUserMap = new Map<string, { name: string; count: number }>();

    funcionarioAssignments.forEach((assignment) => {
      const userId = assignment.user.id;
      const userName = assignment.user.fullName;

      if (!activeByUserMap.has(userId)) {
        activeByUserMap.set(userId, { name: userName, count: 0 });
      }

      activeByUserMap.get(userId)!.count += 1;
    });

    const activeByUser = Array.from(activeByUserMap.entries()).map(
      ([userId, data]) => ({
        userId,
        userName: data.name,
        count: data.count,
      })
    );

    // Casos cerrados por funcionario (closedBy)
    const closedCases = await prisma.case.findMany({
      where: {
        tenantId,
        filedAt: { gte: from, lte: to },
        closedAt: { not: null },
        closedBy: { not: null },
      },
      select: {
        closedBy: true,
      },
    });

    const closedByIds = [...new Set(closedCases.map((c: typeof closedCases[number]) => c.closedBy!))];

    const usersWhoClosedCases = await prisma.user.findMany({
      where: {
        id: { in: closedByIds },
      },
      select: {
        id: true,
        fullName: true,
        
      },
    });

    const userMap = new Map(
      usersWhoClosedCases.map((u: typeof usersWhoClosedCases[number]) => [
        u.id,
        u.fullName,
      ])
    );

    const closedByUserMap = new Map<string, number>();

    closedCases.forEach((c: typeof closedCases[number]) => {
      const userId = c.closedBy!;
      closedByUserMap.set(userId, (closedByUserMap.get(userId) || 0) + 1);
    });

    const closedByUser: { userId: string; userName: string; count: number }[] = Array.from(closedByUserMap.entries()).map(
      ([userId, count]) => ({
        userId,
        userName: userMap.get(userId) || 'Desconocido',
        count,
      })
    );

    return {
      activeByUser,
      closedByUser,
    };
  }

  /**
   * 5. INDICADOR: Métricas de calidad
   */
  private static async calculateQualityMetrics(
    tenantId: string,
    from: Date,
    to: Date
  ): Promise<QualityMetrics> {
    // Total de casos en el período
    const totalCases = await prisma.case.count({
      where: {
        tenantId,
        filedAt: { gte: from, lte: to },
      },
    });

    // Casos reabiertos: tienen más de 1 transición a estado no final después de cerrado
    const casesWithHistory = await prisma.case.findMany({
      where: {
        tenantId,
        filedAt: { gte: from, lte: to },
      },
      select: {
        id: true,
        stateHistory: {
          orderBy: { timestamp: 'asc' },
          select: {
            toState: {
              select: {
                isFinal: true,
              },
            },
          },
        },
      },
    });

    let totalReopened = 0;

    casesWithHistory.forEach((c: typeof casesWithHistory[number]) => {
      let hasBeenClosed = false;
      let reopened = false;

      c.stateHistory.forEach((h: typeof c.stateHistory[number]) => {
        if (h.toState.isFinal) {
          hasBeenClosed = true;
        } else if (hasBeenClosed) {
          reopened = true;
        }
      });

      if (reopened) {
        totalReopened += 1;
      }
    });

    const reopenedPercentage =
      totalCases > 0 ? (totalReopened / totalCases) * 100 : 0;

    // Trazabilidad completa: casos con al menos 1 registro de historial de estado
    const casesWithCompleteTraceability = await prisma.case.count({
      where: {
        tenantId,
        filedAt: { gte: from, lte: to },
        stateHistory: {
          some: {},
        },
      },
    });

    const traceabilityPercentage =
      totalCases > 0
        ? (casesWithCompleteTraceability / totalCases) * 100
        : 0;

    return {
      totalReopened,
      reopenedPercentage: parseFloat(reopenedPercentage.toFixed(2)),
      casesWithCompleteTraceability,
      traceabilityPercentage: parseFloat(traceabilityPercentage.toFixed(2)),
    };
  }

  /**
   * 6. INDICADOR: Tendencia mensual
   */
  private static async calculateMonthlyTrends(
    tenantId: string,
    from: Date,
    to: Date
  ): Promise<MonthlyTrend[]> {
    // Obtener todos los casos del período
    const cases = await prisma.case.findMany({
      where: {
        tenantId,
        filedAt: { gte: from, lte: to },
      },
      select: {
        filedAt: true,
        closedAt: true,
        slaStatus: true,
      },
    });

    // Agrupar por mes
    const monthsMap = new Map<
      string,
      { filed: number; closed: number; overdue: number }
    >();

    cases.forEach((c: typeof cases[number]) => {
      const monthKey = `${c.filedAt.getFullYear()}-${String(
        c.filedAt.getMonth() + 1
      ).padStart(2, '0')}`;

      if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, { filed: 0, closed: 0, overdue: 0 });
      }

      const entry = monthsMap.get(monthKey)!;
      entry.filed += 1;

      if (c.closedAt) {
        const closedMonthKey = `${c.closedAt.getFullYear()}-${String(
          c.closedAt.getMonth() + 1
        ).padStart(2, '0')}`;

        if (closedMonthKey === monthKey) {
          entry.closed += 1;
        }
      }

      if (c.slaStatus === 'OVERDUE') {
        entry.overdue += 1;
      }
    });

    // Convertir a array y ordenar
    const trends = Array.from(monthsMap.entries())
      .map(([month, data]) => ({
        month,
        filed: data.filed,
        closed: data.closed,
        overdue: data.overdue,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return trends;
  }
}
