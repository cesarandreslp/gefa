/**
 * API ENDPOINT: GET /api/v1/notifications/history
 * 
 * Obtiene el historial de notificaciones
 * 
 * Acceso: ADMIN, SUPERVISOR
 * Auditoría: No (solo lectura)
 * 
 * @author GEFA — Gestión Familiar
 * @date Enero 12, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { NotificationService } from '@/services/NotificationService';
import { NotificationStatus, NotificationType } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    // 1. Verificar autenticación y autorización
    const auth = await protectAPIRoute(req, ['ADMIN', 'SUPERVISOR']);
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    // 2. Extraer parámetros de query
    const { searchParams } = new URL(req.url);
    const caseId = searchParams.get('caseId') || undefined;
    const recipientId = searchParams.get('recipientId') || undefined;
    const status = searchParams.get('status') as NotificationStatus | undefined;
    const type = searchParams.get('type') as NotificationType | undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 3. Obtener historial
    const notifications = await NotificationService.getNotificationHistory({
      tenantId: auth.user.tenantId,
      caseId,
      recipientId,
      status,
      type,
      limit,
      offset,
    });

    // 4. Retornar
    return NextResponse.json({
      success: true,
      data: notifications,
      pagination: {
        limit,
        offset,
        count: notifications.length,
      },
    });
  } catch (error) {
    console.error('Error en GET /api/v1/notifications/history:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener historial de notificaciones',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
