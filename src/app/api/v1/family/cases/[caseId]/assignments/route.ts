import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_READ_ROLES, FAMILY_WRITE_ROLES, findCaseInTenant, auditFamily } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// GET /api/v1/family/cases/[caseId]/assignments
// Lista los miembros del equipo asignados al caso.
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

    const assignments = await db.assignment.findMany({
      where: { caseId: params.caseId, tenantId: auth.user.tenantId, status: { not: 'REASSIGNED' } },
      include: { user: { select: { id: true, fullName: true, role: { select: { code: true, name: true } } } } },
      orderBy: { assignedAt: 'asc' },
    });

    return NextResponse.json({ data: assignments });
  } catch (error) {
    console.error('Error listando asignaciones del caso:', error);
    return NextResponse.json({ error: 'Error al listar asignaciones' }, { status: 500 });
  }
}

// POST /api/v1/family/cases/[caseId]/assignments
// Asigna un miembro del equipo (funcionario/profesional) al caso.
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
    const { userId, notes } = body;
    if (!userId) {
      return NextResponse.json({ error: 'userId es obligatorio' }, { status: 400 });
    }

    const user = await db.user.findFirst({
      where: { id: userId, tenantId: auth.user.tenantId, isActive: true },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'El usuario no existe o no está activo en la entidad' }, { status: 404 });
    }

    const existing = await db.assignment.findFirst({
      where: { caseId: params.caseId, userId, tenantId: auth.user.tenantId, status: { not: 'REASSIGNED' } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: 'Ese profesional ya está asignado al caso' }, { status: 409 });
    }

    const assignment = await db.assignment.create({
      data: {
        tenantId: auth.user.tenantId,
        caseId: params.caseId,
        userId,
        assignedBy: auth.user.userId,
        status: 'ACCEPTED',
        notes: notes || null,
      },
      include: { user: { select: { id: true, fullName: true, role: { select: { code: true, name: true } } } } },
    });

    await auditFamily(db, request, auth.user, 'FAMILY_TEAM_ASSIGNED', 'Assignment', assignment.id, { caseId: params.caseId, metadata: { assignedUserId: userId } });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error('Error asignando miembro al caso:', error);
    return NextResponse.json({ error: 'Error al asignar' }, { status: 500 });
  }
}
