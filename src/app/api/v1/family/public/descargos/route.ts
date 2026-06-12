/**
 * POST /api/v1/family/public/descargos
 * El QUERELLADO presenta sus descargos en línea (derecho a ser oído).
 * Doble factor: número de radicado + su documento (debe coincidir con una parte
 * AGRESOR del caso). Solo escribe los descargos; NUNCA expone PII del expediente.
 * Se anexa (no sobrescribe) para conservar lo presentado por ambas vías.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantFromRequest } from '@/lib/tenantResolver';
import { getTenantPrisma } from '@/lib/tenantDb';
import { prisma as mainPrisma } from '@/lib/prisma';
import { successResponse, errorResponse, sanitizeString } from '@/lib/validation';
import { applyRateLimit, RATE_LIMIT_CONFIGS, addRateLimitHeaders } from '@/lib/rateLimit';
import { auditFamilyPublic } from '@/lib/familyApi';
import type { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const rl = applyRateLimit(request, RATE_LIMIT_CONFIGS.FORM_SUBMISSION);
  if (!rl.allowed) return rl.response;

  const tenant = await getTenantFromRequest(request);
  const dbUrl = (tenant as { databaseUrl?: string })?.databaseUrl;
  let db: PrismaClient = dbUrl ? getTenantPrisma(dbUrl) : mainPrisma;

  try {
    const body = await request.json();
    const filingNumber = sanitizeString(String(body.filingNumber || '')).toUpperCase();
    const documentNumber = sanitizeString(String(body.documentNumber || ''));
    const descargos = sanitizeString(String(body.descargos || ''));

    if (filingNumber.length < 5 || documentNumber.length < 4) {
      return NextResponse.json(errorResponse('VALIDATION_ERROR', 'Indique el radicado y su documento.'), { status: 400 });
    }
    if (descargos.trim().length < 10 || descargos.length > 5000) {
      return NextResponse.json(errorResponse('VALIDATION_ERROR', 'Los descargos deben tener entre 10 y 5000 caracteres.'), { status: 400 });
    }

    // Resolver tenant por la sigla del radicado si el host no lo resolvió.
    if (!tenant) {
      const m = filingNumber.match(/^([A-Z]+)-/);
      if (m) {
        const t = (await mainPrisma.tenant.findFirst({ where: { sigla: { equals: m[1], mode: 'insensitive' } }, select: { databaseUrl: true } })) as { databaseUrl?: string } | null;
        if (t?.databaseUrl) db = getTenantPrisma(t.databaseUrl);
      }
    }

    const caseData = await db.case.findUnique({
      where: { filingNumber },
      select: {
        id: true, tenantId: true, descargosQuerellado: true,
        caseParties: { where: { role: 'AGRESOR' }, select: { person: { select: { documentNumber: true } } } },
      },
    });

    // Error uniforme: no revelar si el radicado existe a quien no acredita ser el querellado.
    const esQuerellado = !!caseData?.caseParties.some((p) => p.person?.documentNumber === documentNumber);
    if (!caseData || !esQuerellado) {
      return NextResponse.json(
        errorResponse('NOT_FOUND', 'No se encontró un proceso con esos datos, o el documento no corresponde al querellado.'),
        { status: 404 }
      );
    }

    const stamp = new Date();
    const header = `[Querellado — ${stamp.toLocaleString('es-CO')} (portal)]`;
    const nuevo = caseData.descargosQuerellado?.trim()
      ? `${caseData.descargosQuerellado.trim()}\n\n${header}:\n${descargos.trim()}`
      : `${header}:\n${descargos.trim()}`;

    await db.case.update({
      where: { id: caseData.id },
      data: { descargosQuerellado: nuevo, descargosAt: stamp, descargosOrigen: 'PORTAL' },
    });

    await auditFamilyPublic(db, request, caseData.tenantId, 'FAMILY_DESCARGOS_PORTAL', 'Case', caseData.id, { caseId: caseData.id });

    const response = NextResponse.json(successResponse({ ok: true }), { status: 200 });
    return addRateLimitHeaders(response, RATE_LIMIT_CONFIGS.FORM_SUBMISSION, rl.remaining, rl.resetTime);
  } catch (error) {
    console.error('Error en descargos públicos (familia):', error);
    return NextResponse.json(errorResponse('INTERNAL_ERROR', 'No se pudieron registrar los descargos.'), { status: 500 });
  }
}
