import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { protectAPIRoute } from '@/lib/auth';
import { auditService } from '@/services/AuditService';
import { getClientIp, getUserAgent } from '@/lib/validation';

// PUT - Actualizar una comisaría (solo ADMIN)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, ['ADMIN']);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    const existing = await auth.db.comisaria.findFirst({
      where: { id, tenantId: auth.user.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Comisaría no encontrada' }, { status: 404 });
    }

    const data: Prisma.ComisariaUncheckedUpdateInput = {};

    if (body.code !== undefined) {
      const code = String(body.code).trim().toUpperCase();
      if (!code) return NextResponse.json({ error: 'El código no puede quedar vacío' }, { status: 400 });
      if (code !== existing.code) {
        const dup = await auth.db.comisaria.findFirst({
          where: { code, tenantId: auth.user.tenantId, id: { not: id } },
        });
        if (dup) return NextResponse.json({ error: `Ya existe una comisaría con el código ${code}` }, { status: 400 });
      }
      data.code = code;
    }
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: 'El nombre no puede quedar vacío' }, { status: 400 });
      data.name = name;
    }
    if (body.address !== undefined) data.address = body.address ? String(body.address).trim() : null;
    if (body.phone !== undefined) data.phone = body.phone ? String(body.phone).trim() : null;
    if (body.isMobile !== undefined) data.isMobile = Boolean(body.isMobile);
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    // Reactivar consume cupo: si se pasa de inactiva a activa, respetar maxComisarias.
    if (body.isActive === true && !existing.isActive) {
      const tenant = await auth.db.tenant.findUnique({
        where: { id: auth.user.tenantId },
        select: { maxComisarias: true },
      });
      if (tenant?.maxComisarias != null) {
        const activas = await auth.db.comisaria.count({
          where: { tenantId: auth.user.tenantId, isActive: true },
        });
        if (activas >= tenant.maxComisarias) {
          return NextResponse.json(
            { error: `Cupo de comisarías alcanzado: la entidad contrató ${tenant.maxComisarias}. Desactive otra o solicite ampliación.` },
            { status: 409 }
          );
        }
      }
    }

    const updated = await auth.db.comisaria.update({ where: { id }, data });

    await auditService.log({
      action: 'COMISARIA_UPDATED',
      userId: auth.user.userId,
      userEmail: auth.user.email,
      userRole: auth.user.roleCode,
      tenantId: auth.user.tenantId || null,
      entityType: 'Comisaria',
      entityId: id,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      before: { code: existing.code, name: existing.name, isActive: existing.isActive },
      after: { code: updated.code, name: updated.name, isActive: updated.isActive },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error actualizando comisaría:', error);
    return NextResponse.json({ error: 'Error al actualizar la comisaría' }, { status: 500 });
  }
}

// DELETE - Desactivar una comisaría (soft delete; preserva historial)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, ['ADMIN']);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;
    const existing = await auth.db.comisaria.findFirst({
      where: { id, tenantId: auth.user.tenantId },
      include: { _count: { select: { users: true, cases: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Comisaría no encontrada' }, { status: 404 });
    }

    if (existing._count.cases > 0) {
      return NextResponse.json(
        { error: `No se puede desactivar: la comisaría tiene ${existing._count.cases} caso(s) asociado(s). Reasígnelos primero.` },
        { status: 400 }
      );
    }

    const updated = await auth.db.comisaria.update({ where: { id }, data: { isActive: false } });

    await auditService.log({
      action: 'COMISARIA_DEACTIVATED',
      userId: auth.user.userId,
      userEmail: auth.user.email,
      userRole: auth.user.roleCode,
      tenantId: auth.user.tenantId || null,
      entityType: 'Comisaria',
      entityId: id,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { code: existing.code, name: existing.name, usersAffected: existing._count.users },
    });

    return NextResponse.json({ success: true, comisaria: updated });
  } catch (error) {
    console.error('Error desactivando comisaría:', error);
    return NextResponse.json({ error: 'Error al desactivar la comisaría' }, { status: 500 });
  }
}
