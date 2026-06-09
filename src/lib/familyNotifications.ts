/**
 * ============================================================================
 * NOTIFICACIONES DE FAMILIA — digests de vencimientos y recordatorios
 * ============================================================================
 * Construye y envía un correo-resumen por profesional ASIGNADO a los casos con
 * medidas vencidas/por vencer, PARD atrasados o audiencias próximas (48 h).
 * Reutiliza `EmailService` y la asignación al equipo (Fase 5). Best-effort:
 * los fallos de envío no interrumpen el job.
 * ============================================================================
 */

import { PrismaClient } from '@prisma/client';
import { EmailService } from '@/services/EmailService';
import { computeVencimientos } from '@/lib/familyVencimientos';
import { PROTECTION_MEASURE_TYPE_LABELS, HEARING_TYPE_LABELS } from '@/domain/catalogs/familyLabels';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Horas de antelación para recordatorio de audiencia. */
export const HEARING_REMINDER_HOURS = 48;

interface Digest {
  email: string;
  fullName: string;
  lines: string[];
}

/**
 * Envía los digests de vencimientos/recordatorios a los profesionales asignados.
 * Devuelve el número de correos enviados.
 */
export async function sendVencimientoNotifications(db: PrismaClient, tenantId: string): Promise<number> {
  const now = new Date();
  const reminderLimit = new Date(now.getTime() + HEARING_REMINDER_HOURS * 3600 * 1000);

  const [v, hearings] = await Promise.all([
    computeVencimientos(db, tenantId),
    db.hearing.findMany({
      where: { tenantId, wasHeld: false, scheduledAt: { gte: now, lte: reminderLimit } },
      include: { case: { select: { id: true, filingNumber: true } }, presidedBy: { select: { id: true } } },
    }),
  ]);

  // Reunir caseIds involucrados
  const caseIds = new Set<string>();
  for (const m of v.measuresOverdue) caseIds.add(m.caseId);
  for (const m of v.measuresUpcoming) caseIds.add(m.caseId);
  for (const p of v.pardOverdue) caseIds.add(p.caseId);
  for (const h of hearings) caseIds.add(h.caseId);
  if (caseIds.size === 0) return 0;

  // Profesionales asignados a esos casos
  const assignments = await db.assignment.findMany({
    where: { tenantId, caseId: { in: Array.from(caseIds) }, status: { not: 'REASSIGNED' } },
    include: { user: { select: { id: true, fullName: true, email: true, isActive: true } } },
  });

  // caseId -> usuarios asignados (activos, con email)
  const usersByCase = new Map<string, Array<{ id: string; fullName: string; email: string }>>();
  for (const a of assignments) {
    if (!a.user?.isActive || !a.user.email) continue;
    const arr = usersByCase.get(a.caseId) ?? [];
    arr.push({ id: a.user.id, fullName: a.user.fullName, email: a.user.email });
    usersByCase.set(a.caseId, arr);
  }

  // Construir un digest por usuario
  const digests = new Map<string, Digest>();
  const addLine = (users: Array<{ id: string; fullName: string; email: string }> | undefined, line: string) => {
    if (!users) return;
    for (const u of users) {
      const d = digests.get(u.id) ?? { email: u.email, fullName: u.fullName, lines: [] };
      d.lines.push(line);
      digests.set(u.id, d);
    }
  };

  for (const m of v.measuresOverdue) {
    addLine(usersByCase.get(m.caseId), `⛔ Medida VENCIDA — ${PROTECTION_MEASURE_TYPE_LABELS[m.measureType] ?? m.measureType} — caso ${m.case?.filingNumber ?? ''}`);
  }
  for (const m of v.measuresUpcoming) {
    addLine(usersByCase.get(m.caseId), `⏰ Medida por vencer (${new Date(m.expiresAt).toLocaleDateString('es-CO')}) — caso ${m.case?.filingNumber ?? ''}`);
  }
  for (const p of v.pardOverdue) {
    addLine(usersByCase.get(p.caseId), `👶 PARD con término atrasado — caso ${p.case?.filingNumber ?? ''}`);
  }
  for (const h of hearings) {
    const when = new Date(h.scheduledAt).toLocaleString('es-CO');
    addLine(usersByCase.get(h.caseId), `📅 Audiencia ${HEARING_TYPE_LABELS[h.hearingType] ?? h.hearingType} — ${when} — caso ${h.case?.filingNumber ?? ''}`);
  }

  if (digests.size === 0) return 0;

  const baseUrl = await EmailService.getBaseUrlForTenant(tenantId);
  let sent = 0;
  for (const d of digests.values()) {
    const html = `
      <p>Hola ${d.fullName},</p>
      <p>Tiene asuntos de comisaría de familia que requieren su atención:</p>
      <ul>${d.lines.map((l) => `<li>${l}</li>`).join('')}</ul>
      <p><a href="${baseUrl}/admin/family">Abrir GEFA</a></p>
      <p style="color:#6b7280;font-size:12px">Mensaje automático del sistema de control de términos.</p>
    `;
    const ok = await EmailService.sendEmail({
      to: d.email,
      subject: `GEFA — ${d.lines.length} alerta(s) de su gestión`,
      html,
      replyTo: false,
      tenantId,
    });
    if (ok) sent++;
  }
  return sent;
}
