import { NextRequest, NextResponse } from 'next/server';
import { getTenantFromRequest } from '@/lib/tenantResolver';
import { getTenantPrisma } from '@/lib/tenantDb';
import { prisma as mainPrisma } from '@/lib/prisma';
import { successResponse, errorResponse, sanitizeString } from '@/lib/validation';
import { applyRateLimit, RATE_LIMIT_CONFIGS, addRateLimitHeaders } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// GET /api/v1/family/public/status?filingNumber=...&documentNumber=...
// Consulta pública de estado del caso de familia. Doble factor: número de
// radicado + documento del denunciante. Devuelve SOLO información no sensible
// (estado y fechas). NUNCA expone PII de víctimas/NNA/agresor ni comentarios
// del expediente (Ley 1581/2012, Ley 1098/2006).
export async function GET(request: NextRequest) {
  const rl = applyRateLimit(request, RATE_LIMIT_CONFIGS.QUERY);
  if (!rl.allowed) return rl.response;

  const tenant = await getTenantFromRequest(request);
  const dbUrl = (tenant as { databaseUrl?: string })?.databaseUrl;
  let db = dbUrl ? getTenantPrisma(dbUrl) : mainPrisma;

  try {
    const { searchParams } = new URL(request.url);
    const rawFiling = searchParams.get('filingNumber');
    const rawDoc = searchParams.get('documentNumber');

    if (!rawFiling || !rawDoc) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'Debe indicar el número de radicado y el documento del denunciante'),
        { status: 400 }
      );
    }

    const filingNumber = sanitizeString(rawFiling).toUpperCase();
    const documentNumber = sanitizeString(rawDoc);

    if (filingNumber.length < 5 || documentNumber.length < 4) {
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', 'Los datos ingresados no son válidos'),
        { status: 400 }
      );
    }

    // Si el host no resolvió tenant, inferirlo por la sigla del radicado ({SIGLA}-{AÑO}-{NRO})
    if (!tenant) {
      const siglaMatch = filingNumber.match(/^([A-Z]+)-/);
      if (siglaMatch) {
        const tenantBySigla = (await mainPrisma.tenant.findFirst({
          where: { sigla: { equals: siglaMatch[1], mode: 'insensitive' } },
          select: { databaseUrl: true },
        })) as { databaseUrl?: string } | null;
        if (tenantBySigla?.databaseUrl) {
          db = getTenantPrisma(tenantBySigla.databaseUrl);
        }
      }
    }

    const caseData = await db.case.findUnique({
      where: { filingNumber },
      select: {
        filingNumber: true,
        subject: true,
        filedAt: true,
        dueDate: true,
        caseType: { select: { name: true } },
        state: { select: { name: true, color: true, isFinal: true } },
        citizen: { select: { documentNumber: true } },
        stateHistory: {
          select: { timestamp: true, toState: { select: { name: true, color: true } } },
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    // Respuesta uniforme ante "no existe" y "documento no coincide": no revelar
    // si un radicado existe a quien no acredita ser el denunciante.
    const docMatches = caseData?.citizen?.documentNumber === documentNumber;
    if (!caseData || !docMatches) {
      return NextResponse.json(
        errorResponse('NOT_FOUND', 'No se encontró una solicitud con esos datos. Verifique el radicado y el documento.'),
        { status: 404 }
      );
    }

    const publicInfo = {
      filingNumber: caseData.filingNumber,
      subject: caseData.subject,
      caseType: caseData.caseType.name,
      state: caseData.state.name,
      stateColor: caseData.state.color,
      isFinal: caseData.state.isFinal,
      filedAt: caseData.filedAt.toISOString(),
      dueDate: caseData.dueDate.toISOString(),
      timeline: caseData.stateHistory.map((h) => ({
        date: h.timestamp.toISOString(),
        state: h.toState.name,
        color: h.toState.color,
      })),
    };

    const response = NextResponse.json(successResponse(publicInfo), { status: 200 });
    return addRateLimitHeaders(response, RATE_LIMIT_CONFIGS.QUERY, rl.remaining, rl.resetTime);
  } catch (error) {
    console.error('Error en consulta pública de estado (familia):', error);
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'No se pudo consultar el estado de la solicitud'),
      { status: 500 }
    );
  }
}
