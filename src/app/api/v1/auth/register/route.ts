/**
 * POST /api/v1/auth/register
 * 
 * FASE 2: Registro de funcionarios
 * 
 * Permite a un ADMIN crear nuevos funcionarios
 * Requiere autenticación y rol ADMIN
 */

import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@/lib/schemas/auth.schemas';
import { authService } from '@/services/AuthService';
import { protectAPIRoute } from '@/lib/auth';
import { applyRateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 10 registros por IP cada hora
    const rateLimitResult = applyRateLimit(request, {
      maxRequests: 10,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    // Verificar autenticación y rol ADMIN
    const auth = await protectAPIRoute(request, ['ADMIN', 'DIRECTOR']);

    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    // Parsear y validar body
    const body = await request.json();
    const validationResult = registerSchema.safeParse(body);

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

    const { email, password, fullName, documentType, documentNumber, roleCode, department, position } = validationResult.data;

    // Crear usuario
    const result = await authService.register({
      tenantId: auth.user.tenantId,
      email,
      password,
      fullName,
      documentType,
      documentNumber,
      roleCode,
      department,
      position,
    });

    if (!result.success || !result.user) {
      // Si el error es por duplicado
      if (result.error === 'Email already exists') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'EMAIL_EXISTS',
              message: 'El email ya está registrado',
            },
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'REGISTRATION_FAILED',
            message: result.error || 'Error al crear usuario',
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            fullName: result.user.fullName,
            isActive: result.user.isActive,
            role: {
              code: result.user.role.code,
              name: result.user.role.name,
            },
            createdAt: result.user.createdAt,
          },
        },
        message: 'Usuario creado exitosamente',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error en registro:', error);

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
