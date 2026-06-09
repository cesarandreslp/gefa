const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPositions() {
  console.log('Migrando Positions existentes al Tenant original: PMBUGA');
  
  const buga = await prisma.tenant.findUnique({ where: { sigla: 'PMBUGA' } });
  
  if (!buga) {
    console.log('No se encontró el tenant principal (PMBUGA)');
    return;
  }

  // Actualizar todos los cargos actuales para que pertenezcan a Buga
  const result = await prisma.position.updateMany({
    where: { tenantId: null },
    data: { tenantId: buga.id }
  });
  
  // Replicar los 4 base puros para TODOS los tenants (incluido Pradera) para que la página de cargos no esté vacía
  // Los 4 roles base: Administrador, Personero Municipal, Ventanilla Única, Auxiliar de Atención al Usuario
  const otherTenants = await prisma.tenant.findMany({
    where: { id: { not: buga.id } }
  });
  
  const basePositionsToCreate = [
    { name: 'Administrador Local', roleCode: 'ADMIN' },
    { name: 'Personero Municipal', roleCode: 'PERSONERO_MUNICIPAL' },
    { name: 'Ventanilla Única', roleCode: 'VENTANILLA_UNICA' },
    { name: 'Auxiliar de Atención al Usuario', roleCode: 'AUXILIAR_ATENCION_USUARIO' }
  ];
  
  for (const t of otherTenants) {
    for (const base of basePositionsToCreate) {
      try {
        await prisma.position.create({
          data: {
            name: base.name,
            roleCode: base.roleCode,
            tenantId: t.id,
            isActive: true
          }
        });
        console.log(`Creado cargo base ${base.name} para ${t.name}`);
      } catch (e) {
        // Podría fallar si ya existen
      }
    }
  }

  console.log(`✅ Migrados ${result.count} cargos a PMBUGA exitosamente.`);
}

fixPositions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
