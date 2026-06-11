/**
 * Jornada laboral y disponibilidad por horario (RF‑16/17).
 * La disponibilidad se DERIVA: fuera de la jornada (día no hábil, fuera de
 * horario o durante el almuerzo) el profesional no está disponible. La jornada
 * sale de la configuración (`BUSINESS_HOURS`, `ATTENTION_DAYS`); el almuerzo usa
 * un valor por defecto de 2 h (configurable en una iteración posterior).
 */

const BH_DEFAULT = { start: '07:30', end: '17:00' };
const DAYS_DEFAULT = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const LUNCH_DEFAULT = { start: '12:00', end: '14:00' }; // 2 h de almuerzo

function toMin(hhmm: string): number {
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Hora local de Colombia (America/Bogota) como día de semana + minutos del día. */
export function bogotaNow(date: Date = new Date()): { day: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit',
  }).formatToParts(date);
  const wd = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const map: Record<string, string> = { Sun: 'SUN', Mon: 'MON', Tue: 'TUE', Wed: 'WED', Thu: 'THU', Fri: 'FRI', Sat: 'SAT' };
  return { day: map[wd] ?? 'MON', minutes: hour * 60 + minute };
}

export interface JornadaConfig {
  businessHours?: { start?: string; end?: string } | null;
  attentionDays?: string[] | null;
  lunch?: { start?: string; end?: string } | null;
}

/** ¿Estamos dentro de la jornada laboral (día hábil, en horario y fuera del almuerzo)? */
export function dentroDeJornada(cfg: JornadaConfig = {}, now = bogotaNow()): boolean {
  const bh = cfg.businessHours ?? BH_DEFAULT;
  const days = cfg.attentionDays && cfg.attentionDays.length ? cfg.attentionDays : DAYS_DEFAULT;
  const lunch = cfg.lunch ?? LUNCH_DEFAULT;

  if (!days.includes(now.day)) return false;
  const start = toMin(bh.start || BH_DEFAULT.start);
  const end = toMin(bh.end || BH_DEFAULT.end);
  if (now.minutes < start || now.minutes >= end) return false;

  const ls = toMin(lunch.start || LUNCH_DEFAULT.start);
  const le = toMin(lunch.end || LUNCH_DEFAULT.end);
  if (now.minutes >= ls && now.minutes < le) return false; // almuerzo

  return true;
}
