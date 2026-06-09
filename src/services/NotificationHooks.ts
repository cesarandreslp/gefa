/**
 * NOTIFICATION HOOKS - FASE 5 MÓDULO 2
 * 
 * Hooks para integración no invasiva de notificaciones en flujos existentes
 * 
 * Características:
 * - No modifican lógica de negocio existente
 * - Errores no propagan (notificaciones opcionales)
 * - Logging completo
 * - Fácil integración en endpoints
 * 
 * @author Sistema Ventanilla Única
 * @date Enero 12, 2026
 */

import { NotificationService } from './NotificationService';
import { EmailService } from './EmailService';

export class NotificationHooks {
  /**
   * Hook para caso radicado
   * Llamar después de crear un caso
   */
  static async onCaseFiled(caseData: {
    id: string;
    filingNumber: string;
    citizenId: string;
    citizenName: string;
    citizenEmail?: string;
    caseType: string;
    filedAt: Date;
    dueDate: Date;
    tenantId: string;
  }): Promise<void> {
    try {
      if (!caseData.citizenEmail) {
        console.log('No se puede notificar: email del ciudadano no disponible');
        return;
      }

      await NotificationService.createNotification({
        recipientType: 'CITIZEN',
        recipientId: caseData.citizenId,
        recipientEmail: caseData.citizenEmail,
        caseId: caseData.id,
        type: 'CASE_FILED',
        channel: 'EMAIL',
        tenantId: caseData.tenantId,
        templateData: {
          citizenName: caseData.citizenName,
          filingNumber: caseData.filingNumber,
          caseType: caseData.caseType,
          filedAt: caseData.filedAt.toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          dueDate: caseData.dueDate.toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
        },
      });

      console.log(`✉️ Notificación de radicación creada para caso ${caseData.filingNumber}`);
    } catch (error) {
      console.error('Error al crear notificación de radicación:', error);
      // NO propagar - las notificaciones son opcionales
    }
  }

  /**
   * Hook para caso asignado
   * Llamar después de asignar un caso a un funcionario
   */
  static async onCaseAssigned(assignmentData: {
    caseId: string;
    filingNumber: string;
    userId: string;
    userName: string;
    userEmail?: string;
    citizenName: string;
    caseType: string;
    dueDate: Date;
    tenantId: string;
  }): Promise<void> {
    try {
      if (!assignmentData.userEmail) {
        console.log('No se puede notificar: email del funcionario no disponible');
        return;
      }

      const baseUrl = await EmailService.getBaseUrlForTenant(assignmentData.tenantId);

      const notificationId = await NotificationService.createNotification({
        recipientType: 'USER',
        recipientId: assignmentData.userId,
        recipientEmail: assignmentData.userEmail,
        caseId: assignmentData.caseId,
        type: 'CASE_ASSIGNED',
        channel: 'EMAIL',
        tenantId: assignmentData.tenantId,
        templateData: {
          userName: assignmentData.userName,
          filingNumber: assignmentData.filingNumber,
          citizenName: assignmentData.citizenName,
          caseType: assignmentData.caseType,
          dueDate: assignmentData.dueDate.toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          caseUrl: `${baseUrl}/home/bandeja-entrada?caso=${assignmentData.caseId}`
        },
      });

      console.log(`✉️ Notificación de asignación creada para caso ${assignmentData.filingNumber}`);

      // Intentar enviar inmediatamente para no depender del cronjob
      if (notificationId) {
        await NotificationService.sendNotification(notificationId);
      }
    } catch (error) {
      console.error('Error al crear o enviar notificación de asignación:', error);
      // NO propagar
    }
  }

  /**
   * Hook para cambio de estado
   * Llamar después de cambiar el estado de un caso
   */
  static async onStateChanged(stateData: {
    caseId: string;
    filingNumber: string;
    citizenId: string;
    citizenName: string;
    citizenEmail?: string;
    previousState: string;
    newState: string;
    comment?: string;
    tenantId: string;
  }): Promise<void> {
    try {
      if (!stateData.citizenEmail) {
        console.log('No se puede notificar: email del ciudadano no disponible');
        return;
      }

      await NotificationService.createNotification({
        recipientType: 'CITIZEN',
        recipientId: stateData.citizenId,
        recipientEmail: stateData.citizenEmail,
        caseId: stateData.caseId,
        type: 'CASE_STATE_CHANGED',
        channel: 'EMAIL',
        tenantId: stateData.tenantId,
        templateData: {
          citizenName: stateData.citizenName,
          filingNumber: stateData.filingNumber,
          previousState: stateData.previousState,
          newState: stateData.newState,
          stateComment: stateData.comment || '',
        },
      });

      console.log(`✉️ Notificación de cambio de estado creada para caso ${stateData.filingNumber}`);
    } catch (error) {
      console.error('Error al crear notificación de cambio de estado:', error);
      // NO propagar
    }
  }

  /**
   * Hook para caso vencido o próximo a vencer
   * Llamar desde un cron job o proceso de monitoreo
   */
  static async onCaseOverdue(overdueData: {
    caseId: string;
    filingNumber: string;
    userId: string;
    userName: string;
    userEmail?: string;
    citizenName: string;
    caseType: string;
    dueDate: Date;
    daysRemaining: number;
    tenantId: string;
  }): Promise<void> {
    try {
      if (!overdueData.userEmail) {
        console.log('No se puede notificar: email del funcionario no disponible');
        return;
      }

      await NotificationService.createNotification({
        recipientType: 'USER',
        recipientId: overdueData.userId,
        recipientEmail: overdueData.userEmail,
        caseId: overdueData.caseId,
        type: 'CASE_OVERDUE',
        channel: 'EMAIL',
        tenantId: overdueData.tenantId,
        templateData: {
          userName: overdueData.userName,
          filingNumber: overdueData.filingNumber,
          citizenName: overdueData.citizenName,
          caseType: overdueData.caseType,
          dueDate: overdueData.dueDate.toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          daysRemaining: overdueData.daysRemaining,
        },
      });

      console.log(`⚠️ Notificación de vencimiento creada para caso ${overdueData.filingNumber}`);
    } catch (error) {
      console.error('Error al crear notificación de vencimiento:', error);
      // NO propagar
    }
  }

  /**
   * Hook para solicitud de información adicional
   * Llamar cuando se requiere información del ciudadano
   */
  static async onInformationRequired(infoData: {
    caseId: string;
    filingNumber: string;
    citizenId: string;
    citizenName: string;
    citizenEmail?: string;
    requiredInformation: string;
    tenantId: string;
  }): Promise<void> {
    try {
      if (!infoData.citizenEmail) {
        console.log('No se puede notificar: email del ciudadano no disponible');
        return;
      }

      await NotificationService.createNotification({
        recipientType: 'CITIZEN',
        recipientId: infoData.citizenId,
        recipientEmail: infoData.citizenEmail,
        caseId: infoData.caseId,
        type: 'INFORMATION_REQUIRED',
        channel: 'EMAIL',
        tenantId: infoData.tenantId,
        templateData: {
          citizenName: infoData.citizenName,
          filingNumber: infoData.filingNumber,
          requiredInformation: infoData.requiredInformation,
        },
      });

      console.log(`✉️ Notificación de información requerida creada para caso ${infoData.filingNumber}`);
    } catch (error) {
      console.error('Error al crear notificación de información requerida:', error);
      // NO propagar
    }
  }

  /**
   * Hook para nota interna agregada a un caso
   * Notifica al funcionario asignado que el Director dejó una observación
   */
  static async onInternalNote(noteData: {
    caseId: string;
    filingNumber: string;
    authorName: string;
    funcionarioId: string;
    funcionarioName: string;
    funcionarioEmail: string;
    tenantId: string;
  }): Promise<void> {
    try {
      const notificationId = await NotificationService.createNotification({
        recipientType: 'USER',
        recipientId: noteData.funcionarioId,
        recipientEmail: noteData.funcionarioEmail,
        caseId: noteData.caseId,
        type: 'GENERIC',
        channel: 'EMAIL',
        tenantId: noteData.tenantId,
        templateData: {
          message: `${noteData.authorName} ha dejado una nota interna en el caso ${noteData.filingNumber} que tienes asignado. Ingresa a tu bandeja de entrada para revisarla.`,
          userName: noteData.funcionarioName,
          filingNumber: noteData.filingNumber,
        },
      });

      if (notificationId) {
        await NotificationService.sendNotification(notificationId);
      }

      console.log(`✉️ Notificación de nota interna enviada a ${noteData.funcionarioEmail} para caso ${noteData.filingNumber}`);
    } catch (error) {
      console.error('Error al notificar nota interna:', error);
      // NO propagar
    }
  }

  /**
   * Hook genérico para notificaciones personalizadas
   */
  static async sendCustomNotification(customData: {
    recipientType: 'CITIZEN' | 'USER';
    recipientId: string;
    recipientEmail?: string;
    caseId?: string;
    message: string;
    tenantId: string;
  }): Promise<void> {
    try {
      if (!customData.recipientEmail) {
        console.log('No se puede notificar: email no disponible');
        return;
      }

      await NotificationService.createNotification({
        recipientType: customData.recipientType,
        recipientId: customData.recipientId,
        recipientEmail: customData.recipientEmail,
        caseId: customData.caseId,
        type: 'GENERIC',
        channel: 'EMAIL',
        tenantId: customData.tenantId,
        templateData: {
          message: customData.message,
        },
      });

      console.log(`✉️ Notificación personalizada creada`);
    } catch (error) {
      console.error('Error al crear notificación personalizada:', error);
      // NO propagar
    }
  }
}
