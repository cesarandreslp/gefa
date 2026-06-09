// @ts-check
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// NOTA: Script de migración ya ejecutado. No volver a correr en producción.
// Requiere en .env: OLD_DB, DATABASE_URL, DATABASE_URL_BUGA, DATABASE_URL_GUACARI
const OLD_DB    = process.env.OLD_DB;
const MAIN_DB   = process.env.DATABASE_URL;
const BUGA_DB   = process.env.DATABASE_URL_BUGA;
const GUACARI_DB= process.env.DATABASE_URL_GUACARI;

const BUGA_ID    = 'e433ad70-0a62-4a81-9d0d-9bfb66b286ed';
const GUACARI_ID = '94a1473f-c0d4-4639-a119-2797a7bf175a';

const client = (url) => new PrismaClient({ datasources: { db: { url } } });

// Convierte campos JSON null a undefined (Prisma requiere Prisma.DbNull para campos JSON)
const fixJson = (obj) => {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = v === null && typeof v === 'object' ? null : v;
  }
  return result;
};

async function upsertAll(dst, model, records, uniqueKey = 'id') {
  let count = 0;
  for (const record of records) {
    try {
      await dst[model].upsert({
        where: { [uniqueKey]: record[uniqueKey] },
        create: record,
        update: record,
      });
      count++;
    } catch (e) {
      const msg = e?.message?.split('\n')[0] || '';
      const code = e?.code || '';
      const meta = e?.meta ? JSON.stringify(e.meta) : '';
      console.warn(`   ⚠ ${model}[${record[uniqueKey]}]: code=${code} ${msg} ${meta}`);
    }
  }
  return count;
}

async function ensureTenantIaUser(db, tenantId, sigla) {
  const iaRole = await db.role.findFirst({ where: { tenantId, code: 'ASIGNACION_DE_CASOS' } });
  if (!iaRole) { console.warn(`   ⚠ Rol ASIGNACION_DE_CASOS no encontrado para ${sigla}`); return; }

  const existing = await db.user.findFirst({ where: { tenantId, roleId: iaRole.id } });
  if (existing) {
    console.log(`   ✓ Usuario IA ya existe para ${sigla} (${existing.fullName})`);
    return;
  }

  const passwordHash = await bcrypt.hash(`ia-internal-${tenantId}`, 10);
  await db.user.create({
    data: {
      tenantId,
      email: `ia.asignacion@${sigla.toLowerCase()}.sistema.interno`,
      passwordHash,
      fullName: 'Agente IA - Asignación Automática',
      documentType: 'SISTEMA',
      documentNumber: `IA-${sigla.toUpperCase()}`,
      roleId: iaRole.id,
      department: 'Sistema',
      position: 'Inteligencia Artificial',
      isActive: true,
      mustChangePassword: false,
      maxCaseLoad: 999999,
    }
  });
  console.log(`   ✓ Usuario IA creado para ${sigla}`);
}

async function migrate() {
  const old      = client(OLD_DB);
  const main     = client(MAIN_DB);
  const buga     = client(BUGA_DB);
  const guacari  = client(GUACARI_DB);

  try {
    console.log('=== MIGRACIÓN MULTI-TENANT ===\n');

    // ── 1. BD PRINCIPAL ────────────────────────────────────────────────────────
    console.log('1. BD Principal (super admins + tenant registry)...');

    const instTypes = await old.institutionType.findMany();
    let n = await upsertAll(main, 'institutionType', instTypes);
    console.log(`   ✓ ${n} institution types`);

    // Seleccionar solo campos que existen en la BD antigua (no tiene databaseUrl etc.)
    const tenants = await old.tenant.findMany({
      select: { id: true, name: true, sigla: true, domain: true, logoUrl: true,
        primaryColor: true, secondaryColor: true, institutionalEmail: true, phone: true,
        address: true, isActive: true, createdAt: true, updatedAt: true, institutionTypeId: true }
    });
    for (const t of tenants) {
      const isBuga    = t.id === BUGA_ID;
      const isGuacari = t.id === GUACARI_ID;
      try {
        await main.tenant.upsert({
          where: { id: t.id },
          create: {
            ...t,
            databaseUrl:       isBuga ? BUGA_DB    : isGuacari ? GUACARI_DB : null,
            databaseUrlDirect: isBuga ? process.env.DATABASE_URL_BUGA_UNPOOLED
              : isGuacari ? process.env.DATABASE_URL_GUACARI_UNPOOLED
              : null,
            neonProjectId: isBuga ? process.env.NEON_PROJECT_ID_BUGA : isGuacari ? process.env.NEON_PROJECT_ID_GUACARI : null,
          },
          update: {
            databaseUrl:       isBuga ? BUGA_DB    : isGuacari ? GUACARI_DB : null,
            databaseUrlDirect: isBuga ? process.env.DATABASE_URL_BUGA_UNPOOLED
              : isGuacari ? process.env.DATABASE_URL_GUACARI_UNPOOLED
              : null,
            neonProjectId: isBuga ? process.env.NEON_PROJECT_ID_BUGA : isGuacari ? process.env.NEON_PROJECT_ID_GUACARI : null,
          },
        });
      } catch(e) {
        const msg = e?.message?.split('\n')[0] || '';
        const code = e?.code || '';
        const meta = e?.meta ? JSON.stringify(e.meta) : '';
        console.warn(`   ⚠ tenant ${t.name}: code=${code} ${msg} ${meta}`);
      }
    }
    console.log(`   ✓ ${tenants.length} tenants (con databaseUrl)`);

    // Super admin role + users
    const saRole = await old.role.findFirst({ where: { code: 'SUPER_ADMIN', tenantId: null } });
    if (saRole) {
      await upsertAll(main, 'role', [saRole]);
    }
    const superAdmins = await old.user.findMany({ where: { tenantId: null } });
    n = await upsertAll(main, 'user', superAdmins);
    console.log(`   ✓ ${n} super admins`);

    // ── 2. BD BUGA ─────────────────────────────────────────────────────────────
    console.log('\n2. BD Buga...');
    await migrateTenant(old, buga, BUGA_ID);
    await ensureTenantIaUser(buga, BUGA_ID, 'PMBUGA');

    // ── 3. BD GUACARÍ ──────────────────────────────────────────────────────────
    console.log('\n3. BD Guacarí...');
    await migrateTenant(old, guacari, GUACARI_ID);
    await ensureTenantIaUser(guacari, GUACARI_ID, 'PMGUACARI');

    console.log('\n✅ MIGRACIÓN COMPLETADA');

    // Verificación final
    const [mainTenants, bugaCases, guacariCases] = await Promise.all([
      main.tenant.count(),
      buga.case.count(),
      guacari.case.count(),
    ]);
    console.log(`\n--- VERIFICACIÓN ---`);
    console.log(`BD Principal: ${mainTenants} tenants`);
    console.log(`BD Buga:      ${bugaCases} casos`);
    console.log(`BD Guacarí:   ${guacariCases} casos`);

  } finally {
    await Promise.all([old.$disconnect(), main.$disconnect(), buga.$disconnect(), guacari.$disconnect()]);
  }
}

async function migrateTenant(src, dst, tenantId) {
  // Tenant record (copia local para config/branding) — solo campos del esquema antiguo
  const tenant = await src.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, sigla: true, domain: true, logoUrl: true,
      primaryColor: true, secondaryColor: true, institutionalEmail: true, phone: true,
      address: true, isActive: true, createdAt: true, updatedAt: true, institutionTypeId: true }
  });
  if (tenant) await upsertAll(dst, 'tenant', [tenant]);

  // Datos globales replicados
  const instTypes  = await src.institutionType.findMany();
  await upsertAll(dst, 'institutionType', instTypes);

  const caseStates = await src.caseState.findMany();
  const n1 = await upsertAll(dst, 'caseState', caseStates);
  console.log(`   ✓ ${n1} case states`);

  // Datos del tenant
  const roles = await src.role.findMany({ where: { tenantId } });
  const n2 = await upsertAll(dst, 'role', roles);
  console.log(`   ✓ ${n2} roles`);
  // Mapa: roleId_fuente → roleId_destino (para remapear usuarios con roleId de otro tenant)
  const roleCodeToDestId = new Map(roles.map(r => [r.code, r.id]));
  const validRoleIds = new Set(roles.map(r => r.id));

  const positions = await src.position.findMany({ where: { tenantId } });
  const n3 = await upsertAll(dst, 'position', positions);
  console.log(`   ✓ ${n3} positions`);

  const caseTypes = await src.caseType.findMany({ where: { tenantId } });
  const n4 = await upsertAll(dst, 'caseType', caseTypes);
  console.log(`   ✓ ${n4} case types`);

  const settings = await src.tenantSettings.findUnique({ where: { tenantId } });
  if (settings) {
    try {
      await dst.tenantSettings.upsert({
        where: { tenantId },
        create: settings,
        update: settings,
      });
      console.log(`   ✓ tenant settings`);
    } catch(e) {
      const msg = e?.message?.split('\n')[0] || '';
      const code = e?.code || '';
      const meta = e?.meta ? JSON.stringify(e.meta) : '';
      console.warn(`   ⚠ settings: code=${code} ${msg} ${meta}`);
    }
  }

  // Remapear usuarios con roleId de otro tenant
  const srcUsers = await src.user.findMany({ where: { tenantId } });
  const remappedUsers = await Promise.all(srcUsers.map(async u => {
    if (u.roleId && !validRoleIds.has(u.roleId)) {
      const srcRole = await src.role.findUnique({ where: { id: u.roleId } });
      const destId = srcRole ? roleCodeToDestId.get(srcRole.code) : undefined;
      if (destId) {
        console.log(`   ↺ user ${u.fullName}: roleId remapped (${srcRole.code})`);
        return { ...u, roleId: destId };
      }
      console.warn(`   ⚠ user ${u.fullName}: roleId ${u.roleId} no existe en destino, omitiendo`);
      return null;
    }
    return u;
  }));
  const validUsers = remappedUsers.filter(Boolean);
  const n5 = await upsertAll(dst, 'user', validUsers);
  console.log(`   ✓ ${n5} users`);
  const validUserIds = new Set(validUsers.map(u => u.id));

  const citizens = await src.citizen.findMany({ where: { tenantId } });
  const n6 = await upsertAll(dst, 'citizen', citizens);
  console.log(`   ✓ ${n6} citizens`);

  const cases = await src.case.findMany({ where: { tenantId } });
  const n7 = await upsertAll(dst, 'case', cases);
  console.log(`   ✓ ${n7} cases`);

  const caseIds = cases.map(c => c.id);

  // Detectar usuarios externos (de otro tenant) referenciados en assignments/history
  // y copiarlos al destino con roleId remapeado
  const srcAssignments = await src.assignment.findMany({ where: { tenantId } });
  const srcAssignHist = caseIds.length > 0
    ? await src.caseAssignmentHistory.findMany({ where: { caseId: { in: caseIds } } })
    : [];
  const externalUserIds = new Set([
    ...srcAssignments.map(a => a.assignedBy).filter(id => id && !validUserIds.has(id)),
    ...srcAssignHist.map(h => h.assignedByUserId).filter(id => id && !validUserIds.has(id)),
    ...srcAssignHist.map(h => h.newAssigneeId).filter(id => id && !validUserIds.has(id)),
    ...srcAssignHist.map(h => h.previousAssigneeId).filter(id => id && !validUserIds.has(id)),
  ]);
  if (externalUserIds.size > 0) {
    const extUsers = await src.user.findMany({ where: { id: { in: [...externalUserIds] } } });
    const remappedExtUsers = await Promise.all(extUsers.map(async u => {
      const srcRole = u.roleId ? await src.role.findUnique({ where: { id: u.roleId } }) : null;
      const destRoleId = srcRole ? roleCodeToDestId.get(srcRole.code) : undefined;
      return { ...u, tenantId, roleId: destRoleId || u.roleId };
    }));
    const nExt = await upsertAll(dst, 'user', remappedExtUsers);
    remappedExtUsers.forEach(u => validUserIds.add(u.id));
    console.log(`   ↺ ${nExt} usuarios externos copiados (ej. IA)`);
  }

  const n8 = await upsertAll(dst, 'assignment', srcAssignments);
  console.log(`   ✓ ${n8} assignments`);

  if (caseIds.length > 0) {
    const stateHist = await src.caseStateHistory.findMany({ where: { caseId: { in: caseIds } } });
    const n9 = await upsertAll(dst, 'caseStateHistory', stateHist);
    console.log(`   ✓ ${n9} state history`);

    const n10 = await upsertAll(dst, 'caseAssignmentHistory', srcAssignHist);
    console.log(`   ✓ ${n10} assignment history`);

    const docs = await src.document.findMany({ where: { tenantId } });
    const n11 = await upsertAll(dst, 'document', docs);
    console.log(`   ✓ ${n11} documents`);

    const srcLogs = await src.actionLog.findMany({ where: { tenantId } });
    const fixedLogs = srcLogs.filter(l => !l.userId || validUserIds.has(l.userId));
    const n12 = await upsertAll(dst, 'actionLog', fixedLogs);
    console.log(`   ✓ ${n12} action logs`);

    const notifs = await src.notification.findMany({ where: { tenantId } });
    const n13 = await upsertAll(dst, 'notification', notifs);
    console.log(`   ✓ ${n13} notifications`);
  }

  // attendanceRecord: el cliente viejo no tiene tenantId, filtramos por createdBy
  const userIds = srcUsers.map(u => u.id);
  const attendance = userIds.length > 0
    ? await src.attendanceRecord.findMany({ where: { createdBy: { in: userIds } } })
    : [];
  if (attendance.length > 0) {
    const n14 = await upsertAll(dst, 'attendanceRecord', attendance);
    console.log(`   ✓ ${n14} attendance records`);
  }
}

migrate().catch(e => { console.error(e); process.exit(1); });
