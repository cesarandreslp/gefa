/**
 * POST /api/v1/auth/logout
 * 
 * FASE 2: Cerrar sesión
 * 
 * Elimina la cookie de autenticación y registra el evento
 */

import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookie, protectAPIRoute } from '@/lib/auth';
import { auditService } from '@/services/AuditService';
import { getClientIp, getUserAgent } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    // Obtener usuario si está autenticado (opcional para logout)
    const auth = await protectAPIRoute(request);
    
    // Si hay usuario autenticado, registrar logout
    if (auth.authorized && auth.user) {
      const ipAddress = getClientIp(request.headers);
      const userAgent = getUserAgent(request.headers);
      await auditService.logLogout(
        auth.user.userId,
        auth.user.email,
        auth.user.roleCode,
        auth.user.tenantId || '',
        ipAddress,
        userAgent
      );
    }

    // Crear respuesta
    const response = NextResponse.json(
      {
        success: true,
        message: 'Sesión cerrada exitosamente',
      },
      { status: 200 }
    );

    // Eliminar cookie de autenticación
    return clearAuthCookie(response);
  } catch (error) {
    console.error('Error en logout:', error);

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
