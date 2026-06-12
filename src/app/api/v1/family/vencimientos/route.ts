import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_READ_ROLES } from '@/lib/familyApi';
import { computeVencimientos } from '@/lib/familyVencimientos';

export const dynamic = 'force-dynamic';

// GET /api/v1/family/vencimientos
// Tablero de control de términos de la comisaría: medidas vencidas / por vencer
// y PARD con término o seguimiento atrasado.
export async function GET(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_READ_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const v = await computeVencimientos(auth.db, auth.user.tenantId);
    return NextResponse.json({
      measuresOverdue: v.measuresOverdue,
      measuresUpcoming: v.measuresUpcoming,
      pardOverdue: v.pardOverdue,
      recursosUpcoming: v.recursosUpcoming,
      recursosOverdue: v.recursosOverdue,
      counts: {
        measuresOverdue: v.measuresOverdue.length,
        measuresUpcoming: v.measuresUpcoming.length,
        pardOverdue: v.pardOverdue.length,
        recursosUpcoming: v.recursosUpcoming.length,
        recursosOverdue: v.recursosOverdue.length,
      },
    });
  } catch (error) {
    console.error('Error obteniendo vencimientos:', error);
    return NextResponse.json({ error: 'Error al obtener vencimientos' }, { status: 500 });
  }
}
