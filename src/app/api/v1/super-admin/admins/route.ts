import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { protectAPIRoute } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { auditService } from '@/services/AuditService';
import { getClientIp, getUserAgent } from '@/lib/validation';

// GET — listar todos los super admins
export async function GET(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, ['SUPER_ADMIN']);
    if (!auth.authorized) return auth.response!;

    const admins = await prisma.user.findMany({
      where: { tenantId: null, role: { code: 'SUPER_ADMIN' } },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, data: admins });
  } catch (error) {
    console.error('[super-admin/admins GET]', error);
    return NextResponse.json({ success: false, error: { message: 'Error interno del servidor' } }, { status: 500 });
  }
}

// POST — crear nuevo super admin
export async function POST(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, ['SUPER_ADMIN']);
    if (!auth.authorized) return auth.response!;

    const body = await request.json();
    const { email, fullName, password } = body;

    if (!email || !fullName || !password) {
      return NextResponse.json(
        { success: false, error: { message: 'Correo, nombre completo y contraseña son requeridos' } },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: { message: 'La contraseña debe tener al menos 8 caracteres' } },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findFirst({ where: { email, tenantId: null } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: { message: 'Ya existe un super admin con ese correo' } },
        { status: 409 }
      );
    }

    const role = await prisma.role.findFirst({ where: { code: 'SUPER_ADMIN' } });
    if (!role) {
      return NextResponse.json(
        { success: false, error: { message: 'Rol SUPER_ADMIN no encontrado en la base de datos' } },
        { status: 500 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        passwordHash,
        tenantId: null,
        roleId: role.id,
        isActive: true,
        // documentType y documentNumber son requeridos por el schema
        documentType: 'SA',
        documentNumber: `SA-${Date.now()}`,
      },
      select: { id: true, email: true, fullName: true, isActive: true, createdAt: true },
    });

    await auditService.log({
      action: 'ADMIN_CREATED',
      userId: auth.user!.userId,
      userEmail: auth.user!.email,
      userRole: 'SUPER_ADMIN',
      tenantId: null,
      entityType: 'User',
      entityId: user.id,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { createdEmail: email },
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    console.error('[super-admin/admins POST]', error);
    return NextResponse.json({ success: false, error: { message: 'Error interno del servidor' } }, { status: 500 });
  }
}
