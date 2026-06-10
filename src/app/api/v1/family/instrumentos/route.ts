import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_CONFIDENTIAL_ROLES } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// GET /api/v1/family/instrumentos?profesion=&modalidad=
// Lista los instrumentos de valoración activos (con su plantilla de campos) para
// que el equipo interdisciplinario elija el formato a diligenciar. Catálogo global.
export async function GET(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_CONFIDENTIAL_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const profesion = searchParams.get('profesion'); // PSICOLOGIA | TRABAJO_SOCIAL
    const modalidad = searchParams.get('modalidad'); // CaseModality

    const where: Record<string, unknown> = { isActive: true };
    if (profesion) where.profesion = { in: [profesion, 'AMBOS'] };
    if (modalidad) where.OR = [{ appliesTo: modalidad }, { appliesTo: null }];

    const instrumentos = await auth.db.instrumento.findMany({
      where,
      include: { campos: { orderBy: { orden: 'asc' } } },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({ data: instrumentos });
  } catch (error) {
    console.error('Error listando instrumentos:', error);
    return NextResponse.json({ error: 'Error al listar los instrumentos' }, { status: 500 });
  }
}
