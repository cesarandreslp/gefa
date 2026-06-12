/**
 * Borradores de documentos de un caso (editor del despacho).
 *  - GET:  lista los borradores del caso.
 *  - POST: crea un borrador, normalmente a partir de una plantilla (mergea variables).
 */

import { NextRequest, NextResponse } from 'next/server';
import { DocumentType } from '@prisma/client';
import { protectAPIRoute, getBaseRoleCode } from '@/lib/auth';
import { findCaseInTenant, auditFamily } from '@/lib/familyApi';
import { DOCUMENT_DRAFT_ROLES, documentTypeForKind, mergeTemplateBody } from '@/lib/documentsApi';

export const dynamic = 'force-dynamic';

const DOCUMENT_TYPES = Object.values(DocumentType) as string[];

// GET /api/v1/family/cases/[caseId]/documents/drafts
export async function GET(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, DOCUMENT_DRAFT_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const caseRow = await findCaseInTenant(db, params.caseId, auth.user.tenantId);
    if (!caseRow) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });

    const drafts = await db.documentDraft.findMany({
      where: { caseId: params.caseId, tenantId: auth.user.tenantId },
      select: {
        id: true, title: true, documentType: true, status: true,
        lastAutosaveAt: true, updatedAt: true, documentId: true,
        template: { select: { id: true, name: true, kind: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json({ data: drafts });
  } catch (error) {
    console.error('Error listando borradores:', error);
    return NextResponse.json({ error: 'Error al listar los borradores' }, { status: 500 });
  }
}

// POST /api/v1/family/cases/[caseId]/documents/drafts
export async function POST(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, DOCUMENT_DRAFT_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const caseRow = await findCaseInTenant(db, params.caseId, auth.user.tenantId);
    if (!caseRow) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });

    const body = await request.json();
    const { templateId, title, documentType, data } = body;
    const values: Record<string, unknown> = (data && typeof data === 'object') ? data : {};

    let resolvedType: DocumentType;
    let bodyHtml = '';
    let resolvedTitle = typeof title === 'string' ? title.trim() : '';

    if (templateId) {
      const tpl = await db.documentTemplate.findFirst({
        where: { id: templateId, tenantId: auth.user.tenantId, isActive: true },
        select: { id: true, kind: true, name: true, bodyHtml: true, profesiones: true, requiereInformeFinal: true },
      });
      if (!tpl) return NextResponse.json({ error: 'Plantilla no encontrada o inactiva' }, { status: 404 });

      // Restricción por profesión (defensa en profundidad; la lista ya se filtra al mostrar).
      const baseRole = getBaseRoleCode(auth.user.roleCode);
      if (!['ADMIN', 'DIRECTOR'].includes(baseRole) && tpl.profesiones.length > 0) {
        const u = await db.user.findFirst({ where: { id: auth.user.userId }, select: { profesion: true } });
        if (!u?.profesion || !tpl.profesiones.includes(u.profesion)) {
          return NextResponse.json({ error: 'Su profesión no está habilitada para esta plantilla.' }, { status: 403 });
        }
      }

      // Plantillas ligadas al informe final (p. ej. resolución): exigirlo y prellenar.
      if (tpl.requiereInformeFinal || tpl.bodyHtml.includes('{{informe_final}}')) {
        const c = await db.case.findFirst({ where: { id: params.caseId, tenantId: auth.user.tenantId }, select: { informeCompilado: true } });
        if (tpl.requiereInformeFinal && !c?.informeCompilado?.trim()) {
          return NextResponse.json({ error: 'Este documento requiere el informe final compilado. Genérelo primero (Informe final del comisario).' }, { status: 409 });
        }
        if (c?.informeCompilado && values.informe_final === undefined) values.informe_final = c.informeCompilado;
      }

      resolvedType = documentTypeForKind(tpl.kind);
      bodyHtml = mergeTemplateBody(tpl.bodyHtml, values);
      if (!resolvedTitle) resolvedTitle = tpl.name;
    } else {
      if (!documentType || !DOCUMENT_TYPES.includes(documentType)) {
        return NextResponse.json({ error: 'Tipo de documento inválido' }, { status: 400 });
      }
      resolvedType = documentType as DocumentType;
      if (!resolvedTitle) resolvedTitle = 'Documento sin título';
    }

    const draft = await db.documentDraft.create({
      data: {
        tenantId: auth.user.tenantId,
        caseId: params.caseId,
        templateId: templateId || null,
        documentType: resolvedType,
        title: resolvedTitle,
        bodyHtml,
        data: values as never,
        createdByUserId: auth.user.userId,
      },
      select: { id: true, title: true, documentType: true, status: true },
    });

    await auditFamily(db, request, auth.user, 'FAMILY_DRAFT_CREATED', 'DocumentDraft', draft.id, {
      caseId: params.caseId,
      metadata: { templateId: templateId || null, documentType: resolvedType },
    });

    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    console.error('Error creando borrador:', error);
    return NextResponse.json({ error: 'Error al crear el borrador' }, { status: 500 });
  }
}
