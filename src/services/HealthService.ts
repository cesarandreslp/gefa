/**
 * HEALTH SERVICE - FASE 5 MÓDULO 4
 * 
 * Servicio de verificación de salud del sistema
 * 
 * Características:
 * - Verificación de conexión a BD
 * - Estado de cola de notificaciones
 * - Uptime del sistema
 * - Métricas básicas de salud
 * 
 * @author GEFA — Gestión Familiar
 * @date Enero 13, 2026
 */

import { prisma } from '@/lib/prisma';

// Timestamp de inicio del servidor
const SERVER_START_TIME = Date.now();

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  message?: string;
}

export interface QueueStatus {
  status: 'healthy' | 'degraded' | 'down';
  pendingCount: number;
  failedCount: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: HealthCheck;
    notifications: QueueStatus;
  };
}

export class HealthService {
  /**
   * Verifica la salud general del sistema
   */
  static async getSystemHealth(): Promise<SystemHealth> {
    const database = await this.checkDatabase();
    const notifications = await this.checkNotificationQueue();

    // Determinar estado general
    let overallStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (database.status === 'down' || notifications.status === 'down') {
      overallStatus = 'down';
    } else if (database.status === 'degraded' || notifications.status === 'degraded') {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.SYSTEM_VERSION || '1.0.0',
      uptime: this.getUptime(),
      checks: {
        database,
        notifications,
      },
    };
  }

  /**
   * Verifica conexión a la base de datos
   */
  static async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      // Query simple para verificar conexión
      await prisma.$queryRaw`SELECT 1 as result`;
      const responseTime = Date.now() - start;

      // Para conexiones en la nube (Neon), 2000ms es aceptable
      // Degraded si > 2000ms, down si falla completamente
      return {
        status: responseTime < 2000 ? 'healthy' : 'degraded',
        responseTime,
        message: responseTime < 2000 ? 'Database connected' : 'Database slow response',
      };
    } catch {
      return {
        status: 'down',
        responseTime: Date.now() - start,
        message: 'Database connection failed',
      };
    }
  }

  /**
   * Verifica estado de cola de notificaciones
   */
  static async checkNotificationQueue(): Promise<QueueStatus> {
    try {
      const [pendingCount, failedCount] = await Promise.all([
        prisma.notification.count({
          where: { status: 'PENDING' },
        }),
        prisma.notification.count({
          where: { status: 'FAILED' },
        }),
      ]);

      // Estado degradado si hay muchas pendientes o fallidas
      let status: 'healthy' | 'degraded' | 'down' = 'healthy';
      if (pendingCount > 100 || failedCount > 50) {
        status = 'degraded';
      }

      return {
        status,
        pendingCount,
        failedCount,
      };
    } catch (error) {
      console.error('Error checking notification queue:', error);
      return {
        status: 'down',
        pendingCount: -1,
        failedCount: -1,
      };
    }
  }

  /**
   * Obtiene el uptime del servidor en segundos
   */
  static getUptime(): number {
    return Math.floor((Date.now() - SERVER_START_TIME) / 1000);
  }

  /**
   * Verifica si el sistema está en modo degradado
   */
  static async isInDegradedMode(): Promise<boolean> {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'SYSTEM_DEGRADED_MODE' },
      });
      
      return setting?.value === true;
    } catch (error) {
      console.error('Error checking degraded mode:', error);
      return false;
    }
  }

  /**
   * Formatea uptime a formato legible
   */
  static formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}
