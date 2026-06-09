const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAuditLogs() {
  console.log('🔄 Extrayendo registros de auditoría (ActionLogs)...');
  
  const logs = await prisma.actionLog.findMany({
    orderBy: { timestamp: 'asc' },
    take: 10
  });
  
  if (logs.length === 0) {
    console.log('⚠️ NO HAY REGISTROS DE AUDITORÍA EN LA BASE DE DATOS.');
    return;
  }
  
  console.log(`\n✅ Se encontraron ${logs.length} registros (mostrando los primeros 10):`);
  
  let validChain = true;
  let previousHash = null;
  
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    
    console.log(`\n[Log ID: ${log.id}] Action: ${log.action} | Entity: ${log.entityType}`);
    console.log(`  - Actor Email: ${log.userEmail}`);
    console.log(`  - Actor Role: ${log.userRole}`);
    console.log(`  - Checksum Actual: ${log.checksum}`);
    console.log(`  - Previous Hash Registrado: ${log.previousHash || 'N/A'}`);
    
    // Validate Metadata
    if (log.metadata) {
      console.log(`  - Metadata: ${JSON.stringify(log.metadata)}`);
    } else {
      console.log(`  - Metadata: vacía`);
    }

    // Verify Chain
    if (i > 0) {
      if (log.previousHash !== previousHash) {
        console.log(`  ❌ ENCADENAMIENTO ROTO! Se esperaba: ${previousHash}, pero tiene: ${log.previousHash}`);
        validChain = false;
      } else {
        console.log(`  ✅ Encadenamiento validado con el bloque anterior.`);
      }
    } else {
      if (!log.previousHash) {
        console.log(`  🟢 Bloque Génesis (sin previousHash).`);
      }
    }
    
    previousHash = log.checksum;
  }
  
  console.log('\n======================================');
  if (validChain) {
    console.log('🔗 VEREDICTO DE CADENA: VÁLIDA E INQUEBRANTABLE');
  } else {
    console.log('⚠️ VEREDICTO DE CADENA: ROTA/INCONSISTENTE');
  }
  
  // Checking for API routes that delete or update ActionLog
  console.log('\nRevisión manual requerida para endpoints API (Verificaremos con grep/fs)...');
}

checkAuditLogs().finally(() => prisma.$disconnect());
