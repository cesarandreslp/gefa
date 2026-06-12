/**
 * Plantillas del despacho (RF — documentos jurídicos).
 *  - GET:  lista las plantillas del tenant (para escoger al redactar). Filtros: kind, activos.
 *  - POST: crea una plantilla (solo ADMIN/DIRECTOR).
 */

import { NextRequest, NextResponse } from 'next/server';
import { TemplateKind } from '@prisma/client';
import { protectAPIRoute, getBaseRoleCode } from '@/lib/auth';
import {
  TEMPLATE_ADMIN_ROLES,
  DOCUMENT_DRAFT_ROLES,
  TEMPLATE_KINDS,
  SIGNING_PROFESSIONS,
  normalizeVariables,
} from '@/lib/documentsApi';
import { auditFamily } from '@/lib/familyApi';
import { seedDefaultTemplates } from '@/lib/defaultTemplates';

export const dynamic = 'force-dynamic';

const VALID_SIGNER_ROLES = ['DIRECTOR', ...SIGNING_PROFESSIONS];

function normalizeSignerRoles(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.map(String).filter((r) => VALID_SIGNER_ROLES.includes(r)))];
}

function normalizeProfesiones(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.map(String).filter((p) => SIGNING_PROFESSIONS.includes(p)))];
}

// GET /api/v1/family/templates
export async function GET(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, DOCUMENT_DRAFT_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get('kind');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Precarga perezosa: si el tenant no tiene plantillas, sembrar el set predefinido.
    const total = await db.documentTemplate.count({ where: { tenantId: auth.user.tenantId } });
    if (total === 0) {
      try { await seedDefaultTemplates(db, auth.user.tenantId, auth.user.userId); } catch (e) { console.error('Seed plantillas:', e); }
    }

    const templates = await db.documentTemplate.findMany({
      where: {
        tenantId: auth.user.tenantId,
        ...(kind && TEMPLATE_KINDS.includes(kind as TemplateKind) ? { kind: kind as TemplateKind } : {}),
        ...(includeInactive ? {} : { isActive: true }),
      },
      select: {
        id: true, kind: true, name: true, description: true,
        variables: true, signerRoles: true, profesiones: true, requiereInformeFinal: true,
        isActive: true, version: true, comisariaId: true, updatedAt: true,
      },
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    });

    // Restricción por profesión: el jurídico solo ve las jurídicas (o las sin
    // restricción). ADMIN/DIRECTOR ven todas.
    const baseRole = getBaseRoleCode(auth.user.roleCode);
    const isAdminLike = ['ADMIN', 'DIRECTOR'].includes(baseRole);
    let visibles = templates;
    if (!isAdminLike) {
      const u = await db.user.findFirst({ where: { id: auth.user.userId }, select: { profesion: true } });
      const prof = u?.profesion ?? null;
      visibles = templates.filter((t) => t.profesiones.length === 0 || (prof != null && t.profesiones.includes(prof)));
    }

    return NextResponse.json({ data: visibles });
  } catch (error) {
    console.error('Error listando plantillas:', error);
    return NextResponse.json({ error: 'Error al listar las plantillas' }, { status: 500 });
  }
}

// POST /api/v1/family/templates
export async function POST(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, TEMPLATE_ADMIN_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const body = await request.json();
    const { kind, name, description, bodyHtml, variables, signerRoles, comisariaId, profesiones, requiereInformeFinal } = body;

    if (!kind || !TEMPLATE_KINDS.includes(kind)) {
      return NextResponse.json({ error: 'Tipo de plantilla inválido' }, { status: 400 });
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }
    if (!bodyHtml || typeof bodyHtml !== 'string') {
      return NextResponse.json({ error: 'El cuerpo de la plantilla es obligatorio' }, { status: 400 });
    }

    // Sede opcional: si se indica, debe pertenecer al tenant.
    if (comisariaId) {
      const com = await db.comisaria.findFirst({
        where: { id: comisariaId, tenantId: auth.user.tenantId },
        select: { id: true },
      });
      if (!com) {
        return NextResponse.json({ error: 'La comisaría indicada no existe en la entidad' }, { status: 400 });
      }
    }

    const created = await db.documentTemplate.create({
      data: {
        tenantId: auth.user.tenantId,
        comisariaId: comisariaId || null,
        kind,
        name: name.trim(),
        description: description?.trim() || null,
        bodyHtml,
        variables: normalizeVariables(variables) as never,
        signerRoles: normalizeSignerRoles(signerRoles) as never,
        profesiones: normalizeProfesiones(profesiones),
        requiereInformeFinal: requiereInformeFinal === true,
        createdByUserId: auth.user.userId,
      },
      select: { id: true, kind: true, name: true, isActive: true, version: true },
    });

    await auditFamily(db, request, auth.user, 'FAMILY_TEMPLATE_CREATED', 'DocumentTemplate', created.id, {
      metadata: { kind, name: created.name },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creando plantilla:', error);
    return NextResponse.json({ error: 'Error al crear la plantilla' }, { status: 500 });
  }
}
