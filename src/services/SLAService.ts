/**
 * SLAService - FASE 3 MÓDULO 4
 * 
 * Control formal de tiempos y SLA institucional
 * 
 * Funcionalidades:
 * - Calcular fechas límite según SLA configurado
 * - Determinar estado del SLA (ON_TIME, WARNING, OVERDUE)
 * - Actualizar estado de vencimiento
 * - Auditar cambios de SLA
 * 
 * Cumplimiento:
 * - Ley 1437/2011: Términos procesales
 * - Ley 1755/2015: Derecho de petición (15 días hábiles)
 */

import { prisma } from '@/lib/prisma';
import { SLAStatus, CaseSLAConfig } from '@prisma/client';
import { auditService } from './AuditService';
import { SystemSettingsService } from './SystemSettingsService';

export class SLAService {
  /**
   * Calcula fecha límite sumando días hábiles
   * Excluye fines de semana y festivos configurados
   * Ahora usa SystemSettings en lugar de NonBusinessDay
   */
  async calculateDueDate(startDate: Date, businessDays: number): Promise<Date> {
    const currentDate = new Date(startDate);
    let daysAdded = 0;

    while (daysAdded < businessDays) {
      currentDate.setDate(currentDate.getDate() + 1);

      // Verificar si es día hábil usando SystemSettings
      const isBusinessDay = await SystemSettingsService.isBusinessDay(currentDate);
      if (!isBusinessDay) {
        continue; // Skip non-business day
      }

      daysAdded++;
    }

    return currentDate;
  }

  /**
   * Calcula el estado del SLA basado en tiempo restante
   */
  calculateSLAStatus(dueDate: Date, referenceDate: Date = new Date()): SLAStatus {
    const currentDate = referenceDate;
    
    // Si ya venció
    if (currentDate > dueDate) {
      return 'OVERDUE';
    }

    // Calcular porcentaje de tiempo restante
    // Asumiendo término promedio de 15 días para el cálculo
    const totalTime = 15 * 24 * 60 * 60 * 1000; // 15 días en ms
    const timeLeft = dueDate.getTime() - currentDate.getTime();
    const percentLeft = (timeLeft / totalTime) * 100;

    if (percentLeft > 50) return 'ON_TIME';
    if (percentLeft > 25) return 'WARNING';
    return 'OVERDUE';
  }

  /**
   * Obtiene la configuración de SLA para un tipo de caso
   */
  async getSLAConfig(caseTypeId: string): Promise<{
    success: boolean;
    slaDays?: number;
    error?: string;
  }> {
    try {
      const config = await prisma.caseSLAConfig.findUnique({
        where: { caseTypeId },
      });

      if (!config || !config.isActive) {
        // Si no hay config, usar default del tipo de caso
        const caseType = await prisma.caseType.findUnique({
          where: { id: caseTypeId },
        });

        if (!caseType) {
          return {
            success: false,
            error: 'Tipo de caso no encontrado',
          };
        }

        return {
          success: true,
          slaDays: caseType.defaultLegalTermDays,
        };
      }

      return {
        success: true,
        slaDays: config.slaDays,
      };
    } catch (error) {
      console.error('Error obteniendo SLA config:', error);
      return {
        success: false,
        error: 'Error al obtener configuración de SLA',
      };
    }
  }

  /**
   * Calcula y actualiza el SLA de un caso al crearlo
   */
  async calculateAndSetSLA(
    caseId: string,
    caseTypeId: string,
    filedAt: Date,
    userId: string,
    userEmail: string,
    userRole: string,
    tenantId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{
    success: boolean;
    dueDate?: Date;
    slaStatus?: SLAStatus;
    error?: string;
  }> {
    try {
      // 1. Obtener configuración de SLA
      const slaConfig = await this.getSLAConfig(caseTypeId);

      if (!slaConfig.success || !slaConfig.slaDays) {
        return {
          success: false,
          error: slaConfig.error || 'No se pudo obtener SLA',
        };
      }

      // 2. Calcular fecha límite
      const dueDate = await this.calculateDueDate(filedAt, slaConfig.slaDays);

      // 3. Calcular estado del SLA
      const slaStatus = this.calculateSLAStatus(dueDate);

      // 4. Actualizar caso
      await prisma.case.update({
        where: { id: caseId },
        data: {
          legalTermDays: slaConfig.slaDays,
          dueDate,
          slaStatus,
          isOverdue: slaStatus === 'OVERDUE',
        },
      });

      // 5. Auditar
      await auditService.log({
        action: 'CASE_CREATED',
        userId,
        userEmail,
        userRole,
        tenantId,
        ipAddress,
        userAgent,
        entityType: 'CASE',
        entityId: caseId,
        metadata: {
          slaDays: slaConfig.slaDays,
          dueDate: dueDate.toISOString(),
          slaStatus,
        },
      });

      return {
        success: true,
        dueDate,
        slaStatus,
      };
    } catch (error) {
      console.error('Error calculando SLA:', error);
      return {
        success: false,
        error: 'Error al calcular SLA',
      };
    }
  }

  /**
   * Recalcula el SLA de un caso (ej: cambio de estado)
   */
  async recalculateSLA(
    caseId: string,
    userId: string,
    userEmail: string,
    userRole: string,
    tenantId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{
    success: boolean;
    dueDate?: Date;
    slaStatus?: SLAStatus;
    error?: string;
  }> {
    try {
      // 1. Obtener caso actual
      const existingCase = await prisma.case.findUnique({
        where: { id: caseId },
      });

      if (!existingCase) {
        return {
          success: false,
          error: 'Caso no encontrado',
        };
      }

      // 2. Recalcular estado del SLA con fecha límite actual
      const slaStatus = this.calculateSLAStatus(existingCase.dueDate);

      // 3. Actualizar solo si cambió
      if (slaStatus !== existingCase.slaStatus) {
        await prisma.case.update({
          where: { id: caseId },
          data: {
            slaStatus,
            isOverdue: slaStatus === 'OVERDUE',
          },
        });

        // 4. Auditar cambio de estado SLA
        if (slaStatus === 'OVERDUE' && existingCase.slaStatus !== 'OVERDUE') {
          await auditService.log({
            action: 'STATUS_CHANGED',
            userId,
            userEmail,
            userRole,
            tenantId,
            ipAddress,
            userAgent,
            entityType: 'CASE',
            entityId: caseId,
            metadata: {
              slaStatusChanged: true,
              oldStatus: existingCase.slaStatus,
              newStatus: slaStatus,
              dueDate: existingCase.dueDate.toISOString(),
            },
          });
        }
      }

      return {
        success: true,
        dueDate: existingCase.dueDate,
        slaStatus,
      };
    } catch (error) {
      console.error('Error recalculando SLA:', error);
      return {
        success: false,
        error: 'Error al recalcular SLA',
      };
    }
  }

  /**
   * Actualiza el estado de vencimiento de todos los casos activos
   * Útil para ejecutar como tarea programada
   */
  async updateAllOverdueStatus(): Promise<{
    success: boolean;
    updated: number;
    error?: string;
  }> {
    try {
      const now = new Date();

      // Actualizar casos que pasaron la fecha límite
      const result = await prisma.case.updateMany({
        where: {
          dueDate: {
            lt: now,
          },
          slaStatus: {
            not: 'OVERDUE',
          },
          state: {
            code: {
              not: 'CERRADO',
            },
          },
        },
        data: {
          slaStatus: 'OVERDUE',
          isOverdue: true,
        },
      });

      return {
        success: true,
        updated: result.count,
      };
    } catch (error) {
      console.error('Error actualizando vencimientos:', error);
      return {
        success: false,
        updated: 0,
        error: 'Error al actualizar vencimientos',
      };
    }
  }

  /**
   * Crea o actualiza configuración de SLA para un tipo de caso
   */
  async upsertSLAConfig(
    caseTypeId: string,
    slaDays: number,
    description?: string,
    userId?: string,
    userEmail?: string,
    userRole?: string,
    tenantId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    success: boolean;
    config?: CaseSLAConfig;
    error?: string;
  }> {
    try {
      // Verificar si existe para determinar acción de auditoría
      const existing = await prisma.caseSLAConfig.findUnique({
        where: { caseTypeId },
      });

      const config = await prisma.caseSLAConfig.upsert({
        where: { caseTypeId },
        create: {
          caseTypeId,
          slaDays,
          description,
          isActive: true,
        },
        update: {
          slaDays,
          description,
        },
        include: {
          caseType: true,
        },
      });

      // Auditar acción si se proporciona información del usuario
      if (userId && userEmail && userRole && ipAddress && userAgent) {
        const action = existing ? 'SLA_UPDATED' : 'SLA_CREATED';
        
        await auditService.log({
          action,
          userId,
          userEmail,
          userRole,
          tenantId: tenantId || '',
          entityType: 'CaseSLAConfig',
          entityId: config.id,
          ipAddress,
          userAgent,
          metadata: {
            caseTypeId,
            caseTypeName: config.caseType.name,
            slaDays,
          },
          before: existing ? {
            slaDays: existing.slaDays,
            description: existing.description,
          } : undefined,
          after: {
            slaDays: config.slaDays,
            description: config.description,
          },
        });
      }

      return {
        success: true,
        config,
      };
    } catch (error) {
      console.error('Error guardando config SLA:', error);
      return {
        success: false,
        error: 'Error al guardar configuración de SLA',
      };
    }
  }

  /**
   * Obtiene todas las configuraciones de SLA
   */
  async getAllSLAConfigs(): Promise<{
    success: boolean;
    configs: Array<{
      id: string;
      caseTypeId: string;
      caseTypeCode: string;
      caseTypeName: string;
      slaDays: number;
      description: string | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      caseType: {
        code: string;
        name: string;
      };
    }>;
    error?: string;
  }> {
    try {
      const configs = await prisma.caseSLAConfig.findMany({
        include: {
          caseType: {
            select: {
              code: true,
              name: true,
            },
          },
        },
        orderBy: {
          caseType: {
            displayOrder: 'asc',
          },
        },
      });

      return {
        success: true,
        configs: configs.map((c) => ({
          id: c.id,
          caseTypeId: c.caseTypeId,
          caseTypeCode: c.caseType.code,
          caseTypeName: c.caseType.name,
          slaDays: c.slaDays,
          description: c.description,
          isActive: c.isActive,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          caseType: {
            code: c.caseType.code,
            name: c.caseType.name,
          },
        })),
      };
    } catch (error) {
      console.error('Error obteniendo configs SLA:', error);
      return {
        success: false,
        configs: [],
        error: 'Error al obtener configuraciones de SLA',
      };
    }
  }
}

// Singleton
export const slaService = new SLAService();
