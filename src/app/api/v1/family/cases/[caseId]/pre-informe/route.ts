import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_CONFIDENTIAL_ROLES, auditFamily } from '@/lib/familyApi';
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
    const caseRow = await db.case.findFirst({
      where: { id: params.caseId, tenantId: auth.user.tenantId },
      select: { id: true, preInformeEstado: true },
    });
    if (!caseRow) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    }
    if (caseRow.preInformeEstado === 'APROBADO') {
      return NextResponse.json({ error: 'El pre-informe ya fue aprobado por la autoridad; no puede regenerarse.' }, { status: 409 });
    }

    const result = await generateConsolidatedReport(db, params.caseId, auth.user.tenantId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const updated = await db.case.update({
      where: { id: params.caseId },
      data: {
        preInformeConsolidado: result.draft,
        preInformeGeneradoAt: new Date(),
        preInformeEstado: 'BORRADOR',
        preInformeEnviadoAt: null,
        preInformeAprobadoPorUserId: null,
        preInformeAprobadoAt: null,
        preInformeNotaRevision: null,
      },
      select: { id: true, preInformeConsolidado: true, preInformeGeneradoAt: true, preInformeEstado: true },
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
    const caseRow = await db.case.findFirst({
      where: { id: params.caseId, tenantId: auth.user.tenantId },
      select: { id: true, preInformeEstado: true },
    });
    if (!caseRow) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    }
    if (caseRow.preInformeEstado === 'APROBADO') {
      return NextResponse.json({ error: 'El pre-informe ya fue aprobado; no puede editarse.' }, { status: 409 });
    }
    if (caseRow.preInformeEstado === 'EN_REVISION') {
      return NextResponse.json({ error: 'El pre-informe está en revisión de la autoridad; no puede editarse hasta que sea devuelto a borrador.' }, { status: 409 });
    }

    const body = await request.json();
    if (body.preInformeConsolidado === undefined) {
      return NextResponse.json({ error: 'No hay cambios para aplicar' }, { status: 400 });
    }

    const updated = await db.case.update({
      where: { id: params.caseId },
      data: { preInformeConsolidado: body.preInformeConsolidado || null },
      select: { id: true, preInformeConsolidado: true, preInformeGeneradoAt: true, preInformeEstado: true },
    });

    await auditFamily(db, request, auth.user, 'FAMILY_CASE_REPORT_UPDATED', 'Case', params.caseId, { caseId: params.caseId });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error actualizando pre-informe consolidado:', error);
    return NextResponse.json({ error: 'Error al actualizar el pre-informe consolidado' }, { status: 500 });
  }
}
