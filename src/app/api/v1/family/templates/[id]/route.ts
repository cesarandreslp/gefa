/**
 * Plantilla del despacho (detalle).
 *  - GET:    una plantilla (para redactar o editar).
 *  - PATCH:  edita la plantilla y sube la versión (solo ADMIN/DIRECTOR).
 *  - DELETE: desactiva la plantilla (soft delete; preserva borradores que la referencian).
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import {
  TEMPLATE_ADMIN_ROLES,
  DOCUMENT_DRAFT_ROLES,
  SIGNING_PROFESSIONS,
  normalizeVariables,
} from '@/lib/documentsApi';
import { auditFamily } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

const VALID_SIGNER_ROLES = ['DIRECTOR', ...SIGNING_PROFESSIONS];

// GET /api/v1/family/templates/[id]
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, DOCUMENT_DRAFT_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const tpl = await db.documentTemplate.findFirst({
      where: { id: params.id, tenantId: auth.user.tenantId },
    });
    if (!tpl) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
    return NextResponse.json({ data: tpl });
  } catch (error) {
    console.error('Error obteniendo plantilla:', error);
    return NextResponse.json({ error: 'Error al obtener la plantilla' }, { status: 500 });
  }
}

// PATCH /api/v1/family/templates/[id]
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, TEMPLATE_ADMIN_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const existing = await db.documentTemplate.findFirst({
      where: { id: params.id, tenantId: auth.user.tenantId },
      select: { id: true, version: true },
    });
    if (!existing) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
    if (typeof body.description === 'string') data.description = body.description.trim() || null;
    if (typeof body.bodyHtml === 'string') data.bodyHtml = body.bodyHtml;
    if (body.variables !== undefined) data.variables = normalizeVariables(body.variables) as never;
    if (body.signerRoles !== undefined) {
      data.signerRoles = (Array.isArray(body.signerRoles)
        ? [...new Set(body.signerRoles.map(String).filter((r: string) => VALID_SIGNER_ROLES.includes(r)))]
        : []) as never;
    }
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
    data.version = existing.version + 1;

    const updated = await db.documentTemplate.update({
      where: { id: existing.id },
      data,
      select: { id: true, kind: true, name: true, isActive: true, version: true },
    });

    await auditFamily(db, request, auth.user, 'FAMILY_TEMPLATE_UPDATED', 'DocumentTemplate', updated.id, {
      metadata: { version: updated.version },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error actualizando plantilla:', error);
    return NextResponse.json({ error: 'Error al actualizar la plantilla' }, { status: 500 });
  }
}

// DELETE /api/v1/family/templates/[id]  (soft delete)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, TEMPLATE_ADMIN_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const existing = await db.documentTemplate.findFirst({
      where: { id: params.id, tenantId: auth.user.tenantId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });

    await db.documentTemplate.update({ where: { id: existing.id }, data: { isActive: false } });
    await auditFamily(db, request, auth.user, 'FAMILY_TEMPLATE_DISABLED', 'DocumentTemplate', existing.id, {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error desactivando plantilla:', error);
    return NextResponse.json({ error: 'Error al desactivar la plantilla' }, { status: 500 });
  }
}
