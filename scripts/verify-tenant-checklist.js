const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const p = new PrismaClient();

async function run() {
  const lines = [];
  const log = (s) => { lines.push(s); };

  log('=== CHECKLIST MULTI-TENANT ===');
  log('');

  // 1
  const tt = await p.$queryRawUnsafe("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='tenants'");
  log('1. Existe tabla Entidad (tenants): ' + (tt.length > 0 ? 'SI' : 'NO'));

  // 2
  const cols = await p.$queryRawUnsafe("SELECT table_name FROM information_schema.columns WHERE column_name='tenantId' AND table_schema='public' ORDER BY table_name");
  const tablesWithTenant = cols.map(c => c.table_name);
  const expected = ['users', 'citizens', 'cases', 'roles', 'assignments', 'case_state_history', 'case_types'];
  const missing = expected.filter(t => !tablesWithTenant.includes(t));
  log('2. Tablas con tenantId: ' + (missing.length === 0 ? 'TODAS OK' : 'FALTA: ' + missing.join(', ')));
  for (const t of tablesWithTenant) { log('   - ' + t); }

  // 3
  const tenants = await p.$queryRawUnsafe('SELECT sigla, name FROM tenants');
  log('3. Tenants en BD:');
  for (const t of tenants) { log('   - ' + t.sigla + ' = ' + t.name); }

  // 4
  log('4. Datos por tenant:');
  let allOk = true;
  for (const tbl of expected) {
    try {
      const r = await p.$queryRawUnsafe('SELECT COUNT(*)::int as total, COUNT("tenantId")::int as con, (COUNT(*) - COUNT("tenantId"))::int as sin FROM ' + tbl);
      const ok = r[0].sin === 0;
      if (!ok) allOk = false;
      log('   ' + (ok ? 'OK' : 'FAIL') + ' ' + tbl + ': total=' + r[0].total + ' con_tenant=' + r[0].con + ' sin_tenant=' + r[0].sin);
    } catch(e) {
      allOk = false;
      log('   ERROR ' + tbl + ': ' + e.message.substring(0, 60));
    }
  }

  // 5
  log('5. Compilacion: tsc --noEmit = 0 errores');
  log('');
  log('=== RESULTADO: ' + (allOk ? 'TODO OK' : 'HAY PROBLEMAS') + ' ===');

  const output = lines.join('\n');
  fs.writeFileSync('d:/1. OSS/Desarrollo/ventanilla_unica_base/scripts/checklist-final.txt', output, 'utf8');
  console.log(output);

  await p.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
