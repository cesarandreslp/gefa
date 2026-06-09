/**
 * API ENDPOINT: GET /api/v1/system/metrics
 * 
 * Obtiene métricas operativas del sistema
 * 
 * Acceso: ADMIN
 * Propósito: Métricas básicas para panel administrativo
 * 
 * @author Sistema Ventanilla Única
 * @date Enero 13, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // 1. Verificar autenticación y autorización
    const auth = await protectAPIRoute(req, ['ADMIN', 'DIRECTOR']);
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    // 2. Obtener métricas del sistema
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalCases,
      totalUsers,
      totalNotifications,
      casesCreatedToday,
      casesClosedToday,
      notificationsSentToday,
      pendingNotifications,
    ] = await Promise.all([
      prisma.case.count({ where: { tenantId: auth.user.tenantId } }),
      prisma.user.count({ where: { tenantId: auth.user.tenantId } }),
      prisma.notification.count({ where: { tenantId: auth.user.tenantId } }),
      prisma.case.count({
        where: { tenantId: auth.user.tenantId, filedAt: { gte: today } },
      }),
      prisma.case.count({
        where: { tenantId: auth.user.tenantId, closedAt: { gte: today } },
      }),
      prisma.notification.count({
        where: { tenantId: auth.user.tenantId, status: 'SENT', sentAt: { gte: today } },
      }),
      prisma.notification.count({
        where: { tenantId: auth.user.tenantId, status: 'PENDING' },
      }),
    ]);

    // 3. Calcular promedio de tiempo de respuesta
    const closedCases = await prisma.case.findMany({
      where: {
        tenantId: auth.user.tenantId,
        closedAt: { not: null },
      },
      select: { filedAt: true, closedAt: true },
      take: 100,
      orderBy: { closedAt: 'desc' },
    });

    let averageResponseTime = 0;
    if (closedCases.length > 0) {
      const totalDays = closedCases.reduce((sum, case_) => {
        if (!case_.closedAt) return sum;
        const diff = case_.closedAt.getTime() - case_.filedAt.getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      averageResponseTime = Math.round((totalDays / closedCases.length) * 10) / 10;
    }

    // 4. Retornar métricas
    return NextResponse.json({
      success: true,
      data: {
        system: {
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || 'development',
          uptime: Math.floor(process.uptime()),
          version: process.env.SYSTEM_VERSION || '1.0.0',
        },
        database: {
          totalCases,
          totalUsers,
          totalNotifications,
        },
        operations: {
          casesCreatedToday,
          casesClosedToday,
          notificationsSentToday,
          pendingNotifications,
          averageResponseTime,
        },
      },
    });
  } catch (error) {
    console.error('Error en GET /api/v1/system/metrics:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener métricas del sistema',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
