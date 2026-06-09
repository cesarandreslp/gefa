const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
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

const CASE_ID = 'e7240890-d44d-45ea-95ee-cb5a457b1bc1';

async function main() {
  const mainPrisma = new PrismaClient();
  const tokenRoute = await mainPrisma.externalTokenRoute.findUnique({
    where: { token: '563f3ec6-3747-4fb1-bf04-fb899f75443b' }
  });

  const db = new PrismaClient({
    datasources: { db: { url: tokenRoute.databaseUrl } }
  });

  console.log('=== Documentos del caso PMGUC-2026-000013 ===\n');
  
  const docs = await db.document.findMany({
    where: { caseId: CASE_ID },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      isInternal: true,
      uploadedByType: true,
      documentType: true,
      uploadedAt: true,
      fileSize: true,
    },
    orderBy: { uploadedAt: 'asc' }
  });

  if (docs.length === 0) {
    console.log('❌ No hay documentos asociados a este caso');
  } else {
    console.log(`Total documentos: ${docs.length}\n`);
    docs.forEach((d, i) => {
      console.log(`${i+1}. ${d.originalName}`);
      console.log(`   isInternal: ${d.isInternal} | type: ${d.documentType} | uploadedBy: ${d.uploadedByType}`);
      console.log(`   size: ${(d.fileSize/1024).toFixed(0)}KB | date: ${d.uploadedAt}`);
      console.log(`   → Visible en portal: ${d.isInternal ? '❌ NO (interno)' : '✅ SÍ'}`);
      console.log();
    });
  }

  // También verificar qué retorna el query del portal
  console.log('\n=== Lo que el portal filtra (isInternal: false) ===');
  const visible = docs.filter(d => !d.isInternal);
  console.log(`Documentos visibles: ${visible.length}`);
  visible.forEach(d => console.log(`  ✅ ${d.originalName}`));

  const hidden = docs.filter(d => d.isInternal);
  console.log(`\nDocumentos ocultos (isInternal=true): ${hidden.length}`);
  hidden.forEach(d => console.log(`  🔒 ${d.originalName}`));

  await db.$disconnect();
  await mainPrisma.$disconnect();
}

main();
