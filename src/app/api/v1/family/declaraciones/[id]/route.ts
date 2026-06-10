import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_DECLARATION_AUTHOR_ROLES, auditFamily } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// PATCH /api/v1/family/declaraciones/[id]
// Corrige el acta o FIRMA la declaración. Solo el Comisario (DIRECTOR).
// Una vez firmada, queda en firme y no se edita su contenido.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_DECLARATION_AUTHOR_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json(
        { error: 'Solo el Comisario(a) de Familia puede modificar declaraciones' },
        { status: 403 }
      );
    }

    const db = auth.db;
    const existing = await db.declaracion.findFirst({
      where: { id: params.id, tenantId: auth.user.tenantId },
      select: { id: true, caseId: true, isSigned: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Declaración no encontrada' }, { status: 404 });
    }
    if (existing.isSigned) {
      return NextResponse.json(
        { error: 'La declaración ya está firmada y en firme; no puede modificarse' },
        { status: 409 }
      );
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.contenido !== undefined) {
      if (!body.contenido) {
        return NextResponse.json({ error: 'El contenido no puede quedar vacío' }, { status: 400 });
      }
      data.contenido = body.contenido;
    }
    if (body.takenAt !== undefined) data.takenAt = new Date(body.takenAt);

    let signedNow = false;
    if (body.sign === true) {
      data.isSigned = true;
      data.signedAt = new Date();
      signedNow = true;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No hay cambios para aplicar' }, { status: 400 });
    }

    const declaracion = await db.declaracion.update({
      where: { id: params.id },
      data,
      include: {
        declarante: { include: { person: { select: { id: true, firstName: true, firstLastName: true } } } },
        tomadaPor: { select: { id: true, fullName: true } },
      },
    });

    await auditFamily(
      db,
      request,
      auth.user,
      signedNow ? 'FAMILY_DECLARATION_SIGNED' : 'FAMILY_DECLARATION_UPDATED',
      'Declaracion',
      declaracion.id,
      { caseId: existing.caseId }
    );

    return NextResponse.json(declaracion);
  } catch (error) {
    console.error('Error actualizando declaración:', error);
    return NextResponse.json({ error: 'Error al actualizar la declaración' }, { status: 500 });
  }
}
