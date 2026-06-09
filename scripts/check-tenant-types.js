const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const tenants = await p.tenant.findMany({
    select: { name: true, sigla: true, institutionType: { select: { name: true } } }
  });
  console.log(JSON.stringify(tenants, null, 2));
  await p.$disconnect();
}

main();
