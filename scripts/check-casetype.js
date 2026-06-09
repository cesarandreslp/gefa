const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const t = await prisma.tenant.findUnique({ where: { sigla: 'PMPRADERA' } }); // Suponiendo que la sigla es PMPRADERA
  let tenantId = t?.id;
  
  if(!tenantId) {
    const pradera = await prisma.tenant.findFirst({ where: { name: { contains: 'Pradera' } } });
    if(pradera) tenantId = pradera.id;
  }
  console.log("Tenant Pradera ID:", tenantId);
  const types = await prisma.caseType.findMany({ where: { tenantId } });
  console.log("CaseTypes de Pradera:", types);
}

run().finally(() => prisma.$disconnect());
