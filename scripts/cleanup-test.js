const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function cleanup() {
  const t = await p.tenant.findUnique({ where: { sigla: 'ETEST1' } });
  if (t) {
    await p.user.deleteMany({ where: { tenantId: t.id } });
    await p.caseType.deleteMany({ where: { tenantId: t.id } });
    await p.role.deleteMany({ where: { tenantId: t.id } });
    await p.tenant.delete({ where: { id: t.id } });
    console.log('ETEST1 limpiado');
  } else {
    console.log('ETEST1 no encontrado');
  }

  // Also cleanup TESTXX from earlier test
  const t2 = await p.tenant.findUnique({ where: { sigla: 'TESTXX' } });
  if (t2) {
    await p.user.deleteMany({ where: { tenantId: t2.id } });
    await p.caseType.deleteMany({ where: { tenantId: t2.id } });
    await p.role.deleteMany({ where: { tenantId: t2.id } });
    await p.tenant.delete({ where: { id: t2.id } });
    console.log('TESTXX limpiado');
  }

  // List remaining tenants
  const tenants = await p.tenant.findMany({ select: { sigla: true, name: true } });
  console.log('Tenants restantes:', JSON.stringify(tenants));

  await p.$disconnect();
}

cleanup();
