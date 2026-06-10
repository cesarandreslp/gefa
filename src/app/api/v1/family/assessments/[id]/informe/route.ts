import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_CONFIDENTIAL_ROLES, auditFamily } from '@/lib/familyApi';
import { generateInstrumentReport } from '@/services/InstrumentReportService';

export const dynamic = 'force-dynamic';

// POST /api/v1/family/assessments/[id]/informe
// Genera (IA) un BORRADOR de informe preliminar a partir del instrumento aplicado.
// Lo guarda en Assessment.informePreliminar. Editable luego por el profesional.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_CONFIDENTIAL_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const result = await generateInstrumentReport(db, params.id, auth.user.tenantId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const updated = await db.assessment.update({
      where: { id: params.id },
      data: { informePreliminar: result.draft, informeGeneradoAt: new Date() },
      include: { assessor: { select: { id: true, fullName: true } } },
    });

    await auditFamily(db, request, auth.user, 'FAMILY_INSTRUMENT_REPORT_GENERATED', 'Assessment', updated.id, { caseId: updated.caseId });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error generando informe preliminar:', error);
    return NextResponse.json({ error: 'Error al generar el informe preliminar' }, { status: 500 });
  }
}
