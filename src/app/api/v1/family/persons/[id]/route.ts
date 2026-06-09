import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_READ_ROLES, FAMILY_INTAKE_ROLES } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// GET /api/v1/family/persons/[id]
// Devuelve una persona con sus vínculos a casos (CaseParty).
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_READ_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const person = await db.person.findFirst({
      where: { id: params.id, tenantId: auth.user.tenantId },
      include: {
        caseParties: {
          include: { case: { select: { id: true, filingNumber: true, subject: true } } },
        },
      },
    });

    if (!person) {
      return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 });
    }

    return NextResponse.json(person);
  } catch (error) {
    console.error('Error obteniendo persona:', error);
    return NextResponse.json({ error: 'Error al obtener la persona' }, { status: 500 });
  }
}

// PATCH /api/v1/family/persons/[id]
// Actualiza datos de contacto/demográficos de una persona.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_INTAKE_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const existing = await db.person.findFirst({
      where: { id: params.id, tenantId: auth.user.tenantId },
      select: { id: true, dataConsent: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const editable = [
      'firstName', 'secondName', 'firstLastName', 'secondLastName', 'gender',
      'ethnicity', 'disability', 'email', 'phone', 'address', 'neighborhood',
      'city', 'department', 'isPriorityGroup', 'priorityReason',
    ] as const;

    const data: Record<string, unknown> = {};
    for (const key of editable) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.birthDate !== undefined) {
      data.birthDate = body.birthDate ? new Date(body.birthDate) : null;
      if (body.birthDate) {
        const age = (Date.now() - new Date(body.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000);
        data.isMinor = age < 18;
      }
    }
    if (body.isMinor !== undefined) data.isMinor = body.isMinor === true;
    // Registrar consentimiento de datos al activarse por primera vez
    if (body.dataConsent === true && !existing.dataConsent) {
      data.dataConsent = true;
      data.dataConsentDate = new Date();
    }

    const person = await db.person.update({ where: { id: params.id }, data });
    return NextResponse.json(person);
  } catch (error) {
    console.error('Error actualizando persona:', error);
    return NextResponse.json({ error: 'Error al actualizar la persona' }, { status: 500 });
  }
}
