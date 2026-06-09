import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { protectAPIRoute } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await protectAPIRoute(request, ['SUPER_ADMIN']);
  if (!auth.authorized) return auth.response!;

  const { searchParams } = new URL(request.url);
  const tenantId   = searchParams.get('tenantId')   || undefined;
  const userEmail  = searchParams.get('userEmail')  || undefined;
  const action     = searchParams.get('action')     || undefined;
  const entityType = searchParams.get('entityType') || undefined;
  const dateFrom   = searchParams.get('dateFrom')   || undefined;
  const dateTo     = searchParams.get('dateTo')     || undefined;
  const page       = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit      = Math.min(100, parseInt(searchParams.get('limit') || '50'));

  const scope = searchParams.get('scope') || 'tenant'; // 'tenant' | 'superadmin'

  const where: Record<string, unknown> = {};

  if (scope === 'superadmin') {
    where.userRole = 'SUPER_ADMIN';
  } else {
    where.userRole = { not: 'SUPER_ADMIN' };
    if (tenantId) where.tenantId = tenantId;
  }

  if (userEmail)  where.userEmail  = { contains: userEmail, mode: 'insensitive' };
  if (action)     where.action     = action;
  if (entityType) where.entityType = entityType;
  if (dateFrom || dateTo) {
    where.timestamp = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo   ? { lte: new Date(dateTo + 'T23:59:59Z') } : {}),
    };
  }

  const [total, logs] = await Promise.all([
    prisma.actionLog.count({ where }),
    prisma.actionLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        tenant: { select: { name: true, sigla: true } },
      },
    }),
  ]);

  // Tenants únicos para el filtro
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, sigla: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({
    success: true,
    data: { logs, total, page, limit, pages: Math.ceil(total / limit), tenants },
  });
}
