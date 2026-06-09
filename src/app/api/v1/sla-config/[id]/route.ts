/**
 * PUT /api/v1/sla-config/[id]
 * Actualiza una configuración de SLA existente
 * Solo ADMIN
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { slaService } from '@/services/SLAService';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación - Solo ADMIN
    const auth = await protectAPIRoute(req, ['ADMIN', 'DIRECTOR']);

    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const user = auth.user;

    // Obtener datos del body
    const body = await req.json();
    const { slaDays, description } = body;

    // Validaciones
    if (!slaDays || slaDays <= 0) {
      return NextResponse.json(
        { error: 'slaDays debe ser mayor a 0' },
        { status: 400 }
      );
    }

    // Actualizar configuración con auditoría
    const result = await slaService.upsertSLAConfig(
      params.id, // caseTypeId
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
        { error: result.error || 'Error al actualizar configuración' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      config: result.config,
    });

  } catch (error) {
    console.error('Error en PUT /api/v1/sla-config/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
