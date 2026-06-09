/**
 * Migra datos desde la BD global hacia las BDs propias de cada tenant.
 *
 * SEGURO:      No borra nada de la BD global.
 * IDEMPOTENTE: Usa upsert — se puede correr varias veces sin duplicar.
 * VERIFICABLE: Muestra conteos fuente vs destino al finalizar.
 *
 * Uso:
 *   node scripts/migrate-global-to-tenant-dbs.js                     # migrar todos
 *   node scripts/migrate-global-to-tenant-dbs.js --dry-run           # solo conteos, sin escribir
 *   node scripts/migrate-global-to-tenant-dbs.js --tenant PMBUGA     # solo un tenant
 *   node scripts/migrate-global-to-tenant-dbs.js --verify            # verificar sin migrar
 *
 * Tablas globales replicadas a cada tenant DB (FK / independencia):
 *   institution_types, case_states, non_business_days
 *
 * Tablas que permanecen SOLO en BD global (no se migran):
 *   system_config, system_settings, report_templates, dropdown_options, email_directory
 *
 * SUPER_ADMIN usuarios (tenantId = null) permanecen en BD global.
 */

// @ts-check

// Cargar .env manualmente (no hay dotenv instalado; Next.js lo carga automáticamente pero
// los scripts standalone de Node.js necesitan hacerlo explícitamente).
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
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const { PrismaClient } = require('@prisma/client');

const isDryRun  = process.argv.includes('--dry-run') || process.argv.includes('--verify');
const tenantArg = process.argv.includes('--tenant')
  ? process.argv[process.argv.indexOf('--tenant') + 1]
  : null;

const globalPrisma = new PrismaClient();

function tenantClient(databaseUrl) {
  return new PrismaClient({ datasources: { db: { url: databaseUrl } } });
}

async function upsertAll(dst, model, records, dryRun) {
  if (dryRun) return records.length;
  let ok = 0;
  for (const record of records) {
    try {
      await dst[model].upsert({
        where: { id: record.id },
        create: record,
        update: record,
      });
      ok++;
    } catch (e) {
      const msg = (e?.message || '').split('\n')[0];
      const meta = e?.meta ? ` meta=${JSON.stringify(e.meta)}` : '';
      console.warn(`   ⚠  ${model}[${record.id}]: ${msg}${meta}`);
    }
  }
  return ok;
}

async function upsertTenantSettings(dst, settings, dryRun) {
  if (dryRun) return;
  try {
    await dst.tenantSettings.upsert({
      where:  { tenantId: settings.tenantId },
      create: settings,
      update: settings,
    });
  } catch (e) {
    console.warn(`   ⚠  tenant_settings: ${(e?.message || '').split('\n')[0]}`);
  }
}

function row(label, src, dst, dryRun) {
  const dstStr = dryRun ? '(dry run)' : String(dst);
  const ok     = dryRun || src === dst;
  console.log(`   ${ok ? '✓' : '⚠'} ${label.padEnd(22)} ${String(src).padStart(5)} → ${dstStr.padStart(10)}`);
}

// ─────────────────────────────────────────────────────────────────────────────

async function migrateTenant(src, tenant, dryRun) {
  const { id: tenantId, sigla, name, databaseUrl } = tenant;
  const dst = tenantClient(databaseUrl);

  console.log(`\n${'━'.repeat(62)}`);
  console.log(` TENANT  [${sigla}]  ${name}`);
  console.log(`${'━'.repeat(62)}`);

  try {

    // ── 1. DATOS GLOBALES REPLICADOS ─────────────────────────────────────────

    const instTypes       = await src.institutionType.findMany();
    const n1              = await upsertAll(dst, 'institutionType', instTypes, dryRun);
    row('institution_types', instTypes.length, n1, dryRun);

    // CaseStates: replicados con mismos UUIDs → independencia total del tenant
    const caseStates      = await src.caseState.findMany();
    const n2              = await upsertAll(dst, 'caseState', caseStates, dryRun);
    row('case_states', caseStates.length, n2, dryRun);

    const nonBizDays      = await src.nonBusinessDay.findMany();
    const n3              = await upsertAll(dst, 'nonBusinessDay', nonBizDays, dryRun);
    row('non_business_days', nonBizDays.length, n3, dryRun);

    // ── 2. RÉPLICA DEL TENANT (FK para caseType, user, case…) ───────────────

    const tenantRecord    = await src.tenant.findUnique({ where: { id: tenantId } });
    if (tenantRecord) {
      const n4 = await upsertAll(dst, 'tenant', [tenantRecord], dryRun);
      row('tenant (replica)', 1, n4, dryRun);
    }

    // ── 3. CONFIGURACIÓN ─────────────────────────────────────────────────────

    const settings        = await src.tenantSettings.findUnique({ where: { tenantId } });
    if (settings) {
      await upsertTenantSettings(dst, settings, dryRun);
      row('tenant_settings', 1, dryRun ? '(dry run)' : 1, dryRun);
    }

    // ── 4. ROLES ─────────────────────────────────────────────────────────────

    const roles           = await src.role.findMany({ where: { tenantId } });
    const n6              = await upsertAll(dst, 'role', roles, dryRun);
    row('roles', roles.length, n6, dryRun);
    const validRoleIds    = new Set(roles.map(r => r.id));

    // ── 5. POSITIONS ─────────────────────────────────────────────────────────

    const positions       = await src.position.findMany({ where: { tenantId } });
    const n7              = await upsertAll(dst, 'position', positions, dryRun);
    row('positions', positions.length, n7, dryRun);

    // ── 6. CASE TYPES + SLA CONFIG ───────────────────────────────────────────

    const caseTypes       = await src.caseType.findMany({ where: { tenantId } });
    const n8              = await upsertAll(dst, 'caseType', caseTypes, dryRun);
    row('case_types', caseTypes.length, n8, dryRun);

    const caseTypeIds     = caseTypes.map(ct => ct.id);
    const slaConfigs      = caseTypeIds.length > 0
      ? await src.caseSLAConfig.findMany({ where: { caseTypeId: { in: caseTypeIds } } })
      : [];
    const n8b             = await upsertAll(dst, 'caseSLAConfig', slaConfigs, dryRun);
    row('case_sla_config', slaConfigs.length, n8b, dryRun);

    // ── 7. USUARIOS ──────────────────────────────────────────────────────────

    const srcUsers        = await src.user.findMany({ where: { tenantId } });
    const remappedUsers   = srcUsers.map(u => {
      if (u.roleId && !validRoleIds.has(u.roleId)) {
        console.warn(`   ↺  user ${u.fullName}: roleId ${u.roleId} no encontrado — se limpia`);
        return { ...u, roleId: null };
      }
      return u;
    });
    const n9              = await upsertAll(dst, 'user', remappedUsers, dryRun);
    row('users', srcUsers.length, n9, dryRun);
    const validUserIds    = new Set(remappedUsers.map(u => u.id));

    // ── 8. CIUDADANOS ────────────────────────────────────────────────────────

    const citizens        = await src.citizen.findMany({ where: { tenantId } });
    const n10             = await upsertAll(dst, 'citizen', citizens, dryRun);
    row('citizens', citizens.length, n10, dryRun);

    // ── 9. CASOS ─────────────────────────────────────────────────────────────

    const cases           = await src.case.findMany({ where: { tenantId } });
    const n11             = await upsertAll(dst, 'case', cases, dryRun);
    row('cases', cases.length, n11, dryRun);
    const caseIds         = cases.map(c => c.id);

    if (caseIds.length === 0) {
      console.log('   (sin casos — omitiendo datos dependientes)');
      return;
    }

    // ── 10. ASIGNACIONES ─────────────────────────────────────────────────────

    const assignments     = await src.assignment.findMany({ where: { tenantId } });

    // Usuarios externos referenciados como assignedBy
    await copyExternalUsers(src, dst, assignments.map(a => a.assignedBy), validUserIds, tenantId, dryRun);

    const n12             = await upsertAll(dst, 'assignment', assignments, dryRun);
    row('assignments', assignments.length, n12, dryRun);

    // ── 11. HISTORIAL DE ESTADO ──────────────────────────────────────────────

    const stateHist       = await src.caseStateHistory.findMany({ where: { caseId: { in: caseIds } } });
    const n13             = await upsertAll(dst, 'caseStateHistory', stateHist, dryRun);
    row('state_history', stateHist.length, n13, dryRun);

    // ── 12. HISTORIAL DE ASIGNACIONES ────────────────────────────────────────

    const assignHist      = caseIds.length > 0
      ? await src.caseAssignmentHistory.findMany({ where: { caseId: { in: caseIds } } })
      : [];

    // Usuarios externos referenciados en historial
    const histExtIds      = [
      ...assignHist.map(h => h.assignedByUserId),
      ...assignHist.map(h => h.newAssigneeId),
      ...assignHist.map(h => h.previousAssigneeId),
    ];
    await copyExternalUsers(src, dst, histExtIds, validUserIds, tenantId, dryRun);

    const n14             = await upsertAll(dst, 'caseAssignmentHistory', assignHist, dryRun);
    row('assign_history', assignHist.length, n14, dryRun);

    // ── 13. DOCUMENTOS ───────────────────────────────────────────────────────

    const docs            = await src.document.findMany({ where: { tenantId } });
    const n15             = await upsertAll(dst, 'document', docs, dryRun);
    row('documents', docs.length, n15, dryRun);

    // ── 14. AUDIT LOGS ───────────────────────────────────────────────────────

    const actionLogs      = await src.actionLog.findMany({ where: { tenantId } });
    // Omitir logs que referencian userId de otro tenant (integridad)
    const validLogs       = actionLogs.filter(l => !l.userId || validUserIds.has(l.userId));
    const n16             = await upsertAll(dst, 'actionLog', validLogs, dryRun);
    const omitted         = actionLogs.length - validLogs.length;
    row('action_logs', actionLogs.length, dryRun ? '(dry run)' : `${n16}${omitted > 0 ? ` (-${omitted})` : ''}`, dryRun);

    // ── 15. NOTIFICACIONES ───────────────────────────────────────────────────

    const notifs          = await src.notification.findMany({ where: { tenantId } });
    const n17             = await upsertAll(dst, 'notification', notifs, dryRun);
    row('notifications', notifs.length, n17, dryRun);

    // ── 16. REGISTROS DE ATENCIÓN ────────────────────────────────────────────

    const attendance      = await src.attendanceRecord.findMany({
      where: {
        OR: [
          { tenantId },
          { tenantId: null, createdBy: { in: [...validUserIds] } },
        ],
      },
    });
    // Asegurar tenantId en registros que no lo tienen
    const attendanceFixed = attendance.map(r => r.tenantId ? r : { ...r, tenantId });
    const n18             = await upsertAll(dst, 'attendanceRecord', attendanceFixed, dryRun);
    row('attendance_records', attendance.length, n18, dryRun);

    // ── VERIFICACIÓN CRUZADA ─────────────────────────────────────────────────

    if (!dryRun) {
      console.log(`\n   📊 VERIFICACIÓN FINAL:`);
      const [dstCases, dstUsers, dstCitizens, dstRoles, dstCaseStates] = await Promise.all([
        dst.case.count({ where: { tenantId } }),
        dst.user.count({ where: { tenantId } }),
        dst.citizen.count({ where: { tenantId } }),
        dst.role.count({ where: { tenantId } }),
        dst.caseState.count(),
      ]);
      row('Casos', cases.length, dstCases, false);
      row('Usuarios', srcUsers.length, dstUsers, false);
      row('Ciudadanos', citizens.length, dstCitizens, false);
      row('Roles', roles.length, dstRoles, false);
      row('CaseStates', caseStates.length, dstCaseStates, false);

      const allOk = dstCases === cases.length && dstUsers === srcUsers.length
        && dstCitizens === citizens.length && dstRoles === roles.length
        && dstCaseStates === caseStates.length;

      console.log(`\n   ${allOk ? '✅  OK — todos los registros migrados' : '⚠️   ALGUNOS REGISTROS NO MIGRADOS — revisar warnings'}`);
    }

  } finally {
    await dst.$disconnect();
  }
}

// Copia usuarios externos (de otro tenant o del sistema) que son referenciados
// en FK de assignments / historial, para satisfacer integridad referencial.
async function copyExternalUsers(src, dst, ids, validUserIds, tenantId, dryRun) {
  if (dryRun) return;
  const extIds = [...new Set(ids.filter(id => id && !validUserIds.has(id)))];
  if (extIds.length === 0) return;
  const extUsers = await src.user.findMany({ where: { id: { in: extIds } } });
  if (extUsers.length === 0) return;
  // Asignamos tenantId del tenant destino para satisfacer FK
  const remapped = extUsers.map(u => ({ ...u, tenantId }));
  await upsertAll(dst, 'user', remapped, false);
  remapped.forEach(u => validUserIds.add(u.id));
  console.log(`   ↺  ${extUsers.length} usuario(s) externo(s) copiados para integridad referencial`);
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       MIGRACIÓN: BD GLOBAL → BDs DE TENANT                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`  Modo:    ${isDryRun ? 'DRY RUN — solo conteos, no se escribe nada' : 'MIGRACIÓN REAL'}`);
  if (tenantArg) console.log(`  Tenant:  ${tenantArg}`);
  console.log('');

  try {
    const tenants = await globalPrisma.tenant.findMany({
      where: {
        databaseUrl: { not: null },
        ...(tenantArg ? { sigla: tenantArg } : {}),
      },
      select: { id: true, name: true, sigla: true, databaseUrl: true },
    });

    if (tenants.length === 0) {
      console.log('No se encontraron tenants con databaseUrl configurada.');
      if (tenantArg) console.log(`¿Existe la sigla "${tenantArg}"?`);
      return;
    }

    console.log(`Tenants encontrados: ${tenants.length}`);
    tenants.forEach(t => console.log(`  • [${t.sigla}]  ${t.name}`));

    for (const tenant of tenants) {
      await migrateTenant(globalPrisma, tenant, isDryRun);
    }

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log(`║  ${isDryRun ? 'DRY RUN COMPLETADO — ningún dato fue modificado        ' : 'MIGRACIÓN COMPLETADA                                        '}║`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  ⚠  La BD global NO fue modificada ni limpiada.           ║');
    console.log('║     Verifica los datos antes de cualquier acción de        ║');
    console.log('║     limpieza en la BD global.                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } finally {
    await globalPrisma.$disconnect();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
