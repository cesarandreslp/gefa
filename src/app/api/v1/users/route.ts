import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { protectAPIRoute } from '@/lib/auth';
import { auditService } from '@/services/AuditService';
import { getClientIp, getUserAgent } from '@/lib/validation';

// GET - Obtener todos los usuarios
export async function GET(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const users = await db.user.findMany({
      where: {
        tenantId: auth.user.tenantId,
        // Excluir usuario interno de IA, pero incluir usuarios sin rol
        OR: [
          { role: null },
          { role: { code: { not: 'ASIGNACION_DE_CASOS' } } }
        ]
      },
      include: {
        role: {
          select: {
            id: true,
            code: true,
            name: true
          }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { fullName: 'asc' }
      ]
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    return NextResponse.json(
      { error: 'Error al obtener los usuarios' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo usuario
export async function POST(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const body = await request.json();
    const {
      email,
      password,
      fullName,
      documentType,
      documentNumber,
      roleId,
      department,
      position
    } = body;

    // Validar email único DENTRO del tenant
    const existingEmail = await db.user.findFirst({
      where: { email, tenantId: auth.user.tenantId }
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con ese email' },
        { status: 400 }
      );
    }

    // Validar documento único DENTRO del tenant
    const existingDocument = await db.user.findFirst({
      where: { documentNumber, tenantId: auth.user.tenantId }
    });

    if (existingDocument) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con ese número de documento' },
        { status: 400 }
      );
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear usuario
    const userData: Prisma.UserUncheckedCreateInput = {
      tenantId: auth.user.tenantId,
      email,
      passwordHash,
      fullName,
      documentType,
      documentNumber,
      roleId: (roleId && roleId !== '') ? roleId : null,
      isActive: true
    };

    // Agregar campos opcionales solo si tienen valor
    if (department) userData.department = department;
    if (position) userData.position = position;

    const newUser = await db.user.create({
      data: userData,
      include: {
        role: {
          select: {
            id: true,
            code: true,
            name: true
          }
        }
      }
    });

    await auditService.log({
      action: 'USER_CREATED',
      userId: auth.user.userId,
      userEmail: auth.user.email,
      userRole: auth.user.roleCode,
      tenantId: auth.user.tenantId || null,
      entityType: 'User',
      entityId: newUser.id,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { createdEmail: email, createdRole: newUser.role?.code },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creando usuario:', error);
    return NextResponse.json(
      { error: 'Error al crear el usuario' },
      { status: 500 }
    );
  }
}
