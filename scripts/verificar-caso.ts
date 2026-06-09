import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verificarCaso() {
  const radicado = 'PMBUGA-2026-000002';
  
  console.log(`🔍 Verificando caso: ${radicado}\n`);
  
  // Buscar el caso
  const caso = await prisma.case.findFirst({
    where: { filingNumber: radicado },
    include: {
      state: true,
      citizen: true,
      caseType: true
    }
  });
  
  if (!caso) {
    console.log('❌ Caso no encontrado\n');
    return;
  }
  
  console.log('📋 INFORMACIÓN DEL CASO:');
  console.log(`   ID: ${caso.id}`);
  console.log(`   Radicado: ${caso.filingNumber}`);
  console.log(`   Asunto: ${caso.subject}`);
  console.log(`   Estado: ${caso.state.code} (${caso.state.name})`);
  console.log(`   Tipo: ${caso.caseType.name}`);
  console.log(`   Ciudadano: ${caso.citizen.firstName} ${caso.citizen.firstLastName}`);
  console.log(`   Fecha: ${caso.filedAt.toISOString()}`);
  
  // Buscar asignaciones
  const assignments = await prisma.assignment.findMany({
    where: { caseId: caso.id },
    include: {
      user: {
        include: {
          role: true
        }
      },
      assignedByUser: {
        include: {
          role: true
        }
      }
    },
    orderBy: { assignedAt: 'desc' }
  });
  
  console.log(`\n👥 ASIGNACIONES (${assignments.length}):`);
  
  if (assignments.length === 0) {
    console.log('   ❌ NO TIENE ASIGNACIONES');
    console.log('   ⚠️  El caso NO aparecerá en ninguna bandeja de entrada\n');
  } else {
    assignments.forEach((a, index) => {
      console.log(`\n   ${index + 1}. Asignación #${a.id.substring(0, 8)}...`);
      console.log(`      → Asignado a: ${a.user.email}`);
      console.log(`      → Rol: ${a.user.role?.name || 'Sin rol'} (${a.user.role?.code || 'N/A'})`);
      console.log(`      → Estado: ${a.status}`);
      console.log(`      → Por: ${a.assignedByUser.email} (${a.assignedByUser.role?.code || 'N/A'})`);
      console.log(`      → Fecha: ${a.assignedAt.toISOString()}`);
      console.log(`      → Notas: ${a.notes || 'N/A'}`);
    });
    
    const asignacionActual = assignments[0];
    console.log(`\n   ✅ Caso ASIGNADO a: ${asignacionActual.user.email}`);
    console.log(`   📥 Debería aparecer en su bandeja de entrada\n`);
  }
}

verificarCaso()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
