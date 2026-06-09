import fs from 'fs';
import path from 'path';
import { headers } from 'next/headers';
import { resolveTenantByHost } from '@/lib/tenantResolver';
import { prisma } from '@/lib/prisma';
import ClientLayout from './ClientLayout';

export async function generateMetadata() {
  const headersList = headers();
  const host = headersList.get('x-tenant-domain') || headersList.get('host');
  const tenant = await resolveTenantByHost(host);

  return {
    title: tenant ? `${tenant.name} - Ventanilla Única` : 'Sistema de Ventanilla Única',
    description: `Portal oficial de la ventanilla única para ${tenant?.name || 'Entidad Pública'}.`,
  };
}

function resolveFaviconUrl(tenant: { sigla: string; faviconUrl?: string | null } | null): string | undefined {
  if (!tenant) return '/favicon_oss.png';
  // 1. URL guardada en BD (subida por el super admin)
  if (tenant.faviconUrl) return tenant.faviconUrl;
  // 2. Convención de archivo: /public/favicon_<sigla>.png
  const faviconPath = path.join(process.cwd(), 'public', `favicon_${tenant.sigla.toLowerCase()}.png`);
  return fs.existsSync(faviconPath) ? `/favicon_${tenant.sigla.toLowerCase()}.png` : undefined;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = headers();
  const host = headersList.get('x-tenant-domain') || headersList.get('host');
  const tenant = await resolveTenantByHost(host);

  // Branding de la app principal (ossprobe.store sin tenant)
  let mainLogoUrl = '/logo.png';
  let mainFaviconUrl = '/favicon_oss.png';
  if (!tenant) {
    const brandingRows = await prisma.systemConfig.findMany({
      where: { key: { in: ['main_logo_url', 'main_favicon_url'] } },
      select: { key: true, value: true },
    });
    for (const row of brandingRows) {
      if (row.key === 'main_logo_url' && row.value) mainLogoUrl = row.value;
      if (row.key === 'main_favicon_url' && row.value) mainFaviconUrl = row.value;
    }
  }

  const tenantName = tenant?.name || 'Entidad No Configurada';
  const logoUrl = tenant?.logoUrl || mainLogoUrl;
  const primaryColor = tenant?.primaryColor;
  const secondaryColor = tenant?.secondaryColor;
  const city = (tenant as { city?: string })?.city || tenant?.name || 'Municipio';
  const faviconUrl = tenant ? resolveFaviconUrl(tenant) : mainFaviconUrl;

  // Traer datos de contacto de TenantSettings para el footer
  let contactData: any = {};
  if (tenant) {
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
      select: {
        address: true,
        businessHours: true,
        phone: true,
        mobilePhone: true,
        tollFreePhone: true,
        anticorruptionPhone: true,
        fax: true,
        institutionalEmail: true,
        judicialNoticesEmail: true,
        facebook: true,
        twitter: true,
        youtube: true,
        instagram: true,
      }
    });
    contactData = {
      address: settings?.address || tenant.address || '',
      businessHours: settings?.businessHours || '',
      phone: settings?.phone || tenant.phone || '',
      mobilePhone: settings?.mobilePhone ?? null,
      tollFreePhone: settings?.tollFreePhone ?? null,
      anticorruptionPhone: settings?.anticorruptionPhone ?? null,
      fax: settings?.fax ?? null,
      institutionalEmail: settings?.institutionalEmail || tenant.institutionalEmail || '',
      judicialNoticesEmail: settings?.judicialNoticesEmail ?? null,
      facebook: settings?.facebook ?? null,
      twitter: settings?.twitter ?? null,
      youtube: settings?.youtube ?? null,
      instagram: settings?.instagram ?? null,
    };
  }

  return (
    <ClientLayout
      tenantName={tenantName}
      logoUrl={logoUrl}
      city={city}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
      faviconUrl={faviconUrl}
      hasTenant={!!tenant}
      contactData={contactData}
    >
      {children}
    </ClientLayout>
  );
}
