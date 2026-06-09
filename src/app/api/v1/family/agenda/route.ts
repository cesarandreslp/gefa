import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_READ_ROLES } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// GET /api/v1/family/agenda?from=YYYY-MM-DD&to=YYYY-MM-DD&mine=true
// Agenda de audiencias del tenant en el rango (por defecto, próximos 30 días).
// `mine=true` limita a las audiencias que preside el usuario.
export async function GET(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_READ_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const mine = searchParams.get('mine') === 'true';

    const from = fromParam ? new Date(fromParam) : new Date();
    const to = toParam ? new Date(toParam) : new Date(from.getTime() + 30 * 24 * 3600 * 1000);

    const hearings = await db.hearing.findMany({
      where: {
        tenantId: auth.user.tenantId,
        scheduledAt: { gte: from, lte: to },
        ...(mine ? { presidedByUserId: auth.user.userId } : {}),
      },
      include: {
        presidedBy: { select: { id: true, fullName: true } },
        case: { select: { id: true, filingNumber: true, subject: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return NextResponse.json({
      from: from.toISOString(),
      to: to.toISOString(),
      data: hearings,
    });
  } catch (error) {
    console.error('Error obteniendo agenda:', error);
    return NextResponse.json({ error: 'Error al obtener la agenda' }, { status: 500 });
  }
}
