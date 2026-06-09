import { NextRequest, NextResponse } from 'next/server';
import { HearingType } from '@prisma/client';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_READ_ROLES, FAMILY_WRITE_ROLES, findCaseInTenant, isValidEnum } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// GET /api/v1/family/cases/[caseId]/hearings
// Lista las audiencias (programadas y celebradas) de un caso.
export async function GET(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_READ_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const caseRow = await findCaseInTenant(db, params.caseId, auth.user.tenantId);
    if (!caseRow) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    }

    const hearings = await db.hearing.findMany({
      where: { caseId: params.caseId, tenantId: auth.user.tenantId },
      include: { presidedBy: { select: { id: true, fullName: true } } },
      orderBy: { scheduledAt: 'asc' },
    });

    return NextResponse.json({ data: hearings });
  } catch (error) {
    console.error('Error listando audiencias:', error);
    return NextResponse.json({ error: 'Error al listar las audiencias' }, { status: 500 });
  }
}

// POST /api/v1/family/cases/[caseId]/hearings
// Programa una audiencia.
export async function POST(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_WRITE_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const caseRow = await findCaseInTenant(db, params.caseId, auth.user.tenantId);
    if (!caseRow) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { hearingType, scheduledAt, location, isVirtual, meetingUrl, presidedByUserId } = body;

    if (!hearingType || !scheduledAt) {
      return NextResponse.json({ error: 'hearingType y scheduledAt son obligatorios' }, { status: 400 });
    }
    if (!isValidEnum(HearingType, hearingType)) {
      return NextResponse.json(
        { error: `hearingType inválido. Valores: ${Object.values(HearingType).join(', ')}` },
        { status: 400 }
      );
    }

    const hearing = await db.hearing.create({
      data: {
        tenantId: auth.user.tenantId,
        caseId: params.caseId,
        hearingType,
        scheduledAt: new Date(scheduledAt),
        location: location || null,
        isVirtual: isVirtual === true,
        meetingUrl: meetingUrl || null,
        presidedByUserId: presidedByUserId || auth.user.userId,
      },
      include: { presidedBy: { select: { id: true, fullName: true } } },
    });

    return NextResponse.json(hearing, { status: 201 });
  } catch (error) {
    console.error('Error programando audiencia:', error);
    return NextResponse.json({ error: 'Error al programar la audiencia' }, { status: 500 });
  }
}
