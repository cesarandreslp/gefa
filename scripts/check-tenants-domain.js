const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true, domain: true, sigla: true }});
  console.log("Tenants en DB:", tenants);
}
run();
