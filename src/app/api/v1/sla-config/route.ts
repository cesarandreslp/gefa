/**
 * GET /api/v1/sla-config
 * Lista todas las configuraciones de SLA
 * Solo ADMIN
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { slaService } from '@/services/SLAService';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación - Solo ADMIN
    const auth = await protectAPIRoute(req, ['ADMIN', 'DIRECTOR']);

    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    // Obtener todas las configuraciones
    const result = await slaService.getAllSLAConfigs();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al obtener configuraciones' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      configs: result.configs,
    });

  } catch (error) {
    console.error('Error en GET /api/v1/sla-config:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/sla-config
 * Crea una nueva configuración de SLA
 * Solo ADMIN
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación - Solo ADMIN
    const auth = await protectAPIRoute(req, ['ADMIN', 'DIRECTOR']);

    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const user = auth.user;

    // Obtener datos del body
    const body = await req.json();
    const { caseTypeId, slaDays, description } = body;

    // Validaciones
    if (!caseTypeId) {
      return NextResponse.json(
        { error: 'caseTypeId es requerido' },
        { status: 400 }
      );
    }

    if (!slaDays || slaDays <= 0) {
      return NextResponse.json(
        { error: 'slaDays debe ser mayor a 0' },
        { status: 400 }
      );
    }

    // Crear configuración con auditoría
    const result = await slaService.upsertSLAConfig(
      caseTypeId,
      slaDays,
      description,
      user.userId,
      user.email,
      user.roleCode,
      req.ip || req.headers.get('x-forwarded-for') || 'unknown',
      req.headers.get('user-agent') || 'unknown'
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al crear configuración' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      config: result.config,
    }, { status: 201 });

  } catch (error) {
    console.error('Error en POST /api/v1/sla-config:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
