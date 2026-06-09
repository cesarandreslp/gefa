/**
 * Script para verificar archivos en Vercel Blob Storage
 */

import { list } from '@vercel/blob';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verificarBlobStorage() {
  try {
    console.log('🔍 Verificando Vercel Blob Storage...\n');

    // Listar archivos en Vercel Blob
    const { blobs } = await list();
    
    console.log(`📦 Total de archivos en Vercel Blob: ${blobs.length}\n`);

    if (blobs.length > 0) {
      console.log('📄 Archivos encontrados:');
      blobs.forEach((blob, index) => {
        console.log(`${index + 1}. ${blob.pathname}`);
        console.log(`   URL: ${blob.url}`);
        console.log(`   Tamaño: ${(blob.size / 1024).toFixed(2)} KB`);
        console.log(`   Subido: ${blob.uploadedAt}\n`);
      });
    } else {
      console.log('⚠️  No se encontraron archivos en Vercel Blob\n');
    }

    // Verificar documentos en la base de datos
    console.log('📊 Verificando documentos en la base de datos...\n');
    
    const documents = await prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        case: {
          select: {
            filingNumber: true,
          }
        }
      }
    });

    console.log(`📄 Total de documentos en BD: ${documents.length}\n`);

    if (documents.length > 0) {
      console.log('📋 Últimos documentos:');
      documents.forEach((doc, index) => {
        console.log(`${index + 1}. Caso: ${doc.case.filingNumber}`);
        console.log(`   Tipo: ${doc.documentType}`);
        console.log(`   Archivo: ${doc.fileName}`);
        console.log(`   URL: ${doc.fileUrl}`);
        console.log(`   Tamaño: ${(doc.fileSize / 1024).toFixed(2)} KB`);
        console.log(`   Subido: ${doc.createdAt}\n`);
      });
    } else {
      console.log('⚠️  No se encontraron documentos en la base de datos\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarBlobStorage();
