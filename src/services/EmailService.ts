/**
 * EMAIL SERVICE - FASE 5 MÓDULO 2
 *
 * Servicio de envío de correos electrónicos institucionales
 *
 * Características:
 * - Envío vía SMTP (nodemailer)
 * - Renderizado de plantillas
 * - Validación de configuración
 * - Manejo de errores
 *
 * @author GEFA — Gestión Familiar
 * @date Enero 12, 2026
 */

import nodemailer from "nodemailer";
import { SystemSettingsService } from "./SystemSettingsService";
import { prisma } from "@/lib/prisma";
import type Mail from "nodemailer/lib/mailer";

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export class EmailService {
  /**
   * Obtiene la URL base del sistema de forma dinámica
   * Prioriza: NEXT_PUBLIC_APP_URL > NEXT_PUBLIC_API_URL > localhost
   */
  static getBaseUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  }

  static async getBaseUrlForTenant(tenantId?: string): Promise<string> {
    let baseUrl = this.getBaseUrl();
    if (tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { domain: true },
      });
      if (tenant?.domain) {
        const protocol = baseUrl.startsWith('https') ? 'https' : 'http';
        baseUrl = `${protocol}://${tenant.domain}`;
      }
    }
    return baseUrl;
  }

  /**
   * Obtiene config SMTP del tenant; si no tiene, usa el .env global como fallback
   */
  static async getSmtpConfig(_tenantId?: string): Promise<SmtpConfig> {
    // Todos los tenants usan el SMTP global (Resend). La configuración por tenant
    // estará disponible cuando cada entidad tenga su propio dominio verificado.
    return {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
      fromName: process.env.SMTP_FROM_NAME || process.env.NOREPLY_FROM_NAME || "GEFA — Gestión Familiar",
      fromEmail: process.env.SMTP_FROM || process.env.SMTP_FROM_EMAIL || process.env.NOREPLY_FROM_EMAIL || process.env.SMTP_USER || "",
    };
  }

  /**
   * Crea transporter SMTP configurado
   */
  private static createTransporter(config?: SmtpConfig) {
    const smtp = config || {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    };
    return nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass },
    });
  }

  /**
   * Envía un email
   */
  static async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    replyTo?: string | false;
    fromEmail?: string;
    fromName?: string;
    tenantId?: string;
  }): Promise<boolean> {
    try {
      const smtpConfig = await this.getSmtpConfig(params.tenantId);

      if (!smtpConfig.user || !smtpConfig.pass) {
        console.error("❌ SMTP sin credenciales. tenantId:", params.tenantId || "global", "user:", smtpConfig.user || "(vacío)");
        return false;
      }

      console.log("🔧 SMTP config:", { host: smtpConfig.host, port: smtpConfig.port, user: smtpConfig.user });
      const transporter = this.createTransporter(smtpConfig);
      console.log("🔍 Verificando conexión SMTP...");
      await transporter.verify();
      console.log("✅ Conexión SMTP verificada");

      const fromName = params.fromName || smtpConfig.fromName ||
        (await SystemSettingsService.getSetting("NOTIFICATION_FROM_NAME"));
      const fromEmail = params.fromEmail || smtpConfig.fromEmail || smtpConfig.user;

      console.log("📧 Enviando email...");
      console.log("From:", `"${fromName}" <${fromEmail}>`);
      console.log("To:", params.to);
      console.log("Subject:", params.subject);

      const mailOptions: Mail.Options = {
        from: `"${fromName}" <${fromEmail}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text || params.html.replace(/<[^>]*>/g, ""), // Strip HTML para texto plano
      };

      // Si replyTo es false, configurar para que no se pueda responder
      if (params.replyTo === false) {
        mailOptions.replyTo = "noreply@entidad-ciudad.gov.co";
        console.log("🚫 Reply-To configurado como no-reply");
      } else if (params.replyTo) {
        mailOptions.replyTo = params.replyTo;
        console.log("↩️ Reply-To personalizado:", params.replyTo);
      }

      const info = await transporter.sendMail(mailOptions);

      console.log(`✅ Email enviado exitosamente a ${params.to}`);
      console.log("Message ID:", info.messageId);
      console.log("Response:", info.response);
      return true;
    } catch (error) {
      console.error("❌ Error al enviar email:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      return false;
    }
  }

  /**
   * Renderiza una plantilla con datos
   */
  static renderTemplate(
    template: string,
    data: Record<string, unknown>,
  ): string {
    let rendered = template;

    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const regex = new RegExp(
        placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "g",
      );
      rendered = rendered.replace(regex, String(value || ""));
    });

    return rendered;
  }

  /**
   * Valida la configuración SMTP
   */
  static async validateConfiguration(): Promise<boolean> {
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return false;
      }

      const transporter = this.createTransporter();
      await transporter.verify();
      return true;
    } catch (error) {
      console.error("Error al validar configuración SMTP:", error);
      return false;
    }
  }

  /**
   * Envía email de confirmación al ciudadano cuando presenta su solicitud
   */
  static async sendCitizenConfirmationEmail(
    tenantName: string,
    citizenEmail: string,
    citizenName: string,
    filingNumber: string,
    tenantId?: string,
  ): Promise<boolean> {
    const baseUrl = await this.getBaseUrlForTenant(tenantId);
    const subject = `Confirmación de radicado - Solicitud ${filingNumber}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #003366; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
          .radicado-box { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px; 
            margin: 20px 0; 
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .radicado-number {
            font-size: 28px;
            font-weight: bold;
            letter-spacing: 2px;
            margin: 10px 0;
          }
          .info-box { 
            background-color: white; 
            padding: 15px; 
            margin: 15px 0; 
            border-left: 4px solid #10b981; 
            border-radius: 4px;
          }
          .warning { 
            background-color: #fef3c7; 
            padding: 15px; 
            border-left: 4px solid #f59e0b; 
            margin: 20px 0; 
            font-size: 13px;
            border-radius: 4px;
          }
          .footer { 
            margin-top: 20px; 
            padding: 15px; 
            background-color: #f0f0f0; 
            font-size: 12px; 
            border-top: 2px solid #003366;
            border-radius: 0 0 5px 5px;
            text-align: center;
          }
          .checkmark {
            font-size: 48px;
            color: #10b981;
            text-align: center;
            margin: 10px 0;
          }
          strong { color: #003366; }
          @media only screen and (max-width: 600px) {
            .container { padding: 10px; }
            .radicado-number { font-size: 22px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">✓ Solicitud Recibida</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px;">${tenantName}</p>
          </div>
          
          <div class="content">
            <div class="checkmark">✓</div>
            
            <p>Estimado/a <strong>${citizenName}</strong>,</p>
            
            <p>Le confirmamos que su solicitud ha sido <strong>recibida exitosamente</strong> y se encuentra en proceso de revisión.</p>
            
            <div class="radicado-box">
              <p style="margin: 0; font-size: 14px; opacity: 0.9;">Su número de radicado es:</p>
              <div class="radicado-number">${filingNumber}</div>
              <p style="margin: 10px 0 0 0; font-size: 13px; opacity: 0.9;">Guarde este número para consultar el estado de su solicitud</p>
            </div>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #10b981; font-size: 16px;">📋 ¿Cómo consultar el estado?</h3>
              <p style="margin: 10px 0;">Para consultar el estado de su solicitud, haga clic en el siguiente enlace:</p>
              <div style="text-align: center; margin: 15px 0;">
                <a href="${baseUrl}/atencion-ciudadano/consultar?radicado=${filingNumber}" 
                   style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
                  👉 Consultar Estado de mi Solicitud
                </a>
              </div>
              <p style="margin: 8px 0; font-size: 12px; color: #666; text-align: center;">
                <a href="${baseUrl}/atencion-ciudadano/consultar?radicado=${filingNumber}" style="color: #003366;">${baseUrl}/atencion-ciudadano/consultar?radicado=${filingNumber}</a>
              </p>
              <p style="margin: 10px 0;">Al ingresar, digite su número de radicado: <strong>${filingNumber}</strong></p>
            </div>
            
            <div class="warning">
              <strong>⚠️ MENSAJE AUTOMÁTICO - NO RESPONDER</strong><br>
              Este es un correo electrónico automático generado por el sistema. 
              Por favor, <strong>NO responda a este mensaje</strong>. 
              Para cualquier consulta adicional, utilice los canales oficiales de atención al ciudadano.
            </div>
            
            <p style="margin-top: 20px; font-size: 13px; color: #666;">
              Recibirá notificaciones sobre el progreso de su solicitud a través de este correo electrónico.
            </p>
          </div>
          
          <div class="footer">
            <p style="margin: 5px 0;"><strong>${tenantName}</strong></p>
            <p style="margin: 5px 0; font-size: 11px;">GEFA — Gestión Familiar</p>
            <p style="margin: 5px 0; font-size: 11px; color: #666;">
              Este mensaje fue enviado automáticamente. Por favor no responda a este correo.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.sendEmail({
        to: citizenEmail,
        subject,
        html,
        replyTo: false,
        tenantId,
      });
      console.log(
        `📧 ✅ Email de confirmación enviado exitosamente a ${citizenEmail}`,
      );
      return true;
    } catch (error) {
      console.error(
        `📧 ❌ Error enviando email de confirmación a ${citizenEmail}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Envía email de notificación a ciudadano cuando su caso es reasignado
   */
  static async sendCitizenReassignmentEmail(
    tenantName: string,
    citizenEmail: string,
    citizenName: string,
    filingNumber: string,
    newOfficialName: string,
    tenantId?: string,
  ): Promise<boolean> {
    const baseUrl = await this.getBaseUrlForTenant(tenantId);
    const subject = `Su solicitud ha sido reasignada - Radicado N° ${filingNumber}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            border: 1px solid #ddd; 
            border-radius: 5px; 
            background-color: #f9f9f9;
          }
          .header { 
            background-color: #003366; 
            color: white; 
            padding: 20px; 
            border-radius: 5px 5px 0 0; 
            text-align: center; 
          }
          .content { padding: 20px; background-color: white; }
          .radicado-box { 
            background-color: #f0f7ff; 
            border-left: 4px solid #003366; 
            padding: 15px; 
            margin: 20px 0; 
            border-radius: 0 4px 4px 0;
            text-align: center;
          }
          .radicado-number {
            font-size: 28px;
            font-weight: bold;
            color: #003366;
            letter-spacing: 2px;
            margin: 10px 0;
            font-family: monospace;
          }
          .info-box { 
            background-color: white; 
            padding: 15px; 
            margin: 15px 0; 
            border-left: 4px solid #10b981; 
            border-radius: 4px;
          }
          .warning { 
            background-color: #fef3c7; 
            padding: 15px; 
            border-left: 4px solid #f59e0b; 
            margin: 20px 0; 
            font-size: 13px;
            border-radius: 4px;
          }
          .footer { 
            margin-top: 20px; 
            padding: 15px; 
            background-color: #f0f0f0; 
            font-size: 12px; 
            border-top: 2px solid #003366;
            border-radius: 0 0 5px 5px;
            text-align: center;
          }
          .update-icon {
            font-size: 48px;
            color: #3b82f6;
            text-align: center;
            margin: 10px 0;
          }
          strong { color: #003366; }
          @media only screen and (max-width: 600px) {
            .container { padding: 10px; }
            .radicado-number { font-size: 22px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">🔄 Actualización de Solicitud</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px;">${tenantName}</p>
          </div>
          
          <div class="content">
            <div class="update-icon">🔄</div>
            
            <p>Estimado/a <strong>${citizenName}</strong>,</p>
            
            <p>Le informamos que su solicitud con radicado <strong>${filingNumber}</strong> ha sido <strong>reasignada</strong> para continuar con su trámite correspondiente.</p>
            
            <div class="radicado-box">
              <p style="margin: 0; font-size: 14px; opacity: 0.9;">Nuevo Funcionario Asignado:</p>
              <div class="radicado-number" style="font-size: 20px;">${newOfficialName}</div>
            </div>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #10b981; font-size: 16px;">📋 ¿Cómo consultar el estado?</h3>
              <p style="margin: 10px 0;">Para consultar el estado actualizado de su solicitud o si se le requiere información adicional, haga clic en el siguiente enlace:</p>
              <div style="text-align: center; margin: 15px 0;">
                <a href="${baseUrl}/atencion-ciudadano/consultar?radicado=${filingNumber}" 
                   style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
                  👉 Consultar Estado de mi Solicitud
                </a>
              </div>
              <p style="margin: 8px 0; font-size: 12px; color: #666; text-align: center;">
                <a href="${baseUrl}/atencion-ciudadano/consultar?radicado=${filingNumber}" style="color: #003366;">${baseUrl}/atencion-ciudadano/consultar?radicado=${filingNumber}</a>
              </p>
            </div>
            
            <div class="warning">
              <strong>⚠️ MENSAJE AUTOMÁTICO - NO RESPONDER</strong><br>
              Este es un correo electrónico automático generado por el sistema. 
              Por favor, <strong>NO responda a este mensaje</strong>. 
            </div>
          </div>
          
          <div class="footer">
            <p style="margin: 5px 0;"><strong>${tenantName}</strong></p>
            <p style="margin: 5px 0; font-size: 11px;">GEFA — Gestión Familiar</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.sendEmail({
        to: citizenEmail,
        subject,
        html,
        replyTo: false,
        fromName: process.env.NOREPLY_FROM_NAME || "GEFA — Gestión Familiar",
        fromEmail:
          process.env.NOREPLY_FROM_EMAIL || "noreply@ventanillaunica.gov.co",
      });
      console.log(
        `📧 ✅ Email de reasignación enviado exitosamente a ${citizenEmail}`,
      );
      return true;
    } catch (error) {
      console.error(
        `📧 ❌ Error enviando email de reasignación a ${citizenEmail}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Envía email de respuesta a ciudadano cuando un caso es finalizado
   */
  static async sendCaseResponseEmail(
    tenantName: string,
    citizenEmail: string,
    citizenName: string,
    filingNumber: string,
    response: string,
    newStateCode?: string,
    diasRespuesta?: number | null,
    tenantId?: string
  ): Promise<boolean> {
    const baseUrl = await this.getBaseUrlForTenant(tenantId);
    // Personalizar el mensaje según el estado
    let stateMessage = "";
    let stateColor = "#003366";
    let stateIcon = "📋";
    let allowEmailResponse = false; // Solo true para REMITIDO_POR_COMPETENCIA

    switch (newStateCode) {
      case "REQUIERE_INFORMACION":
        stateMessage = "Respuesta de la Entidad";
        stateColor = "#003366";
        stateIcon = "✉️";
        break;
      case "ESCALADO_A_OTRA_DEPENDENCIA":
        stateMessage = "Escalado a Otra Dependencia";
        stateColor = "#9333ea";
        stateIcon = "↗️";
        break;
      case "REMITIDO_A_ENTIDAD_EXTERNA":
        stateMessage = "Remitido a Entidad Externa";
        stateColor = "#0891b2";
        stateIcon = "📤";
        break;
      case "REMITIDO_POR_COMPETENCIA":
        stateMessage = "Rechazado por Improcedencia";
        stateColor = "#dc2626";
        stateIcon = "❌";
        allowEmailResponse = true; // Permitir respuesta por email SOLO en este caso
        break;
      case "CERRADO":
        stateMessage = "Cerrado";
        stateColor = "#6b7280";
        stateIcon = "✅";
        break;
      default:
        stateMessage = "Actualizado";
        stateColor = "#10b981";
        stateIcon = "📋";
    }

    const subject = `Respuesta a su solicitud ${filingNumber}${newStateCode ? ` - ${stateMessage}` : ""} `;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #003366; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .header h1 { margin: 0 0 8px 0; font-size: 22px; }
    .header p { margin: 0; font-size: 14px; opacity: 0.9; }
    .content { background-color: #f9f9f9; padding: 25px; border: 1px solid #ddd; border-top: none; }
    .state-badge { display: inline-block; background-color: ${stateColor}; color: white; padding: 8px 20px; border-radius: 20px; font-size: 15px; font-weight: bold; margin: 15px 0; }
    .response-box { background-color: white; padding: 18px; margin: 15px 0; border-left: 4px solid ${stateColor}; border-radius: 0 4px 4px 0; }
    .signature { margin-top: 25px; padding-top: 20px; border-top: 1px solid #ddd; }
    .footer { margin-top: 0; padding: 15px 25px; background-color: #f0f0f0; font-size: 12px; border-top: 2px solid #003366; border-radius: 0 0 5px 5px; }
    .warning { background-color: #fef3c7; padding: 10px 15px; border-left: 4px solid #f59e0b; margin: 15px 0; font-size: 13px; border-radius: 0 4px 4px 0; }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Notificación Formal</h1>
    <p>${tenantName}</p>
  </div>

  <div class="content">
    <p>Estimado/a <strong>${citizenName}</strong>,</p>
    <p>Le informamos que hemos procesado su solicitud con número de radicado <strong>${filingNumber}</strong>.</p>

    ${newStateCode ? `
    <div style="text-align: center; margin: 20px 0;">
      <span class="state-badge">${stateIcon} ${stateMessage}</span>
    </div>
    ` : ""}

    <div class="response-box">
      <h3 style="margin-top: 0; color: ${stateColor};">Respuesta:</h3>
      <p style="white-space: pre-wrap; margin: 0;">${response}</p>
    </div>

    ${diasRespuesta ? `
    <div style="background-color: #fef3c7; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b; border-radius: 4px;">
      <h3 style="margin-top: 0; color: #92400e;">⏰ Acción Requerida</h3>
      <p style="margin: 10px 0; line-height: 1.6; color: #78350f;">
        Para continuar con el trámite, requerimos su respuesta dentro de los próximos <strong style="color: #dc2626; font-size: 16px;">${diasRespuesta} DÍAS CALENDARIO</strong>.
      </p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${baseUrl}/atencion-ciudadano/consultar?radicado=${filingNumber}" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
          👉 Ingresar al Portal para Responder
        </a>
      </div>
    </div>
    ` : ""}

    ${allowEmailResponse ? `
    <div style="background-color: #fee2e2; padding: 20px; margin: 20px 0; border-left: 4px solid #dc2626; border-radius: 4px;">
      <h3 style="margin-top: 0; color: #991b1b;">⛔ No responda a este correo</h3>
      <p style="margin: 10px 0; line-height: 1.6; color: #7f1d1d;">
        <strong>Este mensaje es informativo.</strong><br>
        Para confirmar que recibió esta información, ingrese al portal:
      </p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${baseUrl}/atencion-ciudadano/consultar?radicado=${filingNumber}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
          👉 Ir al Portal de Consulta
        </a>
      </div>
      <p style="margin: 10px 0; line-height: 1.6;">
        Allí ingrese su radicado <strong>${filingNumber}</strong> para registrar su respuesta.
      </p>
    </div>
    <div style="background-color: #fef3c7; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b; border-radius: 4px;">
      <h3 style="margin-top: 0; color: #92400e;">⏰ Importante</h3>
      <p style="margin: 10px 0; line-height: 1.6;">
        Tiene <strong style="color: #dc2626;">10 DÍAS</strong> para responder y confirmar que comprendió el motivo del rechazo.
      </p>
      <p style="margin: 5px 0; color: #dc2626; font-weight: bold;">⚠️ Si no responde en este plazo, el caso será cerrado automáticamente.</p>
    </div>
    ` : ""}

    <div style="background-color: #f0f7ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <h3 style="margin-top: 0; color: #1d4ed8; font-size: 15px;">📋 Consulte el estado de su solicitud</h3>
      <p style="margin: 8px 0; color: #374151; font-size: 14px;">Haga clic en el botón para ver el estado actualizado de su caso:</p>
      <div style="margin: 15px 0;">
        <a href="${baseUrl}/atencion-ciudadano/consultar?radicado=${filingNumber}"
           style="display: inline-block; background-color: #10b981; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
          👉 Consultar Estado de mi Solicitud
        </a>
      </div>
      <p style="margin: 6px 0; font-size: 12px; color: #6b7280;">
        <a href="${baseUrl}/atencion-ciudadano/consultar?radicado=${filingNumber}" style="color: #003366;">${baseUrl}/atencion-ciudadano/consultar?radicado=${filingNumber}</a>
      </p>
    </div>

    <div class="signature">
      <p style="margin: 5px 0;">Atentamente,</p>
      <p style="margin: 5px 0; font-weight: bold;">${tenantName}</p>
    </div>
  </div>

  <div class="footer">
    ${!allowEmailResponse ? `
    <div class="warning">
      <strong>⚠️ Mensaje automático – no responder</strong>
    </div>
    ` : `
    <div style="background-color: #dcfce7; padding: 10px; border-left: 4px solid #10b981; margin: 15px 0; border-radius: 0 4px 4px 0;">
      <p style="margin: 0; font-weight: bold; color: #065f46;">✅ PUEDE RESPONDER A ESTE CORREO</p>
    </div>
    `}
    <p style="margin: 10px 0;">La presente comunicación es generada automáticamente por el sistema de <strong>${tenantName}</strong>.</p>
    ${!allowEmailResponse ? `<p style="margin: 10px 0; color: #dc2626; font-weight: bold;">No se dará trámite a respuestas enviadas a este correo.</p>` : ""}
  </div>
</div>
</body>
</html>`;

    return this.sendEmail({
      to: citizenEmail,
      subject,
      html,
      replyTo: false,
      tenantId,
    });
  }

  /**
   * Notifica al ciudadano que su caso fue escalado bajo reserva administrativa.
   * Se envía cuando soloEntidad=true para que el ciudadano sepa que el caso avanza
   * sin revelar el contenido de la comunicación interna.
   */
  static async sendEscalationNoticeToCitizen(
    tenantName: string,
    citizenEmail: string,
    citizenName: string,
    filingNumber: string,
    tenantId?: string,
    escalationReason?: string,
  ): Promise<boolean> {
    const REASON_LABELS: Record<string, string> = {
      'PROCESO_DISCIPLINARIO': 'proceso disciplinario — reserva de la etapa de instrucción (Art. 115 Ley 1952/2019)',
      'ANALISIS_PRUEBAS': 'análisis de pruebas — recaudo y valoración de material probatorio',
      'COMPETENCIA_EXTERNA': 'competencia externa — traslado a autoridad competente para su definición',
    };
    const razonTexto = escalationReason ? (REASON_LABELS[escalationReason] || escalationReason) : null;
    const bodyTexto =
      `Le informamos que su solicitud ha sido remitida a la etapa de Escalamiento. ` +
      `De acuerdo con la normativa vigente sobre el derecho de petición y la protección de datos (Ley 1712 de 2014), ` +
      `se le informa que esta etapa del proceso se encuentra bajo reserva administrativa` +
      (razonTexto ? ` debido a ${razonTexto}` : '') +
      `. Una vez se produzca una decisión de fondo o se levante la reserva por parte de la dependencia competente, ` +
      `usted será notificado a través de este mismo medio.<br><br>` +
      `<strong>Estado actual:</strong> En trámite interno.`;

    const subject = `Respuesta a su solicitud ${filingNumber} - Trámite Interno`;
    const baseUrl = await this.getBaseUrlForTenant(tenantId);
    const fechaHora = new Date().toLocaleDateString('es-CO', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #003366; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .header h1 { margin: 0 0 8px 0; font-size: 22px; }
    .header p { margin: 0; font-size: 14px; opacity: 0.9; }
    .content { background-color: #f9f9f9; padding: 25px; border: 1px solid #ddd; border-top: none; }
    .state-badge { display: inline-block; background-color: #7c3aed; color: white; padding: 8px 20px; border-radius: 20px; font-size: 15px; font-weight: bold; margin: 15px 0; }
    .response-box { background-color: white; padding: 18px; margin: 15px 0; border-left: 4px solid #7c3aed; border-radius: 0 4px 4px 0; }
    .signature { margin-top: 25px; padding-top: 20px; border-top: 1px solid #ddd; }
    .footer { margin-top: 0; padding: 15px 25px; background-color: #f0f0f0; font-size: 12px; border-top: 2px solid #003366; border-radius: 0 0 5px 5px; }
    .warning { background-color: #fef3c7; padding: 10px 15px; border-left: 4px solid #f59e0b; margin: 15px 0; font-size: 13px; border-radius: 0 4px 4px 0; }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Notificación Formal</h1>
    <p>${tenantName}</p>
  </div>

  <div class="content">
    <p>Estimado/a <strong>${citizenName}</strong>,</p>
    <p>Le informamos que hemos procesado su solicitud con número de radicado <strong>${filingNumber}</strong>.</p>

    <div style="text-align: center; margin: 20px 0;">
      <span class="state-badge">⚙️ Trámite Interno</span>
    </div>

    <div class="response-box">
      <h3 style="margin-top: 0; color: #7c3aed;">Respuesta:</h3>
      <p style="white-space: pre-wrap; margin: 0;">${bodyTexto}</p>
    </div>

    <p style="font-size: 12px; color: #6b7280; margin: 4px 0 16px;">
      Fecha de la respuesta: ${fechaHora}
    </p>

    <div style="background-color: #f0f7ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <h3 style="margin-top: 0; color: #1d4ed8; font-size: 15px;">📋 Consulte el estado de su solicitud</h3>
      <p style="margin: 8px 0; color: #374151; font-size: 14px;">Haga clic en el botón para ver el estado actualizado de su caso:</p>
      <div style="margin: 15px 0;">
        <a href="${baseUrl}/atencion-ciudadano/consultar?radicado=${filingNumber}"
           style="display: inline-block; background-color: #10b981; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
          👉 Consultar Estado de mi Solicitud
        </a>
      </div>
    </div>

    <div class="signature">
      <p style="margin: 5px 0;">Atentamente,</p>
      <p style="margin: 5px 0; font-weight: bold;">${tenantName}</p>
    </div>
  </div>

  <div class="footer">
    <div class="warning">
      <strong>⚠️ Mensaje automático – no responder</strong>
    </div>
    <p style="margin: 10px 0;">La presente comunicación es generada automáticamente por el sistema de <strong>${tenantName}</strong>.</p>
    <p style="margin: 10px 0; color: #dc2626; font-weight: bold;">No se dará trámite a respuestas enviadas a este correo.</p>
  </div>
</div>
</body>
</html>`;

    try {
      await this.sendEmail({ to: citizenEmail, subject, html, replyTo: false, tenantId });
      console.log(`📧 ✅ Notificación de escalamiento enviada a ${citizenEmail}`);
      return true;
    } catch (error) {
      console.error(`📧 ❌ Error enviando notificación de escalamiento a ${citizenEmail}:`, error);
      return false;
    }
  }

  /**
   * Envía email a entidades externas o dependencias
   */
  static async sendEntityEmail(
    tenantName: string,
    entityEmails: string[],
    filingNumber: string,
    message: string,
    stateMessage: string,
    caseDetails?: {
      ciudadanoNombre?: string;
      ciudadanoDocumento?: string;
      ciudadanoEmail?: string;
      ciudadanoTelefono?: string;
      tipoCaso?: string;
      asunto?: string;
      descripcion?: string;
      fechaRadicado?: string;
      baseUrl?: string;
      tenantEmail?: string;
      tenantPhone?: string;
      tenantType?: string;
      externalToken?: string;
      tenantId?: string;
    }
  ): Promise<boolean> {
    const subject = `Remisión de solicitud para trámite y gestión institucional — Radicado ${filingNumber}`;

    const consultaUrl = caseDetails?.externalToken && caseDetails?.baseUrl
      ? `${caseDetails.baseUrl}/entidad/responder/${caseDetails.externalToken}`
      : caseDetails?.baseUrl
        ? `${caseDetails.baseUrl}/atencion-ciudadano/consultar?radicado=${encodeURIComponent(filingNumber)}`
        : null;

    const fullTenantName = tenantName;

    // Destinatario: usar correo completo como fallback (NUNCA extraer dominio como "Gmail")
    const destinatarioLabel = entityEmails[0] || 'Dependencia / Entidad Receptora';

    const ciudadanoNombre = caseDetails?.ciudadanoNombre || 'Anónimo';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.7; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6; }
          .wrapper { padding: 24px 16px; }
          .container { max-width: 640px; margin: 0 auto; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; background-color: white; }
          .header { background-color: #003366; color: white; padding: 28px 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.3px; }
          .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.8; }
          .subject-bar { background-color: #f0f4ff; border-bottom: 1px solid #c7d2fe; padding: 12px 24px; font-size: 13px; color: #3730a3; font-weight: 600; }
          .content { padding: 28px 28px 20px; }
          .radicado-box { background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 14px; text-align: center; margin: 20px 0 16px; }
          .radicado-box span { font-size: 22px; font-weight: 800; color: #1d4ed8; letter-spacing: 3px; }
          .info-table { width: 100%; border-collapse: collapse; font-size: 14px; margin: 16px 0; }
          .info-table tr { border-bottom: 1px solid #f3f4f6; }
          .info-table td { padding: 9px 10px; vertical-align: top; }
          .info-table td:first-child { color: #6b7280; font-weight: 600; width: 40%; white-space: nowrap; }
          .info-table td:last-child { color: #111827; }
          .section-label { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
          .message-box { background-color: #f8fafc; border-left: 4px solid #2563eb; border-radius: 0 6px 6px 0; padding: 14px 16px; margin: 12px 0 20px; font-size: 14px; color: #1e293b; white-space: pre-wrap; line-height: 1.6; }
          .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
          .cta-section { background-color: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px 24px; text-align: center; margin: 16px 0; }
          .btn { display: inline-block; background-color: #003366; color: white !important; padding: 13px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 15px; margin: 10px 0 6px; }
          .link-text { font-size: 11px; color: #9ca3af; margin-top: 6px; word-break: break-all; }
          .link-text a { color: #2563eb; }
          .warning-box { background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 14px 16px; margin: 20px 0 0; font-size: 13px; color: #92400e; }
          .warning-box strong { color: #78350f; }
          .footer { background-color: #f9fafb; border-top: 2px solid #003366; padding: 18px 24px; font-size: 12px; color: #6b7280; }
          .footer strong { color: #374151; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="wrapper">
        <div class="container">
          <div class="header">
            <h1>${fullTenantName}</h1>
            <p>GEFA — Gestión Familiar — Comunicación Oficial</p>
          </div>

          <div class="subject-bar">
            Asunto: Remisión de solicitud para trámite y gestión institucional
          </div>

          <div class="content">
            <p style="margin-top:0;">Señores,<br><strong>${destinatarioLabel}</strong></p>
            <p>Cordial saludo,</p>
            <p>
              La presente tiene como finalidad remitir para su conocimiento, análisis y gestión, la solicitud radicada a través de la plataforma GEFA — Gestión Familiar de <strong>${fullTenantName}</strong>, la cual ha sido asignada a su dependencia por competencia funcional.
            </p>

            <p class="section-label">Información general del trámite</p>
            <div class="radicado-box">
              <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">Número de radicado</div>
              <span>${filingNumber}</span>
            </div>
            <table class="info-table">
              ${caseDetails?.fechaRadicado ? `<tr><td>Fecha de radicación</td><td>${caseDetails.fechaRadicado}</td></tr>` : ''}
              ${caseDetails?.asunto ? `<tr><td>Asunto</td><td>${caseDetails.asunto}</td></tr>` : ''}
              ${caseDetails?.tipoCaso ? `<tr><td>Tipo de trámite</td><td>${caseDetails.tipoCaso}</td></tr>` : ''}
              <tr><td>Ciudadano</td><td>${ciudadanoNombre}</td></tr>
              <tr><td>Clasificación</td><td>${stateMessage}</td></tr>
            </table>

            <p class="section-label">Mensaje del funcionario remitente</p>
            <div class="message-box">${message}</div>

            <p>
              En atención a lo anterior, respetuosamente se solicita adelantar las acciones correspondientes dentro del marco de sus competencias, garantizando el cumplimiento de los términos legales vigentes y la debida trazabilidad del proceso.
            </p>
            <p>
              Cualquier actuación o respuesta deberá ser registrada a través del sistema, con el fin de mantener la integridad del expediente y facilitar el seguimiento institucional.
            </p>
            <p>Agradecemos su colaboración y atención oportuna.</p>

            ${consultaUrl ? `
            <hr class="divider">
            <div class="cta-section">
              <p style="margin:0 0 4px;font-size:14px;color:#374151;font-weight:600;">Consulta el historial completo del trámite</p>
              <p style="margin:0 0 10px;font-size:13px;color:#6b7280;">Documentos adjuntos y conversación con el ciudadano disponibles en el sistema.</p>
              <a href="${consultaUrl}" class="btn">Ver trámite completo →</a>
              <p class="link-text">O copie: <a href="${consultaUrl}">${consultaUrl}</a></p>
            </div>
            ` : ''}

            <div class="warning-box">
              <strong>⚠️ Importante:</strong> Este es un canal de notificación automática. Por favor, no responda a este correo electrónico, ya que las respuestas no serán gestionadas.<br><br>
              Para cualquier actuación, respuesta o seguimiento del trámite, deberá hacerlo exclusivamente a través del enlace anterior, garantizando así la correcta trazabilidad y registro dentro del sistema institucional.
            </div>
          </div>

          <div class="footer">
            <p style="margin:0 0 6px;"><strong>Atentamente,<br>${fullTenantName}</strong></p>
            <p style="margin:0;">GEFA — Gestión Familiar</p>
            ${caseDetails?.tenantEmail ? `<p style="margin:2px 0;">${caseDetails.tenantEmail}</p>` : ''}
            ${caseDetails?.tenantPhone ? `<p style="margin:2px 0;">${caseDetails.tenantPhone}</p>` : ''}
          </div>
        </div>
        </div>
      </body>
      </html>
    `;

    const toAddresses = entityEmails.join(',');
    const sent = await this.sendEmail({
      to: toAddresses,
      subject,
      html,
      replyTo: false,
      tenantId: caseDetails?.tenantId,
    });
    if (sent) {
      console.log(`📧 ✅ Email a entidades enviado exitosamente a ${toAddresses}`);
    } else {
      console.error(`📧 ❌ sendEmail retornó false para entidades: ${toAddresses}`);
    }
    return sent;
  }
}
