const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const tenants = await p.tenant.findMany({
    select: {
      id: true,
      name: true,
      sigla: true,
      domain: true,
      isActive: true,
      _count: { select: { users: true, cases: true } }
    }
  });
  
  console.log('=== TENANTS EN LA BD ===');
  tenants.forEach(t => {
    console.log('');
    console.log('Nombre:', t.name);
    console.log('Sigla:', t.sigla);
    console.log('Dominio:', t.domain || '(SIN DOMINIO)');
    console.log('Activo:', t.isActive);
    console.log('Usuarios:', t._count.users, '| Casos:', t._count.cases);
  });
  
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
