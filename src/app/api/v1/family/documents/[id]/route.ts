import { NextRequest, NextResponse } from 'next/server';
import { EvidenceStatus } from '@prisma/client';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_EVIDENCE_VALUATION_ROLES, isValidEnum, auditFamily } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// PATCH /api/v1/family/documents/[id]
// Valora el acervo probatorio: admite/rechaza una prueba y fija su valor.
// SOLO el Comisario (DIRECTOR): la parte aporta, la autoridad determina su valor.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_EVIDENCE_VALUATION_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json(
        { error: 'Solo el Comisario(a) de Familia puede valorar las pruebas' },
        { status: 403 }
      );
    }

    const db = auth.db;
    const doc = await db.document.findFirst({
      where: { id: params.id, tenantId: auth.user.tenantId },
      select: { id: true, caseId: true, documentType: true },
    });
    if (!doc) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }
    if (doc.documentType !== 'EVIDENCE') {
      return NextResponse.json({ error: 'Solo se valoran documentos de tipo evidencia' }, { status: 400 });
    }

    const body = await request.json();
    const { status, evidenceValue } = body;

    if (!status || !isValidEnum(EvidenceStatus, status)) {
      return NextResponse.json(
        { error: `status inválido. Valores: ${Object.values(EvidenceStatus).join(', ')}` },
        { status: 400 }
      );
    }

    const updated = await db.document.update({
      where: { id: params.id },
      data: {
        evidenceStatus: status,
        evidenceValue: evidenceValue || null,
        valoradaPorUserId: auth.user.userId,
        valoradaAt: new Date(),
      },
      include: { valoradaPor: { select: { id: true, fullName: true } } },
    });

    await auditFamily(db, request, auth.user, 'FAMILY_EVIDENCE_VALUED', 'Document', updated.id, {
      caseId: doc.caseId,
      metadata: { status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error valorando prueba:', error);
    return NextResponse.json({ error: 'Error al valorar la prueba' }, { status: 500 });
  }
}
