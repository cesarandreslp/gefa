const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const buga = await prisma.tenant.findUnique({ where: { sigla: 'PMBUGA' } });
  
  const allTenants = await prisma.tenant.findMany({
    where: {
      id: { not: buga.id }
    }
  });

  const bugaTypes = await prisma.caseType.findMany({ where: { tenantId: buga.id } });
  
  for (const t of allTenants) {
    console.log(`Verificando CaseTypes para ${t.name}...`);
    const typesCount = await prisma.caseType.count({ where: { tenantId: t.id } });
    if (typesCount === 0) {
      console.log(`Clonando ${bugaTypes.length} CaseTypes para ${t.name}`);
      for (const bt of bugaTypes) {
        // En Buga, el código pudo ser 'SG' o 'SG_PMBUGA'. Extraemos el prefijo antes del _
        const prefix = bt.code.split('_')[0]; 
        const newCode = `${prefix}_${t.sigla}`;
        await prisma.caseType.create({
          data: {
            tenantId: t.id,
            code: newCode,
            name: bt.name,
            description: bt.description,
            defaultLegalTermDays: bt.defaultLegalTermDays,
            legalReference: bt.legalReference,
            requiresSupervisorApproval: bt.requiresSupervisorApproval,
            requiresSignature: bt.requiresSignature,
            isActive: bt.isActive,
            displayOrder: bt.displayOrder,
            allowedStateIds: []
          }
        });
      }
    }
  }
  console.log("Completado.");
}

run().finally(() => prisma.$disconnect());
