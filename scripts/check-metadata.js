const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cases = await prisma.case.findMany({
    take: 10,
    select: {
      id: true,
      metadata: true
    }
  });
  
  console.log('--- Muestra de Metadata de Casos ---');
  cases.forEach(c => {
    console.log(`ID: ${c.id}`);
    console.log(`Metadata:`, c.metadata);
    console.log('-------------------');
  });
}

main().finally(() => prisma.$disconnect());
