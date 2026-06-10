import { NextRequest, NextResponse } from 'next/server';
import { PartyRole } from '@prisma/client';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_STATS_ROLES } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// GET /api/v1/family/seguimiento
// Tablero de seguimiento de la Secretaría de Gobierno: comportamiento ESTADÍSTICO
// de cada comisaría del municipio (registros, casos por estado/tipo, sexo de
// demandantes y demandados, cumplimiento de medidas). Solo agregados; sin PII.
export async function GET(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_STATS_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const tenantId = auth.user.tenantId;

    const [comisarias, states, cases, parties, measures] = await Promise.all([
      db.comisaria.findMany({ where: { tenantId }, select: { id: true, code: true, name: true, isMobile: true, isActive: true }, orderBy: { code: 'asc' } }),
      db.caseState.findMany({ select: { id: true, name: true } }),
      db.case.findMany({ where: { tenantId }, select: { id: true, comisariaId: true, stateId: true, caseModality: true } }),
      db.caseParty.findMany({ where: { tenantId, role: { in: [PartyRole.DENUNCIANTE, PartyRole.VICTIMA, PartyRole.AGRESOR] } }, select: { role: true, person: { select: { gender: true } }, case: { select: { comisariaId: true } } } }),
      db.protectionMeasure.findMany({ where: { tenantId }, select: { status: true, case: { select: { comisariaId: true } } } }),
    ]);

    const stateName = new Map(states.map((s) => [s.id, s.name]));
    const genderLabel = (g?: string | null) => ({ M: 'Masculino', F: 'Femenino', NB: 'No binario', NR: 'No reporta' }[g ?? ''] ?? 'Sin dato');
    const inc = (o: Record<string, number>, k: string) => { o[k] = (o[k] ?? 0) + 1; };

    const build = (filter: (comisariaId: string | null) => boolean) => {
      const casos = cases.filter((c) => filter(c.comisariaId));
      const byState: Record<string, number> = {};
      const byModality: Record<string, number> = {};
      for (const c of casos) {
        inc(byState, stateName.get(c.stateId) ?? 'Sin estado');
        inc(byModality, c.caseModality ?? 'Sin clasificar');
      }
      const demandanteSexo: Record<string, number> = {};
      const demandadoSexo: Record<string, number> = {};
      for (const p of parties) {
        if (!filter(p.case?.comisariaId ?? null)) continue;
        if (p.role === 'AGRESOR') inc(demandadoSexo, genderLabel(p.person?.gender));
        else inc(demandanteSexo, genderLabel(p.person?.gender)); // DENUNCIANTE / VICTIMA
      }
      const medidas: Record<string, number> = {};
      for (const m of measures) { if (filter(m.case?.comisariaId ?? null)) inc(medidas, m.status); }
      return {
        totalCasos: casos.length,
        byState: Object.entries(byState).map(([k, v]) => ({ key: k, count: v })),
        byModality: Object.entries(byModality).map(([k, v]) => ({ key: k, count: v })),
        demandanteSexo: Object.entries(demandanteSexo).map(([k, v]) => ({ key: k, count: v })),
        demandadoSexo: Object.entries(demandadoSexo).map(([k, v]) => ({ key: k, count: v })),
        medidas: Object.entries(medidas).map(([k, v]) => ({ key: k, count: v })),
      };
    };

    const porComisaria = comisarias.map((com) => ({
      id: com.id, code: com.code, name: com.name, isMobile: com.isMobile, isActive: com.isActive,
      ...build((cid) => cid === com.id),
    }));
    // Casos sin comisaría asignada (compatibilidad)
    const sinAsignar = build((cid) => cid === null);

    return NextResponse.json({
      municipio: { ...build(() => true) },
      porComisaria,
      sinAsignar: sinAsignar.totalCasos > 0 ? sinAsignar : null,
    });
  } catch (error) {
    console.error('Error en seguimiento por comisaría:', error);
    return NextResponse.json({ error: 'Error al obtener el seguimiento' }, { status: 500 });
  }
}
