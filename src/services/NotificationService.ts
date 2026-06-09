/**
 * NOTIFICATION SERVICE - FASE 5 MÓDULO 2
 * 
 * Servicio de gestión de notificaciones institucionales
 * 
 * Características:
 * - Creación de notificaciones en BD
 * - Procesamiento de cola con reintentos
 * - Envío por email y SMS
 * - Auditoría completa
 * - Historial consultable
 * 
 * @author GEFA — Gestión Familiar
 * @date Enero 12, 2026
 */

import { prisma } from '@/lib/prisma';
import { NotificationType, NotificationChannel, NotificationStatus } from '@prisma/client';
import { EmailService } from './EmailService';
import { SMSService } from './SMSService';
import { TemplateService } from './TemplateService';
import { AuditService } from './AuditService';

export interface CreateNotificationParams {
  recipientType: 'CITIZEN' | 'USER';
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  caseId?: string;
  type: NotificationType;
  channel: NotificationChannel;
  templateData: Record<string, unknown>;
  tenantId: string; // Aislamiento multi-tenant
}

export interface ProcessResult {
  sent: number;
  failed: number;
  skipped: number;
}

export class NotificationService {
  /**
   * Crea una notificación (NO la envía aún, queda PENDING)
   */
  static async createNotification(params: CreateNotificationParams): Promise<string> {
    try {
      // Obtener plantilla
      const template = await TemplateService.getTemplate(params.type, params.channel);

      // Renderizar subject y body
      const subject = TemplateService.render(template.subject, params.templateData);
      const body = TemplateService.render(template.html, params.templateData);

      // Crear notificación en BD
      const notification = await prisma.notification.create({
        data: {
          tenantId: params.tenantId,
          recipientType: params.recipientType,
          recipientId: params.recipientId,
          recipientEmail: params.recipientEmail,
          recipientPhone: params.recipientPhone,
          caseId: params.caseId,
          type: params.type,
          subject,
          body,
          channel: params.channel,
          status: 'PENDING',
          attempts: 0,
          maxAttempts: parseInt(process.env.NOTIFICATION_MAX_ATTEMPTS || '3'),
        },
      });

      console.log(`Notificación creada: ${notification.id} (${params.type})`);
      return notification.id;
    } catch (error) {
      console.error('Error al crear notificación:', error);
      throw error;
    }
  }

  /**
   * Procesa todas las notificaciones pendientes
   */
  static async processPendingNotifications(): Promise<ProcessResult> {
    const result: ProcessResult = {
      sent: 0,
      failed: 0,
      skipped: 0,
    };

    try {
      // Obtener notificaciones pendientes
      const pendingNotifications = await prisma.notification.findMany({
        where: {
          status: 'PENDING',
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 50, // Procesar máximo 50 por lote
      });

      console.log(`Procesando ${pendingNotifications.length} notificaciones pendientes...`);

      // Procesar cada notificación
      for (const notification of pendingNotifications) {
        const success = await this.sendNotification(notification.id);
        
        if (success) {
          result.sent++;
        } else {
          // Verificar si debe reintentar o marcar como fallida
          if (notification.attempts >= notification.maxAttempts - 1) {
            result.failed++;
          } else {
            result.skipped++;
          }
        }
      }

      console.log(`Procesamiento completado:`, result);
      return result;
    } catch (error) {
      console.error('Error al procesar notificaciones:', error);
      return result;
    }
  }

  /**
   * Envía una notificación específica
   */
  static async sendNotification(notificationId: string): Promise<boolean> {
    try {
      // Obtener notificación
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        console.error('Notificación no encontrada:', notificationId);
        return false;
      }

      // Verificar intentos
      if (notification.attempts >= notification.maxAttempts) {
        console.error('Máximo de intentos alcanzado:', notificationId);
        await this.markAsFailed(notificationId, 'Máximo de intentos alcanzado');
        return false;
      }

      // Incrementar contador de intentos
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          attempts: notification.attempts + 1,
        },
      });

      // Enviar según canal
      let success = false;

      switch (notification.channel) {
        case 'EMAIL':
          if (notification.recipientEmail) {
            success = await EmailService.sendEmail({
              to: notification.recipientEmail,
              subject: notification.subject,
              html: notification.body,
              tenantId: notification.tenantId || undefined,
            });
          }
          break;

        case 'SMS':
          if (notification.recipientPhone) {
            success = await SMSService.sendSMS({
              to: notification.recipientPhone,
              message: notification.body,
            });
          }
          break;

        default:
          console.error('Canal no soportado:', notification.channel);
          success = false;
      }

      // Actualizar estado
      if (success) {
        await this.markAsSent(notificationId);
        
        // Auditar éxito
        const auditService = new AuditService();
        await auditService.log({
          action: 'NOTIFICATION_SENT',
          userId: 'system',
          userEmail: 'system@entidadciudad.gov.co',
          userRole: 'SYSTEM',
          tenantId: notification.tenantId || '',
          entityType: 'Notification',
          entityId: notificationId,
          ipAddress: 'system',
          userAgent: 'system',
          metadata: {
            type: notification.type,
            channel: notification.channel,
            recipientType: notification.recipientType,
          },
        });
      } else {
        // Si falló, verificar si debe reintentar
        if (notification.attempts + 1 >= notification.maxAttempts) {
          await this.markAsFailed(notificationId, 'Error al enviar notificación');
          
          // Auditar fallo
          const auditService = new AuditService();
          await auditService.log({
            action: 'NOTIFICATION_FAILED',
            userId: 'system',
            userEmail: 'system@entidadciudad.gov.co',
            userRole: 'SYSTEM',
            tenantId: notification.tenantId || '',
            entityType: 'Notification',
            entityId: notificationId,
            ipAddress: 'system',
            userAgent: 'system',
            metadata: {
              type: notification.type,
              channel: notification.channel,
              attempts: notification.attempts + 1,
            },
          });
        }
      }

      return success;
    } catch (error) {
      console.error('Error al enviar notificación:', error);
      return false;
    }
  }

  /**
   * Marca notificación como enviada
   */
  private static async markAsSent(notificationId: string): Promise<void> {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  }

  /**
   * Marca notificación como fallida
   */
  private static async markAsFailed(notificationId: string, errorMessage: string): Promise<void> {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        errorMessage,
      },
    });
  }

  /**
   * Marca notificación como leída (para in-app futuro)
   */
  static async markAsRead(notificationId: string): Promise<void> {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });
  }

  /**
   * Obtiene historial de notificaciones
   */
  static async getNotificationHistory(params: {
    tenantId: string;
    caseId?: string;
    recipientId?: string;
    status?: NotificationStatus;
    type?: NotificationType;
    limit?: number;
    offset?: number;
  }) {
    const where: {
      tenantId: string;
      caseId?: string;
      recipientId?: string;
      status?: NotificationStatus;
      type?: NotificationType;
    } = { tenantId: params.tenantId };

    if (params.caseId) where.caseId = params.caseId;
    if (params.recipientId) where.recipientId = params.recipientId;
    if (params.status) where.status = params.status;
    if (params.type) where.type = params.type;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: params.limit || 50,
      skip: params.offset || 0,
      select: {
        id: true,
        type: true,
        channel: true,
        status: true,
        recipientType: true,
        recipientId: true,
        recipientEmail: true,
        recipientPhone: true,
        subject: true,
        caseId: true,
        attempts: true,
        maxAttempts: true,
        createdAt: true,
        sentAt: true,
        failedAt: true,
        errorMessage: true,
      },
    });

    return notifications;
  }

  /**
   * Obtiene estadísticas de notificaciones
   */
  static async getStatistics(params?: {
    tenantId: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const where: Record<string, unknown> = params ? {
      tenantId: params.tenantId,
      createdAt: {
        gte: params.dateFrom,
        lte: params.dateTo,
      },
    } : {};

    const [total, sent, pending, failed, byType, byChannel] = await Promise.all([
      // Total
      prisma.notification.count({ where }),
      
      // Enviadas
      prisma.notification.count({
        where: { ...where, status: 'SENT' },
      }),
      
      // Pendientes
      prisma.notification.count({
        where: { ...where, status: 'PENDING' },
      }),
      
      // Fallidas
      prisma.notification.count({
        where: { ...where, status: 'FAILED' },
      }),
      
      // Por tipo
      prisma.notification.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),
      
      // Por canal
      prisma.notification.groupBy({
        by: ['channel'],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      sent,
      pending,
      failed,
      successRate: total > 0 ? ((sent / total) * 100).toFixed(2) : '0',
      byType: byType.map(item => ({
        type: item.type,
        count: item._count,
      })),
      byChannel: byChannel.map(item => ({
        channel: item.channel,
        count: item._count,
      })),
    };
  }

  /**
   * Reenvía una notificación fallida
   */
  static async retryNotification(notificationId: string): Promise<boolean> {
    // Resetear intentos y estado
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'PENDING',
        attempts: 0,
        failedAt: null,
        errorMessage: null,
      },
    });

    // Intentar enviar
    return await this.sendNotification(notificationId);
  }
}
