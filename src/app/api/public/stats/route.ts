/**
 * API ENDPOINT: GET /api/public/stats
 * 
 * Estadísticas públicas para transparencia institucional
 * Cumple Ley 1712/2014
 * 
 * Acceso: PÚBLICO (sin autenticación)
 * Método: GET únicamente
 * Caché: 24 horas (Next.js ISR)
 * 
 * Query params opcionales:
 * - periodFrom: Fecha inicio (ISO 8601)
 * - periodTo: Fecha fin (ISO 8601)
 * 
 * @author Sistema Ventanilla Única
 * @date Enero 9, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { PublicStatsService } from '@/services/PublicStatsService';
import { getTenantFromRequest } from '@/lib/tenantResolver';

// Revalidación cada 24 horas (86400 segundos)
export const revalidate = 86400;

export async function GET(req: NextRequest) {
  try {
    // 1. Extraer parámetros opcionales
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get('periodFrom');
    const toParam = searchParams.get('periodTo');

    let from: Date | undefined;
    let to: Date | undefined;

    // 2. Parsear fechas si se proporcionan
    if (fromParam) {
      from = new Date(fromParam);
      if (isNaN(from.getTime())) {
        return NextResponse.json(
          { error: 'Parámetro "periodFrom" inválido. Use formato ISO 8601.' },
          { status: 400 }
        );
      }
    }

    if (toParam) {
      to = new Date(toParam);
      if (isNaN(to.getTime())) {
        return NextResponse.json(
          { error: 'Parámetro "periodTo" inválido. Use formato ISO 8601.' },
          { status: 400 }
        );
      }
    }

    // 3. Obtener Tenant para Aislamiento de Datos
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: 'Entidad no encontrada.' }, { status: 404 });
    }

    // 4. Validar lógica de fechas
    if (from && to && from > to) {
      return NextResponse.json(
        { error: 'La fecha de inicio no puede ser posterior a la fecha de fin.' },
        { status: 400 }
      );
    }

    // 5. Obtener estadísticas públicas (solo de esta entidad)
    const stats = await PublicStatsService.getPublicStats(tenant.id, from, to);

    // 5. Retornar con headers apropiados
    return NextResponse.json(
      {
        success: true,
        data: stats,
        legalNote:
          'Información pública en cumplimiento de la Ley 1712 de 2014. ' +
          'Estos datos son agregados y no contienen información personal ni sensible.',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
          'Access-Control-Allow-Origin': '*', // Permitir CORS para transparencia
          'Access-Control-Allow-Methods': 'GET',
        },
      }
    );
  } catch (error) {
    console.error('Error en GET /api/public/stats:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener estadísticas públicas',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// Bloquear otros métodos
export async function POST() {
  return NextResponse.json(
    { error: 'Método no permitido' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Método no permitido' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Método no permitido' },
    { status: 405 }
  );
}
