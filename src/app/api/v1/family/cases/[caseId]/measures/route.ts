import { NextRequest, NextResponse } from 'next/server';
import { ProtectionMeasureType } from '@prisma/client';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_READ_ROLES, FAMILY_WRITE_ROLES, findCaseInTenant, isValidEnum } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// GET /api/v1/family/cases/[caseId]/measures
// Lista las medidas de protección de un caso.
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

    const measures = await db.protectionMeasure.findMany({
      where: { caseId: params.caseId, tenantId: auth.user.tenantId },
      include: { issuedBy: { select: { id: true, fullName: true } } },
      orderBy: { issuedAt: 'desc' },
    });

    return NextResponse.json({ data: measures });
  } catch (error) {
    console.error('Error listando medidas de protección:', error);
    return NextResponse.json({ error: 'Error al listar las medidas' }, { status: 500 });
  }
}

// POST /api/v1/family/cases/[caseId]/measures
// Impone una medida de protección. Acto con efecto jurídico → roles restringidos.
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
    const { measureType, description, legalBasis, expiresAt, policeStation } = body;

    if (!measureType || !description || !legalBasis) {
      return NextResponse.json(
        { error: 'measureType, description y legalBasis son obligatorios' },
        { status: 400 }
      );
    }
    if (!isValidEnum(ProtectionMeasureType, measureType)) {
      return NextResponse.json(
        { error: `measureType inválido. Valores: ${Object.values(ProtectionMeasureType).join(', ')}` },
        { status: 400 }
      );
    }

    const measure = await db.protectionMeasure.create({
      data: {
        tenantId: auth.user.tenantId,
        caseId: params.caseId,
        measureType,
        description,
        legalBasis,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        policeStation: policeStation || null,
        issuedByUserId: auth.user.userId,
      },
      include: { issuedBy: { select: { id: true, fullName: true } } },
    });

    return NextResponse.json(measure, { status: 201 });
  } catch (error) {
    console.error('Error imponiendo medida de protección:', error);
    return NextResponse.json({ error: 'Error al imponer la medida' }, { status: 500 });
  }
}
