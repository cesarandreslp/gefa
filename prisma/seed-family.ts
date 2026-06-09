/**
 * SEED — Catálogo de tipos de caso de COMISARÍA DE FAMILIA (GEFA)
 * ---------------------------------------------------------------------------
 * Aplica (idempotente, upsert) el catálogo canónico `FAMILY_CASE_TYPES` a los
 * tenants presentes en la BD apuntada por DATABASE_URL.
 *
 * Uso:
 *   DATABASE_URL=<conn> npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" prisma/seed-family.ts
 *   DATABASE_URL=<conn> npx ts-node ... prisma/seed-family.ts PMBUGA   # solo un tenant (por sigla)
 *
 * Nota: los tipos de caso pertenecen a la BD de cada tenant (comisaría). El
 * camino normal de creación es el provisioning del super-admin; este script
 * sirve para refrescar o migrar tenants ya existentes.
 * ---------------------------------------------------------------------------
 */

import { PrismaClient } from '@prisma/client';
import { FAMILY_CASE_TYPES } from '../src/domain/catalogs/familyCaseTypes';

const prisma = new PrismaClient();

async function main() {
  const siglaFilter = process.argv[2]?.trim().toUpperCase();

  console.log('🌱 Seed de tipos de caso de comisaría de familia\n');

  const tenants = await prisma.tenant.findMany({
    where: siglaFilter ? { sigla: siglaFilter } : undefined,
    select: { id: true, sigla: true, name: true },
  });

  if (tenants.length === 0) {
    console.log(
      siglaFilter
        ? `⚠️  No se encontró ningún tenant con sigla "${siglaFilter}" en esta BD.`
        : '⚠️  No hay tenants en esta BD. Los tipos de caso se crean en la BD de cada comisaría (control plane no los necesita).'
    );
    return;
  }

  for (const tenant of tenants) {
    console.log(`🏢 ${tenant.name} (${tenant.sigla})`);
    for (const ct of FAMILY_CASE_TYPES) {
      const code = `${ct.code}_${tenant.sigla.toUpperCase()}`;
      await prisma.caseType.upsert({
        where: { code },
        update: {
          name: ct.name,
          description: ct.description,
          defaultLegalTermDays: ct.defaultLegalTermDays,
          legalReference: ct.legalReference,
          requiresSupervisorApproval: ct.requiresSupervisorApproval,
          requiresSignature: ct.requiresSignature,
          displayOrder: ct.displayOrder,
          isActive: true,
        },
        create: {
          tenantId: tenant.id,
          code,
          name: ct.name,
          description: ct.description,
          defaultLegalTermDays: ct.defaultLegalTermDays,
          legalReference: ct.legalReference,
          requiresSupervisorApproval: ct.requiresSupervisorApproval,
          requiresSignature: ct.requiresSignature,
          displayOrder: ct.displayOrder,
          isActive: true,
          allowedStateIds: [],
        },
      });
      console.log(`   ✅ ${code} — ${ct.name} (${ct.defaultLegalTermDays} días)`);
    }
    console.log('');
  }

  console.log('✅ Seed de tipos de caso de familia completado.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed-family:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
