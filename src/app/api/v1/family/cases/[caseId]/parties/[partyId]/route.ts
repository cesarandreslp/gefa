import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_INTAKE_ROLES, auditFamily } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// DELETE /api/v1/family/cases/[caseId]/parties/[partyId]
// Desvincula una parte del caso (corrige un vínculo erróneo). No borra la persona.
export async function DELETE(
  request: NextRequest,
  { params }: { params: { caseId: string; partyId: string } }
) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_INTAKE_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const party = await db.caseParty.findFirst({
      where: { id: params.partyId, caseId: params.caseId, tenantId: auth.user.tenantId },
      select: { id: true },
    });
    if (!party) {
      return NextResponse.json({ error: 'Parte no encontrada en este caso' }, { status: 404 });
    }

    await db.caseParty.delete({ where: { id: params.partyId } });
    await auditFamily(db, request, auth.user, 'FAMILY_PARTY_REMOVED', 'CaseParty', params.partyId, { caseId: params.caseId });
    return NextResponse.json({ message: 'Parte desvinculada del caso' });
  } catch (error) {
    console.error('Error desvinculando parte:', error);
    return NextResponse.json({ error: 'Error al desvincular la parte' }, { status: 500 });
  }
}
