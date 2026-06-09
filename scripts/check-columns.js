const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  // Check columns on users table
  const cols = await p.$queryRawUnsafe(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users' ORDER BY ordinal_position"
  );
  console.log('COLUMNS ON users TABLE:');
  for (const c of cols) {
    console.log(' -', c.column_name);
  }
  
  // Check if tenant_id exists on any table
  const tenantCols = await p.$queryRawUnsafe(
    "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND column_name LIKE '%tenant%' ORDER BY table_name"
  );
  console.log('\nALL tenant-related columns:');
  for (const c of tenantCols) {
    console.log(' -', c.table_name + '.' + c.column_name);
  }

  await p.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
