/**
 * API ENDPOINT: POST /api/v1/notifications/process
 * 
 * Procesa la cola de notificaciones pendientes
 * 
 * Acceso: ADMIN
 * Auditoría: No (proceso automático)
 * 
 * @author GEFA — Gestión Familiar
 * @date Enero 12, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { NotificationService } from '@/services/NotificationService';

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticación y autorización
    const auth = await protectAPIRoute(req, ['ADMIN', 'DIRECTOR']);
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    // 2. Procesar cola
    console.log('Iniciando procesamiento de cola de notificaciones...');
    const result = await NotificationService.processPendingNotifications();

    // 3. Retornar resultado
    return NextResponse.json({
      success: true,
      message: 'Procesamiento de cola completado',
      data: result,
    });
  } catch (error) {
    console.error('Error en POST /api/v1/notifications/process:', error);
    return NextResponse.json(
      {
        error: 'Error al procesar cola de notificaciones',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
