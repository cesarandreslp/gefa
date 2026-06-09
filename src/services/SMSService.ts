/**
 * SMS SERVICE - FASE 5 MÓDULO 2
 * 
 * Servicio de envío de SMS (preparación para futuro)
 * 
 * Características:
 * - Stub para integración futura con Twilio
 * - Estructura lista para expansión
 * - Por ahora solo loguea los mensajes
 * 
 * @author Sistema Ventanilla Única
 * @date Enero 12, 2026
 */

export class SMSService {
  /**
   * Envía un SMS (stub para futuro)
   * 
   * TODO: Integrar con Twilio o proveedor SMS colombiano
   */
  static async sendSMS(params: {
    to: string;
    message: string;
  }): Promise<boolean> {
    console.log('[SMS] Preparando envío...');
    console.log('[SMS] Destinatario:', params.to);
    console.log('[SMS] Mensaje:', params.message);
    
    // TODO: Implementar integración con Twilio
    // const client = twilio(process.env.SMS_ACCOUNT_SID, process.env.SMS_AUTH_TOKEN);
    // await client.messages.create({
    //   body: params.message,
    //   from: process.env.SMS_FROM_NUMBER,
    //   to: params.to,
    // });
    
    console.log('[SMS] Simulando envío exitoso (stub)');
    return true; // Simular éxito por ahora
  }

  /**
   * Valida configuración SMS
   */
  static validateConfiguration(): boolean {
    // Por ahora siempre retorna true (stub)
    return true;
  }

  /**
   * Formatea número de teléfono para Colombia
   */
  static formatPhoneNumber(phone: string): string {
    // Remover espacios y caracteres especiales
    let cleaned = phone.replace(/\D/g, '');
    
    // Si comienza con 57, dejarlo así
    // Si no, agregar código de país
    if (!cleaned.startsWith('57')) {
      cleaned = '57' + cleaned;
    }
    
    return '+' + cleaned;
  }
}
