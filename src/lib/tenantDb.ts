import { PrismaClient } from '@prisma/client';

// Cache de clientes Prisma por URL de BD — uno por tenant
const clientCache = new Map<string, PrismaClient>();

/**
 * Devuelve (o crea) un cliente Prisma conectado a la BD del tenant.
 * Cachea las instancias para no abrir conexiones nuevas en cada request.
 */
export function getTenantPrisma(databaseUrl: string): PrismaClient {
  if (!clientCache.has(databaseUrl)) {
    clientCache.set(
      databaseUrl,
      new PrismaClient({ datasources: { db: { url: databaseUrl } } })
    );
  }
  return clientCache.get(databaseUrl)!;
}

// Cache de tenantId -> databaseUrl para evitar consultas repetidas a la BD principal
const tenantUrlCache = new Map<string, string>();

/**
 * Dado un tenantId, devuelve el cliente Prisma de esa BD.
 * Consulta la BD principal una vez y cachea el resultado.
 */
export async function getPrismaForTenant(
  tenantId: string,
  mainPrisma: PrismaClient
): Promise<PrismaClient> {
  if (!tenantUrlCache.has(tenantId)) {
    const tenant = await mainPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { databaseUrl: true },
    });
    if (!tenant?.databaseUrl) {
      throw new Error(`Tenant ${tenantId} no tiene databaseUrl configurada`);
    }
    tenantUrlCache.set(tenantId, tenant.databaseUrl);
  }
  const url = tenantUrlCache.get(tenantId)!;
  return getTenantPrisma(url);
}

/** Invalida el cache de un tenant (usar cuando se actualiza su databaseUrl) */
export function invalidateTenantCache(tenantId: string): void {
  tenantUrlCache.delete(tenantId);
}
