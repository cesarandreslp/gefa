/**
 * Fix: Actualizar la columna userId de action_logs para permitir NULL
 * en todas las BDs de tenant.
 * 
 * El schema define userId como String? (nullable), pero las BDs de tenant
 * tienen la restricción NOT NULL de una versión anterior del schema.
 * 
 * Esto rompe el portal de entidades externas que necesita crear ActionLogs
 * con userId: null.
 * 
 * Uso: node scripts/fix-actionlog-userid.js [--apply]
 */
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

const APPLY = process.argv.includes('--apply');

async function main() {
  const mainPrisma = new PrismaClient();

  try {
    // Obtener todos los tenants con BD propia
    const tenants = await mainPrisma.tenant.findMany({
      where: { databaseUrl: { not: null } },
      select: { id: true, name: true, sigla: true, databaseUrl: true },
    });

    console.log(`📋 Tenants con BD propia: ${tenants.length}`);

    for (const tenant of tenants) {
      console.log(`\n🏢 ${tenant.name} (${tenant.sigla})`);
      
      const tenantPrisma = new PrismaClient({
        datasources: { db: { url: tenant.databaseUrl } },
      });

      try {
        // Verificar si userId es nullable
        const columns = await tenantPrisma.$queryRaw`
          SELECT column_name, is_nullable, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'action_logs' AND column_name = 'userId'
        `;

        if (columns.length === 0) {
          console.log('   ⚠️  Columna userId no encontrada en action_logs');
          continue;
        }

        const col = columns[0];
        console.log(`   userId: nullable=${col.is_nullable}, type=${col.data_type}`);

        if (col.is_nullable === 'NO') {
          console.log('   🔴 userId es NOT NULL — necesita fix');
          
          if (APPLY) {
            await tenantPrisma.$executeRaw`
              ALTER TABLE action_logs ALTER COLUMN "userId" DROP NOT NULL
            `;
            console.log('   ✅ Corregido: userId ahora permite NULL');
          } else {
            console.log('   ⏸️  Ejecuta con --apply para corregir');
          }
        } else {
          console.log('   ✅ userId ya permite NULL — OK');
        }

        // También verificar caseId (debería ser nullable según el schema)
        const caseCol = await tenantPrisma.$queryRaw`
          SELECT column_name, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'action_logs' AND column_name = 'caseId'
        `;
        
        if (caseCol.length > 0 && caseCol[0].is_nullable === 'NO') {
          console.log('   🔴 caseId es NOT NULL — necesita fix');
          if (APPLY) {
            await tenantPrisma.$executeRaw`
              ALTER TABLE action_logs ALTER COLUMN "caseId" DROP NOT NULL
            `;
            console.log('   ✅ Corregido: caseId ahora permite NULL');
          }
        }

      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      } finally {
        await tenantPrisma.$disconnect();
      }
    }

    // También verificar la BD global
    console.log('\n🌐 BD Global:');
    try {
      const columns = await mainPrisma.$queryRaw`
        SELECT column_name, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'action_logs' AND column_name = 'userId'
      `;
      if (columns.length > 0) {
        console.log(`   userId: nullable=${columns[0].is_nullable}`);
        if (columns[0].is_nullable === 'NO' && APPLY) {
          await mainPrisma.$executeRaw`
            ALTER TABLE action_logs ALTER COLUMN "userId" DROP NOT NULL
          `;
          console.log('   ✅ Corregido en BD global también');
        }
      }
    } catch (err) {
      console.log(`   Error: ${err.message}`);
    }

    if (!APPLY) {
      console.log('\n💡 Para aplicar los cambios, ejecuta:');
      console.log('   node scripts/fix-actionlog-userid.js --apply');
    } else {
      console.log('\n✅ Todos los cambios aplicados');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mainPrisma.$disconnect();
  }
}

main();
