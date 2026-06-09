import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_WRITE_ROLES } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// DELETE /api/v1/family/cases/[caseId]/assignments/[assignmentId]
// Retira a un miembro del equipo del caso.
export async function DELETE(
  request: NextRequest,
  { params }: { params: { caseId: string; assignmentId: string } }
) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_WRITE_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const assignment = await db.assignment.findFirst({
      where: { id: params.assignmentId, caseId: params.caseId, tenantId: auth.user.tenantId },
      select: { id: true },
    });
    if (!assignment) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 });
    }

    await db.assignment.delete({ where: { id: params.assignmentId } });
    return NextResponse.json({ message: 'Profesional retirado del caso' });
  } catch (error) {
    console.error('Error retirando asignación:', error);
    return NextResponse.json({ error: 'Error al retirar la asignación' }, { status: 500 });
  }
}
