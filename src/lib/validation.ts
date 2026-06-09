/**
 * Utilidades para validación y sanitización de inputs
 * 
 * Seguridad:
 * - Prevención de XSS
 * - Validación de formatos
 * - Sanitización de strings
 * 
 * Usadas en APIs y formularios
 */

import { z } from 'zod';

/**
 * Sanitiza un string removiendo HTML y caracteres peligrosos
 */
export function sanitizeString(input: string): string {
  if (!input) return '';

  return input
    .trim()
    .replace(/<[^>]*>/g, '') // Remover tags HTML
    .replace(/[<>'"]/g, '') // Remover caracteres peligrosos
    .substring(0, 5000); // Límite de longitud
}

/**
 * Valida formato de email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida formato de teléfono colombiano
 */
export function isValidPhone(phone: string): boolean {
  // Formatos: 3001234567, 300 123 4567, (2) 2280000
  const phoneRegex = /^(\+57)?[\s\-]?(\(?\d{1,3}\)?)?[\s\-]?\d{3}[\s\-]?\d{4}[\s\-]?\d{0,4}$/;
  return phoneRegex.test(phone);
}

/**
 * Valida número de documento colombiano
 */
export function isValidDocumentNumber(documentType: string, number: string): boolean {
  const cleanNumber = number.replace(/[^\d]/g, '');

  switch (documentType) {
    case 'CC': // Cédula de Ciudadanía
      return cleanNumber.length >= 6 && cleanNumber.length <= 10;
    case 'CE': // Cédula de Extranjería
      return cleanNumber.length >= 6 && cleanNumber.length <= 10;
    case 'TI': // Tarjeta de Identidad
      return cleanNumber.length >= 10 && cleanNumber.length <= 11;
    case 'PA': // Pasaporte
      return number.length >= 6 && number.length <= 12;
    case 'RC': // Registro Civil
      return cleanNumber.length >= 8 && cleanNumber.length <= 11;
    case 'NIT': // NIT
      return cleanNumber.length >= 9 && cleanNumber.length <= 10;
    default:
      return false;
  }
}

/**
 * Extrae IP del request de Next.js
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0] ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

/**
 * Extrae User Agent del request
 */
export function getUserAgent(headers: Headers): string {
  return headers.get('user-agent') || 'unknown';
}

/**
 * Schema Zod para validar ciudadano
 */
export const citizenSchema = z.object({
  documentType: z.enum(['CC', 'TI', 'CE', 'PA', 'RC', 'NIT']),
  documentNumber: z.string().min(6).max(15),
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  address: z.string().max(200).min(1),
  neighborhood: z.string().max(100).min(1),
  city: z.string().max(100).min(1),
  department: z.string().max(100).min(1),
  dataConsent: z.boolean(),
});

/**
 * Schema Zod para validar solicitud general
 */
export const generalRequestSchema = z.object({
  isAnonymous: z.boolean().optional(),
  citizen: z.object({
    documentType: z.enum(['CC', 'TI', 'CE', 'PA', 'RC', 'NIT', 'ANON']).optional(),
    documentNumber: z.string().min(6).max(100).optional(),
    firstName: z.string().min(2).max(100).optional(),
    lastName: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(7).max(20).optional(),
    address: z.string().max(200).optional(),
    neighborhood: z.string().max(100).optional(),
    city: z.string().max(100).optional(),
    department: z.string().max(100).optional(),
    dataConsent: z.boolean().optional(),
  }).optional(),
  subject: z.string().min(10).max(200),
  description: z.string().min(20).max(2000),
}).superRefine((data, ctx) => {
  // Si no es anónima, se requieren los datos del ciudadano
  if (!data.isAnonymous) {
    if (!data.citizen) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['citizen'],
        message: 'Los datos del ciudadano son requeridos para peticiones no anónimas',
      });
      return;
    }

    if (!data.citizen.documentType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['citizen', 'documentType'], message: 'Requerido' });
    }
    if (!data.citizen.documentNumber) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['citizen', 'documentNumber'], message: 'Requerido' });
    }
    if (!data.citizen.firstName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['citizen', 'firstName'], message: 'Requerido' });
    }
    if (!data.citizen.lastName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['citizen', 'lastName'], message: 'Requerido' });
    }
    if (!data.citizen.city) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['citizen', 'city'], message: 'Requerido' });
    }
    if (!data.citizen.email) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['citizen', 'email'], message: 'Requerido' });
    }
    if (!data.citizen.phone) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['citizen', 'phone'], message: 'Requerido' });
    }
    if (!data.citizen.address) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['citizen', 'address'], message: 'Requerido' });
    }
    if (!data.citizen.neighborhood) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['citizen', 'neighborhood'], message: 'Requerido' });
    }
    if (!data.citizen.department) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['citizen', 'department'], message: 'Requerido' });
    }
    if (data.citizen.dataConsent === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['citizen', 'dataConsent'], message: 'Requerido' });
    }
  }
});

/**
 * Schema Zod para contacto simple
 */
export const contactSchema = z.object({
  name: z.string().min(3).max(100),
  email: z.string().email(),
  phone: z.string().min(7).max(20).optional(),
  subject: z.string().min(5).max(200),
  message: z.string().min(10).max(1000),
});

/**
 * Respuesta estándar de API
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Crea una respuesta de éxito
 */
export function successResponse<T>(data: T, metadata?: Record<string, unknown>): ApiResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}

/**
 * Crea una respuesta de error
 */
export function errorResponse(
  code: string,
  message: string,
  details?: unknown
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    metadata: {
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Maneja errores de Zod
 */
export function handleZodError(error: z.ZodError): ApiResponse {
  return errorResponse(
    'VALIDATION_ERROR',
    'Errores de validación en los datos enviados',
    error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }))
  );
}

/**
 * Genera un ID de request único para trazabilidad
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
