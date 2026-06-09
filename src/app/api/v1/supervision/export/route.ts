/**
 * GET /api/v1/supervision/export
 * Genera CSV con casos filtrados
 * Solo SUPERVISOR / ADMIN
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { supervisionService } from '@/services/SupervisionService';
import { auditService } from '@/services/AuditService';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación - Solo SUPERVISOR o ADMIN
    const auth = await protectAPIRoute(req, ['ADMIN', 'SUPERVISOR']);

    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const user = auth.user;

    // Obtener filtros de query params
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const stateCode = searchParams.get('stateCode');
    const assigneeUserId = searchParams.get('assigneeUserId');

    const filters = {
      tenantId: user.tenantId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      stateCode: stateCode || undefined,
      assigneeUserId: assigneeUserId || undefined,
    };

    // Generar CSV
    const result = await supervisionService.generateCSVExport(filters);

    if (!result.success || !result.csv) {
      return NextResponse.json(
        { error: result.error || 'Error al generar exportación' },
        { status: 500 }
      );
    }

    // Auditar exportación
    await auditService.log({
      action: 'SUPERVISION_EXPORTED',
      userId: user.userId,
      userEmail: user.email,
      userRole: user.roleCode,
      tenantId: user.tenantId,
      entityType: 'Supervision',
      entityId: 'export',
      ipAddress: req.ip || req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      metadata: {
        filters,
        recordCount: result.csv.split('\n').length - 1, // Excluir header
      },
    });

    // Retornar CSV con headers apropiados
    return new NextResponse(result.csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="supervision_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error('Error en GET /api/v1/supervision/export:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
