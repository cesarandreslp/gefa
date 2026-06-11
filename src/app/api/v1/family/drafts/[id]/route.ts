/**
 * Borrador de documento (detalle).
 *  - GET:    carga el borrador para el editor.
 *  - PATCH:  autoguarda título/cuerpo/datos (debounced desde el cliente).
 *  - DELETE: elimina un borrador no emitido.
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { auditFamily } from '@/lib/familyApi';
import { DOCUMENT_DRAFT_ROLES } from '@/lib/documentsApi';

export const dynamic = 'force-dynamic';

// GET /api/v1/family/drafts/[id]
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, DOCUMENT_DRAFT_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const draft = await db.documentDraft.findFirst({
      where: { id: params.id, tenantId: auth.user.tenantId },
      include: {
        template: { select: { id: true, name: true, kind: true, variables: true, signerRoles: true } },
        case: { select: { id: true, filingNumber: true, comisariaId: true } },
        document: { select: { id: true, fileUrl: true } },
        signatures: {
          select: { id: true, signerName: true, role: true, signedAt: true, signatureImageUrl: true },
          orderBy: { signedAt: 'asc' },
        },
      },
    });
    if (!draft) return NextResponse.json({ error: 'Borrador no encontrado' }, { status: 404 });
    return NextResponse.json({ data: draft });
  } catch (error) {
    console.error('Error obteniendo borrador:', error);
    return NextResponse.json({ error: 'Error al obtener el borrador' }, { status: 500 });
  }
}

// PATCH /api/v1/family/drafts/[id]
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, DOCUMENT_DRAFT_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const existing = await db.documentDraft.findFirst({
      where: { id: params.id, tenantId: auth.user.tenantId },
      select: { id: true, status: true },
    });
    if (!existing) return NextResponse.json({ error: 'Borrador no encontrado' }, { status: 404 });
    if (existing.status === 'EMITIDO') {
      return NextResponse.json({ error: 'El documento ya fue emitido; no se puede editar.' }, { status: 409 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = { lastAutosaveAt: new Date() };
    if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim();
    if (typeof body.bodyHtml === 'string') data.bodyHtml = body.bodyHtml;
    if (body.data && typeof body.data === 'object') data.data = body.data as never;

    await db.documentDraft.update({ where: { id: existing.id }, data });
    return NextResponse.json({ ok: true, lastAutosaveAt: data.lastAutosaveAt });
  } catch (error) {
    console.error('Error autoguardando borrador:', error);
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 });
  }
}

// DELETE /api/v1/family/drafts/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, DOCUMENT_DRAFT_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const existing = await db.documentDraft.findFirst({
      where: { id: params.id, tenantId: auth.user.tenantId },
      select: { id: true, status: true, caseId: true },
    });
    if (!existing) return NextResponse.json({ error: 'Borrador no encontrado' }, { status: 404 });
    if (existing.status === 'EMITIDO') {
      return NextResponse.json({ error: 'No se puede eliminar un documento ya emitido.' }, { status: 409 });
    }

    await db.documentSignature.deleteMany({ where: { draftId: existing.id } });
    await db.documentDraft.delete({ where: { id: existing.id } });
    await auditFamily(db, request, auth.user, 'FAMILY_DRAFT_DELETED', 'DocumentDraft', existing.id, { caseId: existing.caseId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error eliminando borrador:', error);
    return NextResponse.json({ error: 'Error al eliminar el borrador' }, { status: 500 });
  }
}
