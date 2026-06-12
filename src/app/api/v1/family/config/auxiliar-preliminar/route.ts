/**
 * Capacidad del rol auxiliar: registrar la DESCRIPCIÓN PRELIMINAR y radicar (paso 1).
 * La habilita/inhabilita el comisario (DIRECTOR) o el ADMIN, a nivel de ROL.
 *  - GET:  ¿está habilitada para el rol auxiliar del tenant?
 *  - POST: { enabled } → agrega/quita el permiso `family:descripcion-preliminar`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { PERM_DESCRIPCION_PRELIMINAR, auditFamily } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

const CONFIG_ROLES = ['ADMIN', 'DIRECTOR'];
// Roles auxiliares del tenant: por nivel jerárquico (75) o por código.
const auxRolesWhere = (tenantId: string) => ({
  tenantId,
  OR: [{ level: 75 }, { code: { startsWith: 'AUXILIAR_ATENCION_USUARIO' } }],
});

export async function GET(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, CONFIG_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const roles = await auth.db.role.findMany({
      where: auxRolesWhere(auth.user.tenantId),
      select: { permissions: true },
    });
    const enabled = roles.length > 0 && roles.every((r) => r.permissions.includes(PERM_DESCRIPCION_PRELIMINAR));
    return NextResponse.json({ enabled, hasAuxiliarRole: roles.length > 0 });
  } catch (error) {
    console.error('Error leyendo capacidad del auxiliar:', error);
    return NextResponse.json({ error: 'Error al leer la configuración' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, CONFIG_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const body = await request.json().catch(() => ({}));
    const enabled = body.enabled === true;

    const roles = await db.role.findMany({
      where: auxRolesWhere(auth.user.tenantId),
      select: { id: true, permissions: true },
    });
    if (roles.length === 0) {
      return NextResponse.json({ error: 'No existe un rol auxiliar en la entidad.' }, { status: 404 });
    }

    for (const r of roles) {
      const set = new Set(r.permissions);
      if (enabled) set.add(PERM_DESCRIPCION_PRELIMINAR);
      else set.delete(PERM_DESCRIPCION_PRELIMINAR);
      await db.role.update({ where: { id: r.id }, data: { permissions: Array.from(set) } });
    }

    await auditFamily(db, request, auth.user, 'FAMILY_AUXILIAR_PRELIMINAR_TOGGLED', 'Role', roles[0].id, {
      metadata: { enabled, roles: roles.length },
    });

    return NextResponse.json({ enabled });
  } catch (error) {
    console.error('Error actualizando capacidad del auxiliar:', error);
    return NextResponse.json({ error: 'Error al actualizar la configuración' }, { status: 500 });
  }
}
