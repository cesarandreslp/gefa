/**
 * API ENDPOINT: POST /api/v1/notifications/test
 * 
 * Envía un email de prueba
 * 
 * Acceso: ADMIN
 * Auditoría: No (solo testing)
 * 
 * @author Sistema Ventanilla Única
 * @date Enero 12, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { EmailService } from '@/services/EmailService';

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticación y autorización
    const auth = await protectAPIRoute(req, ['ADMIN', 'DIRECTOR']);
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    // 2. Extraer parámetros
    const body = await req.json();
    const { to, subject, message } = body;

    if (!to) {
      return NextResponse.json(
        { error: 'El campo "to" es requerido' },
        { status: 400 }
      );
    }

    // 3. Validar configuración SMTP
    const isConfigured = await EmailService.validateConfiguration();
    if (!isConfigured) {
      return NextResponse.json(
        { error: 'Configuración SMTP incompleta o inválida. Verifique las variables de entorno.' },
        { status: 500 }
      );
    }

    // 4. Enviar email de prueba
    const success = await EmailService.sendEmail({
      to,
      subject: subject || 'Email de prueba - Ventanilla Única',
      html: message || '<p>Este es un email de prueba del sistema de notificaciones.</p>',
    });

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Email de prueba enviado exitosamente',
      });
    }

    return NextResponse.json(
      { error: 'Error al enviar email de prueba' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error en POST /api/v1/notifications/test:', error);
    return NextResponse.json(
      {
        error: 'Error al enviar email de prueba',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
