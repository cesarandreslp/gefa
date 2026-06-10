import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/v1/tenant/limits
// Cupos contratados del tenant (maxUsers, maxComisarias) y su uso actual, para
// que el panel muestre "X de Y" y deshabilite acciones al alcanzar el cupo.
// El conteo de usuarios excluye al usuario interno de IA (ASIGNACION_DE_CASOS).
export async function GET(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // La Secretaría de Gobierno solo accede a estadística/reportes agregados.
    if (auth.user.roleCode === 'SECRETARIA_GOBIERNO') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const tenantId = auth.user.tenantId;
    const [tenant, activeUsers, activeComisarias] = await Promise.all([
      auth.db.tenant.findUnique({ where: { id: tenantId }, select: { maxUsers: true, maxComisarias: true } }),
      auth.db.user.count({
        where: {
          tenantId,
          isActive: true,
          OR: [{ role: null }, { role: { code: { not: 'ASIGNACION_DE_CASOS' } } }],
        },
      }),
      auth.db.comisaria.count({ where: { tenantId, isActive: true } }),
    ]);

    return NextResponse.json({
      maxUsers: tenant?.maxUsers ?? null,
      maxComisarias: tenant?.maxComisarias ?? null,
      activeUsers,
      activeComisarias,
    });
  } catch (error) {
    console.error('Error obteniendo cupos del tenant:', error);
    return NextResponse.json({ error: 'Error al obtener los cupos' }, { status: 500 });
  }
}
