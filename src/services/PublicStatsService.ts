/**
 * PUBLIC STATS SERVICE - FASE 4 MÓDULO 3
 * 
 * Servicio de estadísticas públicas para transparencia
 * Cumple Ley 1712/2014 (Transparencia y Acceso a la Información)
 * 
 * CRÍTICO:
 * - Solo datos agregados
 * - Sin datos personales
 * - Sin identificación de funcionarios
 * - Sin detalles de casos
 * 
 * @author Sistema Ventanilla Única
 * @date Enero 9, 2026
 */

import { prisma } from '@/lib/prisma';

export interface PublicStats {
  period: {
    from: Date;
    to: Date;
  };
  summary: {
    totalFiled: number;
    totalClosed: number;
    totalActive: number;
    totalOverdue: number;
  };
  slaCompliance: {
    compliancePercentage: number;
    onTimeCount: number;
    warningCount: number;
    overdueCount: number;
  };
  distributionByType: {
    caseTypeName: string;
    count: number;
    percentage: number;
  }[];
  monthlyTrend: {
    month: string;
    filed: number;
    closed: number;
    overdue: number;
  }[];
  averageResolutionDays: number;
  lastUpdated: Date;
}

export class PublicStatsService {
  /**
   * Obtiene estadísticas públicas agregadas
   * SIN DATOS PERSONALES ni detalles sensibles
   */
  static async getPublicStats(
    tenantId: string,
    periodFrom?: Date,
    periodTo?: Date
  ): Promise<PublicStats> {
    const from = periodFrom || new Date(new Date().setMonth(new Date().getMonth() - 6)); // Últimos 6 meses por defecto
    const to = periodTo || new Date();

    // 1. Resumen general
    const totalFiled = await prisma.case.count({
      where: {
        tenantId,
        filedAt: { gte: from, lte: to },
      },
    });

    const totalClosed = await prisma.case.count({
      where: {
        tenantId,
        filedAt: { gte: from, lte: to },
        closedAt: { not: null },
      },
    });

    const totalActive = totalFiled - totalClosed;

    const totalOverdue = await prisma.case.count({
      where: {
        tenantId,
        filedAt: { gte: from, lte: to },
        slaStatus: 'OVERDUE',
        closedAt: null, // Solo activos vencidos
      },
    });

    // 2. Cumplimiento SLA
    const onTimeCount = await prisma.case.count({
      where: {
        tenantId,
        filedAt: { gte: from, lte: to },
        slaStatus: 'ON_TIME',
      },
    });

    const warningCount = await prisma.case.count({
      where: {
        tenantId,
        filedAt: { gte: from, lte: to },
        slaStatus: 'WARNING',
      },
    });

    const overdueCount = await prisma.case.count({
      where: {
        tenantId,
        filedAt: { gte: from, lte: to },
        slaStatus: 'OVERDUE',
      },
    });

    const compliancePercentage =
      totalFiled > 0
        ? ((onTimeCount + warningCount) / totalFiled) * 100
        : 0;

    // 3. Distribución por tipo (sin datos sensibles)
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
        id: { in: byTypeRaw.map((t) => t.caseTypeId) },
      },
      select: { id: true, name: true },
    });

    const caseTypeMap = new Map(caseTypes.map((ct) => [ct.id, ct.name]));

    const distributionByType = byTypeRaw
      .map((item) => ({
        caseTypeName: caseTypeMap.get(item.caseTypeId) || 'Otro',
        count: item._count,
        percentage: totalFiled > 0 ? (item._count / totalFiled) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count); // Ordenar por cantidad descendente

    // 4. Tendencia mensual
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

    const monthsMap = new Map<
      string,
      { filed: number; closed: number; overdue: number }
    >();

    cases.forEach((c) => {
      const monthKey = `${c.filedAt.getFullYear()}-${String(
        c.filedAt.getMonth() + 1
      ).padStart(2, '0')}`;

      if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, { filed: 0, closed: 0, overdue: 0 });
      }

      const entry = monthsMap.get(monthKey)!;
      entry.filed += 1;

      if (c.closedAt) {
        entry.closed += 1;
      }

      if (c.slaStatus === 'OVERDUE') {
        entry.overdue += 1;
      }
    });

    const monthlyTrend = Array.from(monthsMap.entries())
      .map(([month, data]) => ({
        month,
        filed: data.filed,
        closed: data.closed,
        overdue: data.overdue,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // 5. Tiempo promedio de resolución (solo casos cerrados)
    const closedCases = await prisma.case.findMany({
      where: {
        tenantId,
        filedAt: { gte: from, lte: to },
        closedAt: { not: null },
      },
      select: {
        filedAt: true,
        closedAt: true,
      },
    });

    let totalDays = 0;
    closedCases.forEach((c) => {
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

    return {
      period: { from, to },
      summary: {
        totalFiled,
        totalClosed,
        totalActive,
        totalOverdue,
      },
      slaCompliance: {
        compliancePercentage: parseFloat(compliancePercentage.toFixed(2)),
        onTimeCount,
        warningCount,
        overdueCount,
      },
      distributionByType,
      monthlyTrend,
      averageResolutionDays,
      lastUpdated: new Date(),
    };
  }

  /**
   * Obtiene estadísticas del último mes (para página principal)
   */
  static async getCurrentMonthStats(tenantId: string): Promise<PublicStats> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return this.getPublicStats(tenantId, firstDayOfMonth, now);
  }

  /**
   * Obtiene estadísticas del último año
   */
  static async getYearStats(tenantId: string): Promise<PublicStats> {
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    
    return this.getPublicStats(tenantId, oneYearAgo, now);
  }
}
