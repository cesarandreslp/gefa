const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Asignar dominio a PMBUGA para que no capture localhost:3000
  const result = await p.tenant.update({
    where: { sigla: 'PMBUGA' },
    data: { domain: 'buga.localhost:3000' }
  });
  
  console.log('=== DOMINIO ASIGNADO ===');
  console.log('Tenant:', result.name);
  console.log('Sigla:', result.sigla);
  console.log('Nuevo dominio: buga.localhost:3000');
  console.log('');
  console.log('Ahora accede a Buga en: http://buga.localhost:3000');
  console.log('Super Admin queda libre en: http://localhost:3000');
  
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
