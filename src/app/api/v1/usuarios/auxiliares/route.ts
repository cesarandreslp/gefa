/**
 * API para administrar usuarios Auxiliares (creados por y visibles sólo para un funcionario específico)
 * GET /api/v1/usuarios/auxiliares - Lista los auxiliares creados por el funcionario autenticado
 * POST /api/v1/usuarios/auxiliares - Crea un nuevo auxiliar asignado al funcionario autenticado
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, ['FUNCIONARIO', 'DIRECTOR', 'ADMIN']);
    if (!auth.authorized || !auth.user) {
      return auth.response || NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const { user } = auth;

    // Buscar usuarios que tengan a este funcionario como supervisor
    const auxiliares = await db.user.findMany({
      where: {
        supervisorId: user.userId
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        documentNumber: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: auxiliares,
    });
  } catch (error) {
    console.error('Error fetching auxiliares:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, ['FUNCIONARIO', 'DIRECTOR', 'ADMIN']);
    if (!auth.authorized || !auth.user) {
      return auth.response || NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const { user } = auth;

    const body = await request.json();
    const { fullName, email, documentNumber, password } = body;

    // Validación básica
    if (!fullName || !email || !documentNumber || !password) {
      return NextResponse.json(
        { success: false, error: 'El nombre, cédula, correo y contraseña son obligatorios' },
        { status: 400 }
      );
    }

    // --- NUEVA VALIDACIÓN: Máximo 2 auxiliares por funcionario ---
    const auxiliaresCount = await db.user.count({
      where: {
        supervisorId: user.userId,
        isActive: true // Contamos solo los activos
      }
    });

    if (auxiliaresCount >= 2) {
      return NextResponse.json(
        { success: false, error: 'Has alcanzado el límite máximo de 2 auxiliares permitidos por funcionario.' },
        { status: 403 }
      );
    }
    // -----------------------------------------------------------------

    // Verificar si el correo o cédula ya existen
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { email },
          { documentNumber }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: existingUser.email === email 
            ? 'El correo ingresado ya está registrado.' 
            : 'El número de cédula ya está registrado.'
        },
        { status: 409 }
      );
    }

    // Buscar o crear el rol de AUXILIAR si no existe en la BD
    let auxiliarRole = await db.role.findFirst({
      where: { code: 'AUXILIAR', tenantId: user.tenantId }
    });

    if (!auxiliarRole) {
      auxiliarRole = await db.role.create({
        data: {
          tenantId: user.tenantId,
          code: 'AUXILIAR',
          name: 'Auxiliar',
          description: 'Rol para auxiliares asignados a funcionarios, sin acceso a casos completos excepto los designados.',
          level: 30,
          permissions: ['cases:read:assigned'],
          isActive: true
        }
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Crear el usuario ligado al supervisor actual
    const newAuxiliar = await db.user.create({
      data: {
        tenantId: user.tenantId,
        fullName,
        email,
        documentType: 'CC', // Default / asumido
        documentNumber,
        passwordHash,
        roleId: auxiliarRole.id,
        supervisorId: user.userId
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        documentNumber: true,
        isActive: true,
        createdAt: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Auxiliar creado exitosamente',
      data: newAuxiliar,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating auxiliar:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor al crear el auxiliar' },
      { status: 500 }
    );
  }
}
