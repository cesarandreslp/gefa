const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

const { PrismaClient } = require('@prisma/client');

async function main() {
  const mainPrisma = new PrismaClient();

  // Obtener la databaseUrl del tenant de Guacarí
  const tokenRoute = await mainPrisma.externalTokenRoute.findUnique({
    where: { token: '563f3ec6-3747-4fb1-bf04-fb899f75443b' }
  });

  const tenantPrisma = new PrismaClient({
    datasources: { db: { url: tokenRoute.databaseUrl } }
  });

  console.log('=== TODAS las columnas de action_logs con su nullability ===');
  const columns = await tenantPrisma.$queryRaw`
    SELECT column_name, is_nullable, data_type, column_default
    FROM information_schema.columns 
    WHERE table_name = 'action_logs'
    ORDER BY ordinal_position
  `;

  const schemaExpected = {
    id: 'NO',        // PK, always required
    tenantId: 'YES', // String?
    timestamp: 'NO', // has @default(now())
    userId: 'YES',   // String? (JUST FIXED)
    userEmail: 'NO', // String (required)
    userRole: 'NO',  // String (required) 
    action: 'NO',    // String (required)
    entityType: 'NO',// String (required)
    entityId: 'NO',  // String (required)
    ipAddress: 'NO', // String (required)
    userAgent: 'NO', // String (required)
    sessionId: 'YES',// String?
    before: 'YES',   // Json?
    after: 'YES',    // Json?
    metadata: 'YES', // Json?
    success: 'NO',   // Boolean @default(true) 
    errorMessage: 'YES', // String?
    checksum: 'NO',  // String (required)
    previousHash: 'YES', // String?
    caseId: 'YES',   // String?
  };

  console.log('\nColumn           | DB Nullable | Expected | Match?');
  console.log('-'.repeat(60));
  
  const mismatches = [];
  for (const col of columns) {
    const expected = schemaExpected[col.column_name];
    const match = expected === col.is_nullable ? '✅' : '❌ MISMATCH';
    if (expected !== col.is_nullable && expected) {
      mismatches.push(col.column_name);
    }
    console.log(`${col.column_name.padEnd(17)}| ${col.is_nullable.padEnd(12)}| ${(expected || '?').padEnd(9)}| ${match}`);
  }

  if (mismatches.length > 0) {
    console.log('\n🔴 Columnas que necesitan fix:', mismatches.join(', '));
  } else {
    console.log('\n✅ Todas las columnas coinciden con el schema');
  }

  await tenantPrisma.$disconnect();
  await mainPrisma.$disconnect();
}

main();
