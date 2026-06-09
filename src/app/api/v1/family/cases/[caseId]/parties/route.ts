import { NextRequest, NextResponse } from 'next/server';
import { PartyRole } from '@prisma/client';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_READ_ROLES, FAMILY_INTAKE_ROLES, findCaseInTenant, isValidEnum } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// GET /api/v1/family/cases/[caseId]/parties
// Lista las partes (personas y su rol) vinculadas a un caso.
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

    const parties = await db.caseParty.findMany({
      where: { caseId: params.caseId, tenantId: auth.user.tenantId },
      include: { person: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ data: parties });
  } catch (error) {
    console.error('Error listando partes del caso:', error);
    return NextResponse.json({ error: 'Error al listar las partes' }, { status: 500 });
  }
}

// POST /api/v1/family/cases/[caseId]/parties
// Vincula una persona existente al caso con un rol (VICTIMA, AGRESOR, NNA, …).
export async function POST(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_INTAKE_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const caseRow = await findCaseInTenant(db, params.caseId, auth.user.tenantId);
    if (!caseRow) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { personId, role, legalRepresentativeName, legalRepresentativeUserId, notes } = body;

    if (!personId || !role) {
      return NextResponse.json({ error: 'personId y role son obligatorios' }, { status: 400 });
    }
    if (!isValidEnum(PartyRole, role)) {
      return NextResponse.json(
        { error: `role inválido. Valores: ${Object.values(PartyRole).join(', ')}` },
        { status: 400 }
      );
    }

    // La persona debe existir en el mismo tenant
    const person = await db.person.findFirst({
      where: { id: personId, tenantId: auth.user.tenantId },
      select: { id: true, isMinor: true },
    });
    if (!person) {
      return NextResponse.json({ error: 'La persona no existe en la entidad' }, { status: 404 });
    }

    // Un NNA como parte requiere representante legal
    if ((role === PartyRole.NNA || person.isMinor) && !legalRepresentativeName && !legalRepresentativeUserId) {
      return NextResponse.json(
        { error: 'Un NNA debe tener representante legal (legalRepresentativeName o legalRepresentativeUserId)' },
        { status: 400 }
      );
    }

    try {
      const party = await db.caseParty.create({
        data: {
          tenantId: auth.user.tenantId,
          caseId: params.caseId,
          personId,
          role,
          legalRepresentativeName: legalRepresentativeName || null,
          legalRepresentativeUserId: legalRepresentativeUserId || null,
          notes: notes || null,
        },
        include: { person: true },
      });
      return NextResponse.json(party, { status: 201 });
    } catch (e: unknown) {
      // Violación de unique [caseId, personId, role]
      if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002') {
        return NextResponse.json(
          { error: 'Esa persona ya está vinculada al caso con ese rol' },
          { status: 409 }
        );
      }
      throw e;
    }
  } catch (error) {
    console.error('Error vinculando parte al caso:', error);
    return NextResponse.json({ error: 'Error al vincular la parte' }, { status: 500 });
  }
}
