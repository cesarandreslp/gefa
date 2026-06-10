/**
 * REPORT SERVICE - FASE 4 MÓDULO 2
 * 
 * Servicio de reportes institucionales formales
 * 
 * Características:
 * - Reportes oficiales defendibles
 * - Reutiliza MetricsService
 * - Generación de PDF y CSV
 * - Metadata institucional completa
 * - Reproducible y determinístico
 * 
 * @author GEFA — Gestión Familiar
 * @date Enero 9, 2026
 */

import { prisma } from '@/lib/prisma';
import { MetricsService, InstitutionalMetrics } from './MetricsService';
import crypto from 'crypto';

export type ReportType =
  | 'MONTHLY_MANAGEMENT'      // Gestión Mensual de Casos
  | 'SLA_COMPLIANCE'          // Cumplimiento SLA Institucional
  | 'WORKLOAD'                // Carga Operativa por Funcionario
  | 'QUALITY'                 // Calidad y Trazabilidad
  | 'HISTORICAL';             // Histórico Consolidado

export interface ReportMetadata {
  reportId: string;
  reportType: ReportType;
  title: string;
  description: string;
  periodFrom: Date;
  periodTo: Date;
  generatedAt: Date;
  generatedBy: {
    userId: string;
    email: string;
    name: string;
    role: string;
  };
  reportHash: string;
  legalNote: string;
}

export interface ReportData {
  metadata: ReportMetadata;
  metrics: InstitutionalMetrics;
  summary: Record<string, unknown>;
}

export class ReportService {
  private static readonly LEGAL_NOTE =
    'Este reporte es un documento oficial de la Comisaría de Familia. ' +
    'La información contenida es auténtica y verificable. Generado automáticamente por el GEFA — Gestión Familiar. ' +
    'Ley 1712/2014 (Transparencia y Acceso a la Información Pública).';

  /**
   * Genera un reporte completo
   */
  static async generateReport(
    reportType: ReportType,
    periodFrom: Date,
    periodTo: Date,
    userId: string,
    userEmail: string,
    userName: string,
    userRole: string,
    tenantId: string = ''
  ): Promise<ReportData> {
    // 1. Obtener métricas del período
    const metrics = await MetricsService.getInstitutionalMetrics({
      tenantId,
      from: periodFrom,
      to: periodTo,
    });

    // 2. Preparar metadata
    const reportId = crypto.randomUUID();
    const generatedAt = new Date();

    const metadata: ReportMetadata = {
      reportId,
      reportType,
      title: this.getReportTitle(reportType),
      description: this.getReportDescription(reportType),
      periodFrom,
      periodTo,
      generatedAt,
      generatedBy: {
        userId,
        email: userEmail,
        name: userName,
        role: userRole,
      },
      reportHash: '', // Se calculará después
      legalNote: this.LEGAL_NOTE,
    };

    // 3. Generar resumen específico por tipo
    const summary = this.generateSummary(reportType, metrics);

    // 4. Crear objeto del reporte
    const reportData: ReportData = {
      metadata,
      metrics,
      summary,
    };

    // 5. Calcular hash del reporte
    metadata.reportHash = this.calculateReportHash(reportData);

    // 6. Persistir en base de datos
    await prisma.report.create({
      data: {
        id: reportId,
        reportType,
        periodFrom,
        periodTo,
        generatedByUserId: userId,
        title: metadata.title,
        description: metadata.description,
        reportHash: metadata.reportHash,
        data: reportData as never,
      },
    });

    return reportData;
  }

  /**
   * Genera el resumen específico según tipo de reporte
   */
  private static generateSummary(
    reportType: ReportType,
    metrics: InstitutionalMetrics
  ): Record<string, unknown> {
    switch (reportType) {
      case 'MONTHLY_MANAGEMENT':
        return {
          totalCases: metrics.distribution.totalCases,
          closedCases: metrics.trends.reduce((sum, t) => sum + t.closed, 0),
          activeCases: metrics.distribution.totalCases - metrics.trends.reduce((sum, t) => sum + t.closed, 0),
          overdueCases: metrics.distribution.activeOverdue,
          complianceRate: metrics.sla.compliancePercentage,
          averageResolutionDays: metrics.time.averageResolutionDays,
        };

      case 'SLA_COMPLIANCE':
        return {
          totalWithSLA: metrics.sla.totalCasesWithSLA,
          onTime: metrics.sla.casesOnTime,
          warning: metrics.sla.casesWarning,
          overdue: metrics.sla.casesOverdue,
          compliancePercentage: metrics.sla.compliancePercentage,
          institutionalGoal: 90, // Meta institucional
          gap: 90 - metrics.sla.compliancePercentage,
        };

      case 'WORKLOAD':
        return {
          totalUsers: metrics.users.activeByUser.length,
          totalActiveCases: metrics.users.activeByUser.reduce((sum, u) => sum + u.count, 0),
          totalClosedCases: metrics.users.closedByUser.reduce((sum, u) => sum + u.count, 0),
          averageActivePerUser:
            metrics.users.activeByUser.length > 0
              ? metrics.users.activeByUser.reduce((sum, u) => sum + u.count, 0) /
                metrics.users.activeByUser.length
              : 0,
          topPerformer: metrics.users.closedByUser[0]?.userName || 'N/A',
        };

      case 'QUALITY':
        return {
          totalCases: metrics.distribution.totalCases,
          reopenedCases: metrics.quality.totalReopened,
          reopenedPercentage: metrics.quality.reopenedPercentage,
          traceabilityCases: metrics.quality.casesWithCompleteTraceability,
          traceabilityPercentage: metrics.quality.traceabilityPercentage,
          qualityGoal: 95, // Meta institucional
          qualityScore: 100 - metrics.quality.reopenedPercentage,
        };

      case 'HISTORICAL':
        return {
          periodDays: Math.ceil(
            (metrics.period.to.getTime() - metrics.period.from.getTime()) /
              (1000 * 60 * 60 * 24)
          ),
          totalFiled: metrics.trends.reduce((sum, t) => sum + t.filed, 0),
          totalClosed: metrics.trends.reduce((sum, t) => sum + t.closed, 0),
          totalOverdue: metrics.trends.reduce((sum, t) => sum + t.overdue, 0),
          monthlyAverage:
            metrics.trends.length > 0
              ? metrics.trends.reduce((sum, t) => sum + t.filed, 0) / metrics.trends.length
              : 0,
          caseTypes: metrics.distribution.byType.length,
          states: metrics.distribution.byState.length,
        };

      default:
        return {};
    }
  }

  /**
   * Genera CSV del reporte
   */
  static generateCSV(reportData: ReportData): string {
    const { metadata, metrics } = reportData;

    let csv = '';

    // Encabezado del reporte
    csv += `"${metadata.title}"\n`;
    csv += `"Período: ${metadata.periodFrom.toLocaleDateString('es-CO')} - ${metadata.periodTo.toLocaleDateString('es-CO')}"\n`;
    csv += `"Generado: ${metadata.generatedAt.toLocaleString('es-CO')}"\n`;
    csv += `"Por: ${metadata.generatedBy.name} (${metadata.generatedBy.role})"\n`;
    csv += '\n';

    // Sección 1: SLA
    csv += '"CUMPLIMIENTO SLA"\n';
    csv += '"Concepto","Valor"\n';
    csv += `"Total Expedientes","${metrics.sla.totalCasesWithSLA}"\n`;
    csv += `"A Tiempo (🟢)","${metrics.sla.casesOnTime}"\n`;
    csv += `"Advertencia (🟡)","${metrics.sla.casesWarning}"\n`;
    csv += `"Vencidos (🔴)","${metrics.sla.casesOverdue}"\n`;
    csv += `"% Cumplimiento","${metrics.sla.compliancePercentage.toFixed(2)}%"\n`;
    csv += '\n';

    // Sección 2: Distribución por Tipo
    csv += '"DISTRIBUCIÓN POR TIPO DE TRÁMITE"\n';
    csv += '"Tipo de Trámite","Cantidad"\n';
    metrics.distribution.byType.forEach((item) => {
      csv += `"${item.caseTypeName}","${item.count}"\n`;
    });
    csv += '\n';

    // Sección 3: Distribución por Estado
    csv += '"DISTRIBUCIÓN POR ESTADO"\n';
    csv += '"Estado","Cantidad"\n';
    metrics.distribution.byState.forEach((item) => {
      csv += `"${item.stateName}","${item.count}"\n`;
    });
    csv += '\n';

    // Sección 4: Productividad
    csv += '"CASOS ACTIVOS POR FUNCIONARIO"\n';
    csv += '"Funcionario","Casos Activos"\n';
    metrics.users.activeByUser.forEach((item) => {
      csv += `"${item.userName}","${item.count}"\n`;
    });
    csv += '\n';

    csv += '"CASOS CERRADOS POR FUNCIONARIO"\n';
    csv += '"Funcionario","Casos Cerrados"\n';
    metrics.users.closedByUser.forEach((item) => {
      csv += `"${item.userName}","${item.count}"\n`;
    });
    csv += '\n';

    // Sección 5: Calidad
    csv += '"INDICADORES DE CALIDAD"\n';
    csv += '"Indicador","Valor"\n';
    csv += `"Casos Reabiertos","${metrics.quality.totalReopened}"\n`;
    csv += `"% Reapertura","${metrics.quality.reopenedPercentage.toFixed(2)}%"\n`;
    csv += `"Casos con Trazabilidad Completa","${metrics.quality.casesWithCompleteTraceability}"\n`;
    csv += `"% Trazabilidad","${metrics.quality.traceabilityPercentage.toFixed(2)}%"\n`;
    csv += '\n';

    // Sección 6: Tendencia Mensual
    if (metrics.trends.length > 0) {
      csv += '"TENDENCIA MENSUAL"\n';
      csv += '"Mes","Radicados","Cerrados","Vencidos"\n';
      metrics.trends.forEach((item) => {
        csv += `"${item.month}","${item.filed}","${item.closed}","${item.overdue}"\n`;
      });
      csv += '\n';
    }

    // Pie de página
    csv += `"${metadata.legalNote}"\n`;
    csv += `"Hash del Reporte: ${metadata.reportHash}"\n`;

    return csv;
  }

  /**
   * Obtiene reportes generados
   */
  static async getReports(userId: string, userRole: string, limit = 50) {
    const where =
      userRole === 'ADMIN' || userRole === 'SUPERVISOR' || userRole === 'DIRECTOR'
        ? {}
        : { generatedByUserId: userId };

    const reports = await prisma.report.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
      take: limit,
      include: {
        generatedBy: {
          select: {
            fullName: true,
            
            email: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return reports;
  }

  /**
   * Obtiene un reporte por ID
   */
  static async getReportById(reportId: string) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        generatedBy: {
          select: {
            fullName: true,
            
            email: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!report) {
      throw new Error('Reporte no encontrado');
    }

    // Incrementar contador de descargas
    await prisma.report.update({
      where: { id: reportId },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadAt: new Date(),
      },
    });

    return report;
  }

  /**
   * Calcula hash del reporte para integridad
   */
  private static calculateReportHash(reportData: ReportData): string {
    const content = JSON.stringify({
      type: reportData.metadata.reportType,
      period: {
        from: reportData.metadata.periodFrom,
        to: reportData.metadata.periodTo,
      },
      metrics: reportData.metrics,
    });

    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Obtiene el título del reporte según tipo
   */
  private static getReportTitle(reportType: ReportType): string {
    const titles: Record<ReportType, string> = {
      MONTHLY_MANAGEMENT: 'Reporte de Gestión Mensual de Casos',
      SLA_COMPLIANCE: 'Reporte de Cumplimiento SLA Institucional',
      WORKLOAD: 'Reporte de Carga Operativa por Funcionario',
      QUALITY: 'Reporte de Calidad y Trazabilidad',
      HISTORICAL: 'Reporte Histórico Consolidado',
    };

    return titles[reportType];
  }

  /**
   * Obtiene la descripción del reporte según tipo
   */
  private static getReportDescription(reportType: ReportType): string {
    const descriptions: Record<ReportType, string> = {
      MONTHLY_MANAGEMENT:
        'Reporte ejecutivo de la gestión mensual de expedientes, incluyendo radicación, cierre y vencimientos.',
      SLA_COMPLIANCE:
        'Análisis detallado del cumplimiento de términos legales (SLA) a nivel institucional.',
      WORKLOAD:
        'Distribución de carga operativa entre funcionarios, casos activos y cerrados por usuario.',
      QUALITY:
        'Indicadores de calidad institucional: casos reabiertos, trazabilidad y auditoría.',
      HISTORICAL:
        'Consolidado histórico de expedientes por período, con tendencias y análisis comparativo.',
    };

    return descriptions[reportType];
  }
}
