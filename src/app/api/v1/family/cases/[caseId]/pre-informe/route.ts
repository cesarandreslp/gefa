import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_CONFIDENTIAL_ROLES, findCaseInTenant, auditFamily } from '@/lib/familyApi';
import { generateConsolidatedReport } from '@/services/ConsolidatedReportService';

export const dynamic = 'force-dynamic';

// POST /api/v1/family/cases/[caseId]/pre-informe
// Genera (IA) el BORRADOR de pre-informe consolidado del caso a partir de las
// valoraciones con instrumento. Lo guarda en Case.preInformeConsolidado.
export async function POST(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_CONFIDENTIAL_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const caseRow = await findCaseInTenant(db, params.caseId, auth.user.tenantId);
    if (!caseRow) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    }

    const result = await generateConsolidatedReport(db, params.caseId, auth.user.tenantId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const updated = await db.case.update({
      where: { id: params.caseId },
      data: { preInformeConsolidado: result.draft, preInformeGeneradoAt: new Date() },
      select: { id: true, preInformeConsolidado: true, preInformeGeneradoAt: true },
    });

    await auditFamily(db, request, auth.user, 'FAMILY_CASE_REPORT_CONSOLIDATED', 'Case', params.caseId, { caseId: params.caseId });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error generando pre-informe consolidado:', error);
    return NextResponse.json({ error: 'Error al generar el pre-informe consolidado' }, { status: 500 });
  }
}

// PATCH /api/v1/family/cases/[caseId]/pre-informe
// Edita el borrador del pre-informe consolidado (corrección del equipo).
export async function PATCH(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_CONFIDENTIAL_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const caseRow = await findCaseInTenant(db, params.caseId, auth.user.tenantId);
    if (!caseRow) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    if (body.preInformeConsolidado === undefined) {
      return NextResponse.json({ error: 'No hay cambios para aplicar' }, { status: 400 });
    }

    const updated = await db.case.update({
      where: { id: params.caseId },
      data: { preInformeConsolidado: body.preInformeConsolidado || null },
      select: { id: true, preInformeConsolidado: true, preInformeGeneradoAt: true },
    });

    await auditFamily(db, request, auth.user, 'FAMILY_CASE_REPORT_UPDATED', 'Case', params.caseId, { caseId: params.caseId });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error actualizando pre-informe consolidado:', error);
    return NextResponse.json({ error: 'Error al actualizar el pre-informe consolidado' }, { status: 500 });
  }
}
