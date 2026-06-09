/**
 * API ENDPOINT: GET /api/v1/settings
 * 
 * Obtiene todos los settings del sistema
 * 
 * Acceso: ADMIN
 * Auditoría: No (solo lectura)
 * 
 * @author Sistema Ventanilla Única
 * @date Enero 12, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { SystemSettingsService } from '@/services/SystemSettingsService';

export async function GET(req: NextRequest) {
  try {
    // 1. Verificar autenticación y autorización
    const auth = await protectAPIRoute(req, ['ADMIN', 'DIRECTOR']);
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    // 2. Obtener todos los settings
    const settings = await SystemSettingsService.getAllSettings();

    // 3. Retornar
    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Error en GET /api/v1/settings:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener configuración del sistema',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
