/**
 * API ENDPOINT: GET /api/v1/reports
 * 
 * Lista reportes generados
 * 
 * Acceso: ADMIN, SUPERVISOR
 * 
 * Query params:
 * - limit: Cantidad de reportes (default 50)
 * 
 * @author GEFA — Gestión Familiar
 * @date Enero 9, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { ReportService } from '@/services/ReportService';

export async function GET(req: NextRequest) {
  try {
    // 1. Verificar autenticación y autorización
    const auth = await protectAPIRoute(req, ['ADMIN', 'SUPERVISOR', 'SECRETARIA_GOBIERNO']);
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    // 2. Extraer parámetros
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    // 3. Obtener reportes
    const reports = await ReportService.getReports(
      auth.user.userId,
      auth.user.roleCode,
      limit
    );

    // 4. Retornar lista
    return NextResponse.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error('Error en GET /api/v1/reports:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener reportes',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
