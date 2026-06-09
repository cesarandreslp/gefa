import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_READ_ROLES, FAMILY_WRITE_ROLES, findCaseInTenant } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// GET /api/v1/family/cases/[caseId]/restoration
// Lista los procesos PARD (restablecimiento de derechos) de un caso.
export async function GET(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_READ_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const caseRow = await findCaseInTenant(db, params.caseId, auth.user.tenantId);
    if (!caseRow) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    }

    const processes = await db.restorationProcess.findMany({
      where: { caseId: params.caseId, tenantId: auth.user.tenantId },
      include: {
        child: { select: { id: true, firstName: true, firstLastName: true, documentNumber: true } },
        responsibleUser: { select: { id: true, fullName: true } },
      },
      orderBy: { openedAt: 'desc' },
    });

    return NextResponse.json({ data: processes });
  } catch (error) {
    console.error('Error listando procesos PARD:', error);
    return NextResponse.json({ error: 'Error al listar los procesos' }, { status: 500 });
  }
}

// POST /api/v1/family/cases/[caseId]/restoration
// Abre un PARD para un NNA (Art. 99-100 Ley 1098/2006).
export async function POST(request: NextRequest, { params }: { params: { caseId: string } }) {
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

    const body = await request.json();
    const { childId, legalBasis, responsibleUserId, followUpMonths } = body;

    if (!childId) {
      return NextResponse.json({ error: 'childId (NNA) es obligatorio' }, { status: 400 });
    }

    // El NNA debe existir en el tenant y ser menor
    const child = await db.person.findFirst({
      where: { id: childId, tenantId: auth.user.tenantId },
      select: { id: true, isMinor: true },
    });
    if (!child) {
      return NextResponse.json({ error: 'El NNA no existe en la entidad' }, { status: 404 });
    }
    if (!child.isMinor) {
      return NextResponse.json(
        { error: 'El PARD aplica únicamente a niños, niñas y adolescentes (NNA)' },
        { status: 400 }
      );
    }

    const process = await db.restorationProcess.create({
      data: {
        tenantId: auth.user.tenantId,
        caseId: params.caseId,
        childId,
        responsibleUserId: responsibleUserId || auth.user.userId,
        legalBasis: legalBasis || 'Arts. 99 y 100 Ley 1098/2006',
        followUpMonths: followUpMonths ?? null,
      },
      include: {
        child: { select: { id: true, firstName: true, firstLastName: true } },
        responsibleUser: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json(process, { status: 201 });
  } catch (error) {
    console.error('Error abriendo proceso PARD:', error);
    return NextResponse.json({ error: 'Error al abrir el proceso' }, { status: 500 });
  }
}
