import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function buscarRadicado() {
  try {
    const radicado = 'PMBUGA-2026-000011';
    
    console.log(`\nBuscando radicado: ${radicado}...\n`);
    
    const caso = await prisma.case.findUnique({
      where: {
        filingNumber: radicado
      },
      include: {
        citizen: true,
        caseType: true,
        state: true
      }
    });
    
    if (caso) {
      console.log('✅ RADICADO ENCONTRADO:\n');
      console.log('Número de radicado:', caso.filingNumber);
      console.log('Fecha de radicación:', caso.filedAt);
      console.log('Ciudadano:', `${caso.citizen.firstName} ${caso.citizen.firstLastName}`);
      console.log('Tipo de caso:', caso.caseType.name);
      console.log('Estado:', caso.state.name);
      console.log('Asunto:', caso.subject);
      console.log('\nDatos completos:', JSON.stringify(caso, null, 2));
    } else {
      console.log('❌ RADICADO NO ENCONTRADO');
      console.log('\nBuscando radicados similares...\n');
      
      const similares = await prisma.case.findMany({
        where: {
          filingNumber: {
            startsWith: 'PMBUGA-2026-'
          }
        },
        take: 10,
        orderBy: {
          filedAt: 'desc'
        }
      });
      
      if (similares.length > 0) {
        console.log(`Encontrados ${similares.length} radicados del 2026:`);
        similares.forEach(c => {
          console.log(`  - ${c.filingNumber} (${c.filedAt.toLocaleDateString('es-CO')})`);
        });
      } else {
        console.log('No hay radicados con formato PMBUGA-2026-*');
      }
    }
    
  } catch (error) {
    console.error('Error al buscar radicado:', error);
  } finally {
    await prisma.$disconnect();
  }
}

buscarRadicado();
