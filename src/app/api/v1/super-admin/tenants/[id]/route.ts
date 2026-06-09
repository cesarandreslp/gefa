import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { protectAPIRoute } from '@/lib/auth';
import { auditService } from '@/services/AuditService';
import { getClientIp, getUserAgent } from '@/lib/validation';
import { clearTenantCache } from '@/lib/tenantResolver';

const prisma = new PrismaClient();

async function checkSuperAdmin(request: NextRequest) {
  const auth = await protectAPIRoute(request);
  if (!auth.authorized || !auth.user || auth.user.roleCode !== 'SUPER_ADMIN') {
    return { error: NextResponse.json({ error: 'No autorizado o no es Super Administrador' }, { status: 403 }) };
  }
  return { user: auth.user };
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const check = await checkSuperAdmin(request);
  if (check.error) return check.error;

  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID de tenant no especificado' }, { status: 400 });
    }

    const body = await request.json();

    // Extraer campos validados, excluyendo explícitamente cualquier soft-delete o hard delete.
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.sigla !== undefined) updateData.sigla = body.sigla;
    if (body.domain !== undefined) updateData.domain = body.domain;
    if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl;
    if (body.faviconUrl !== undefined) updateData.faviconUrl = body.faviconUrl || null;
    if (body.primaryColor !== undefined) updateData.primaryColor = body.primaryColor;
    if (body.secondaryColor !== undefined) updateData.secondaryColor = body.secondaryColor;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    // Validación duplicado recursiva si cambia domain
    if (body.domain) {
      const exists = await prisma.tenant.findFirst({
        where: { domain: body.domain, NOT: { id } }
      });
      if (exists) {
        return NextResponse.json({ success: false, error: 'Este dominio ya está asignado a otra entidad.' }, { status: 400 });
      }
    }

    // 1. Obtener estado anterior
    const oldTenant = await prisma.tenant.findUnique({ where: { id } });
    if (!oldTenant) {
      return NextResponse.json({ success: false, error: 'Tenant original no encontrado' }, { status: 404 });
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: updateData
    });

    // Invalidar caché de resolución de dominio para que el nuevo dominio tome efecto de inmediato
    clearTenantCache();

    // Actualizar groqApiKey en TenantSettings si se envió
    if (body.groqApiKey !== undefined || body.smtpUser !== undefined || body.smtpPass !== undefined || body.smtpFromName !== undefined) {
      const settingsUpdate: Record<string, string | null> = {};
      if (body.groqApiKey !== undefined) settingsUpdate.groqApiKey = body.groqApiKey || null;
      if (body.smtpUser !== undefined) settingsUpdate.smtpUser = body.smtpUser || null;
      if (body.smtpPass !== undefined) settingsUpdate.smtpPass = body.smtpPass || null;
      if (body.smtpFromName !== undefined) settingsUpdate.smtpFromName = body.smtpFromName || null;
      await prisma.tenantSettings.upsert({
        where: { tenantId: id },
        update: settingsUpdate,
        create: { tenantId: id, ...settingsUpdate },
      });
    }

    // 2. Registro auditoría
    await auditService.logTenantUpdated(
      id,
      check.user!.userId,
      check.user!.email,
      check.user!.roleCode,
      getClientIp(request.headers),
      getUserAgent(request.headers),
      {
        domain: oldTenant.domain, isActive: oldTenant.isActive, primaryColor: oldTenant.primaryColor
      },
      {
        domain: updatedTenant.domain, isActive: updatedTenant.isActive, primaryColor: updatedTenant.primaryColor
      }
    );

    // 3. Emitir evento extra de estado si detectamos un cambio explícito en isActive
    if (oldTenant.isActive !== updatedTenant.isActive) {
      await auditService.logTenantStateChange(
        id,
        check.user!.userId,
        check.user!.email,
        check.user!.roleCode,
        getClientIp(request.headers),
        getUserAgent(request.headers),
        updatedTenant.isActive
      );
    }

    return NextResponse.json({ success: true, data: updatedTenant });
  } catch (error) {
    console.error('Error actualizando tenant:', error);
    return NextResponse.json({ success: false, error: 'Error interno o el Tenant no existe' }, { status: 500 });
  }
}
