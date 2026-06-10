/**
 * NeonService — Provisioning automático de BD por tenant (Fase 2)
 * ---------------------------------------------------------------------------
 * Cada Alcaldía (tenant) recibe su PROPIO proyecto Neon (aislamiento fuerte para
 * datos de NNA/víctimas, Ley 1581/2012). El flujo de alta:
 *   1. createTenantProject(sigla) — crea el proyecto `gefa-<sigla>` vía API de Neon
 *      y devuelve las cadenas de conexión (pooled para runtime, direct para DDL).
 *   2. applyTenantSchema(direct) — aplica el esquema completo (prisma/tenant-schema.sql)
 *      a la `neondb` recién creada (un proyecto Neon nace vacío).
 *   3. seedTenantInstrumentos(db) — siembra el catálogo de instrumentos en la BD nueva.
 *   4. (el endpoint de alta) siembra roles/estados/tipos/admin/IA.
 *   5. deleteTenantProject(projectId) — rollback si algo falla.
 *
 * Requiere envs: NEON_API_KEY (obligatoria), NEON_ORG_ID (org donde se crean los
 * proyectos), NEON_PROJECT_REGION (default aws-us-east-1).
 * ---------------------------------------------------------------------------
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient, Prisma } from '@prisma/client';
import { FAMILY_INSTRUMENTOS } from '@/domain/catalogs/familyInstrumentos';

const NEON_API = 'https://console.neon.tech/api/v2';
const PG_VERSION = 17;

export interface NeonProvisionResult {
  projectId: string;
  projectName: string;
  databaseUrl: string; // pooled — para runtime de la app
  databaseUrlDirect: string; // direct — para migraciones/DDL
}

function authHeaders(): Record<string, string> {
  const key = process.env.NEON_API_KEY;
  if (!key) throw new Error('NEON_API_KEY no está configurada en el entorno');
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

/** Inserta `-pooler` tras el id del endpoint (ep-xxxx) para obtener el host pooled. */
function toPooled(uri: string): string {
  return uri.replace(/@(ep-[^.\/@]+)/, '@$1-pooler');
}

function ensureSslmode(uri: string): string {
  if (/sslmode=/.test(uri)) return uri;
  return uri + (uri.includes('?') ? '&' : '?') + 'sslmode=require';
}

/**
 * Crea un proyecto Neon dedicado para el tenant y devuelve sus cadenas de conexión.
 * El proyecto nace con una `neondb` vacía (sin esquema): aplicar applyTenantSchema después.
 */
export async function createTenantProject(sigla: string): Promise<NeonProvisionResult> {
  const orgId = process.env.NEON_ORG_ID;
  const region = process.env.NEON_PROJECT_REGION || 'aws-us-east-1';
  const name = `gefa-${sigla.toLowerCase()}`;

  const project: Record<string, unknown> = {
    name,
    pg_version: PG_VERSION,
    region_id: region,
  };
  if (orgId) project.org_id = orgId;

  const res = await fetch(`${NEON_API}/projects`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ project }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Neon: no se pudo crear el proyecto "${name}" (HTTP ${res.status}): ${txt}`);
  }

  const data = await res.json();
  const projectId: string | undefined = data?.project?.id;
  const uri: string | undefined = data?.connection_uris?.[0]?.connection_uri;
  if (!projectId || !uri) {
    throw new Error('Neon: respuesta inesperada al crear el proyecto (sin id o connection_uri)');
  }

  // Esperar a que terminen las operaciones de aprovisionamiento del proyecto.
  await waitForOperations(projectId, data?.operations);

  const direct = ensureSslmode(uri);
  const pooled = ensureSslmode(toPooled(uri));
  return { projectId, projectName: name, databaseUrl: pooled, databaseUrlDirect: direct };
}

/** Sondea las operaciones del proyecto hasta que todas terminen (o se agote el tiempo). */
async function waitForOperations(
  projectId: string,
  initialOps: Array<{ status?: string }> = []
): Promise<void> {
  const isPending = (o: { status?: string }) =>
    o.status !== 'finished' && o.status !== 'success' && o.status !== 'skipped';

  if (Array.isArray(initialOps) && initialOps.length > 0 && !initialOps.some(isPending)) return;

  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    const r = await fetch(`${NEON_API}/projects/${projectId}/operations`, { headers: authHeaders() });
    if (!r.ok) continue;
    const d = await r.json();
    const ops: Array<{ status?: string }> = d?.operations || [];
    if (ops.length === 0 || !ops.some(isPending)) return;
  }
  // No lanzamos: aún sin confirmación, los reintentos del DDL absorben latencia residual.
}

/** Elimina el proyecto Neon del tenant (rollback). No lanza si falla. */
export async function deleteTenantProject(projectId: string): Promise<void> {
  try {
    await fetch(`${NEON_API}/projects/${projectId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
  } catch {
    // best-effort
  }
}

/**
 * Aplica el esquema completo (prisma/tenant-schema.sql) a la BD del tenant vía
 * la conexión DIRECTA (apta para DDL). Ejecuta sentencia por sentencia porque
 * Prisma no admite múltiples comandos en $executeRawUnsafe.
 */
export async function applyTenantSchema(databaseUrlDirect: string): Promise<void> {
  const sqlPath = join(process.cwd(), 'prisma', 'tenant-schema.sql');
  const raw = readFileSync(sqlPath, 'utf8');
  const statements = splitSqlStatements(raw);
  if (statements.length === 0) {
    throw new Error('tenant-schema.sql no contiene sentencias ejecutables');
  }

  const client = new PrismaClient({ datasources: { db: { url: databaseUrlDirect } } });
  try {
    // Reintento de conexión: el endpoint recién creado puede tardar en aceptar conexiones.
    await connectWithRetry(client);
    for (const stmt of statements) {
      await client.$executeRawUnsafe(stmt);
    }
  } finally {
    await client.$disconnect().catch(() => {});
  }
}

async function connectWithRetry(client: PrismaClient, attempts = 6): Promise<void> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      await client.$queryRawUnsafe('SELECT 1');
      return;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error(`No se pudo conectar a la BD del tenant tras varios intentos: ${String(lastErr)}`);
}

/**
 * Divide el DDL generado por Prisma en sentencias individuales. El script de
 * `migrate diff` pone cada sentencia en su propio bloque terminado en `;` al final
 * de línea, precedido por comentarios `-- ...` que se descartan.
 */
function splitSqlStatements(sql: string): string[] {
  return sql
    .split(/;\s*$/m)
    .map((chunk) => chunk.replace(/^\s*--.*$/gm, '').trim())
    .filter((chunk) => chunk.length > 0);
}

/**
 * Siembra el catálogo de instrumentos de valoración en la BD del tenant.
 * Réplica de scripts/seed-instrumentos.ts pero operando sobre el cliente del tenant.
 */
export async function seedTenantInstrumentos(db: PrismaClient): Promise<void> {
  const idByCode: Record<string, string> = {};

  for (const def of FAMILY_INSTRUMENTOS) {
    const data = {
      name: def.name,
      norma: def.norma,
      version: def.version ?? null,
      profesion: def.profesion as never,
      appliesTo: (def.appliesTo ?? null) as never,
      assessmentType: (def.assessmentType ?? null) as never,
      description: def.description ?? null,
      isActive: def.isActive,
      displayOrder: def.displayOrder,
      scoringConfig: (def.scoringConfig ?? Prisma.JsonNull) as never,
    };
    const instrumento = await db.instrumento.upsert({
      where: { code: def.code },
      update: data,
      create: { code: def.code, ...data },
    });
    idByCode[def.code] = instrumento.id;

    await db.instrumentoCampo.deleteMany({ where: { instrumentoId: instrumento.id } });
    if (def.campos.length > 0) {
      await db.instrumentoCampo.createMany({
        data: def.campos.map((c) => ({
          instrumentoId: instrumento.id,
          code: c.code,
          seccion: c.seccion,
          label: c.label,
          tipo: c.tipo as never,
          opciones: (c.opciones ?? Prisma.JsonNull) as never,
          ayuda: c.ayuda ?? null,
          requerido: c.requerido ?? false,
          orden: c.orden,
          peso: c.peso ?? null,
          esCritico: c.esCritico ?? false,
        })),
      });
    }
  }

  for (const def of FAMILY_INSTRUMENTOS) {
    const parentId = def.parentCode ? idByCode[def.parentCode] ?? null : null;
    await db.instrumento.update({ where: { id: idByCode[def.code] }, data: { parentId } });
  }
}
