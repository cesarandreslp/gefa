import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { protectAPIRoute } from '@/lib/auth';

const BRANDING_KEYS = ['main_logo_url', 'main_favicon_url'] as const;

async function checkSuperAdmin(request: NextRequest) {
  const auth = await protectAPIRoute(request);
  if (!auth.authorized || !auth.user || auth.user.roleCode !== 'SUPER_ADMIN') {
    return { error: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) };
  }
  return { user: auth.user };
}

export async function GET(request: NextRequest) {
  const check = await checkSuperAdmin(request);
  if (check.error) return check.error;

  const rows = await prisma.systemConfig.findMany({
    where: { key: { in: [...BRANDING_KEYS] } },
    select: { key: true, value: true },
  });

  const data: Record<string, string> = {};
  for (const row of rows) data[row.key] = row.value;

  return NextResponse.json({ success: true, data });
}

export async function PATCH(request: NextRequest) {
  const check = await checkSuperAdmin(request);
  if (check.error) return check.error;

  const body = await request.json();
  const updates: { key: string; value: string }[] = [];

  if (body.main_logo_url !== undefined) updates.push({ key: 'main_logo_url', value: body.main_logo_url || '' });
  if (body.main_favicon_url !== undefined) updates.push({ key: 'main_favicon_url', value: body.main_favicon_url || '' });

  if (updates.length === 0) {
    return NextResponse.json({ success: false, error: 'Nada que actualizar' }, { status: 400 });
  }

  await Promise.all(updates.map(({ key, value }) =>
    prisma.systemConfig.upsert({
      where: { key },
      update: { value, updatedBy: check.user!.userId },
      create: { key, value, category: 'branding', dataType: 'string', updatedBy: check.user!.userId },
    })
  ));

  return NextResponse.json({ success: true });
}
