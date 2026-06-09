/**
 * ============================================================================
 * HELPERS COMPARTIDOS — APIs DE DOMINIO FAMILIAR (Fase 3, Módulo 2)
 * ============================================================================
 * Grupos de roles (RBAC) y utilidades de validación reutilizadas por todas las
 * rutas de `/api/v1/family/*`. Centralizar el control de acceso evita
 * divergencias entre endpoints sobre datos sensibles (NNA / víctimas).
 * ============================================================================
 */

import { PrismaClient } from '@prisma/client';

/**
 * Roles con acceso de LECTURA al expediente de familia (no confidencial).
 * Incluye ventanilla porque radica y consulta casos en el mostrador.
 */
export const FAMILY_READ_ROLES = [
  'ADMIN',
  'DIRECTOR',
  'ASIGNACION_DE_CASOS',
  'FUNCIONARIO',
  'VENTANILLA_UNICA',
];

/**
 * Roles que pueden CREAR/EDITAR personas y partes, y radicar.
 */
export const FAMILY_INTAKE_ROLES = [
  'ADMIN',
  'DIRECTOR',
  'FUNCIONARIO',
  'VENTANILLA_UNICA',
];

/**
 * Roles con potestad para actos con efecto jurídico: medidas de protección,
 * PARD, audiencias y sus resultados. Excluye ventanilla y auxiliar.
 */
export const FAMILY_WRITE_ROLES = ['ADMIN', 'DIRECTOR', 'FUNCIONARIO'];

/**
 * Roles autorizados a ver/registrar VALORACIONES (datos sensibles, confidenciales).
 * Hardening Ley 1581/2012 + Ley 1098/2006: solo el equipo que opera el caso.
 * NUNCA ventanilla ni auxiliar de atención.
 */
export const FAMILY_CONFIDENTIAL_ROLES = ['ADMIN', 'DIRECTOR', 'FUNCIONARIO'];

/**
 * Verifica que un caso exista y pertenezca al tenant del usuario.
 * Devuelve el caso (id) o null. Evita fuga de datos entre comisarías.
 */
export async function findCaseInTenant(
  db: PrismaClient,
  caseId: string,
  tenantId: string
): Promise<{ id: string } | null> {
  return db.case.findFirst({
    where: { id: caseId, tenantId },
    select: { id: true },
  });
}

/**
 * Valida que un valor pertenezca a un enum (objeto de Prisma). Útil para
 * rechazar inputs inválidos antes de llegar a la BD.
 */
export function isValidEnum<T extends Record<string, string>>(
  enumObj: T,
  value: unknown
): value is T[keyof T] {
  return typeof value === 'string' && Object.values(enumObj).includes(value);
}
