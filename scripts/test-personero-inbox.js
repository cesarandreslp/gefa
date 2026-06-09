const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cases = await prisma.case.findMany({
    where: {
      metadata: {
        path: ['personeroClassification'],
        string_contains: 'SEGUIMIENTO',
      }
    },
    include: {
      citizen: true,
      caseType: true,
      state: true,
      documents: {
        where: { documentType: { in: ['PETITION', 'SUPPORTING_DOC'] } },
        orderBy: { uploadedAt: 'asc' },
        take: 1
      },
      stateHistory: {
        orderBy: { timestamp: 'desc' },
        include: { toState: true }
      }
    },
    orderBy: { filedAt: 'desc' }
  });

  console.log(`Found cases: ${cases.length}`);
  if (cases.length > 0) {
    const c = cases[0];
    console.log(`Case ID: ${c.id}`);
    console.log(`Citizen:`, c.citizen);
    console.log(`State:`, c.state?.code);
    console.log(`Type:`, c.caseType?.name);
    console.log(`Filed At:`, c.filedAt);
  }
}

main().finally(() => prisma.$disconnect());
