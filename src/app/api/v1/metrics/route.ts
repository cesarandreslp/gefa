/**
 * API ENDPOINT: GET /api/v1/metrics
 * 
 * Obtiene indicadores de gestión institucional (MiPG)
 * 
 * Acceso: ADMIN, SUPERVISOR
 * Auditoría: METRICS_VIEWED
 * 
 * Query params:
 * - from: Fecha inicio (ISO 8601)
 * - to: Fecha fin (ISO 8601)
 * 
 * @author GEFA — Gestión Familiar
 * @date Enero 9, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { MetricsService } from '@/services/MetricsService';
import { AuditService } from '@/services/AuditService';

export async function GET(req: NextRequest) {
  try {
    // 1. Verificar autenticación y autorización
    const auth = await protectAPIRoute(req, ['ADMIN', 'SUPERVISOR']);
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    // 2. Extraer parámetros
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    // 3. Validar y parsear fechas
    let from: Date | undefined;
    let to: Date | undefined;

    if (fromParam) {
      from = new Date(fromParam);
      if (isNaN(from.getTime())) {
        return NextResponse.json(
          { error: 'Parámetro "from" inválido. Use formato ISO 8601.' },
          { status: 400 }
        );
      }
    }

    if (toParam) {
      to = new Date(toParam);
      if (isNaN(to.getTime())) {
        return NextResponse.json(
          { error: 'Parámetro "to" inválido. Use formato ISO 8601.' },
          { status: 400 }
        );
      }
    }

    // 4. Validar lógica de fechas
    if (from && to && from > to) {
      return NextResponse.json(
        { error: 'La fecha "from" no puede ser posterior a "to".' },
        { status: 400 }
      );
    }

    // 5. Obtener métricas
    const metrics = await MetricsService.getInstitutionalMetrics({
      tenantId: auth.user.tenantId,
      from,
      to,
    });

    // 6. Auditar consulta
    const auditService = new AuditService();
    await auditService.log({
      action: 'METRICS_VIEWED',
      userId: auth.user.userId,
      userEmail: auth.user.email,
      userRole: auth.user.roleCode,
      tenantId: auth.user.tenantId,
      entityType: 'Metrics',
      entityId: 'institutional',
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      metadata: {
        filters: {
          from: from?.toISOString(),
          to: to?.toISOString(),
        },
        periodDays: from && to 
          ? Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      },
    });

    // 7. Retornar métricas
    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error en GET /api/v1/metrics:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener métricas institucionales',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
