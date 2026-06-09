/**
 * API ENDPOINT: GET /api/v1/health
 * 
 * Verifica la salud general del sistema
 * 
 * Acceso: PÚBLICO (sin autenticación)
 * Propósito: Health check para monitoreo externo
 * 
 * @author Sistema Ventanilla Única
 * @date Enero 13, 2026
 */

import { NextResponse } from 'next/server';
import { HealthService } from '@/services/HealthService';

export async function GET() {
  try {
    const health = await HealthService.getSystemHealth();
    
    // Retornar con status code apropiado
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 503 : 503;
    
    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    console.error('Error en GET /api/v1/health:', error);
    
    return NextResponse.json(
      {
        status: 'down',
        timestamp: new Date().toISOString(),
        version: process.env.SYSTEM_VERSION || '1.0.0',
        uptime: 0,
        checks: {
          database: {
            status: 'down',
            responseTime: 0,
            message: 'Health check failed',
          },
          notifications: {
            status: 'down',
            pendingCount: -1,
            failedCount: -1,
          },
        },
      },
      { status: 503 }
    );
  }
}
