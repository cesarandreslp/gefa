/**
 * SYSTEM SETTINGS SERVICE - FASE 5 MÓDULO 1
 * 
 * Servicio de parametrización institucional
 * Permite configurar valores del sistema sin hardcodeo
 * 
 * Características:
 * - Validación por tipo de setting
 * - Auditoría de cambios
 * - Valores por defecto
 * - Calendario de negocio
 * 
 * @author GEFA — Gestión Familiar
 * @date Enero 12, 2026
 */

import { prisma } from '@/lib/prisma';
import { AuditService } from './AuditService';

export type SettingKey =
  | 'HOLIDAYS'
  | 'BUSINESS_HOURS'
  | 'ATTENTION_DAYS'
  | 'CASE_TYPES_CONFIG'
  | 'LEGAL_TEXTS'
  | 'NOTIFICATION_FROM_EMAIL'
  | 'NOTIFICATION_FROM_NAME'
  | 'INSTITUTION_NAME'
  | 'INSTITUTION_ADDRESS'
  | 'INSTITUTION_PHONE'
  | 'MAX_CASE_LOAD'
  | 'SLA_WARNING_THRESHOLD'
  | 'AUTO_ASSIGNMENT_ENABLED';

export interface HolidayDate {
  date: string; // YYYY-MM-DD
  name: string;
  isNational: boolean;
}

export interface BusinessHours {
  start: string; // HH:MM
  end: string; // HH:MM
}

export interface LegalTexts {
  [section: string]: string;
}

export interface SettingValue {
  HOLIDAYS: HolidayDate[];
  BUSINESS_HOURS: BusinessHours;
  ATTENTION_DAYS: string[]; // ['MON', 'TUE', 'WED', 'THU', 'FRI']
  CASE_TYPES_CONFIG: Record<string, unknown>[];
  LEGAL_TEXTS: LegalTexts;
  NOTIFICATION_FROM_EMAIL: string;
  NOTIFICATION_FROM_NAME: string;
  INSTITUTION_NAME: string;
  INSTITUTION_ADDRESS: string;
  INSTITUTION_PHONE: string;
  MAX_CASE_LOAD: number;
  SLA_WARNING_THRESHOLD: number;
  AUTO_ASSIGNMENT_ENABLED: boolean;
}

export class SystemSettingsService {
  /**
   * Valores por defecto del sistema
   */
  private static readonly DEFAULTS: Partial<SettingValue> = {
    HOLIDAYS: [],
    BUSINESS_HOURS: { start: '08:00', end: '17:00' },
    ATTENTION_DAYS: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    CASE_TYPES_CONFIG: [],
    LEGAL_TEXTS: {
      privacyPolicy: 'Política de privacidad de la Entidad Institucional.',
      termsOfService: 'Términos y condiciones del servicio.',
      transparencyNote: 'En cumplimiento de la Ley 1712 de 2014.',
    },
    NOTIFICATION_FROM_EMAIL: 'noreply@entidadciudad.gov.co',
    NOTIFICATION_FROM_NAME: 'Entidad Institucional',
    INSTITUTION_NAME: 'Entidad Institucional',
    INSTITUTION_ADDRESS: 'Carrera 10 #10-10, Ciudad/Municipio, Valle del Cauca',
    INSTITUTION_PHONE: '(602) 228-0000',
    MAX_CASE_LOAD: 50,
    SLA_WARNING_THRESHOLD: 50,
    AUTO_ASSIGNMENT_ENABLED: false,
  };

  /**
   * Obtiene un setting específico
   */
  static async getSetting<K extends SettingKey>(
    key: K
  ): Promise<SettingValue[K]> {
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      // Retornar valor por defecto
      return this.DEFAULTS[key] as SettingValue[K];
    }

    return setting.value as SettingValue[K];
  }

  /**
   * Obtiene todos los settings
   */
  static async getAllSettings(): Promise<Partial<SettingValue>> {
    const settings = await prisma.systemSetting.findMany();

    const result: Partial<SettingValue> = { ...this.DEFAULTS };

    settings.forEach((setting) => {
      result[setting.key as SettingKey] = setting.value as never;
    });

    return result;
  }

  /**
   * Crea o actualiza un setting
   */
  static async upsertSetting<K extends SettingKey>(
    key: K,
    value: SettingValue[K],
    userId: string,
    userEmail: string,
    userRole: string,
    tenantId: string = ''
  ): Promise<void> {
    // 1. Validar el valor según el tipo de setting
    this.validateSetting(key, value);

    // 2. Obtener valor anterior para auditoría
    const oldSetting = await prisma.systemSetting.findUnique({
      where: { key },
    });

    // 3. Upsert
    await prisma.systemSetting.upsert({
      where: { key },
      create: {
        key,
        value: value as never,
        updatedByUserId: userId,
      },
      update: {
        value: value as never,
        updatedByUserId: userId,
        updatedAt: new Date(),
      },
    });

    // 4. Auditar
    const auditService = new AuditService();
    await auditService.log({
      action: oldSetting ? 'SETTING_UPDATED' : 'SETTING_CREATED',
      userId,
      userEmail,
      userRole,
      tenantId,
      entityType: 'SystemSetting',
      entityId: key,
      ipAddress: 'system',
      userAgent: 'system',
      metadata: {
        key,
        before: oldSetting?.value || null,
        after: value,
      },
    });
  }

  /**
   * Valida un setting según su tipo
   */
  static validateSetting<K extends SettingKey>(
    key: K,
    value: SettingValue[K]
  ): void {
    switch (key) {
      case 'HOLIDAYS':
        this.validateHolidays(value as HolidayDate[]);
        break;

      case 'BUSINESS_HOURS':
        this.validateBusinessHours(value as BusinessHours);
        break;

      case 'ATTENTION_DAYS':
        this.validateAttentionDays(value as string[]);
        break;

      case 'NOTIFICATION_FROM_EMAIL':
        this.validateEmail(value as string);
        break;

      case 'MAX_CASE_LOAD':
        this.validateNumber(value as number, 1, 500);
        break;

      case 'SLA_WARNING_THRESHOLD':
        this.validateNumber(value as number, 1, 100);
        break;

      case 'AUTO_ASSIGNMENT_ENABLED':
        if (typeof value !== 'boolean') {
          throw new Error('AUTO_ASSIGNMENT_ENABLED debe ser un booleano');
        }
        break;

      case 'LEGAL_TEXTS':
        if (typeof value !== 'object' || value === null) {
          throw new Error('LEGAL_TEXTS debe ser un objeto');
        }
        break;

      // Para strings simples
      case 'NOTIFICATION_FROM_NAME':
      case 'INSTITUTION_NAME':
      case 'INSTITUTION_ADDRESS':
      case 'INSTITUTION_PHONE':
        if (typeof value !== 'string' || value.length === 0) {
          throw new Error(`${key} debe ser un string no vacío`);
        }
        break;

      default:
        // Validación genérica
        break;
    }
  }

  /**
   * Validación de holidays
   */
  private static validateHolidays(holidays: HolidayDate[]): void {
    if (!Array.isArray(holidays)) {
      throw new Error('HOLIDAYS debe ser un array');
    }

    holidays.forEach((holiday, index) => {
      if (!holiday.date || !holiday.name) {
        throw new Error(`Holiday en índice ${index} incompleto`);
      }

      // Validar formato de fecha YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(holiday.date)) {
        throw new Error(
          `Fecha inválida en índice ${index}. Use formato YYYY-MM-DD`
        );
      }

      if (typeof holiday.isNational !== 'boolean') {
        throw new Error(`isNational debe ser booleano en índice ${index}`);
      }
    });
  }

  /**
   * Validación de horario de negocio
   */
  private static validateBusinessHours(hours: BusinessHours): void {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!timeRegex.test(hours.start)) {
      throw new Error('start debe tener formato HH:MM');
    }

    if (!timeRegex.test(hours.end)) {
      throw new Error('end debe tener formato HH:MM');
    }

    // Validar que start < end
    const [startH, startM] = hours.start.split(':').map(Number);
    const [endH, endM] = hours.end.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes >= endMinutes) {
      throw new Error('Hora de inicio debe ser menor que hora de fin');
    }
  }

  /**
   * Validación de días de atención
   */
  private static validateAttentionDays(days: string[]): void {
    const validDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    if (!Array.isArray(days) || days.length === 0) {
      throw new Error('ATTENTION_DAYS debe ser un array no vacío');
    }

    days.forEach((day) => {
      if (!validDays.includes(day)) {
        throw new Error(
          `Día inválido: ${day}. Valores permitidos: ${validDays.join(', ')}`
        );
      }
    });
  }

  /**
   * Validación de email
   */
  private static validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Email inválido');
    }
  }

  /**
   * Validación de número en rango
   */
  private static validateNumber(
    value: number,
    min: number,
    max: number
  ): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('Valor debe ser un número');
    }

    if (value < min || value > max) {
      throw new Error(`Valor debe estar entre ${min} y ${max}`);
    }
  }

  /**
   * Obtiene el calendario de negocio (para cálculos de SLA)
   */
  static async getBusinessCalendar(): Promise<{
    holidays: Date[];
    businessHours: BusinessHours;
    attentionDays: string[];
  }> {
    const holidays = await this.getSetting('HOLIDAYS');
    const businessHours = await this.getSetting('BUSINESS_HOURS');
    const attentionDays = await this.getSetting('ATTENTION_DAYS');

    return {
      holidays: holidays.map((h) => new Date(h.date)),
      businessHours,
      attentionDays,
    };
  }

  /**
   * Verifica si una fecha es día hábil
   */
  static async isBusinessDay(date: Date): Promise<boolean> {
    const calendar = await this.getBusinessCalendar();

    // 1. Verificar si es día de atención
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const dayName = dayNames[date.getDay()];

    if (!calendar.attentionDays.includes(dayName)) {
      return false;
    }

    // 2. Verificar si es festivo
    const dateStr = date.toISOString().split('T')[0];
    const isHoliday = calendar.holidays.some(
      (h) => h.toISOString().split('T')[0] === dateStr
    );

    return !isHoliday;
  }
}
