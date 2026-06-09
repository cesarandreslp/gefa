/**
 * ============================================================================
 * CALCULADOR DE TÉRMINOS LEGALES
 * ============================================================================
 * Calcula términos legales según la normativa colombiana.
 * 
 * Normativa aplicada:
 * - Ley 1755/2015: Derecho de Petición
 * - Ley 1437/2011: CPACA
 * - Código Contencioso Administrativo
 * 
 * Reglas:
 * - Los términos se cuentan en días HÁBILES
 * - Se excluyen sábados, domingos y festivos
 * - El término inicia al día siguiente de la radicación
 * - El término vence al finalizar el último día hábil
 * 
 * Fecha: Enero 8, 2026
 * ============================================================================
 */

import prisma from '@/lib/prisma';
import { LEGAL_TERMS_CONFIG } from '@/lib/constants';

/**
 * Añade días a una fecha
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Verifica si es fin de semana
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Domingo, 6 = Sábado
}

/**
 * Formatea fecha a string
 */
function format(date: Date, formatStr: string): string {
  if (formatStr === 'yyyy-MM-dd') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return date.toISOString();
}

/**
 * Clase principal para cálculo de términos legales
 */
export class LegalTermsCalculator {
  // Cache de días no hábiles en memoria
  private static nonBusinessDaysCache: Set<string> | null = null;
  private static cacheExpiry: Date | null = null;

  /**
   * Calcula la fecha de vencimiento de un caso
   * 
   * @param filedDate - Fecha de radicación
   * @param termDays - Días hábiles del término
   * @returns Fecha de vencimiento
   */
  static async calculateDueDate(
    filedDate: Date,
    termDays: number
  ): Promise<Date> {
    // El término inicia al día siguiente de la radicación
    let currentDate = addDays(filedDate, 1);
    let businessDaysAdded = 0;

    // Cargar días no hábiles
    const nonBusinessDays = await this.getNonBusinessDays();

    // Iterar hasta completar los días hábiles
    while (businessDaysAdded < termDays) {
      // Verificar si es día hábil
      if (await this.isBusinessDay(currentDate, nonBusinessDays)) {
        businessDaysAdded++;
      }

      // Si no hemos completado, avanzar al siguiente día
      if (businessDaysAdded < termDays) {
        currentDate = addDays(currentDate, 1);
      }
    }

    // Retornar la fecha de vencimiento (final del día)
    currentDate.setHours(23, 59, 59, 999);
    return currentDate;
  }

  /**
   * Calcula los días hábiles transcurridos entre dos fechas
   * 
   * @param startDate - Fecha de inicio
   * @param endDate - Fecha de fin
   * @returns Número de días hábiles transcurridos
   */
  static async calculateBusinessDaysElapsed(
    startDate: Date,
    endDate: Date = new Date()
  ): Promise<number> {
    let currentDate = addDays(startDate, 1); // Inicia al día siguiente
    let businessDays = 0;

    const nonBusinessDays = await this.getNonBusinessDays();

    // Iterar día por día
    while (currentDate <= endDate) {
      if (await this.isBusinessDay(currentDate, nonBusinessDays)) {
        businessDays++;
      }
      currentDate = addDays(currentDate, 1);
    }

    return businessDays;
  }

  /**
   * Calcula los días hábiles restantes hasta el vencimiento
   * 
   * @param dueDate - Fecha de vencimiento
   * @param currentDate - Fecha actual (opcional, por defecto hoy)
   * @returns Días hábiles restantes (negativo si está vencido)
   */
  static async calculateBusinessDaysRemaining(
    dueDate: Date,
    currentDate: Date = new Date()
  ): Promise<number> {
    // Si ya venció, retornar negativo
    if (currentDate > dueDate) {
      return -1 * (await this.calculateBusinessDaysElapsed(dueDate, currentDate));
    }

    return await this.calculateBusinessDaysElapsed(currentDate, dueDate);
  }

  /**
   * Verifica si una fecha es día hábil
   * 
   * @param date - Fecha a verificar
   * @param nonBusinessDays - Set de días no hábiles (opcional)
   * @returns true si es día hábil
   */
  static async isBusinessDay(
    date: Date,
    nonBusinessDays?: Set<string>
  ): Promise<boolean> {
    // 1. Verificar si es fin de semana
    if (isWeekend(date)) {
      return false;
    }

    // 2. Verificar si es festivo o día no hábil
    const dateKey = format(date, 'yyyy-MM-dd');
    const holidays = nonBusinessDays || (await this.getNonBusinessDays());

    if (holidays.has(dateKey)) {
      return false;
    }

    return true;
  }

  /**
   * Obtiene el conjunto de días no hábiles del año actual y siguiente
   * Implementa cache para optimizar consultas
   * 
   * @returns Set de fechas en formato 'yyyy-MM-dd'
   */
  static async getNonBusinessDays(): Promise<Set<string>> {
    // Verificar si el cache es válido (24 horas)
    if (
      this.nonBusinessDaysCache &&
      this.cacheExpiry &&
      new Date() < this.cacheExpiry
    ) {
      return this.nonBusinessDaysCache;
    }

    // Consultar días no hábiles desde la BD
    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1); // Inicio del año actual
    const endDate = new Date(currentYear + 1, 11, 31); // Fin del año siguiente

    // Nota: Si nonBusinessDay no está disponible, es porque no se ha generado el cliente de Prisma
    // Ejecutar: npm run db:generate
    const nonBusinessDays = await (prisma as unknown as { nonBusinessDay: { findMany: (args: unknown) => Promise<Array<{ date: Date }>> } }).nonBusinessDay.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        isActive: true,
      },
      select: {
        date: true,
      },
    });

    // Convertir a Set de strings
    const daysSet = new Set<string>(
      nonBusinessDays.map((day: { date: Date }) => format(day.date, 'yyyy-MM-dd'))
    );

    // Actualizar cache
    this.nonBusinessDaysCache = daysSet;
    this.cacheExpiry = addDays(new Date(), 1); // Cache por 24 horas

    return daysSet;
  }

  /**
   * Invalida el cache de días no hábiles
   * Útil cuando se actualizan festivos
   */
  static invalidateCache(): void {
    this.nonBusinessDaysCache = null;
    this.cacheExpiry = null;
  }

  /**
   * Calcula el porcentaje de término consumido
   * 
   * @param filedDate - Fecha de radicación
   * @param dueDate - Fecha de vencimiento
   * @param totalDays - Total de días hábiles del término
   * @returns Porcentaje (0-100)
   */
  static async calculateTermPercentage(
    filedDate: Date,
    dueDate: Date,
    totalDays: number
  ): Promise<number> {
    const elapsed = await this.calculateBusinessDaysElapsed(filedDate, new Date());
    const percentage = (elapsed / totalDays) * 100;
    return Math.min(Math.max(percentage, 0), 100); // Clamp entre 0 y 100
  }

  /**
   * Determina el estado del semáforo de términos
   * 
   * @param daysRemaining - Días hábiles restantes
   * @param totalDays - Total de días del término
   * @returns Estado del semáforo
   */
  static getTermStatus(
    daysRemaining: number,
    totalDays: number
  ): 'GREEN' | 'YELLOW' | 'RED' | 'BLACK' {
    // Vencido
    if (daysRemaining < 0) {
      return 'BLACK';
    }

    const percentage = (daysRemaining / totalDays) * 100;

    if (percentage < LEGAL_TERMS_CONFIG.RED_THRESHOLD) {
      return 'RED';
    } else if (percentage < LEGAL_TERMS_CONFIG.YELLOW_THRESHOLD) {
      return 'YELLOW';
    } else if (percentage < LEGAL_TERMS_CONFIG.GREEN_THRESHOLD) {
      return 'YELLOW';
    } else {
      return 'GREEN';
    }
  }

  /**
   * Verifica si un caso está vencido
   * 
   * @param dueDate - Fecha de vencimiento
   * @param currentDate - Fecha actual (opcional)
   * @returns true si está vencido
   */
  static isOverdue(dueDate: Date, currentDate: Date = new Date()): boolean {
    return currentDate > dueDate;
  }

  /**
   * Calcula la nueva fecha de vencimiento después de suspender términos
   * 
   * @param dueDate - Fecha de vencimiento original
   * @param suspendedAt - Fecha de suspensión
   * @param resumedAt - Fecha de reanudación
   * @returns Nueva fecha de vencimiento
   */
  static async calculateDueDateAfterSuspension(
    dueDate: Date,
    suspendedAt: Date,
    resumedAt: Date
  ): Promise<Date> {
    // Calcular días hábiles que estuvieron suspendidos
    const suspendedBusinessDays = await this.calculateBusinessDaysElapsed(
      suspendedAt,
      resumedAt
    );

    // Extender la fecha de vencimiento por esos días
    let newDueDate = dueDate;
    let businessDaysAdded = 0;
    const nonBusinessDays = await this.getNonBusinessDays();

    while (businessDaysAdded < suspendedBusinessDays) {
      newDueDate = addDays(newDueDate, 1);
      if (await this.isBusinessDay(newDueDate, nonBusinessDays)) {
        businessDaysAdded++;
      }
    }

    return newDueDate;
  }

  /**
   * Verifica si se debe alertar por proximidad al vencimiento
   * 
   * @param daysRemaining - Días hábiles restantes
   * @returns true si se debe alertar
   */
  static shouldAlert(daysRemaining: number): boolean {
    return LEGAL_TERMS_CONFIG.ALERT_DAYS_BEFORE.some(day => day === daysRemaining);
  }

  /**
   * Obtiene información completa del estado de términos de un caso
   * 
   * @param filedDate - Fecha de radicación
   * @param dueDate - Fecha de vencimiento
   * @param totalDays - Total de días del término
   * @returns Objeto con información completa
   */
  static async getTermInfo(
    filedDate: Date,
    dueDate: Date,
    totalDays: number
  ): Promise<{
    daysElapsed: number;
    daysRemaining: number;
    percentage: number;
    status: 'GREEN' | 'YELLOW' | 'RED' | 'BLACK';
    isOverdue: boolean;
    shouldAlert: boolean;
  }> {
    const daysElapsed = await this.calculateBusinessDaysElapsed(filedDate);
    const daysRemaining = await this.calculateBusinessDaysRemaining(dueDate);
    const percentage = await this.calculateTermPercentage(filedDate, dueDate, totalDays);
    const status = this.getTermStatus(daysRemaining, totalDays);
    const isOverdue = this.isOverdue(dueDate);
    const shouldAlert = this.shouldAlert(daysRemaining);

    return {
      daysElapsed,
      daysRemaining,
      percentage,
      status,
      isOverdue,
      shouldAlert,
    };
  }
}

export default LegalTermsCalculator;
