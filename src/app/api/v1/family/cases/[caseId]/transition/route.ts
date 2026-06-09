import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute, getBaseRoleCode } from '@/lib/auth';
import { FAMILY_READ_ROLES, FAMILY_WRITE_ROLES, auditFamily } from '@/lib/familyApi';
import { validateFamilyTransition, availableFamilyTransitions } from '@/domain/rules/familyStateMachine';

export const dynamic = 'force-dynamic';

// GET /api/v1/family/cases/[caseId]/transition
// Devuelve los estados a los que el caso puede transicionar según rol del usuario.
export async function GET(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_READ_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const caseRow = await db.case.findFirst({
      where: { id: params.caseId, tenantId: auth.user.tenantId },
      select: { state: { select: { code: true, name: true } } },
    });
    if (!caseRow) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    }

    const roleCode = getBaseRoleCode(auth.user.roleCode);
    const available = availableFamilyTransitions(caseRow.state.code, roleCode);

    return NextResponse.json({ currentState: caseRow.state, available });
  } catch (error) {
    console.error('Error obteniendo transiciones:', error);
    return NextResponse.json({ error: 'Error al obtener transiciones' }, { status: 500 });
  }
}

// POST /api/v1/family/cases/[caseId]/transition
// Cambia el estado del caso: valida la transición, actualiza el estado y registra el historial.
export async function POST(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_WRITE_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const body = await request.json();
    const { toStateCode, comment } = body;

    if (!toStateCode) {
      return NextResponse.json({ error: 'toStateCode es obligatorio' }, { status: 400 });
    }

    const caseRow = await db.case.findFirst({
      where: { id: params.caseId, tenantId: auth.user.tenantId },
      select: { id: true, stateId: true, state: { select: { code: true } } },
    });
    if (!caseRow) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    }

    const roleCode = getBaseRoleCode(auth.user.roleCode);
    const validation = validateFamilyTransition(caseRow.state.code, toStateCode, roleCode, comment);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error, requiresComment: validation.requiresComment },
        { status: 422 }
      );
    }

    const targetState = await db.caseState.findFirst({
      where: { code: toStateCode, isActive: true },
      select: { id: true, code: true, name: true, color: true },
    });
    if (!targetState) {
      return NextResponse.json({ error: `Estado destino no configurado: ${toStateCode}` }, { status: 422 });
    }

    await db.$transaction(async (tx) => {
      await tx.case.update({
        where: { id: caseRow.id },
        data: {
          stateId: targetState.id,
          ...(toStateCode === 'CERRADO' ? { closedAt: new Date(), closedBy: auth.user!.userId } : {}),
        },
      });
      await tx.caseStateHistory.create({
        data: {
          tenantId: auth.user!.tenantId,
          caseId: caseRow.id,
          fromStateId: caseRow.stateId,
          toStateId: targetState.id,
          changedBy: auth.user!.userId,
          comment: comment?.trim() || null,
          reason: validation.isReopen ? 'REOPENED' : 'TRANSITION',
        },
      });
    });

    await auditFamily(db, request, auth.user, 'FAMILY_CASE_STATE_CHANGED', 'Case', caseRow.id, {
      caseId: caseRow.id,
      metadata: { from: caseRow.state.code, to: toStateCode, reopen: validation.isReopen ?? false },
    });

    return NextResponse.json({
      message: `Estado actualizado a ${targetState.name}`,
      state: targetState,
    });
  } catch (error) {
    console.error('Error en transición de estado:', error);
    return NextResponse.json({ error: 'Error al cambiar el estado' }, { status: 500 });
  }
}
