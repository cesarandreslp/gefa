/**
 * GET /api/v1/supervision/metrics
 * Retorna métricas agregadas del sistema
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

    // Obtener métricas
    const result = await supervisionService.getMetrics(filters);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al obtener métricas' },
        { status: 500 }
      );
    }

    // Auditar acceso a supervisión
    await auditService.log({
      action: 'SUPERVISION_VIEWED',
      userId: user.userId,
      userEmail: user.email,
      userRole: user.roleCode,
      tenantId: user.tenantId,
      entityType: 'Supervision',
      entityId: 'metrics',
      ipAddress: req.ip || req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      metadata: {
        filters,
      },
    });

    return NextResponse.json({
      success: true,
      metrics: result.metrics,
    });

  } catch (error) {
    console.error('Error en GET /api/v1/supervision/metrics:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
