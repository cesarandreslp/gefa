/**
 * Script de diagnóstico: verifica si la tabla external_token_routes existe
 * y si el token específico está registrado.
 * 
 * Uso: node scripts/check-external-token.js [token]
 */
const fs = require('fs');
const path = require('path');

// Load .env.local manually
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

const TOKEN = process.argv[2] || '563f3ec6-3747-4fb1-bf04-fb899f75443b';

async function main() {
  console.log('🔍 Conectando a BD global...');
  console.log('   DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 40) + '...');
  
  const prisma = new PrismaClient();
  
  try {
    // 1. Verificar que la tabla existe
    console.log('\n1️⃣  Verificando tabla external_token_routes...');
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'external_token_routes'
    `;
    console.log('   Tabla existe:', tables.length > 0 ? '✅ SÍ' : '❌ NO');

    if (tables.length === 0) {
      console.log('\n⚠️  La tabla no existe. Ejecuta: npx prisma db push');
      return;
    }

    // 2. Contar registros totales
    const count = await prisma.externalTokenRoute.count();
    console.log(`   Total registros: ${count}`);

    // 3. Buscar el token específico
    console.log(`\n2️⃣  Buscando token: ${TOKEN}`);
    const record = await prisma.externalTokenRoute.findUnique({
      where: { token: TOKEN }
    });

    if (record) {
      console.log('   ✅ Token encontrado:');
      console.log('      tenantId:', record.tenantId);
      console.log('      caseId:', record.caseId);
      console.log('      databaseUrl:', record.databaseUrl?.substring(0, 40) + '...');
      console.log('      createdAt:', record.createdAt);
      console.log('      credenciales:', record.credentialPasswordHash ? 'YA CONFIGURADAS' : 'SIN CONFIGURAR');
    } else {
      console.log('   ❌ Token NO encontrado en la BD global');
      
      // 4. Listar todos los tokens existentes
      if (count > 0) {
        console.log('\n3️⃣  Tokens existentes:');
        const all = await prisma.externalTokenRoute.findMany({
          select: { token: true, tenantId: true, caseId: true, createdAt: true }
        });
        all.forEach(t => {
          console.log(`      ${t.token} | tenant: ${t.tenantId} | case: ${t.caseId} | ${t.createdAt}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'P2021') {
      console.log('\n⚠️  La tabla no existe en la BD. Necesitas ejecutar: npx prisma db push');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
