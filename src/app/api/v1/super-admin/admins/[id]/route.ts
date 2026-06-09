import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { protectAPIRoute } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { auditService } from '@/services/AuditService';
import { getClientIp, getUserAgent } from '@/lib/validation';

// PATCH — editar nombre, email o contraseña de un super admin
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await protectAPIRoute(request, ['SUPER_ADMIN']);
    if (!auth.authorized) return auth.response!;

    const { id } = params;
    const body = await request.json();
    const { fullName, email, password, isActive } = body;

    const target = await prisma.user.findFirst({
      where: { id, tenantId: null, role: { code: 'SUPER_ADMIN' } },
    });
    if (!target) {
      return NextResponse.json(
        { success: false, error: { message: 'Super admin no encontrado' } },
        { status: 404 }
      );
    }

    if (isActive === false && id === auth.user?.userId) {
      return NextResponse.json(
        { success: false, error: { message: 'No puedes desactivarte a ti mismo' } },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (fullName  !== undefined) updateData.fullName  = fullName;
    if (email     !== undefined) updateData.email     = email;
    if (isActive  !== undefined) updateData.isActive   = isActive;
    if (password) {
      if (password.length < 8) {
        return NextResponse.json(
          { success: false, error: { message: 'La contraseña debe tener al menos 8 caracteres' } },
          { status: 400 }
        );
      }
      updateData.passwordHash      = await bcrypt.hash(password, 12);
      updateData.passwordChangedAt = new Date();
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, fullName: true, isActive: true, createdAt: true },
    });

    await auditService.log({
      action: 'ADMIN_UPDATED',
      userId: auth.user!.userId,
      userEmail: auth.user!.email,
      userRole: 'SUPER_ADMIN',
      tenantId: null,
      entityType: 'User',
      entityId: id,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      before: { email: target.email, fullName: target.fullName, isActive: target.isActive },
      after:  { email: updated.email,  fullName: updated.fullName,  isActive: updated.isActive },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('[super-admin/admins PATCH]', error);
    return NextResponse.json({ success: false, error: { message: 'Error interno del servidor' } }, { status: 500 });
  }
}
