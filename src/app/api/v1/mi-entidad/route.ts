import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { clearTenantCache } from '@/lib/tenantResolver';
import { getLandingConfig } from '@/lib/landingDefaults';

// Campos que viven en TenantSettings
const SETTINGS_FIELDS = [
  'address', 'businessHours', 'phone', 'mobilePhone', 'tollFreePhone',
  'anticorruptionPhone', 'fax', 'institutionalEmail', 'judicialNoticesEmail',
  'facebook', 'twitter', 'youtube', 'instagram'
];

/**
 * GET /api/v1/mi-entidad
 * Obtiene los datos de branding + contacto del tenant actual
 */
export async function GET(request: NextRequest) {
  const auth = await protectAPIRoute(request);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (!auth.user.tenantId) {
    return NextResponse.json({ error: 'No tienes entidad asociada' }, { status: 400 });
  }

  try {
    const db = auth.db;
    const tenant = await db.tenant.findUnique({
      where: { id: auth.user.tenantId },
      select: {
        id: true,
        name: true,
        sigla: true,
        domain: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        institutionalEmail: true,
        phone: true,
        address: true,
        institutionTypeId: true,
        institutionType: { select: { name: true } },
        settings: true,
      }
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Entidad no encontrada' }, { status: 404 });
    }

    // Aplanar settings para el frontend
    const s = tenant.settings;
    const result = {
      id: tenant.id,
      name: tenant.name,
      sigla: tenant.sigla,
      domain: tenant.domain,
      logoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
      institutionType: tenant.institutionType,
      // Contacto (priorizar settings, fallback a tenant)
      address: s?.address || tenant.address || '',
      businessHours: s?.businessHours || '',
      phone: s?.phone || tenant.phone || '',
      institutionalEmail: s?.institutionalEmail || tenant.institutionalEmail || '',
      // Desactivables (null = desactivado, string = activado)
      mobilePhone: s?.mobilePhone ?? null,
      tollFreePhone: s?.tollFreePhone ?? null,
      anticorruptionPhone: s?.anticorruptionPhone ?? null,
      fax: s?.fax ?? null,
      judicialNoticesEmail: s?.judicialNoticesEmail ?? null,
      // Redes sociales (null = desactivado)
      facebook: s?.facebook ?? null,
      twitter: s?.twitter ?? null,
      youtube: s?.youtube ?? null,
      instagram: s?.instagram ?? null,
      // Landing page config
      landingConfig: getLandingConfig(
        s?.metadata as Record<string, unknown> | null
      ),
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error obteniendo datos de entidad:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

/**
 * PATCH /api/v1/mi-entidad
 * Permite al admin del tenant editar colores, logo, contacto y redes
 * NO permite cambiar nombre, sigla ni dominio
 */
export async function PATCH(request: NextRequest) {
  const auth = await protectAPIRoute(request);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const roleCode = auth.user.roleCode || '';
  const isAdmin = roleCode.startsWith('ADMIN') || roleCode === 'SUPER_ADMIN';
  if (!isAdmin) {
    return NextResponse.json({ error: 'Solo administradores pueden editar la configuración de la entidad' }, { status: 403 });
  }

  if (!auth.user.tenantId) {
    return NextResponse.json({ error: 'No tienes entidad asociada' }, { status: 400 });
  }

  try {
    const db = auth.db;
    const body = await request.json();
    const tenantId = auth.user.tenantId;

    // 1. Actualizar campos del modelo Tenant (branding)
    const tenantUpdate: any = {};
    if (body.logoUrl !== undefined) tenantUpdate.logoUrl = body.logoUrl;
    if (body.primaryColor !== undefined) tenantUpdate.primaryColor = body.primaryColor;
    if (body.secondaryColor !== undefined) tenantUpdate.secondaryColor = body.secondaryColor;
    // Sincronizar campos base en Tenant
    if (body.institutionalEmail !== undefined) tenantUpdate.institutionalEmail = body.institutionalEmail;
    if (body.phone !== undefined) tenantUpdate.phone = body.phone;
    if (body.address !== undefined) tenantUpdate.address = body.address;

    await db.tenant.update({
      where: { id: tenantId },
      data: tenantUpdate
    });

    // 2. Actualizar TenantSettings (contacto + redes)
    const settingsUpdate: any = {};
    for (const field of SETTINGS_FIELDS) {
      if (body[field] !== undefined) {
        // null = desactivado, '' = activado pero vacío, string = con valor
        settingsUpdate[field] = body[field];
      }
    }

    if (Object.keys(settingsUpdate).length > 0) {
      await db.tenantSettings.upsert({
        where: { tenantId },
        update: settingsUpdate,
        create: { tenantId, ...settingsUpdate }
      });
    }

    // 3. Guardar landing config en metadata si se envió
    if (body.landingConfig !== undefined) {
      const existing = await db.tenantSettings.findUnique({ where: { tenantId } });
      const currentMetadata = (existing?.metadata as Record<string, unknown>) || {};
      const updatedMetadata = { ...currentMetadata };
      updatedMetadata.landingConfig = body.landingConfig;
      await db.tenantSettings.upsert({
        where: { tenantId },
        update: { metadata: updatedMetadata as any },
        create: { tenantId, metadata: updatedMetadata as any }
      });
    }

    // Invalidar cache del tenant para que el footer se actualice
    clearTenantCache();

    return NextResponse.json({ success: true, message: 'Configuración actualizada' });
  } catch (error) {
    console.error('Error actualizando entidad:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
