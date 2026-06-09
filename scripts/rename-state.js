const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Update the state code and name in the database
  const result = await prisma.caseState.updateMany({
    where: { code: 'RECHAZADO_POR_IMPROCEDENCIA' },
    data: {
      code: 'REMITIDO_POR_COMPETENCIA',
      name: 'Remitido por Competencia',
    }
  });

  console.log('Updated records:', result.count);

  // Verify
  const state = await prisma.caseState.findFirst({
    where: { code: 'REMITIDO_POR_COMPETENCIA' }
  });
  console.log('New state:', state);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
