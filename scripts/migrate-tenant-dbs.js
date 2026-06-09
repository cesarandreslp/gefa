/**
 * Aplica migraciones pendientes a todas las BDs de tenants.
 * Ejecutar cuando se agrega una columna nueva al schema.
 *
 * Uso: node scripts/migrate-tenant-dbs.js
 */

// Cargar .env manualmente
{
  const fs   = require('fs');
  const path = require('path');
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const idx = line.indexOf('=');
      if (idx < 0) continue;
      const key = line.substring(0, idx).trim();
      if (!key || key.startsWith('#')) continue;
      let val = line.substring(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const { PrismaClient } = require('@prisma/client');

const mainPrisma = new PrismaClient();

const MIGRATIONS = [
  {
    name: 'add_allow_citizen_response',
    sql: `ALTER TABLE "case_state_history" ADD COLUMN IF NOT EXISTS "allow_citizen_response" BOOLEAN NOT NULL DEFAULT true;`,
  },
  {
    name: 'add_favicon_url_to_tenants',
    sql: `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "faviconUrl" TEXT;`,
  },
];

async function migrateDb(databaseUrl, tenantName) {
  const client = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    for (const migration of MIGRATIONS) {
      await client.$executeRawUnsafe(migration.sql);
      console.log(`  ✅ ${migration.name}`);
    }
  } catch (err) {
    console.error(`  ❌ Error:`, err.message);
  } finally {
    await client.$disconnect();
  }
}

async function main() {
  const tenants = await mainPrisma.tenant.findMany({
    select: { id: true, name: true, sigla: true, databaseUrl: true },
  });

  console.log(`Encontrados ${tenants.length} tenants.\n`);

  for (const tenant of tenants) {
    console.log(`→ [${tenant.sigla}] ${tenant.name}`);
    if (!tenant.databaseUrl) {
      console.log('  ⚠️  Sin databaseUrl, saltando.');
      continue;
    }
    await migrateDb(tenant.databaseUrl, tenant.name);
  }

  console.log('\nMigración completada.');
}

main()
  .catch(console.error)
  .finally(() => mainPrisma.$disconnect());
