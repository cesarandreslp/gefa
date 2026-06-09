/**
 * API ENDPOINT: GET /api/v1/system/status
 * 
 * Obtiene estado detallado de servicios del sistema
 * 
 * Acceso: ADMIN, SUPERVISOR
 * Propósito: Diagnóstico operativo detallado
 * 
 * @author GEFA — Gestión Familiar
 * @date Enero 13, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { HealthService } from '@/services/HealthService';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // 1. Verificar autenticación y autorización
    const auth = await protectAPIRoute(req, ['ADMIN', 'SUPERVISOR']);
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    // 2. Verificar salud de servicios
    const [databaseCheck, notificationQueueCheck] = await Promise.all([
      HealthService.checkDatabase(),
      HealthService.checkNotificationQueue(),
    ]);

    // 3. Obtener estadísticas de almacenamiento
    const documents = await prisma.document.aggregate({
      _count: true,
      _sum: {
        fileSize: true,
      },
      _avg: {
        fileSize: true,
      },
    });

    const storage = {
      documentsCount: documents._count,
      totalSizeMB: Math.round(((documents._sum.fileSize || 0) / (1024 * 1024)) * 100) / 100,
      averageSizeMB: Math.round(((documents._avg.fileSize || 0) / (1024 * 1024)) * 100) / 100,
    };

    // 4. Verificar modo degradado
    const isInDegradedMode = await HealthService.isInDegradedMode();

    // 5. Última notificación procesada
    const lastNotification = await prisma.notification.findFirst({
      where: { status: 'SENT' },
      orderBy: { sentAt: 'desc' },
      select: { sentAt: true },
    });

    // 6. Retornar estado detallado
    return NextResponse.json({
      success: true,
      data: {
        database: {
          connected: databaseCheck.status !== 'down',
          status: databaseCheck.status,
          latency: databaseCheck.responseTime,
        },
        queue: {
          notifications: {
            status: notificationQueueCheck.status,
            pending: notificationQueueCheck.pendingCount,
            failed: notificationQueueCheck.failedCount,
            lastProcessed: lastNotification?.sentAt?.toISOString() || null,
          },
        },
        storage,
        system: {
          uptime: HealthService.getUptime(),
          uptimeFormatted: HealthService.formatUptime(HealthService.getUptime()),
          version: process.env.SYSTEM_VERSION || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          degradedMode: isInDegradedMode,
        },
      },
    });
  } catch (error) {
    console.error('Error en GET /api/v1/system/status:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener estado del sistema',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
