import { NextRequest, NextResponse } from 'next/server';
import { TipoDeclarante } from '@prisma/client';
import { protectAPIRoute } from '@/lib/auth';
import {
  FAMILY_WRITE_ROLES,
  FAMILY_DECLARATION_AUTHOR_ROLES,
  findCaseInTenant,
  isValidEnum,
  auditFamily,
} from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// GET /api/v1/family/cases/[caseId]/declaraciones
// Lista las declaraciones del expediente. Lectura para el equipo que opera el
// caso (no ventanilla): son contenido procesal del expediente.
export async function GET(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_WRITE_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const caseRow = await findCaseInTenant(db, params.caseId, auth.user.tenantId);
    if (!caseRow) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    }

    const declaraciones = await db.declaracion.findMany({
      where: { caseId: params.caseId, tenantId: auth.user.tenantId },
      include: {
        declarante: { include: { person: { select: { id: true, firstName: true, firstLastName: true } } } },
        tomadaPor: { select: { id: true, fullName: true } },
      },
      orderBy: { takenAt: 'desc' },
    });

    return NextResponse.json({ data: declaraciones });
  } catch (error) {
    console.error('Error listando declaraciones:', error);
    return NextResponse.json({ error: 'Error al listar las declaraciones' }, { status: 500 });
  }
}

// POST /api/v1/family/cases/[caseId]/declaraciones
// Toma una declaración. SOLO el Comisario (DIRECTOR): es el acto con peso procesal.
export async function POST(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_DECLARATION_AUTHOR_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json(
        { error: 'Solo el Comisario(a) de Familia puede tomar declaraciones' },
        { status: 403 }
      );
    }

    const db = auth.db;
    const caseRow = await findCaseInTenant(db, params.caseId, auth.user.tenantId);
    if (!caseRow) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { declaranteId, tipoDeclarante, contenido, hearingId, takenAt, sign } = body;

    if (!declaranteId || !tipoDeclarante || !contenido) {
      return NextResponse.json(
        { error: 'declaranteId, tipoDeclarante y contenido son obligatorios' },
        { status: 400 }
      );
    }
    if (!isValidEnum(TipoDeclarante, tipoDeclarante)) {
      return NextResponse.json(
        { error: `tipoDeclarante inválido. Valores: ${Object.values(TipoDeclarante).join(', ')}` },
        { status: 400 }
      );
    }

    // El declarante debe ser una parte de ESTE caso (evita enlazar partes ajenas).
    const party = await db.caseParty.findFirst({
      where: { id: declaranteId, caseId: params.caseId, tenantId: auth.user.tenantId },
      select: { id: true },
    });
    if (!party) {
      return NextResponse.json({ error: 'El declarante no es una parte de este caso' }, { status: 400 });
    }

    // Si se rinde en audiencia, la audiencia debe pertenecer al caso.
    if (hearingId) {
      const hearing = await db.hearing.findFirst({
        where: { id: hearingId, caseId: params.caseId, tenantId: auth.user.tenantId },
        select: { id: true },
      });
      if (!hearing) {
        return NextResponse.json({ error: 'La audiencia indicada no pertenece a este caso' }, { status: 400 });
      }
    }

    const signed = sign === true;
    const declaracion = await db.declaracion.create({
      data: {
        tenantId: auth.user.tenantId,
        caseId: params.caseId,
        declaranteId,
        tipoDeclarante,
        tomadaPorUserId: auth.user.userId,
        hearingId: hearingId || null,
        contenido,
        takenAt: takenAt ? new Date(takenAt) : new Date(),
        isSigned: signed,
        signedAt: signed ? new Date() : null,
      },
      include: {
        declarante: { include: { person: { select: { id: true, firstName: true, firstLastName: true } } } },
        tomadaPor: { select: { id: true, fullName: true } },
      },
    });

    await auditFamily(db, request, auth.user, 'FAMILY_DECLARATION_TAKEN', 'Declaracion', declaracion.id, {
      caseId: params.caseId,
      metadata: { tipoDeclarante, signed },
    });

    return NextResponse.json(declaracion, { status: 201 });
  } catch (error) {
    console.error('Error tomando declaración:', error);
    return NextResponse.json({ error: 'Error al tomar la declaración' }, { status: 500 });
  }
}
