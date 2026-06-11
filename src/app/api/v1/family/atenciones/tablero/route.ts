/**
 * GET /api/v1/family/atenciones/tablero?comisariaId=
 *
 * Tablero de disponibilidad del equipo (RF‑09): estado LIBRE/OCUPADO en vivo de
 * cada profesional. La disponibilidad se DERIVA de si el profesional tiene un
 * turno EN_CURSO (RF‑17) — nadie la marca a mano. La jornada laboral y las
 * indisponibilidades autorizadas se superponen en 12d.
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_DISPATCH_ROLES } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// Orden lógico sugerido del paso 2 (RF‑08): psicología → trabajo social → jurídico.
const PROFESION_ORDEN: Record<string, number> = { PSICOLOGIA: 1, TRABAJO_SOCIAL: 2, JURIDICA: 3 };

// Recepción/dirección despachan; el profesional también ve el tablero (para hallar su turno).
const TABLERO_ROLES = [...FAMILY_DISPATCH_ROLES, 'FUNCIONARIO'];

export async function GET(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, TABLERO_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const { searchParams } = new URL(request.url);
    const comisariaId = searchParams.get('comisariaId')?.trim();

    const profesionales = await db.user.findMany({
      where: {
        tenantId: auth.user.tenantId,
        isActive: true,
        profesion: { not: null },
        ...(comisariaId ? { comisariaId } : {}),
      },
      select: {
        id: true, fullName: true, profesion: true,
        comisaria: { select: { id: true, code: true, name: true } },
      },
    });

    const ids = profesionales.map((p) => p.id);
    const enCurso = ids.length
      ? await db.atencion.findMany({
          where: { estado: 'EN_CURSO', profesionalUserId: { in: ids } },
          select: {
            id: true, profesionalUserId: true, startedAt: true,
            case: { select: { id: true, filingNumber: true } },
          },
        })
      : [];
    const ocupadoPorUser = new Map(enCurso.map((a) => [a.profesionalUserId, a]));

    const data = profesionales
      .map((p) => {
        const turno = ocupadoPorUser.get(p.id);
        return {
          id: p.id,
          fullName: p.fullName,
          profesion: p.profesion,
          comisaria: p.comisaria,
          estado: turno ? 'OCUPADO' : 'LIBRE',
          desde: turno?.startedAt ?? null,
          caso: turno?.case ?? null,
          atencionId: turno?.id ?? null,
        };
      })
      .sort((a, b) => {
        const oa = PROFESION_ORDEN[a.profesion ?? ''] ?? 99;
        const ob = PROFESION_ORDEN[b.profesion ?? ''] ?? 99;
        return oa !== ob ? oa - ob : a.fullName.localeCompare(b.fullName);
      });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error cargando tablero de disponibilidad:', error);
    return NextResponse.json({ error: 'Error al cargar el tablero' }, { status: 500 });
  }
}
