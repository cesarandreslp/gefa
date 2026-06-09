/**
 * GET /api/v1/auth/me
 * 
 * FASE 2: Obtener información del usuario autenticado
 * 
 * Devuelve los datos del usuario actual a partir del token
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const auth = await protectAPIRoute(request, undefined, { substituteAuxiliar: false });

    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const db = auth.db;

    // Obtener datos completos del usuario
    const user = await db.user.findFirst({
      where: { id: auth.user.userId },
      include: {
        role: true,
        supervisor: { include: { role: true } },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Usuario no encontrado',
          },
        },
        { status: 404 }
      );
    }

    const tenant = auth.user.tenantId
      ? await db.tenant.findUnique({ where: { id: auth.user.tenantId } })
      : null;

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            isActive: user.isActive,
            role: user.role ? {
              code: user.role.code,
              name: user.role.name,
              level: user.role.level,
              canApprove: user.role.canApprove,
              canReassign: user.role.canReassign,
              canSign: user.role.canSign,
            } : null,
            tenant: tenant ? {
              id: tenant.id,
              name: tenant.name,
              sigla: tenant.sigla,
              domain: tenant.domain,
              logoUrl: tenant.logoUrl,
              primaryColor: tenant.primaryColor,
              secondaryColor: tenant.secondaryColor,
            } : null,
            createdAt: user.createdAt,
            supervisorId: user.supervisorId ?? null,
            supervisorRole: user.supervisor?.role ? {
              code: user.supervisor.role.code,
              name: user.supervisor.role.name,
              level: user.supervisor.role.level,
              canApprove: user.supervisor.role.canApprove,
              canReassign: user.supervisor.role.canReassign,
              canSign: user.supervisor.role.canSign,
            } : null,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al obtener usuario:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error interno del servidor',
        },
      },
      { status: 500 }
    );
  }
}
