import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStates() {
  try {
    console.log('🔍 Verificando estados en la base de datos...\n');
    
    // Obtener todos los estados
    const allStates = await prisma.caseState.findMany({
      select: {
        code: true,
        name: true,
        isFinal: true,
        isActive: true
      },
      orderBy: {
        displayOrder: 'asc'
      }
    });

    console.log('📊 Estados encontrados:', allStates.length);
    console.log('\n--- Estados ---');
    allStates.forEach(state => {
      console.log(`${state.code}: ${state.name} | Final: ${state.isFinal} | Activo: ${state.isActive}`);
    });

    // Verificar estados finales
    const finalStates = allStates.filter(s => s.isFinal);
    console.log(`\n✅ Estados finales: ${finalStates.length}`);
    finalStates.forEach(state => {
      console.log(`  - ${state.code}: ${state.name}`);
    });

    if (finalStates.length === 0) {
      console.log('\n⚠️  ADVERTENCIA: No hay estados marcados como finales (isFinal: true)');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStates();
