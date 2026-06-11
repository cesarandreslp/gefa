/**
 * Despacho automático del paso 2 (RF‑08/12).
 *
 * Asignación ROTATIVA por profesión en el ciclo:
 *   psicología → trabajo social → jurídico → (psicología) …
 * Para asignar se recorre el ciclo empezando por la profesión SIGUIENTE a la del
 * último turno asignado (en la sede), y se toma el primer profesional LIBRE. Así:
 *  - si la profesión de turno está ocupada, pasa a la siguiente del ciclo;
 *  - el punto de partida rota en cada asignación → balancea la carga y resuelve
 *    los empates de "ocupado" descritos por el negocio (no siempre arranca en uno).
 *
 * "LIBRE" se DERIVA igual que el tablero: dentro de jornada, sin turno EN_CURSO y
 * sin indisponibilidad autorizada vigente.
 */

import { PrismaClient, ProfesionInstrumento } from '@prisma/client';
import { dentroDeJornada } from './jornada';

/** Ciclo de profesiones del equipo interdisciplinario. */
export const PROFESION_CICLO: ProfesionInstrumento[] = ['PSICOLOGIA', 'TRABAJO_SOCIAL', 'JURIDICA'];

/** Profesión siguiente en el ciclo (con wrap). */
export function siguienteProfesion(p: ProfesionInstrumento | null | undefined): ProfesionInstrumento {
  const i = p ? PROFESION_CICLO.indexOf(p) : -1;
  return PROFESION_CICLO[(i + 1) % PROFESION_CICLO.length];
}

/** Fecha local de Colombia (America/Bogotá) en formato YYYY-MM-DD. */
export function bogotaDateString(date: Date = new Date()): string {
  // en-CA produce YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export type AutoSelectResult =
  | { ok: true; profesionalUserId: string; profesion: ProfesionInstrumento; fullName: string }
  | { ok: false; reason: 'FUERA_HORARIO' | 'SIN_DISPONIBLES' };

/**
 * Selecciona automáticamente al profesional para un caso, siguiendo el ciclo
 * rotativo. `comisariaId` acota a la sede del caso (si la tiene); si es null, se
 * evalúa todo el tenant.
 */
export async function seleccionarProfesionalAuto(
  db: PrismaClient,
  opts: { tenantId: string; comisariaId?: string | null }
): Promise<AutoSelectResult> {
  const { tenantId, comisariaId } = opts;

  // Jornada laboral: fuera de ella, nadie está disponible.
  const settings = await db.systemSetting.findMany({
    where: { key: { in: ['BUSINESS_HOURS', 'ATTENTION_DAYS'] } },
    select: { key: true, value: true },
  });
  const businessHours = settings.find((s) => s.key === 'BUSINESS_HOURS')?.value as { start?: string; end?: string } | undefined;
  const attentionDays = settings.find((s) => s.key === 'ATTENTION_DAYS')?.value as string[] | undefined;
  if (!dentroDeJornada({ businessHours, attentionDays })) {
    return { ok: false, reason: 'FUERA_HORARIO' };
  }

  // Alcance por sede: los profesionales se filtran por su comisaría (User.comisariaId);
  // las atenciones, por la comisaría del caso (Atencion no tiene comisariaId propio).
  const userScope = comisariaId ? { comisariaId } : {};
  const atencionScope = comisariaId ? { case: { comisariaId } } : {};

  const profesionales = await db.user.findMany({
    where: { tenantId, isActive: true, profesion: { not: null }, ...userScope },
    select: { id: true, fullName: true, profesion: true },
    orderBy: { fullName: 'asc' },
  });
  if (profesionales.length === 0) return { ok: false, reason: 'SIN_DISPONIBLES' };

  const ids = profesionales.map((p) => p.id);
  const ahora = new Date();
  const [enCurso, indisponibles] = await Promise.all([
    db.atencion.findMany({ where: { estado: 'EN_CURSO', profesionalUserId: { in: ids } }, select: { profesionalUserId: true } }),
    db.indisponibilidad.findMany({
      where: { estado: 'AUTORIZADA', profesionalUserId: { in: ids }, desde: { lte: ahora }, hasta: { gte: ahora } },
      select: { profesionalUserId: true },
    }),
  ]);
  const ocupados = new Set(enCurso.map((a) => a.profesionalUserId));
  const noDisp = new Set(indisponibles.map((i) => i.profesionalUserId));

  // Profesionales LIBRES agrupados por profesión.
  const libresPorProfesion = new Map<ProfesionInstrumento, { id: string; fullName: string }[]>();
  for (const p of profesionales) {
    if (!p.profesion) continue;
    if (ocupados.has(p.id) || noDisp.has(p.id)) continue;
    const arr = libresPorProfesion.get(p.profesion) ?? [];
    arr.push({ id: p.id, fullName: p.fullName });
    libresPorProfesion.set(p.profesion, arr);
  }

  // Punto de partida del ciclo: la SIGUIENTE a la del último turno asignado en la sede.
  const ultimo = await db.atencion.findFirst({
    where: { tenantId, ...atencionScope },
    orderBy: { startedAt: 'desc' },
    select: { profesion: true },
  });
  const inicio = siguienteProfesion(ultimo?.profesion ?? null);
  const inicioIdx = PROFESION_CICLO.indexOf(inicio);

  // Recorrer el ciclo desde `inicio` y tomar el primer profesional libre.
  for (let step = 0; step < PROFESION_CICLO.length; step++) {
    const prof = PROFESION_CICLO[(inicioIdx + step) % PROFESION_CICLO.length];
    const libres = libresPorProfesion.get(prof);
    if (libres && libres.length) {
      const elegido = libres[0];
      return { ok: true, profesionalUserId: elegido.id, profesion: prof, fullName: elegido.fullName };
    }
  }

  return { ok: false, reason: 'SIN_DISPONIBLES' };
}

/** Próximo número de turno diario (1‑999) para la sede en la fecha dada. */
export async function siguienteNumeroTurno(
  db: PrismaClient,
  opts: { tenantId: string; comisariaId?: string | null; turnoFecha: string }
): Promise<number> {
  const { tenantId, comisariaId, turnoFecha } = opts;
  const last = await db.atencion.aggregate({
    where: { tenantId, turnoFecha, ...(comisariaId ? { case: { comisariaId } } : {}) },
    _max: { numeroTurno: true },
  });
  const next = (last._max.numeroTurno ?? 0) + 1;
  return next > 999 ? 999 : next;
}
