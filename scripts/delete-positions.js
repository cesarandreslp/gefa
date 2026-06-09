const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanPositions() {
  console.log('🧹 Limpiando Cargos (Positions) de tenants copiados incidentalmente...');
  
  // Buscar a Buga
  const buga = await prisma.tenant.findUnique({ where: { sigla: 'PMBUGA' } });
  
  if (!buga) {
    console.log('No se encontró el tenant principal (PMBUGA)');
    return;
  }

  // Obtenemos los demás tenants
  const otherTenants = await prisma.tenant.findMany({
    where: { id: { not: buga.id } }
  });

  const basePositionNames = [
    'Administrador',
    'Administrador Local',
    'Ventanilla Única',
    'Auxiliar de Atención al Usuario',
    'Personero Municipal',
    'Revisor' // Por si acaso hay de versiones anteriores
  ];

  for (const tenant of otherTenants) {
    console.log(`\n🏢 Procesando tenant: ${tenant.name} (${tenant.sigla})`);
    
    // Suponiendo que el modelo se llama Position o Cargo.
    // Revisemos el nombre exacto de prisma, normalmente es position
    let positions = [];
    try {
      positions = await prisma.position.findMany({ where: { tenantId: tenant.id } });
    } catch(e) {
      console.log('No existe la tabla de position o cargo falló', e.message);
      continue;
    }
    
    let deletedCount = 0;
    for (const pos of positions) {
      if (!basePositionNames.includes(pos.name)) {
        console.log(` ❌ Borrando cargo excedente: ${pos.name} (${pos.roleCode})`);
        
        try {
          await prisma.position.delete({ where: { id: pos.id } });
          deletedCount++;
        } catch(e) {
          console.log(`   ! No se pudo eliminar ${pos.name}`);
        }
      } else {
        console.log(` ✅ Conservando cargo fijo: ${pos.name} (${pos.roleCode})`);
      }
    }
    
    console.log(`🎉 Limpieza de CARGOS finalizada para ${tenant.name}: Se limpiaron ${deletedCount} cargos extra.`);
  }
}

cleanPositions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
