import { PrismaClient } from '@prisma/client';
import { LegalTermsCalculator } from '../src/domain/rules/LegalTermsCalculator';

const prisma = new PrismaClient();

async function main() {
  console.log('Update case types to 15 days...');
  await prisma.caseType.updateMany({
    data: { defaultLegalTermDays: 15 }
  });
  console.log('Case types updated.');

  const pendingCases = await prisma.case.findMany({
    where: { state: { code: { notIn: ['CERRADO', 'FINALIZADO', 'RECHAZADO_POR_IMPROCEDENCIA'] } } }
  });

  console.log(`Found ${pendingCases.length} pending cases. Update to 15 days...`);
  let count = 0;
  for (const c of pendingCases) {
    if (c.legalTermDays !== 15) {
      const newDueDate = await LegalTermsCalculator.calculateDueDate(c.filedAt, 15);
      await prisma.case.update({
        where: { id: c.id },
        data: {
          legalTermDays: 15,
          dueDate: newDueDate
        }
      });
      console.log(`Updated case ${c.filingNumber} to 15 days. New due date: ${newDueDate}`);
      count++;
    }
  }
  console.log(`Updated ${count} active cases.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
