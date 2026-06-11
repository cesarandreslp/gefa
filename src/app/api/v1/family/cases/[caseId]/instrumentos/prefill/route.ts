/**
 * GET /api/v1/family/cases/[caseId]/instrumentos/prefill?instrumentoId=
 *
 * PRELLENADO de un instrumento (RF‑02). Devuelve `respuestasIniciales` —
 * { campoCode: valor } — con los datos que ya constan en el expediente
 * (identidad de la víctima/agresor, tipo de violencia), para que el profesional
 * abra el formato precargado y solo confirme/complete. Solo lectura: no escribe.
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_CONFIDENTIAL_ROLES, findCaseInTenant } from '@/lib/familyApi';
import { resolveInstrumentoPrefill } from '@/lib/instrumentoPrefill';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { caseId: string } }) {
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

    const { searchParams } = new URL(request.url);
    const instrumentoId = searchParams.get('instrumentoId')?.trim();
    if (!instrumentoId) {
      return NextResponse.json({ error: 'instrumentoId es obligatorio' }, { status: 400 });
    }

    const instrumento = await db.instrumento.findFirst({
      where: { id: instrumentoId, isActive: true },
      select: { campos: { select: { code: true } } },
    });
    if (!instrumento) {
      return NextResponse.json({ error: 'Instrumento no encontrado o inactivo' }, { status: 404 });
    }

    const caseData = await db.case.findUnique({
      where: { id: params.caseId },
      select: {
        violenceTypes: true,
        citizen: {
          select: {
            documentType: true, documentNumber: true, firstName: true, secondName: true,
            firstLastName: true, secondLastName: true, email: true, phone: true,
            address: true, city: true, department: true, neighborhood: true,
          },
        },
        caseParties: {
          select: {
            role: true,
            person: {
              select: {
                documentType: true, documentNumber: true, firstName: true, secondName: true,
                firstLastName: true, secondLastName: true, birthDate: true, gender: true,
                email: true, phone: true, address: true, city: true, department: true, neighborhood: true,
              },
            },
          },
        },
      },
    });
    if (!caseData) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    }

    const campoCodes = instrumento.campos.map((c) => c.code);
    const respuestasIniciales = resolveInstrumentoPrefill(campoCodes, {
      caseParties: caseData.caseParties,
      citizen: caseData.citizen,
      violenceTypes: caseData.violenceTypes,
    });

    return NextResponse.json({ respuestasIniciales });
  } catch (error) {
    console.error('Error prellenando instrumento:', error);
    return NextResponse.json({ error: 'Error al prellenar el instrumento' }, { status: 500 });
  }
}
