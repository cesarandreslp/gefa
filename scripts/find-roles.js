const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findRoles() {
  const buga = await prisma.tenant.findUnique({ where: { sigla: 'PMBUGA' } });
  const allRoles = await prisma.role.findMany({ 
    include: { tenant: true },
    where: { 
      // Filter roles whose name contains 'Delegad' or 'Administrativa' to spot if they belong to Pradera
      name: { contains: 'Delegad' } 
    }
  });

  for (const r of allRoles) {
    console.log(`Role: ${r.name} | Tenant: ${r.tenant.name} (${r.tenant.sigla}) | TenantId: ${r.tenantId}`);
  }
}

findRoles().finally(() => prisma.$disconnect());
