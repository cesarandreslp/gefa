/**
 * Corrección por IA del documento en el editor (redacción/gramática/ortografía).
 * Recibe el HTML actual del editor y devuelve el HTML corregido. No persiste:
 * el editor decide si reemplaza el contenido (el profesional revisa antes de guardar).
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { auditFamily } from '@/lib/familyApi';
import { DOCUMENT_DRAFT_ROLES } from '@/lib/documentsApi';
import { proofreadDocumentHtml } from '@/services/DocumentProofreadService';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/v1/family/drafts/[id]/proofread
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, DOCUMENT_DRAFT_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const draft = await db.documentDraft.findFirst({
      where: { id: params.id, tenantId: auth.user.tenantId },
      select: { id: true, status: true, caseId: true },
    });
    if (!draft) return NextResponse.json({ error: 'Borrador no encontrado' }, { status: 404 });

    const body = await request.json();
    const html = typeof body.html === 'string' ? body.html : '';

    const result = await proofreadDocumentHtml(db, auth.user.tenantId, html);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    await auditFamily(db, request, auth.user, 'FAMILY_DRAFT_PROOFREAD', 'DocumentDraft', draft.id, { caseId: draft.caseId });
    return NextResponse.json({ corrected: result.corrected });
  } catch (error) {
    console.error('Error corrigiendo documento:', error);
    return NextResponse.json({ error: 'Error al corregir el documento' }, { status: 500 });
  }
}
