import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_READ_ROLES, FAMILY_WRITE_ROLES, auditFamily } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// GET /api/v1/family/cases/[caseId]
// Expediente de familia: caso + partes + medidas + PARD + audiencias.
// NO incluye valoraciones (Assessment) — son confidenciales y se consultan
// por su endpoint restringido /api/v1/family/cases/[caseId]/assessments.
export async function GET(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_READ_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const caseRow = await db.case.findFirst({
      where: { id: params.caseId, tenantId: auth.user.tenantId },
      include: {
        caseType: { select: { code: true, name: true, defaultLegalTermDays: true } },
        state: { select: { code: true, name: true, color: true } },
        comisaria: { select: { id: true, code: true, name: true } },
        caseParties: { include: { person: true }, orderBy: { createdAt: 'asc' } },
        protectionMeasures: {
          include: { issuedBy: { select: { id: true, fullName: true } } },
          orderBy: { issuedAt: 'desc' },
        },
        restorationProcesses: {
          include: {
            child: { select: { id: true, firstName: true, firstLastName: true } },
            responsibleUser: { select: { id: true, fullName: true } },
          },
          orderBy: { openedAt: 'desc' },
        },
        hearings: {
          include: { presidedBy: { select: { id: true, fullName: true } } },
          orderBy: { scheduledAt: 'asc' },
        },
        stateHistory: {
          include: {
            fromState: { select: { code: true, name: true } },
            toState: { select: { code: true, name: true, color: true } },
            changedByUser: { select: { fullName: true } },
          },
          orderBy: { timestamp: 'desc' },
        },
        _count: { select: { assessments: true } },
      },
    });

    if (!caseRow) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    }

    return NextResponse.json(caseRow);
  } catch (error) {
    console.error('Error obteniendo expediente de familia:', error);
    return NextResponse.json({ error: 'Error al obtener el expediente' }, { status: 500 });
  }
}

// PATCH /api/v1/family/cases/[caseId]
// Reasigna la comisaría (sede) que atiende el caso. `comisariaId: null` la quita.
export async function PATCH(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_WRITE_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const tenantId = auth.user.tenantId;
    const body = await request.json();

    if (!('comisariaId' in body)) {
      return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
    }
    const comisariaId: string | null = body.comisariaId || null;

    const caseRow = await db.case.findFirst({
      where: { id: params.caseId, tenantId },
      select: { id: true, comisariaId: true },
    });
    if (!caseRow) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    }

    if (comisariaId) {
      const comisaria = await db.comisaria.findFirst({
        where: { id: comisariaId, tenantId, isActive: true },
        select: { id: true },
      });
      if (!comisaria) {
        return NextResponse.json(
          { error: 'La comisaría seleccionada no existe o no está activa en la entidad' },
          { status: 400 }
        );
      }
    }

    const updated = await db.case.update({
      where: { id: params.caseId },
      data: { comisariaId },
      include: { comisaria: { select: { id: true, code: true, name: true } } },
    });

    await auditFamily(db, request, auth.user, 'FAMILY_CASE_UPDATED', 'Case', params.caseId, {
      caseId: params.caseId,
      metadata: { from: caseRow.comisariaId, to: comisariaId, field: 'comisariaId' },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error reasignando comisaría del caso:', error);
    return NextResponse.json({ error: 'Error al reasignar la comisaría' }, { status: 500 });
  }
}
