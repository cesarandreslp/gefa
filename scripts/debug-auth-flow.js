/**
 * Script de diagnóstico: simula lo que hace la ruta auth
 * para encontrar el error exacto.
 * 
 * Uso: node scripts/debug-auth-flow.js
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

const TOKEN = '563f3ec6-3747-4fb1-bf04-fb899f75443b';

async function main() {
  const mainPrisma = new PrismaClient();

  try {
    // Paso 1: Buscar token en BD global
    console.log('1️⃣  Buscando token en BD global...');
    const tokenRoute = await mainPrisma.externalTokenRoute.findUnique({ where: { token: TOKEN } });
    if (!tokenRoute) {
      console.log('   ❌ Token no encontrado');
      return;
    }
    console.log('   ✅ Token encontrado');
    console.log('   databaseUrl:', tokenRoute.databaseUrl?.substring(0, 50) + '...');
    console.log('   credentialEmail:', tokenRoute.credentialEmail);
    console.log('   credentialCedula:', tokenRoute.credentialCedula);
    console.log('   credentialPasswordHash:', tokenRoute.credentialPasswordHash ? 'SET (length: ' + tokenRoute.credentialPasswordHash.length + ')' : 'NULL');

    // Paso 2: Conectar a BD del tenant
    console.log('\n2️⃣  Conectando a BD del tenant...');
    const tenantPrisma = new PrismaClient({
      datasources: { db: { url: tokenRoute.databaseUrl } }
    });

    // Paso 3: Verificar que ActionLog funciona en tenant DB
    console.log('3️⃣  Verificando ActionLog en BD del tenant...');
    try {
      const logCount = await tenantPrisma.actionLog.count();
      console.log(`   ✅ ActionLog accesible. Total registros: ${logCount}`);
    } catch (err) {
      console.log('   ❌ Error accediendo ActionLog:', err.message);
    }

    // Paso 4: Verificar que el caso existe en la BD del tenant
    console.log('\n4️⃣  Verificando caso en BD del tenant...');
    try {
      const caso = await tenantPrisma.case.findUnique({
        where: { id: tokenRoute.caseId },
        select: { id: true, filingNumber: true, subject: true }
      });
      if (caso) {
        console.log(`   ✅ Caso encontrado: ${caso.filingNumber} — ${caso.subject}`);
      } else {
        console.log('   ❌ Caso NO encontrado con id:', tokenRoute.caseId);
      }
    } catch (err) {
      console.log('   ❌ Error buscando caso:', err.message);
    }

    // Paso 5: Verificar el historial de estado con el token
    console.log('\n5️⃣  Verificando CaseStateHistory con externalToken...');
    try {
      const historial = await tenantPrisma.caseStateHistory.findUnique({
        where: { externalToken: TOKEN },
        select: {
          id: true,
          externalTokenUsed: true,
          comment: true,
        }
      });
      if (historial) {
        console.log(`   ✅ Historial encontrado. Token usado: ${historial.externalTokenUsed}`);
        console.log(`   Comentario: ${historial.comment?.substring(0, 100)}...`);
      } else {
        console.log('   ❌ No se encontró historial con este externalToken');
      }
    } catch (err) {
      console.log('   ❌ Error buscando historial:', err.message);
    }

    // Paso 6: Intentar crear un ActionLog de prueba
    console.log('\n6️⃣  Intentando crear ActionLog de prueba...');
    try {
      const log = await tenantPrisma.actionLog.create({
        data: {
          tenantId: tokenRoute.tenantId,
          caseId: tokenRoute.caseId,
          userId: null,
          userEmail: 'test@debug.com',
          userRole: 'EXTERNAL',
          action: 'DEBUG_TEST',
          entityType: 'Case',
          entityId: tokenRoute.caseId || TOKEN,
          ipAddress: 'debug-script',
          userAgent: 'debug-script',
          metadata: { debug: true },
          checksum: 'debug-test-checksum',
        },
      });
      console.log('   ✅ ActionLog creado exitosamente:', log.id);
      
      // Limpiar el registro de prueba
      await tenantPrisma.actionLog.delete({ where: { id: log.id } });
      console.log('   🧹 Registro de prueba eliminado');
    } catch (err) {
      console.log('   ❌ Error creando ActionLog:', err.message);
      console.log('   Error completo:', err);
    }

    await tenantPrisma.$disconnect();

  } catch (error) {
    console.error('❌ Error general:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mainPrisma.$disconnect();
  }
}

main();
