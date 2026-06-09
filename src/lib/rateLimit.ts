/**
 * Rate Limiting Middleware
 * 
 * Protección contra abuso y spam en APIs públicas
 * 
 * Estrategia:
 * - Límite por IP address
 * - Ventana de tiempo deslizante
 * - Almacenamiento en memoria (simple para FASE 1)
 * 
 * FASE 2: Migrar a Redis para mejor escalabilidad
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, errorResponse } from './validation';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Almacén en memoria (simple para desarrollo)
// En producción, usar Redis
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Configuración de rate limiting
 */
export interface RateLimitConfig {
  windowMs: number;     // Ventana de tiempo en milisegundos
  maxRequests: number;  // Máximo de requests en la ventana
  message?: string;     // Mensaje personalizado
}

/**
 * Configuraciones predefinidas
 */
export const RATE_LIMIT_CONFIGS = {
  // API pública: 100 requests por 15 minutos
  PUBLIC_API: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
    message: 'Demasiadas solicitudes. Por favor intente más tarde.',
  },
  
  // Formularios: 5 envíos por hora
  FORM_SUBMISSION: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    message: 'Ha excedido el límite de envíos. Por favor intente en 1 hora.',
  },
  
  // Consultas: 200 requests por 15 minutos
  QUERY: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 200,
    message: 'Demasiadas consultas. Por favor intente más tarde.',
  },
};

/**
 * Limpia entradas expiradas del almacén
 * Previene memory leaks
 */
function cleanupExpired() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Aplica rate limiting a un request
 * 
 * @param request - Next.js request
 * @param config - Configuración de límites
 * @param identifier - Identificador único (default: IP)
 * @returns true si se permite el request, false si excede límite
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  identifier?: string
): { allowed: boolean; remaining: number; resetTime: number } {
  // Limpiar entradas expiradas cada 100 requests
  if (Math.random() < 0.01) {
    cleanupExpired();
  }

  // Identificador: IP por defecto, o personalizado
  const key = identifier || getClientIp(request.headers);
  const now = Date.now();

  // Obtener entrada existente o crear nueva
  let entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // Primera request o ventana expirada
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime,
    };
  }

  // Ventana activa
  if (entry.count >= config.maxRequests) {
    // Límite excedido
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Incrementar contador
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Middleware helper para aplicar rate limiting
 * 
 * Uso en route handler:
 * ```
 * const limitResult = applyRateLimit(request, RATE_LIMIT_CONFIGS.FORM_SUBMISSION);
 * if (!limitResult.allowed) return limitResult.response;
 * ```
 */
export function applyRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  identifier?: string
): {
  allowed: boolean;
  response?: NextResponse;
  remaining: number;
  resetTime: number;
} {
  const result = checkRateLimit(request, config, identifier);

  if (!result.allowed) {
    const response = NextResponse.json(
      errorResponse(
        'RATE_LIMIT_EXCEEDED',
        config.message || 'Too many requests',
        {
          resetTime: new Date(result.resetTime).toISOString(),
        }
      ),
      { status: 429 }
    );

    // Headers informativos
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
    response.headers.set('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString());

    return {
      allowed: false,
      response,
      remaining: 0,
      resetTime: result.resetTime,
    };
  }

  return {
    allowed: true,
    remaining: result.remaining,
    resetTime: result.resetTime,
  };
}

/**
 * Añade headers de rate limit a una respuesta exitosa
 */
export function addRateLimitHeaders(
  response: NextResponse,
  config: RateLimitConfig,
  remaining: number,
  resetTime: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', resetTime.toString());
  return response;
}

/**
 * Limpia el rate limit de un identificador específico
 * Útil para testing o casos administrativos
 */
export function clearRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Obtiene estadísticas del rate limiter
 */
export function getRateLimitStats() {
  return {
    totalEntries: rateLimitStore.size,
    entries: Array.from(rateLimitStore.entries()).map(([key, entry]) => ({
      identifier: key,
      count: entry.count,
      resetTime: new Date(entry.resetTime).toISOString(),
    })),
  };
}
