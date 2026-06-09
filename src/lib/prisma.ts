/**
 * ============================================================================
 * CLIENTE DE PRISMA - SINGLETON
 * ============================================================================
 * Cliente único de Prisma para toda la aplicación.
 * Evita múltiples instancias en desarrollo (hot reload).
 * 
 * Fecha: Enero 8, 2026
 * ============================================================================
 */

import { PrismaClient } from '@prisma/client';

/**
 * Extensión del objeto global para TypeScript
 */
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Cliente de Prisma con logging configurado según entorno
 */
export const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

/**
 * En desarrollo, mantener la instancia en global
 * para evitar múltiples conexiones con hot-reload
 */
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

/**
 * Manejador de cierre graceful
 * Solo se ejecuta en Node.js runtime (no en Edge Runtime)
 */
if (typeof process !== 'undefined' && typeof process.on === 'function') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

export default prisma;
