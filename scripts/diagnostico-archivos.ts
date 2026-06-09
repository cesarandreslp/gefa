import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnosticarArchivos() {
  console.log('🔍 DIAGNÓSTICO DE ARCHIVOS ADJUNTOS\n');
  
  // 1. Verificar casos recientes
  const casos = await prisma.case.findMany({
    take: 3,
    orderBy: { filedAt: 'desc' },
    include: {
      documents: true,
      citizen: true
    }
  });
  
  console.log(`📋 Últimos ${casos.length} casos:\n`);
  
  for (const caso of casos) {
    console.log(`Caso: ${caso.filingNumber}`);
    console.log(`  Ciudadano: ${caso.citizen.firstName} ${caso.citizen.firstLastName}`);
    console.log(`  Fecha: ${caso.filedAt.toISOString()}`);
    console.log(`  Documentos: ${caso.documents.length}`);
    
    if (caso.documents.length > 0) {
      caso.documents.forEach((doc, i) => {
        console.log(`    ${i + 1}. ${doc.originalName}`);
        console.log(`       URL: ${doc.fileUrl}`);
        console.log(`       Tipo: ${doc.documentType}`);
        console.log(`       Tamaño: ${(doc.fileSize / 1024).toFixed(2)} KB`);
      });
    } else {
      console.log('    ❌ NO TIENE DOCUMENTOS');
    }
    console.log('');
  }
  
  // 2. Total de documentos en la BD
  const totalDocs = await prisma.document.count();
  console.log(`📊 Total de documentos en BD: ${totalDocs}\n`);
  
  // 3. Documentos recientes
  const docsRecientes = await prisma.document.findMany({
    take: 5,
    orderBy: { uploadedAt: 'desc' },
    include: {
      case: {
        select: {
          filingNumber: true
        }
      }
    }
  });
  
  console.log(`📎 Últimos ${docsRecientes.length} documentos subidos:\n`);
  docsRecientes.forEach(doc => {
    console.log(`  - ${doc.originalName}`);
    console.log(`    Caso: ${doc.case.filingNumber}`);
    console.log(`    URL: ${doc.fileUrl}`);
    console.log(`    Fecha: ${doc.uploadedAt.toISOString()}`);
    console.log('');
  });
}

diagnosticarArchivos()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
