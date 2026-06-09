import { prisma } from '@/lib/prisma';
import { Tenant } from '@prisma/client';

// Global cache to prevent repeated queries per API request
// For Next.js dev mode, declare it globally so it survives hot reloads
const globalForTenant = global as unknown as { tenantCache: Map<string, Tenant> };
const tenantCache = globalForTenant.tenantCache || new Map<string, Tenant>();
if (process.env.NODE_ENV !== 'production') globalForTenant.tenantCache = tenantCache;

/**
 * Limpia el cache de tenants. Llamar después de actualizar datos del tenant.
 */
export function clearTenantCache() {
  tenantCache.clear();
}

/**
 * Normalizes host from headers by removing 'www.' and ports.
 * Example: 'www.pmcali.gov.co:3000' -> 'pmcali.gov.co'
 */
export function normalizeHost(rawHost: string | null): string {
  if (!rawHost) return '';
  return rawHost.replace(/^www\./, '').split(':')[0].toLowerCase();
}

/**
 * Retrieves the tenant by the normalized domain, using memory cache.
 * For localhost/dev environments, uses DEFAULT_TENANT_SIGLA env var or first available tenant.
 */
export async function resolveTenantByHost(rawHost: string | null): Promise<Tenant | null> {
  const host = normalizeHost(rawHost);

  if (!host) {
    console.warn('[TenantResolver] No host provided');
    return null;
  }

  // 1. Check Memory Cache
  if (tenantCache.has(host)) {
    return tenantCache.get(host)!;
  }

  let tenant = null;

  // 2. Localhost/Dev Fallback — SOLO si DEFAULT_TENANT_SIGLA está definido
  // Sin DEFAULT_TENANT_SIGLA, localhost queda sin tenant (para Super Admin)
  if (host === 'localhost' || host === '127.0.0.1') {
    const defaultSigla = process.env.DEFAULT_TENANT_SIGLA;
    if (defaultSigla) {
      tenant = await prisma.tenant.findUnique({
        where: { sigla: defaultSigla }
      });
    }
    // Ya no hace findFirst() — cada tenant debe tener su propio subdominio
  } else if (host.endsWith('.localhost')) {
    // Subdominio de localhost para desarrollo local, ej: guacari.localhost:3000 → sigla "guacari"
    const sigla = host.split('.')[0];
    tenant = await prisma.tenant.findFirst({
      where: { sigla: { equals: sigla, mode: 'insensitive' } }
    });
    // Fallback: buscar por domain (el tenant puede tener domain "guacari.localhost:3000")
    if (!tenant) {
      tenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { domain: host },
            { domain: `${host}:3000` },
            { domain: `${host}:3001` },
          ]
        }
      });
    }
  } else {
    // 3. Database Lookup leniente (Intenta la URL exacta tipiádola en la bbdd, o la normalizada)
    const rawClean = rawHost?.replace(/https?:\/\//, '').replace(/\/$/, '') || host;
    const normalizedWithoutPort = host; // host ya está normalizado sin puerto por normalizeHost
    
    tenant = await prisma.tenant.findFirst({
      where: { 
        OR: [
          { domain: rawClean },
          { domain: host },
          { domain: rawHost || '' },
          { domain: `${normalizedWithoutPort}:3000` }
        ]
      }
    });
  }

  // 4. Update Cache
  if (tenant) {
    tenantCache.set(host, tenant);
  }

  return tenant;
}

/**
 * Extracts and resolves the tenant from Request headers gracefully.
 * Combines x-tenant-domain injection with standard host.
 */
export async function getTenantFromRequest(req: Request): Promise<Tenant | null> {
  const domain = req.headers.get('x-tenant-domain') || req.headers.get('host');
  return resolveTenantByHost(domain);
}
