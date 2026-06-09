/**
 * GET /api/v1/supervision/overdue
 * Lista de casos vencidos (SLA OVERDUE)
 * Solo SUPERVISOR / ADMIN
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { supervisionService } from '@/services/SupervisionService';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación - Solo SUPERVISOR o ADMIN
    const auth = await protectAPIRoute(req, ['ADMIN', 'SUPERVISOR']);

    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    // Obtener filtros y paginación de query params
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const stateCode = searchParams.get('stateCode');
    const assigneeUserId = searchParams.get('assigneeUserId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    const filters = {
      tenantId: auth.user.tenantId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      stateCode: stateCode || undefined,
      assigneeUserId: assigneeUserId || undefined,
    };

    // Obtener casos vencidos
    const result = await supervisionService.getOverdueCases(filters, page, pageSize);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al obtener casos vencidos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      cases: result.cases,
      total: result.total,
      page,
      pageSize,
    });

  } catch (error) {
    console.error('Error en GET /api/v1/supervision/overdue:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
