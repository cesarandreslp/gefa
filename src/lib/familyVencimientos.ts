/**
 * ============================================================================
 * VENCIMIENTOS DE FAMILIA — control de términos de medidas y PARD
 * ============================================================================
 * Lógica compartida por el cron de vencimientos (fan-out por tenant) y el
 * endpoint de dashboard por comisaría. No envía notificaciones; solo calcula y,
 * en el cron, marca como VENCIDA las medidas cuyo `expiresAt` ya pasó.
 * ============================================================================
 */

import { PrismaClient } from '@prisma/client';

/** Días de antelación para considerar una medida "próxima a vencer". */
export const MEASURE_WARNING_DAYS = 5;
/** Término orientativo del PARD en días (≈ 4 meses, Art. 100 Ley 1098/2006). */
export const PARD_TERM_DAYS = 120;

export interface VencimientosResult {
  measuresOverdue: any[];      // VIGENTE con expiresAt ya pasado (aún sin marcar)
  measuresUpcoming: any[];     // VIGENTE que vencen dentro de MEASURE_WARNING_DAYS
  pardOverdue: any[];          // PARD no cerrado con término vencido o seguimiento atrasado
}
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Marca como VENCIDA toda medida VIGENTE cuyo `expiresAt` ya pasó.
 * Devuelve el número de medidas actualizadas.
 */
export async function markExpiredMeasures(db: PrismaClient, tenantId: string): Promise<number> {
  const res = await db.protectionMeasure.updateMany({
    where: { tenantId, status: 'VIGENTE', expiresAt: { not: null, lt: new Date() } },
    data: { status: 'VENCIDA' },
  });
  return res.count;
}

/**
 * Calcula los vencimientos de un tenant: medidas vencidas/por vencer y PARD atrasados.
 */
export async function computeVencimientos(
  db: PrismaClient,
  tenantId: string,
  warningDays = MEASURE_WARNING_DAYS
): Promise<VencimientosResult> {
  const now = new Date();
  const soon = new Date(now.getTime() + warningDays * 24 * 3600 * 1000);
  const pardLimit = new Date(now.getTime() - PARD_TERM_DAYS * 24 * 3600 * 1000);

  const caseSelect = { select: { id: true, filingNumber: true, subject: true } };

  const [measuresOverdue, measuresUpcoming, pardByFollowUp, pardByTerm] = await Promise.all([
    db.protectionMeasure.findMany({
      where: { tenantId, status: 'VIGENTE', expiresAt: { not: null, lt: now } },
      include: { case: caseSelect },
      orderBy: { expiresAt: 'asc' },
    }),
    db.protectionMeasure.findMany({
      where: { tenantId, status: 'VIGENTE', expiresAt: { not: null, gte: now, lte: soon } },
      include: { case: caseSelect },
      orderBy: { expiresAt: 'asc' },
    }),
    db.restorationProcess.findMany({
      where: { tenantId, stage: { not: 'CIERRE' }, nextFollowUpAt: { not: null, lt: now } },
      include: { case: caseSelect, child: { select: { firstName: true, firstLastName: true } } },
    }),
    db.restorationProcess.findMany({
      where: { tenantId, stage: { not: 'CIERRE' }, openedAt: { lt: pardLimit } },
      include: { case: caseSelect, child: { select: { firstName: true, firstLastName: true } } },
    }),
  ]);

  // Unir PARD atrasados (por seguimiento o por término) sin duplicar
  const pardMap = new Map<string, any>();
  for (const p of [...pardByFollowUp, ...pardByTerm]) pardMap.set(p.id, p);

  return {
    measuresOverdue,
    measuresUpcoming,
    pardOverdue: Array.from(pardMap.values()),
  };
}
