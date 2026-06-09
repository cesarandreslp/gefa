const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Testing Personero classification queries...');
  
  // Test 1: Using path and equals
  const cases1 = await prisma.case.findMany({
    where: {
      metadata: {
        path: ['personeroClassification'],
        string_contains: 'SEGUIMIENTO'
      }
    },
    select: { id: true, filingNumber: true }
  });
  console.log(`Test 1 (string_contains): Found ${cases1.length} cases`);

  // Test 2: Using equals directly (if the whole JSON is just the string, which it's not)
  
  // Test 3: Raw query to ensure cases exist
  const rawCases = await prisma.$queryRaw`
    SELECT id, "filingNumber", metadata 
    FROM cases 
    WHERE metadata->>'personeroClassification' = 'SEGUIMIENTO'
  `;
  console.log(`Test 3 (Raw Postgres Query): Found ${rawCases.length} cases`);
  if (rawCases.length > 0) {
    console.log('Sample raw case:', rawCases[0].filingNumber);
  }
}

main().finally(() => prisma.$disconnect());
