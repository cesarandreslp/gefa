import { NextRequest, NextResponse } from 'next/server';
import { getTenantFromRequest } from '@/lib/tenantResolver';
import { getTenantPrisma } from '@/lib/tenantDb';
import { prisma as mainPrisma } from '@/lib/prisma';
import { getTransparencyConfig } from '@/lib/transparencyDefaults';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 hora

export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: 'Entidad no encontrada.' }, { status: 404 });
    }

    const dbUrl = (tenant as any)?.databaseUrl as string | undefined;
    const db = dbUrl ? getTenantPrisma(dbUrl) : mainPrisma;

    const settings = await db.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
      select: { metadata: true },
    });

    const config = getTransparencyConfig(
      settings?.metadata as Record<string, unknown> | null
    );

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Error al obtener configuración de transparencia:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
