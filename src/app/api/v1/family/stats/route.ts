import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_STATS_ROLES } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// GET /api/v1/family/stats
// Estadísticas agregadas de la comisaría para tableros de política pública.
export async function GET(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_STATS_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const tenantId = auth.user.tenantId;
    const familyWhere = { tenantId, caseModality: { not: null } };

    const [
      totalCases,
      byModality,
      byState,
      measuresByStatus,
      partiesByRole,
      minorsCount,
      assignmentsByUser,
      casesForViolence,
    ] = await Promise.all([
      db.case.count({ where: familyWhere }),
      db.case.groupBy({ by: ['caseModality'], where: familyWhere, _count: true }),
      db.case.groupBy({ by: ['stateId'], where: familyWhere, _count: true }),
      db.protectionMeasure.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
      db.caseParty.groupBy({ by: ['role'], where: { tenantId }, _count: true }),
      db.person.count({ where: { tenantId, isMinor: true } }),
      db.assignment.groupBy({ by: ['userId'], where: { tenantId, status: { not: 'REASSIGNED' } }, _count: true }),
      db.case.findMany({ where: familyWhere, select: { violenceTypes: true } }),
    ]);

    // Resolver nombres de estados
    const stateIds = byState.map((s) => s.stateId);
    const states = await db.caseState.findMany({ where: { id: { in: stateIds } }, select: { id: true, code: true, name: true, color: true } });
    const stateMap = new Map(states.map((s) => [s.id, s]));

    // Resolver nombres de usuarios para carga por profesional
    const userIds = assignmentsByUser.map((a) => a.userId);
    const users = await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } });
    const userMap = new Map(users.map((u) => [u.id, u.fullName]));

    // Cruce: tipo de violencia (desnormalizar el array)
    const violenceCounts: Record<string, number> = {};
    for (const c of casesForViolence) {
      for (const v of c.violenceTypes) violenceCounts[v] = (violenceCounts[v] ?? 0) + 1;
    }

    return NextResponse.json({
      totalCases,
      totalMinors: minorsCount,
      byModality: byModality.map((m) => ({ key: m.caseModality, count: (m._count as number) })),
      byState: byState.map((s) => ({
        key: stateMap.get(s.stateId)?.code ?? s.stateId,
        name: stateMap.get(s.stateId)?.name ?? '—',
        color: stateMap.get(s.stateId)?.color ?? null,
        count: (s._count as number),
      })),
      byViolenceType: Object.entries(violenceCounts).map(([key, count]) => ({ key, count })),
      measuresByStatus: measuresByStatus.map((m) => ({ key: m.status, count: (m._count as number) })),
      partiesByRole: partiesByRole.map((p) => ({ key: p.role, count: (p._count as number) })),
      workloadByUser: assignmentsByUser
        .map((a) => ({ key: userMap.get(a.userId) ?? a.userId, count: (a._count as number) }))
        .sort((x, y) => y.count - x.count),
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de familia:', error);
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
  }
}
