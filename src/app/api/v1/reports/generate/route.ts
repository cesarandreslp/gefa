/**
 * API ENDPOINT: POST /api/v1/reports/generate
 * 
 * Genera un reporte institucional oficial
 * 
 * Acceso: ADMIN, SUPERVISOR
 * Auditoría: REPORT_GENERATED
 * 
 * Body:
 * - reportType: MONTHLY_MANAGEMENT | SLA_COMPLIANCE | WORKLOAD | QUALITY | HISTORICAL
 * - periodFrom: Fecha inicio (ISO 8601)
 * - periodTo: Fecha fin (ISO 8601)
 * 
 * @author Sistema Ventanilla Única
 * @date Enero 9, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { ReportService, ReportType } from '@/services/ReportService';
import { AuditService } from '@/services/AuditService';

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticación y autorización
    const auth = await protectAPIRoute(req, ['ADMIN', 'SUPERVISOR']);
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    // 2. Extraer parámetros del body
    const body = await req.json();
    const { reportType, periodFrom, periodTo } = body;

    // 3. Validar parámetros requeridos
    if (!reportType || !periodFrom || !periodTo) {
      return NextResponse.json(
        {
          error:
            'Parámetros requeridos: reportType, periodFrom, periodTo',
        },
        { status: 400 }
      );
    }

    // 4. Validar tipo de reporte
    const validTypes: ReportType[] = [
      'MONTHLY_MANAGEMENT',
      'SLA_COMPLIANCE',
      'WORKLOAD',
      'QUALITY',
      'HISTORICAL',
    ];

    if (!validTypes.includes(reportType)) {
      return NextResponse.json(
        {
          error: `Tipo de reporte inválido. Valores permitidos: ${validTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // 5. Parsear y validar fechas
    const from = new Date(periodFrom);
    const to = new Date(periodTo);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json(
        { error: 'Fechas inválidas. Use formato ISO 8601.' },
        { status: 400 }
      );
    }

    if (from > to) {
      return NextResponse.json(
        { error: 'La fecha de inicio no puede ser posterior a la fecha de fin.' },
        { status: 400 }
      );
    }

    // 6. Generar reporte
    const userName = auth.user.email; // Simplificado: usar email como nombre
    
    const reportData = await ReportService.generateReport(
      reportType,
      from,
      to,
      auth.user.userId,
      auth.user.email,
      userName,
      auth.user.roleCode,
      auth.user.tenantId
    );

    // 7. Auditar generación
    const auditService = new AuditService();
    await auditService.log({
      action: 'REPORT_GENERATED',
      userId: auth.user.userId,
      userEmail: auth.user.email,
      userRole: auth.user.roleCode,
      tenantId: auth.user.tenantId,
      entityType: 'Report',
      entityId: reportData.metadata.reportId,
      ipAddress:
        req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      metadata: {
        reportType,
        periodFrom: from.toISOString(),
        periodTo: to.toISOString(),
        reportHash: reportData.metadata.reportHash,
      },
    });

    // 8. Retornar resultado
    return NextResponse.json({
      success: true,
      data: {
        reportId: reportData.metadata.reportId,
        reportType: reportData.metadata.reportType,
        title: reportData.metadata.title,
        periodFrom: reportData.metadata.periodFrom,
        periodTo: reportData.metadata.periodTo,
        generatedAt: reportData.metadata.generatedAt,
        reportHash: reportData.metadata.reportHash,
      },
    });
  } catch (error) {
    console.error('Error en POST /api/v1/reports/generate:', error);
    return NextResponse.json(
      {
        error: 'Error al generar reporte',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
