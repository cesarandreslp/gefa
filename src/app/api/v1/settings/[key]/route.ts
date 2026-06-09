/**
 * API ENDPOINT: GET/PUT /api/v1/settings/[key]
 * 
 * Obtiene o actualiza un setting específico
 * 
 * Acceso: ADMIN
 * Auditoría: Sí (en PUT)
 * 
 * @author GEFA — Gestión Familiar
 * @date Enero 12, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { SystemSettingsService, SettingKey } from '@/services/SystemSettingsService';

interface RouteParams {
  params: {
    key: string;
  };
}

export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    // 1. Verificar autenticación y autorización
    const auth = await protectAPIRoute(req, ['ADMIN', 'DIRECTOR']);
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    // 2. Validar key
    const { key } = params;
    
    // 3. Obtener setting
    try {
      const value = await SystemSettingsService.getSetting(key as SettingKey);

      return NextResponse.json({
        success: true,
        data: {
          key,
          value,
        },
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Setting no encontrado o inválido',
          details: error instanceof Error ? error.message : 'Error desconocido',
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(`Error en GET /api/v1/settings/${params.key}:`, error);
    return NextResponse.json(
      {
        error: 'Error al obtener configuración',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    // 1. Verificar autenticación y autorización
    const auth = await protectAPIRoute(req, ['ADMIN', 'DIRECTOR']);
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    // 2. Extraer parámetros
    const { key } = params;
    const body = await req.json();
    const { value } = body;

    if (value === undefined) {
      return NextResponse.json(
        { error: 'El campo "value" es requerido' },
        { status: 400 }
      );
    }

    // 3. Actualizar setting (incluye validación)
    try {
      await SystemSettingsService.upsertSetting(
        key as SettingKey,
        value,
        auth.user.userId,
        auth.user.email,
        auth.user.roleCode
      );

      return NextResponse.json({
        success: true,
        message: 'Configuración actualizada exitosamente',
        data: {
          key,
          value,
        },
      });
    } catch (validationError) {
      return NextResponse.json(
        {
          error: 'Validación fallida',
          details:
            validationError instanceof Error
              ? validationError.message
              : 'Valor inválido',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error(`Error en PUT /api/v1/settings/${params.key}:`, error);
    return NextResponse.json(
      {
        error: 'Error al actualizar configuración',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
