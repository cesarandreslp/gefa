import { CaseService } from '../src/services/CaseService';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const service = new CaseService();
  const pradera = await prisma.tenant.findUnique({ where: { sigla: 'PMPRA' } });
  
  if (!pradera) {
    console.log("No pradera");
    return;
  }
  
  try {
    const caseType = await service.getCaseTypeByCode('SG', pradera.id);
    console.log("CaseType found:", caseType);
    
  } catch (e) {
    console.error(e);
  }
}
run().finally(() => prisma.$disconnect());
