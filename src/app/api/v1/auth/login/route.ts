/**
 * POST /api/v1/auth/login
 * 
 * FASE 2: Autenticación de funcionarios
 * 
 * Autentica a un funcionario y devuelve un token JWT
 */

import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/schemas/auth.schemas';
import { authService } from '@/services/AuthService';
import { auditService } from '@/services/AuditService';
import { setAuthCookie } from '@/lib/auth';
import { applyRateLimit } from '@/lib/rateLimit';
import { getClientIp, getUserAgent } from '@/lib/validation';
import { getTenantFromRequest } from '@/lib/tenantResolver';
import { getTenantPrisma } from '@/lib/tenantDb';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 intentos por IP cada 15 minutos
    const rateLimitResult = applyRateLimit(request, {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    // Parsear y validar body
    const body = await request.json();
    const validationResult = loginSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Datos inválidos',
            details: validationResult.error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
        },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // Obtener tenant desde la URL/header (el resolver manejará el caché y fallbacks)
    const currentTenant = await getTenantFromRequest(request);
    
    if (!currentTenant) {
      // Permitimos que continúe SOLO si el usuario va a ser SUPER_ADMIN, pero como no sabemos el rol antes de validar la clave, tenemos un problema de huevo-gallina.
      // Solución: El login POST se envía, pero validaremos más adelante si el rol es SUPER_ADMIN en caso de que currentTenant sea null.
      // Sin embargo, si currentTenant es un dominio real que está inactivo, lo bloqueamos inmediatamente.
    }

    if (currentTenant && !currentTenant.isActive) {
      return NextResponse.json({
        success: false,
        error: { code: 'INACTIVE_TENANT', message: 'La entidad se encuentra inactiva. Contacte al administrador global.' }
      }, { status: 403 });
    }

    // Intentar login
    const dbUrl = (currentTenant as any)?.databaseUrl as string | undefined;
    const tenantDb = dbUrl ? getTenantPrisma(dbUrl) : undefined;
    const result = await authService.login(email, password, currentTenant?.id, tenantDb);

    if (!result.success || !result.token || !result.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email o contraseña incorrectos',
          },
        },
        { status: 401 }
      );
    }

    // Validación CRÍTICA: Impedir fuga de datos e inicio cruzado
    if (result.user.role.code !== 'SUPER_ADMIN') {
      if (!currentTenant) {
        return NextResponse.json({
          success: false,
          error: { code: 'INVALID_DOMAIN', message: 'Dominio o entidad no configurada' }
        }, { status: 400 });
      }

      if (result.user.tenantId !== currentTenant.id) {
        return NextResponse.json({
          success: false,
          error: { code: 'UNAUTHORIZED_DOMAIN', message: 'Acceso no permitido para este dominio' }
        }, { status: 403 });
      }
    }

    // Registrar login exitoso en auditoría
    const ipAddress = getClientIp(request.headers);
    const userAgent = getUserAgent(request.headers);
    await auditService.logLogin(
      result.user.id,
      result.user.email,
      result.user.role.code,
      result.user.tenantId || null,
      ipAddress,
      userAgent
    );

    // Crear respuesta con cookie
    const responseWithCookie = NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            fullName: result.user.fullName,
            role: {
              code: result.user.role.code,
              name: result.user.role.name,
              level: result.user.role.level,
            },
          },
          token: result.token,
        },
        message: 'Login exitoso',
      },
      { status: 200 }
    );

    // Establecer cookie con el token
    const response = setAuthCookie(responseWithCookie, result.token);
    
    // Agregar header de redirección para el cliente según el rol
    if (result.user.role.code === 'SUPER_ADMIN') {
      response.headers.set('X-Redirect-To', '/super-admin');
    } else {
      response.headers.set('X-Redirect-To', '/admin/home');
    }
    
    return response;
  } catch (error) {
    console.error('Error en login:', error);

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
