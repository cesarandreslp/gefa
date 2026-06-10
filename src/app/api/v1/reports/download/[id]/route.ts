/**
 * API ENDPOINT: GET /api/v1/reports/download/[id]
 * 
 * Descarga un reporte generado (CSV)
 * 
 * Acceso: ADMIN, SUPERVISOR
 * Auditoría: REPORT_DOWNLOADED
 * 
 * Query params:
 * - format: csv (por ahora solo CSV)
 * 
 * @author GEFA — Gestión Familiar
 * @date Enero 9, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { ReportService } from '@/services/ReportService';
import { AuditService } from '@/services/AuditService';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verificar autenticación y autorización
    const auth = await protectAPIRoute(req, ['ADMIN', 'SUPERVISOR', 'SECRETARIA_GOBIERNO']);
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    // 2. Extraer ID del reporte
    const reportId = params.id;

    if (!reportId) {
      return NextResponse.json(
        { error: 'ID de reporte requerido' },
        { status: 400 }
      );
    }

    // 3. Obtener reporte de BD
    const report = await ReportService.getReportById(reportId);

    if (!report) {
      return NextResponse.json(
        { error: 'Reporte no encontrado' },
        { status: 404 }
      );
    }

    // 4. Extraer formato solicitado
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'csv';

    if (format !== 'csv') {
      return NextResponse.json(
        { error: 'Formato no soportado. Use format=csv' },
        { status: 400 }
      );
    }

    // 5. Generar CSV del reporte
    const reportData = report.data as never;
    const csv = ReportService.generateCSV(reportData);

    // 6. Auditar descarga
    const auditService = new AuditService();
    await auditService.log({
      action: 'REPORT_DOWNLOADED',
      userId: auth.user.userId,
      userEmail: auth.user.email,
      userRole: auth.user.roleCode,
      tenantId: auth.user.tenantId,
      entityType: 'Report',
      entityId: reportId,
      ipAddress:
        req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      metadata: {
        format,
        downloadCount: report.downloadCount + 1,
      },
    });

    // 7. Retornar archivo CSV
    const fileName = `reporte_${report.reportType}_${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error en GET /api/v1/reports/download/[id]:', error);
    return NextResponse.json(
      {
        error: 'Error al descargar reporte',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
