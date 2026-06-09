const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar todos los tenants
  const tenants = await prisma.tenant.findMany({ select: { id: true, sigla: true, name: true } });
  console.log('Tenants encontrados:', tenants.length);

  const POSITIONS = [
    { name: 'Administrador', roleCode: 'ADMIN' },
    { name: 'Ventanilla Única', roleCode: 'VENTANILLA_UNICA' },
    { name: 'Auxiliar de Atención al Usuario', roleCode: 'AUXILIAR_ATENCION_USUARIO' },
  ];

  for (const tenant of tenants) {
    console.log(`\n--- ${tenant.sigla} (${tenant.name}) ---`);
    for (const pos of POSITIONS) {
      const exists = await prisma.position.findFirst({
        where: { tenantId: tenant.id, name: pos.name }
      });
      if (exists) {
        console.log(`  Ya existe: ${pos.name}`);
      } else {
        await prisma.position.create({
          data: { tenantId: tenant.id, name: pos.name, roleCode: pos.roleCode, isActive: true }
        });
        console.log(`  Creado: ${pos.name}`);
      }
    }
  }
  console.log('\nListo!');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
