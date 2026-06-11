/**
 * AuditService - FASE 2: Auditoría persistente en base de datos
 * 
 * Registra todas las acciones de usuarios autenticados y ciudadanos
 * Cumplimiento: Ley 1712/2014 (Transparencia y Acceso a la Información)
 * 
 * Funcionalidades:
 * - Registro inmutable de acciones (LOGIN, CASE_CREATED, STATUS_CHANGED, etc.)
 * - Trazabilidad completa de operaciones
 * - Metadata flexible para contexto adicional
 * - Consulta de logs por entidad y usuario
 * 
 * Nota: Usa el modelo ActionLog del schema de Prisma
 */

import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CASE_CREATED'
  | 'CASE_VIEWED'
  | 'STATUS_CHANGED'
  | 'COMMENT_ADDED'
  | 'INTERNAL_NOTE'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_VIEWED'
  | 'DOCUMENT_DELETED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DEACTIVATED'
  | 'USER_ACTIVATED'
  | 'USER_SIGNATURE_UPLOADED'
  | 'CITIZEN_REQUEST'
  | 'CITIZEN_CONTACT'
  | 'ASSIGNED'
  | 'REASSIGNED'
  | 'SLA_CREATED'
  | 'SLA_UPDATED'
  | 'SUPERVISION_VIEWED'
  | 'SUPERVISION_EXPORTED'
  | 'METRICS_VIEWED'
  | 'REPORT_GENERATED'
  | 'REPORT_DOWNLOADED'
  | 'SETTING_CREATED'
  | 'SETTING_UPDATED'
  | 'NOTIFICATION_SENT'
  | 'NOTIFICATION_FAILED'
  | 'NOTIFICATION_DELIVERED'
  | 'TENANT_CREATED'
  | 'TENANT_UPDATED'
  | 'TENANT_DEACTIVATED'
  | 'TENANT_ACTIVATED'
  | 'ADMIN_CREATED'
  | 'ADMIN_UPDATED'
  | 'ADMIN_PASSWORD_RESET'
  | 'COMISARIA_CREATED'
  | 'COMISARIA_UPDATED'
  | 'COMISARIA_DEACTIVATED'
  | 'SOLICITUD_RESPONDIDA'
  | 'SOLICITUD_RECHAZADA';

export interface AuditLogInput {
  action: AuditAction;
  userId: string | null;
  userEmail: string;
  userRole: string;
  entityType: string; // Case, Document, User, etc.
  entityId: string;
  tenantId: string | null; // null for SUPER_ADMIN users
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  caseId?: string;
}

export class AuditService {
  /**
   * Genera un checksum para verificar la integridad del log
   */
  private generateChecksum(data: unknown): string {
    const content = JSON.stringify(data);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Registra una acción en el log de auditoría
   * Los logs son inmutables (no se pueden editar ni borrar)
   */
  async log(input: AuditLogInput) {
    try {
      // Normalise tenantId: empty string → null (avoids FK constraint violation for SUPER_ADMIN)
      const tenantId = input.tenantId || null;

      // 1. Obtener el hash del log inmediatamente anterior DEL MISMO TENANT
      const lastLog = await prisma.actionLog.findFirst({
        where: { tenantId },
        orderBy: { timestamp: 'desc' },
      });
      const previousHash = lastLog?.checksum || 'GENESIS_BLOCK';

      // 2. Establecer Timestamp explícito en UTC
      const utcTimestamp = new Date(); // Date object represents UTC implicitly. ISO string converts it globally to UTC.

      // Preparar datos para el checksum incrustando el eslabón anterior
      const checksumData = {
        action: input.action,
        userId: input.userId,
        entityType: input.entityType,
        entityId: input.entityId,
        timestamp: utcTimestamp.toISOString(),
        previousHash,
      };

      const checksum = this.generateChecksum(checksumData);

      const actionLog = await prisma.actionLog.create({
        data: {
          tenantId,
          timestamp: utcTimestamp,
          action: input.action,
          userId: (input.userId ?? undefined) as string,
          userEmail: input.userEmail,
          userRole: input.userRole,
          entityType: input.entityType,
          entityId: input.entityId,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          metadata: input.metadata as never,
          before: input.before as never,
          after: input.after as never,
          caseId: input.caseId,
          checksum,
          previousHash,
          success: true,
        },
      });

      return {
        success: true,
        logId: actionLog.id,
      };
    } catch (error) {
      console.error('[AUDIT ERROR]', error);
      // En caso de error, también logeamos a consola como fallback
      console.log('[AUDIT FALLBACK]', {
        timestamp: new Date().toISOString(),
        ...input,
      });

      return {
        success: false,
        error: 'Failed to create audit log',
      };
    }
  }

  /**
   * Obtiene logs de auditoría para una entidad específica
   */
  async getLogsForEntity(tenantId: string, entityType: string, entityId: string) {
    try {
      const logs = await prisma.actionLog.findMany({
        where: {
          tenantId,
          entityType,
          entityId,
        },
        orderBy: {
          timestamp: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              
            },
          },
        },
      });

      return {
        success: true,
        logs,
      };
    } catch (error) {
      console.error('[AUDIT QUERY ERROR]', error);
      return {
        success: false,
        error: 'Failed to retrieve audit logs',
        logs: [],
      };
    }
  }

  /**
   * Obtiene logs de auditoría por usuario
   */
  async getLogsForUser(tenantId: string, userId: string, limit = 50) {
    try {
      const logs = await prisma.actionLog.findMany({
        where: {
          tenantId,
          userId,
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: limit,
      });

      return {
        success: true,
        logs,
      };
    } catch (error) {
      console.error('[AUDIT QUERY ERROR]', error);
      return {
        success: false,
        error: 'Failed to retrieve user audit logs',
        logs: [],
      };
    }
  }

  /**
   * Helper: Log de login exitoso
   */
  async logLogin(
    userId: string,
    userEmail: string,
    userRole: string,
    tenantId: string | null,
    ipAddress: string,
    userAgent: string
  ) {
    return this.log({
      action: 'LOGIN',
      userId,
      userEmail,
      userRole,
      tenantId,
      entityType: 'User',
      entityId: userId,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Helper: Log de logout
   */
  async logLogout(
    userId: string,
    userEmail: string,
    userRole: string,
    tenantId: string,
    ipAddress: string,
    userAgent: string
  ) {
    return this.log({
      action: 'LOGOUT',
      userId,
      userEmail,
      userRole,
      tenantId,
      entityType: 'User',
      entityId: userId,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Helper: Log de creación de caso
   */
  async logCaseCreated(
    caseId: string,
    userId: string,
    userEmail: string,
    userRole: string,
    tenantId: string,
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, unknown>
  ) {
    return this.log({
      action: 'CASE_CREATED',
      userId,
      userEmail,
      userRole,
      tenantId,
      entityType: 'Case',
      entityId: caseId,
      ipAddress,
      userAgent,
      caseId,
      metadata,
    });
  }

  /**
   * Helper: Log de cambio de estado
   */
  async logStatusChanged(
    caseId: string,
    userId: string,
    userEmail: string,
    userRole: string,
    tenantId: string,
    ipAddress: string,
    userAgent: string,
    oldStatus: string,
    newStatus: string
  ) {
    return this.log({
      action: 'STATUS_CHANGED',
      userId,
      userEmail,
      userRole,
      tenantId,
      entityType: 'Case',
      entityId: caseId,
      ipAddress,
      userAgent,
      caseId,
      before: { status: oldStatus },
      after: { status: newStatus },
    });
  }

  /**
   * Helper: Log de subida de documento
   */
  async logDocumentUploaded(
    documentId: string,
    userId: string | null,
    userEmail: string,
    userRole: string,
    tenantId: string,
    caseId: string,
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, unknown>
  ) {
    return this.log({
      action: 'DOCUMENT_UPLOADED',
      userId,
      userEmail,
      userRole,
      tenantId,
      entityType: 'Document',
      entityId: documentId,
      ipAddress,
      userAgent,
      caseId,
      metadata,
    });
  }

  /**
   * Helper: Log de acción ciudadana (sin autenticación)
   * Para compatibilidad con FASE 1 - usa un usuario "sistema"
   */
  async logCitizenAction(
    action: AuditAction,
    entityType: string,
    entityId: string,
    citizenName: string,
    tenantId: string,
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, unknown>
  ) {
    // Para acciones ciudadanas, usamos un usuario "system" ficticio
    // En producción, deberías crear un usuario de sistema en la BD
    // FK constraint requires a real userId — look up the tenant's admin
    const adminUser = await prisma.user.findFirst({
      where: { tenantId, isActive: true, role: { code: 'ADMIN' } },
      select: { id: true },
    });
    if (!adminUser) return { success: false, error: 'No admin found for tenant' };

    return this.log({
      action,
      userId: adminUser.id,
      userEmail: 'ciudadano@externo',
      userRole: 'CITIZEN',
      tenantId,
      entityType,
      entityId,
      ipAddress,
      userAgent,
      metadata: {
        ...metadata,
        citizenName,
      },
    });
  }

  /**
   * Helper: Log de Tenant Creado
   */
  async logTenantCreated(
    tenantId: string,
    userId: string,
    userEmail: string,
    userRole: string,
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, unknown>
  ) {
    return this.log({
      action: 'TENANT_CREATED',
      userId,
      userEmail,
      userRole,
      tenantId,
      entityType: 'Tenant',
      entityId: tenantId,
      ipAddress,
      userAgent,
      metadata,
    });
  }

  /**
   * Helper: Log de Tenant Actualizado (Estandarizado)
   */
  async logTenantUpdated(
    tenantId: string,
    userId: string,
    userEmail: string,
    userRole: string,
    ipAddress: string,
    userAgent: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ) {
    const changedFields = Object.keys(after).filter(key => before[key] !== after[key]);
    
    return this.log({
      action: 'TENANT_UPDATED',
      userId,
      userEmail,
      userRole,
      tenantId,
      entityType: 'Tenant',
      entityId: tenantId,
      ipAddress,
      userAgent,
      before,
      after,
      metadata: {
        ...metadata,
        actorEmail: userEmail,
        actorRole: userRole,
        changedFields
      },
    });
  }

  /**
   * Helper: Cambio de estado de Tenant (Activación/Desactivación)
   */
  async logTenantStateChange(
    tenantId: string,
    userId: string,
    userEmail: string,
    userRole: string,
    ipAddress: string,
    userAgent: string,
    isActivating: boolean
  ) {
    return this.log({
      action: isActivating ? 'TENANT_ACTIVATED' : 'TENANT_DEACTIVATED',
      userId,
      userEmail,
      userRole,
      tenantId,
      entityType: 'Tenant',
      entityId: tenantId,
      ipAddress,
      userAgent,
      metadata: {
        actorEmail: userEmail,
        actorRole: userRole,
      }
    });
  }

  /**
   * Helper: Admin inicial de Tenant creado
   */
  async logAdminCreated(
    adminId: string,
    adminEmail: string,
    tenantId: string,
    userId: string,
    userEmail: string,
    userRole: string,
    ipAddress: string,
    userAgent: string
  ) {
    return this.log({
      action: 'ADMIN_CREATED',
      userId,
      userEmail,
      userRole,
      tenantId,
      entityType: 'User',
      entityId: adminId,
      ipAddress,
      userAgent,
      caseId: tenantId, // Guardamos referencia cruzada
      metadata: {
        actorEmail: userEmail,
        actorRole: userRole,
        targetEmail: adminEmail
      }
    });
  }
}

// Singleton
export const auditService = new AuditService();
