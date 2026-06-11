import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { protectAPIRoute } from '@/lib/auth';
import { auditService } from '@/services/AuditService';
import { getClientIp, getUserAgent } from '@/lib/validation';

// PUT - Actualizar un usuario
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await protectAPIRoute(request);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const { id } = params;
    const body = await request.json();
    const {
      email,
      password,
      fullName,
      documentType,
      documentNumber,
      roleId,
      comisariaId,
      department,
      position,
      profesion
    } = body;

    const PROFESIONES = ['PSICOLOGIA', 'TRABAJO_SOCIAL', 'JURIDICA'];
    if (profesion !== undefined && profesion !== '' && profesion !== null && !PROFESIONES.includes(profesion)) {
      return NextResponse.json({ error: 'Profesión inválida' }, { status: 400 });
    }

    // Verificar si el usuario existe Y pertenece al mismo tenant
    const existingUser = await db.user.findFirst({
      where: { id, tenantId: auth.user.tenantId }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Validar email único DENTRO del tenant (solo si viene y cambió).
    // Importante: en actualizaciones parciales (p. ej. solo comisariaId) estos
    // campos llegan undefined y NO deben dispararse (un findFirst con email:undefined
    // devolvería cualquier otro usuario y daría un falso "ya existe").
    if (email !== undefined && email !== existingUser.email) {
      const emailExists = await db.user.findFirst({
        where: { email, tenantId: auth.user.tenantId, id: { not: id } }
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'Ya existe un usuario con ese email' },
          { status: 400 }
        );
      }
    }

    // Validar documento único DENTRO del tenant (solo si viene y cambió)
    if (documentNumber !== undefined && documentNumber !== existingUser.documentNumber) {
      const documentExists = await db.user.findFirst({
        where: { documentNumber, tenantId: auth.user.tenantId, id: { not: id } }
      });

      if (documentExists) {
        return NextResponse.json(
          { error: 'Ya existe un usuario con ese número de documento' },
          { status: 400 }
        );
      }
    }

    // Preparar datos para actualizar (solo los campos que vienen)
    const updateData: Prisma.UserUncheckedUpdateInput = {};
    if (email !== undefined) updateData.email = email;
    if (fullName !== undefined) updateData.fullName = fullName;
    if (documentType !== undefined) updateData.documentType = documentType;
    if (documentNumber !== undefined) updateData.documentNumber = documentNumber;

    // Campos opcionales
    if (department !== undefined) {
      updateData.department = department || null;
    }
    if (position !== undefined) {
      updateData.position = position || null;
    }
    if (profesion !== undefined) {
      updateData.profesion = (profesion === '' || profesion === null) ? null : (profesion as never);
    }

    // Si hay contraseña nueva, hashearla
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    // Manejar roleId (puede ser string vacío = sin rol)
    if (roleId !== undefined) {
      updateData.roleId = (roleId === '' || roleId === null) ? null : roleId;
    }

    // Manejar comisariaId (string vacío/null = sin sede), validando el tenant
    if (comisariaId !== undefined) {
      if (comisariaId === '' || comisariaId === null) {
        updateData.comisariaId = null;
      } else {
        const comisaria = await db.comisaria.findFirst({
          where: { id: comisariaId, tenantId: auth.user.tenantId },
          select: { id: true },
        });
        if (!comisaria) {
          return NextResponse.json({ error: 'La comisaría seleccionada no existe en la entidad' }, { status: 400 });
        }
        updateData.comisariaId = comisariaId;
      }
    }

    // Actualizar usuario (usar updateMany con tenantId como barrera de seguridad)
    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      include: {
        role: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        comisaria: {
          select: { id: true, code: true, name: true }
        }
      }
    });

    await auditService.log({
      action: 'USER_UPDATED',
      userId: auth.user.userId,
      userEmail: auth.user.email,
      userRole: auth.user.roleCode,
      tenantId: auth.user.tenantId || null,
      entityType: 'User',
      entityId: id,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      before: { email: existingUser.email, fullName: existingUser.fullName, roleId: existingUser.roleId },
      after:  { email: updatedUser.email,  fullName: updatedUser.fullName,  roleId: updatedUser.roleId },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el usuario' },
      { status: 500 }
    );
  }
}

// DELETE - Desactivar un usuario (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await protectAPIRoute(request);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const { id } = params;

    // Verificar si el usuario existe Y pertenece al mismo tenant
    const existingUser = await db.user.findFirst({
      where: { id, tenantId: auth.user.tenantId },
      include: {
        assignments: {
          include: {
            case: {
              include: {
                state: true
              }
            }
          }
        }
      }
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si tiene casos activos asignados
    const activeCases = existingUser.assignments.filter(
      a => !['CERRADO', 'RESUELTO'].includes(a.case.state.code)
    );

    if (activeCases.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `No se puede eliminar el usuario porque tiene ${activeCases.length} caso(s) activo(s). Por favor, reasigne los casos primero o use el botón de desactivar.` 
        },
        { status: 400 }
      );
    }

    // En lugar de eliminar físicamente, desactivamos el usuario
    // Esto preserva la integridad del historial y auditoría
    const updatedUser = await db.user.update({
      where: { id },
      data: { 
        isActive: false,
        refreshToken: null, // Cerrar sesiones activas
        refreshTokenExpiresAt: null
      }
    });

    await auditService.log({
      action: 'USER_DEACTIVATED',
      userId: auth.user.userId,
      userEmail: auth.user.email,
      userRole: auth.user.roleCode,
      tenantId: auth.user.tenantId || null,
      entityType: 'User',
      entityId: id,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { deactivatedEmail: existingUser.email, deactivatedRole: existingUser.roleId },
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario desactivado correctamente. El historial y registros se han preservado.',
      user: updatedUser
    });
  } catch (error: unknown) {
    console.error('Error desactivando usuario:', error);
    
    return NextResponse.json(
      { success: false, error: 'Error al desactivar el usuario', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
