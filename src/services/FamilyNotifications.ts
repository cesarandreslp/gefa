/**
 * FamilyNotifications — enganche de notificaciones al dominio de comisaría de familia.
 * ---------------------------------------------------------------------------
 * Encola Y envía de inmediato (no depende del cron) notificaciones al ciudadano
 * radicante cuando ocurren actos con relevancia para el debido proceso:
 *   - Radicación del caso (confirmación + término legal).
 *   - Cambio de estado del caso (mantener informada a la parte — Ley 1437/2011,
 *     Ley 2126/2021).
 *   - Citación / programación de audiencia (Ley 575/2000, Ley 1098/2006).
 *   - Adopción de medida de protección (Ley 294/1996, Ley 1257/2008).
 *
 * No invasivo: cualquier error se registra y se traga (las notificaciones no deben
 * tumbar el acto procesal). Reusa NotificationService/TemplateService/EmailService.
 *
 * NOTA (deuda conocida): NotificationService usa el prisma GLOBAL. En el demo (BD
 * única) coincide con los datos del tenant; para tenants con BD dedicada (Fase 2)
 * habrá que hacer el almacenamiento de notificaciones tenant-aware.
 * ---------------------------------------------------------------------------
 */
import type { PrismaClient } from '@prisma/client';
import { NotificationService } from './NotificationService';

type Db = PrismaClient;

async function deliver(params: Parameters<typeof NotificationService.createNotification>[0]): Promise<void> {
  const id = await NotificationService.createNotification(params);
  if (id) await NotificationService.sendNotification(id);
}

async function citizenOf(db: Db, caseId: string) {
  const c = await db.case.findUnique({
    where: { id: caseId },
    select: {
      filingNumber: true,
      citizenId: true,
      citizen: { select: { firstName: true, firstLastName: true, email: true } },
    },
  });
  if (!c?.citizen?.email) return null;
  return {
    filingNumber: c.filingNumber,
    citizenId: c.citizenId,
    email: c.citizen.email,
    name: `${c.citizen.firstName} ${c.citizen.firstLastName}`.trim(),
  };
}

/** Confirmación de radicación al ciudadano. */
export async function notifyCaseFiled(db: Db, tenantId: string, caseId: string, caseTypeName: string, filedAt: Date, dueDate: Date | null): Promise<void> {
  try {
    const r = await citizenOf(db, caseId);
    if (!r) return;
    const fmt = (d: Date) => d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    await deliver({
      recipientType: 'CITIZEN', recipientId: r.citizenId, recipientEmail: r.email, caseId,
      type: 'CASE_FILED', channel: 'EMAIL', tenantId,
      templateData: {
        citizenName: r.name, filingNumber: r.filingNumber, caseType: caseTypeName,
        filedAt: fmt(filedAt), dueDate: dueDate ? fmt(dueDate) : 'según el término legal aplicable',
      },
    });
  } catch (e) { console.error('notifyCaseFiled:', e); }
}

/** Cambio de estado del caso → avisar al ciudadano. */
export async function notifyCaseStateChanged(db: Db, tenantId: string, caseId: string, previousState: string, newState: string, comment?: string): Promise<void> {
  try {
    const r = await citizenOf(db, caseId);
    if (!r) return;
    await deliver({
      recipientType: 'CITIZEN', recipientId: r.citizenId, recipientEmail: r.email, caseId,
      type: 'CASE_STATE_CHANGED', channel: 'EMAIL', tenantId,
      templateData: {
        citizenName: r.name, filingNumber: r.filingNumber,
        previousState, newState, stateComment: comment || '',
      },
    });
  } catch (e) { console.error('notifyCaseStateChanged:', e); }
}

/** Citación a audiencia (programación). */
export async function notifyHearingScheduled(db: Db, tenantId: string, caseId: string, hearingTypeLabel: string, scheduledAt: Date, location?: string | null): Promise<void> {
  try {
    const r = await citizenOf(db, caseId);
    if (!r) return;
    const cuando = scheduledAt.toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' });
    await deliver({
      recipientType: 'CITIZEN', recipientId: r.citizenId, recipientEmail: r.email, caseId,
      type: 'GENERIC', channel: 'EMAIL', tenantId,
      templateData: {
        message: `Le informamos que dentro del caso ${r.filingNumber} se ha programado una audiencia de ${hearingTypeLabel} para el ${cuando}${location ? `, en ${location}` : ''}. Su comparecencia es importante para el trámite. Esta citación se realiza conforme a la Ley 575 de 2000 y la Ley 1098 de 2006.`,
      },
    });
  } catch (e) { console.error('notifyHearingScheduled:', e); }
}

/** Adopción de medida de protección → avisar al ciudadano. */
export async function notifyMeasureIssued(db: Db, tenantId: string, caseId: string, measureLabel: string): Promise<void> {
  try {
    const r = await citizenOf(db, caseId);
    if (!r) return;
    await deliver({
      recipientType: 'CITIZEN', recipientId: r.citizenId, recipientEmail: r.email, caseId,
      type: 'GENERIC', channel: 'EMAIL', tenantId,
      templateData: {
        message: `Dentro del caso ${r.filingNumber}, la Comisaría de Familia ha adoptado una medida de protección: ${measureLabel}. Esta decisión se profiere en el marco de la Ley 294 de 1996, la Ley 575 de 2000 y la Ley 1257 de 2008. Puede consultar el detalle y las condiciones de la medida en la Comisaría.`,
      },
    });
  } catch (e) { console.error('notifyMeasureIssued:', e); }
}
