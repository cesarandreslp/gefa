/**
 * TEMPLATE SERVICE - FASE 5 MÓDULO 2
 * 
 * Servicio de gestión de plantillas de notificaciones
 * 
 * Características:
 * - Plantillas por defecto para cada tipo
 * - Obtención desde SystemSettings
 * - Renderizado con variables
 * - Validación de variables requeridas
 * 
 * @author GEFA — Gestión Familiar
 * @date Enero 12, 2026
 */

import { NotificationType, NotificationChannel } from '@prisma/client';

interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

/**
 * Plantillas por defecto del sistema
 */
export const DEFAULT_EMAIL_TEMPLATES: Record<NotificationType, EmailTemplate> = {
  CASE_FILED: {
    subject: 'Radicado de su solicitud - {{filingNumber}}',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .radicado { background-color: #fff; padding: 15px; margin: 20px 0; border-left: 4px solid #0066cc; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Entidad Institucional</h1>
          </div>
          <div class="content">
            <p>Estimado(a) {{citizenName}},</p>
            <p>Su solicitud ha sido radicada exitosamente con el siguiente número:</p>
            <div class="radicado">
              <h2 style="margin: 0; color: #0066cc;">{{filingNumber}}</h2>
              <p><strong>Tipo:</strong> {{caseType}}</p>
              <p><strong>Fecha de radicación:</strong> {{filedAt}}</p>
              <p><strong>Fecha límite de respuesta:</strong> {{dueDate}}</p>
            </div>
            <p>Puede consultar el estado de su solicitud en cualquier momento a través de nuestro portal web.</p>
            <p>Cordialmente,<br><strong>Entidad Institucional</strong></p>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático del sistema GEFA — Gestión Familiar</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  CASE_ASSIGNED: {
    subject: 'Caso asignado - {{filingNumber}}',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .case-info { background-color: #fff; padding: 15px; margin: 20px 0; border-left: 4px solid #ff9800; }
          .button { display: inline-block; padding: 10px 20px; background-color: #ff9800; color: white !important; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 15px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Asignación de Caso</h1>
          </div>
          <div class="content">
            <p>Estimado(a) {{userName}},</p>
            <p>Se le ha asignado el siguiente caso para su gestión:</p>
            <div class="case-info">
              <p><strong>Radicado:</strong> {{filingNumber}}</p>
              <p><strong>Ciudadano:</strong> {{citizenName}}</p>
              <p><strong>Tipo:</strong> {{caseType}}</p>
              <p><strong>Fecha límite:</strong> {{dueDate}}</p>
            </div>
            <p>Por favor, gestione este caso dentro de los plazos establecidos.</p>
            <p>Puede acceder directamente al caso haciendo clic en el siguiente botón:</p>
            <div style="text-align: center;">
              <a href="{{caseUrl}}" class="button">Ver Caso en Bandeja de Entrada</a>
            </div>
          </div>
          <div class="footer">
            <p>GEFA — Gestión Familiar - Entidad Institucional</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  CASE_STATE_CHANGED: {
    subject: 'Actualización de su solicitud - {{filingNumber}}',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .state-change { background-color: #fff; padding: 15px; margin: 20px 0; border-left: 4px solid #4caf50; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Actualización de Estado</h1>
          </div>
          <div class="content">
            <p>Estimado(a) {{citizenName}},</p>
            <p>Su solicitud <strong>{{filingNumber}}</strong> ha cambiado de estado:</p>
            <div class="state-change">
              <p><strong>Estado anterior:</strong> {{previousState}}</p>
              <p><strong>Nuevo estado:</strong> {{newState}}</p>
              {{#if stateComment}}
              <p><strong>Comentario:</strong> {{stateComment}}</p>
              {{/if}}
            </div>
            <p>Puede consultar más detalles en nuestro portal web.</p>
            <p>Cordialmente,<br><strong>Entidad Institucional</strong></p>
          </div>
          <div class="footer">
            <p>GEFA — Gestión Familiar</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  CASE_RESPONSE: {
    subject: 'Respuesta a su solicitud - {{filingNumber}}',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4caf50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .response { background-color: #fff; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Respuesta Disponible</h1>
          </div>
          <div class="content">
            <p>Estimado(a) {{citizenName}},</p>
            <p>Tenemos una respuesta disponible para su solicitud <strong>{{filingNumber}}</strong>.</p>
            <div class="response">
              <p>{{responseMessage}}</p>
            </div>
            <p>Puede descargar los documentos oficiales desde nuestro portal web.</p>
            <p>Cordialmente,<br><strong>Entidad Institucional</strong></p>
          </div>
          <div class="footer">
            <p>GEFA — Gestión Familiar</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  CASE_OVERDUE: {
    subject: '⚠️ Caso próximo a vencer - {{filingNumber}}',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .alert { background-color: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #f44336; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Alerta de Vencimiento</h1>
          </div>
          <div class="content">
            <p>Estimado(a) {{userName}},</p>
            <p>El caso <strong>{{filingNumber}}</strong> está próximo a vencer.</p>
            <div class="alert">
              <p><strong>Ciudadano:</strong> {{citizenName}}</p>
              <p><strong>Tipo:</strong> {{caseType}}</p>
              <p><strong>Fecha límite:</strong> {{dueDate}}</p>
              <p><strong>Días restantes:</strong> {{daysRemaining}}</p>
            </div>
            <p><strong>Por favor, gestione este caso con prioridad.</strong></p>
          </div>
          <div class="footer">
            <p>GEFA — Gestión Familiar - Alertas Automáticas</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  INFORMATION_REQUIRED: {
    subject: 'Solicitud de información adicional - {{filingNumber}}',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .info-required { background-color: #fff; padding: 15px; margin: 20px 0; border-left: 4px solid #ff9800; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Información Adicional Requerida</h1>
          </div>
          <div class="content">
            <p>Estimado(a) {{citizenName}},</p>
            <p>Para continuar con su solicitud <strong>{{filingNumber}}</strong>, necesitamos que proporcione la siguiente información:</p>
            <div class="info-required">
              <p>{{requiredInformation}}</p>
            </div>
            <p>Por favor, responda a la mayor brevedad posible para continuar con el trámite.</p>
            <p>Cordialmente,<br><strong>Entidad Institucional</strong></p>
          </div>
          <div class="footer">
            <p>GEFA — Gestión Familiar</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  GENERIC: {
    subject: 'Notificación - Entidad Institucional',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Entidad Institucional</h1>
          </div>
          <div class="content">
            <p>{{message}}</p>
          </div>
          <div class="footer">
            <p>GEFA — Gestión Familiar</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },
};

export class TemplateService {
  /**
   * Obtiene plantilla configurada o usa default
   */
  static async getTemplate(
    type: NotificationType,
    _channel: NotificationChannel // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<EmailTemplate> {
    try {
      // TODO: Implementar plantillas personalizadas desde SystemSettings
      // Por ahora, siempre usar plantillas por defecto

      // Retornar plantilla por defecto
      return DEFAULT_EMAIL_TEMPLATES[type] || DEFAULT_EMAIL_TEMPLATES.GENERIC;
    } catch (error) {
      console.error('Error al obtener plantilla:', error);
      return DEFAULT_EMAIL_TEMPLATES[type] || DEFAULT_EMAIL_TEMPLATES.GENERIC;
    }
  }

  /**
   * Renderiza plantilla con datos
   */
  static render(template: string, data: Record<string, unknown>): string {
    let rendered = template;

    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      rendered = rendered.replace(regex, String(value || ''));
    });

    // Manejar condicionales simples {{#if key}}...{{/if}}
    rendered = rendered.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
      return data[key] ? content : '';
    });

    return rendered;
  }

  /**
   * Valida que una plantilla tiene las variables requeridas
   */
  static validateTemplate(template: string, requiredVars: string[]): boolean {
    return requiredVars.every(varName => {
      const placeholder = `{{${varName}}}`;
      return template.includes(placeholder);
    });
  }
}
