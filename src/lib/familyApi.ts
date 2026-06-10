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
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { getClientIp, getUserAgent } from '@/lib/validation';

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
 * Roles con acceso al VISOR DE AUDITORÍA (trazabilidad del expediente).
 * Es una herramienta de control interno: expone IPs y quién accedió a datos
 * confidenciales. Se limita a la dirección/administración, no al funcionario
 * que opera el caso.
 */
export const FAMILY_AUDIT_ROLES = ['ADMIN', 'DIRECTOR'];

/**
 * Roles con acceso a ESTADÍSTICAS / seguimiento (tableros agregados, sin PII ni
 * expedientes). Incluye a la SECRETARIA_GOBIERNO, que supervisa el desempeño de
 * las comisarías del municipio con datos meramente estadísticos. La Secretaría
 * NO está en READ/WRITE/CONFIDENTIAL: queda bloqueada de los expedientes.
 */
export const FAMILY_STATS_ROLES = ['ADMIN', 'DIRECTOR', 'SUPERVISOR', 'SECRETARIA_GOBIERNO'];

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

/** Usuario autenticado mínimo necesario para auditar. */
interface AuditUser {
  userId: string;
  email: string;
  roleCode: string;
  tenantId: string;
}

/**
 * Registra una acción del dominio de familia en el log inmutable `ActionLog`
 * de la BD DEL TENANT (aislamiento por tenant, Ley 1581/2012 + Ley 1098/2006),
 * con encadenado de checksum tipo blockchain. Best-effort: nunca lanza ni
 * interrumpe el request; si falla, solo deja traza en consola.
 */
/**
 * Calcula el checksum SHA-256 de una entrada del `ActionLog`. Fuente única de
 * verdad del encadenado: la usa tanto la escritura (`auditFamily`) como el
 * verificador de integridad del visor de auditoría, para que no diverjan.
 */
export function computeAuditChecksum(input: {
  action: string;
  userId?: string | null;
  entityType: string;
  entityId: string;
  timestamp: Date;
  previousHash: string;
}): string {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        action: input.action,
        userId: input.userId,
        entityType: input.entityType,
        entityId: input.entityId,
        timestamp: input.timestamp.toISOString(),
        previousHash: input.previousHash,
      })
    )
    .digest('hex');
}

export async function auditFamily(
  db: PrismaClient,
  request: NextRequest,
  user: AuditUser,
  action: string,
  entityType: string,
  entityId: string,
  opts: { caseId?: string; metadata?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    const last = await db.actionLog.findFirst({
      where: { tenantId: user.tenantId },
      orderBy: { timestamp: 'desc' },
      select: { checksum: true },
    });
    const previousHash = last?.checksum || 'GENESIS_BLOCK';
    const timestamp = new Date();
    const checksum = computeAuditChecksum({ action, userId: user.userId, entityType, entityId, timestamp, previousHash });

    await db.actionLog.create({
      data: {
        tenantId: user.tenantId,
        timestamp,
        userId: user.userId,
        userEmail: user.email,
        userRole: user.roleCode,
        action,
        entityType,
        entityId,
        ipAddress: getClientIp(request.headers),
        userAgent: getUserAgent(request.headers),
        metadata: (opts.metadata ?? undefined) as never,
        caseId: opts.caseId,
        checksum,
        previousHash,
        success: true,
      },
    });
  } catch (error) {
    console.error('[AUDIT FAMILY ERROR]', action, entityType, entityId, error);
  }
}
