/**
 * Descargos / versión de los hechos del QUERELLADO (derecho a ser oído).
 *  - GET:   lee los descargos registrados.
 *  - PATCH: el equipo (ADMIN/DIRECTOR/FUNCIONARIO) registra/edita los descargos
 *           recibidos presencialmente. (La vía por el portal es la Fase 2.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_READ_ROLES, FAMILY_WRITE_ROLES, findCaseInTenant, auditFamily } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_READ_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const caso = await auth.db.case.findFirst({
      where: { id: params.caseId, tenantId: auth.user.tenantId },
      select: { id: true, descargosQuerellado: true, descargosAt: true, descargosOrigen: true },
    });
    if (!caso) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    return NextResponse.json({ data: caso });
  } catch (error) {
    console.error('Error obteniendo descargos:', error);
    return NextResponse.json({ error: 'Error al obtener los descargos' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_WRITE_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const caseRow = await findCaseInTenant(db, params.caseId, auth.user.tenantId);
    if (!caseRow) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });

    const body = await request.json();
    const texto = typeof body.descargosQuerellado === 'string' ? body.descargosQuerellado.trim() : '';

    await db.case.update({
      where: { id: params.caseId },
      data: {
        descargosQuerellado: texto || null,
        descargosAt: texto ? new Date() : null,
        descargosOrigen: texto ? 'PRESENCIAL' : null,
      },
    });
    await auditFamily(db, request, auth.user, 'FAMILY_DESCARGOS_REGISTRADOS', 'Case', params.caseId, { caseId: params.caseId, metadata: { origen: 'PRESENCIAL' } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error registrando descargos:', error);
    return NextResponse.json({ error: 'Error al registrar los descargos' }, { status: 500 });
  }
}
