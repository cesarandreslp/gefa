/**
 * Script: migrate-to-multitenant.ts
 * Migra los datos de la BD única (cuenta Neon vieja) a la nueva arquitectura
 * de 3 BDs independientes:
 *   - BD Principal (ventanilla_unica): tenants, super admins, institution types
 *   - BD Buga (tenant-buga): todos los datos de Buga
 *   - BD Guacarí (tenant-guacari): todos los datos de Guacarí
 */

import { PrismaClient } from '@prisma/client';

// NOTA: Script de migración ya ejecutado. No volver a correr en producción.
// Requiere en .env: OLD_DB, DATABASE_URL, DATABASE_URL_BUGA, DATABASE_URL_GUACARI
const OLD_DB = process.env.OLD_DB!;
const MAIN_DB = process.env.DATABASE_URL!;
const BUGA_DB = process.env.DATABASE_URL_BUGA!;
const GUACARI_DB = process.env.DATABASE_URL_GUACARI!;

const BUGA_TENANT_ID = 'e433ad70-0a62-4a81-9d0d-9bfb66b286ed';
const GUACARI_TENANT_ID = '94a1473f-c0d4-4639-a119-2797a7bf175a';

const oldPrisma  = new PrismaClient({ datasources: { db: { url: OLD_DB } } });
const mainPrisma = new PrismaClient({ datasources: { db: { url: MAIN_DB } } });
const bugaPrisma = new PrismaClient({ datasources: { db: { url: BUGA_DB } } });
const guacariPrisma = new PrismaClient({ datasources: { db: { url: GUACARI_DB } } });

async function migrate() {
  console.log('=== MIGRACIÓN MULTI-TENANT ===\n');

  // ─── 1. BD PRINCIPAL: institution types + tenants ──────────────────────────
  console.log('1. Migrando BD Principal...');

  const institutionTypes = await oldPrisma.institutionType.findMany();
  for (const it of institutionTypes) {
    await mainPrisma.institutionType.upsert({
      where: { id: it.id },
      create: it,
      update: it,
    });
  }
  console.log(`   ✓ ${institutionTypes.length} institution types`);

  // Tenants con sus nuevas databaseUrls
  const tenants = await oldPrisma.tenant.findMany();
  for (const t of tenants) {
    const isGcuacari = t.id === GUACARI_TENANT_ID;
    const isBuga = t.id === BUGA_TENANT_ID;
    await mainPrisma.tenant.upsert({
      where: { id: t.id },
      create: {
        ...t,
        databaseUrl: isBuga ? BUGA_DB : isGcuacari ? GUACARI_DB : null,
        databaseUrlDirect: isBuga ? process.env.DATABASE_URL_BUGA_UNPOOLED
          : isGcuacari ? process.env.DATABASE_URL_GUACARI_UNPOOLED
          : null,
        neonProjectId: isBuga ? process.env.NEON_PROJECT_ID_BUGA : isGcuacari ? process.env.NEON_PROJECT_ID_GUACARI : null,
      },
      update: {
        databaseUrl: isBuga ? BUGA_DB : isGcuacari ? GUACARI_DB : null,
        neonProjectId: isBuga ? process.env.NEON_PROJECT_ID_BUGA : isGcuacari ? process.env.NEON_PROJECT_ID_GUACARI : null,
      },
    });
  }
  console.log(`   ✓ ${tenants.length} tenants (con databaseUrl asignado)`);

  // Super admins (usuarios con tenantId: null)
  const superAdmins = await oldPrisma.user.findMany({ where: { tenantId: null } });
  const superAdminRole = await oldPrisma.role.findFirst({ where: { code: 'SUPER_ADMIN', tenantId: null } });

  if (superAdminRole) {
    await mainPrisma.role.upsert({
      where: { id: superAdminRole.id },
      create: superAdminRole,
      update: superAdminRole,
    });
  }
  for (const sa of superAdmins) {
    await mainPrisma.user.upsert({
      where: { id: sa.id },
      create: sa,
      update: sa,
    });
  }
  console.log(`   ✓ ${superAdmins.length} super admins`);

  // ─── 2. BD BUGA ─────────────────────────────────────────────────────────────
  console.log('\n2. Migrando BD Buga...');
  await migrateTenantData(oldPrisma, bugaPrisma, BUGA_TENANT_ID, 'Buga');

  // ─── 3. BD GUACARÍ ──────────────────────────────────────────────────────────
  console.log('\n3. Migrando BD Guacarí...');
  await migrateTenantData(oldPrisma, guacariPrisma, GUACARI_TENANT_ID, 'Guacarí');

  console.log('\n=== MIGRACIÓN COMPLETADA ✓ ===');
}

async function migrateTenantData(
  src: PrismaClient,
  dst: PrismaClient,
  tenantId: string,
  label: string
) {
  // Tenant (copia local para que el app pueda leer config sin ir a BD principal)
  const tenant = await src.tenant.findUnique({ where: { id: tenantId } });
  if (tenant) {
    await dst.tenant.upsert({ where: { id: tenant.id }, create: tenant, update: tenant });
    console.log(`   ✓ tenant (${label})`);
  }

  // Institution types (referencia global)
  const institutionTypes = await src.institutionType.findMany();
  for (const it of institutionTypes) {
    await dst.institutionType.upsert({ where: { id: it.id }, create: it, update: it });
  }
  console.log(`   ✓ ${institutionTypes.length} institution types`);

  // CaseStates (globales, se replican en cada tenant)
  const caseStates = await src.caseState.findMany();
  for (const cs of caseStates) {
    await dst.caseState.upsert({ where: { id: cs.id }, create: cs, update: cs });
  }
  console.log(`   ✓ ${caseStates.length} case states`);

  // Roles
  const roles = await src.role.findMany({ where: { tenantId } });
  for (const r of roles) {
    await dst.role.upsert({ where: { id: r.id }, create: r, update: r });
  }
  console.log(`   ✓ ${roles.length} roles`);

  // Positions
  const positions = await src.position.findMany({ where: { tenantId } });
  for (const p of positions) {
    await dst.position.upsert({ where: { id: p.id }, create: p, update: p });
  }
  console.log(`   ✓ ${positions.length} positions`);

  // CaseTypes
  const caseTypes = await src.caseType.findMany({ where: { tenantId } });
  for (const ct of caseTypes) {
    await dst.caseType.upsert({ where: { id: ct.id }, create: ct, update: ct });
  }
  console.log(`   ✓ ${caseTypes.length} case types`);

  // TenantSettings
  const settings = await src.tenantSettings.findUnique({ where: { tenantId } });
  if (settings) {
    await dst.tenantSettings.upsert({
      where: { tenantId: settings.tenantId },
      create: settings,
      update: settings,
    });
    console.log(`   ✓ tenant settings`);
  }

  // Users
  const users = await src.user.findMany({ where: { tenantId } });
  for (const u of users) {
    await dst.user.upsert({ where: { id: u.id }, create: u, update: u });
  }
  console.log(`   ✓ ${users.length} users`);

  // Citizens
  const citizens = await src.citizen.findMany({ where: { tenantId } });
  for (const c of citizens) {
    await dst.citizen.upsert({ where: { id: c.id }, create: c, update: c });
  }
  console.log(`   ✓ ${citizens.length} citizens`);

  // Cases
  const cases = await src.case.findMany({ where: { tenantId } });
  for (const c of cases) {
    await dst.case.upsert({ where: { id: c.id }, create: c, update: c });
  }
  console.log(`   ✓ ${cases.length} cases`);

  // Assignments
  const assignments = await src.assignment.findMany({ where: { tenantId } });
  for (const a of assignments) {
    await dst.assignment.upsert({ where: { id: a.id }, create: a, update: a });
  }
  console.log(`   ✓ ${assignments.length} assignments`);

  // CaseStateHistory (por casos del tenant)
  const caseIds = cases.map((c) => c.id);
  if (caseIds.length > 0) {
    const stateHistory = await src.caseStateHistory.findMany({ where: { caseId: { in: caseIds } } });
    for (const sh of stateHistory) {
      await dst.caseStateHistory.upsert({ where: { id: sh.id }, create: sh, update: sh });
    }
    console.log(`   ✓ ${stateHistory.length} state history`);

    const assignHistory = await src.caseAssignmentHistory.findMany({ where: { caseId: { in: caseIds } } });
    for (const ah of assignHistory) {
      await dst.caseAssignmentHistory.upsert({ where: { id: ah.id }, create: ah, update: ah });
    }
    console.log(`   ✓ ${assignHistory.length} assignment history`);

    const documents = await src.document.findMany({ where: { tenantId } });
    for (const d of documents) {
      await dst.document.upsert({ where: { id: d.id }, create: d, update: d });
    }
    console.log(`   ✓ ${documents.length} documents`);

    const actionLogs = await src.actionLog.findMany({ where: { tenantId } });
    for (const al of actionLogs) {
      await dst.actionLog.upsert({ where: { id: al.id }, create: al, update: al });
    }
    console.log(`   ✓ ${actionLogs.length} action logs`);

    const notifications = await src.notification.findMany({ where: { tenantId } });
    for (const n of notifications) {
      await dst.notification.upsert({ where: { id: n.id }, create: n, update: n });
    }
    console.log(`   ✓ ${notifications.length} notifications`);
  }

  // AttendanceRecords
  const userIds = users.map((u) => u.id);
  if (userIds.length > 0) {
    const attendance = await src.attendanceRecord.findMany({ where: { tenantId } });
    for (const ar of attendance) {
      await dst.attendanceRecord.upsert({ where: { id: ar.id }, create: ar, update: ar });
    }
    console.log(`   ✓ ${attendance.length} attendance records`);
  }
}

migrate()
  .catch((e) => { console.error('ERROR:', e); process.exit(1); })
  .finally(async () => {
    await Promise.all([
      oldPrisma.$disconnect(),
      mainPrisma.$disconnect(),
      bugaPrisma.$disconnect(),
      guacariPrisma.$disconnect(),
    ]);
  });
