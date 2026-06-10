import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_CONFIDENTIAL_ROLES, FAMILY_REPORT_APPROVER_ROLES, auditFamily } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// POST /api/v1/family/cases/[caseId]/pre-informe/estado
// Flujo de revisión/aprobación del pre-informe consolidado (Fase C5):
//  - accion=enviar   BORRADOR → EN_REVISION   (equipo: FAMILY_CONFIDENTIAL_ROLES)
//  - accion=aprobar  EN_REVISION → APROBADO    (solo DIRECTOR; firma)
//  - accion=devolver EN_REVISION → BORRADOR    (solo DIRECTOR; con nota)
export async function POST(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    // Autenticación base (equipo). La acción de autoridad se revalida abajo.
    const auth = await protectAPIRoute(request, FAMILY_CONFIDENTIAL_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const body = await request.json().catch(() => ({}));
    const accion = body.accion as string | undefined;
    const nota = (body.nota as string | undefined)?.trim() || null;

    if (!accion || !['enviar', 'aprobar', 'devolver'].includes(accion)) {
      return NextResponse.json({ error: 'Acción inválida. Use enviar, aprobar o devolver.' }, { status: 400 });
    }

    const caseRow = await db.case.findFirst({
      where: { id: params.caseId, tenantId: auth.user.tenantId },
      select: { id: true, preInformeConsolidado: true, preInformeEstado: true },
    });
    if (!caseRow) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    }
    if (!caseRow.preInformeConsolidado) {
      return NextResponse.json({ error: 'No hay pre-informe consolidado para gestionar.' }, { status: 400 });
    }

    const estadoActual = caseRow.preInformeEstado ?? 'BORRADOR';

    // Acciones de la AUTORIDAD: revalidar rol (solo DIRECTOR).
    if (accion === 'aprobar' || accion === 'devolver') {
      const approver = await protectAPIRoute(request, FAMILY_REPORT_APPROVER_ROLES);
      if (!approver.authorized) {
        return approver.response ?? NextResponse.json({ error: 'Solo el comisario (DIRECTOR) puede aprobar o devolver el pre-informe.' }, { status: 403 });
      }
    }

    let data: Record<string, unknown>;
    let action: string;

    if (accion === 'enviar') {
      if (estadoActual !== 'BORRADOR') {
        return NextResponse.json({ error: 'Solo un borrador puede enviarse a revisión.' }, { status: 409 });
      }
      data = { preInformeEstado: 'EN_REVISION', preInformeEnviadoAt: new Date(), preInformeNotaRevision: null };
      action = 'FAMILY_CASE_REPORT_SUBMITTED';
    } else if (accion === 'aprobar') {
      if (estadoActual !== 'EN_REVISION') {
        return NextResponse.json({ error: 'Solo un pre-informe en revisión puede aprobarse.' }, { status: 409 });
      }
      data = {
        preInformeEstado: 'APROBADO',
        preInformeAprobadoPorUserId: auth.user.userId,
        preInformeAprobadoAt: new Date(),
        preInformeNotaRevision: nota,
      };
      action = 'FAMILY_CASE_REPORT_APPROVED';
    } else {
      // devolver
      if (estadoActual !== 'EN_REVISION') {
        return NextResponse.json({ error: 'Solo un pre-informe en revisión puede devolverse a borrador.' }, { status: 409 });
      }
      data = { preInformeEstado: 'BORRADOR', preInformeEnviadoAt: null, preInformeNotaRevision: nota };
      action = 'FAMILY_CASE_REPORT_RETURNED';
    }

    const updated = await db.case.update({
      where: { id: params.caseId },
      data,
      select: {
        id: true, preInformeEstado: true, preInformeEnviadoAt: true,
        preInformeAprobadoAt: true, preInformeNotaRevision: true,
        preInformeAprobadoPor: { select: { id: true, fullName: true } },
      },
    });

    await auditFamily(db, request, auth.user, action, 'Case', params.caseId, { caseId: params.caseId, metadata: { nota: nota ?? undefined } });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error en transición del pre-informe:', error);
    return NextResponse.json({ error: 'Error al actualizar el estado del pre-informe' }, { status: 500 });
  }
}
