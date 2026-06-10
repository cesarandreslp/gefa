import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { auditService } from '@/services/AuditService';
import { getClientIp, getUserAgent } from '@/lib/validation';

// PATCH - Cambiar estado activo/inactivo del usuario
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await protectAPIRoute(request, ['ADMIN', 'DIRECTOR']);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const { id } = params;

    // Obtener usuario actual
    const user = await db.user.findFirst({
      where: { id, tenantId: auth.user.tenantId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Reactivar consume seat: si pasa de inactivo a activo, respetar maxUsers.
    if (!user.isActive) {
      const tenant = await db.tenant.findUnique({
        where: { id: auth.user.tenantId },
        select: { maxUsers: true },
      });
      if (tenant?.maxUsers != null) {
        const activos = await db.user.count({
          where: {
            tenantId: auth.user.tenantId,
            isActive: true,
            OR: [{ role: null }, { role: { code: { not: 'ASIGNACION_DE_CASOS' } } }],
          },
        });
        if (activos >= tenant.maxUsers) {
          return NextResponse.json(
            { error: `Cupo de usuarios alcanzado: la entidad contrató ${tenant.maxUsers}. Desactive otro o solicite ampliación.` },
            { status: 409 }
          );
        }
      }
    }

    // Cambiar el estado
    const updatedUser = await db.user.update({
      where: { id },
      data: {
        isActive: !user.isActive
      },
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
      action: updatedUser.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      userId: auth.user.userId,
      userEmail: auth.user.email,
      userRole: auth.user.roleCode,
      tenantId: auth.user.tenantId || null,
      entityType: 'User',
      entityId: id,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { targetEmail: user.email, newStatus: updatedUser.isActive },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error cambiando estado del usuario:', error);
    return NextResponse.json(
      { error: 'Error al cambiar el estado del usuario' },
      { status: 500 }
    );
  }
}
