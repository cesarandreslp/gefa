const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanRoles() {
  console.log('🧹 Iniciando limpieza de roles extra en Tenants (excepto PMBUGA)...');
  
  const allowedBaseCodes = [
    'ADMIN',
    'PERSONERO_MUNICIPAL',
    'VENTANILLA_UNICA',
    'AUXILIAR_ATENCION_USUARIO',
    'ASIGNACION_DE_CASOS' // Rol de IA que no se expone al cliente pero es esencial
  ];
  
  // Buscar a Buga (Tenant Original)
  const buga = await prisma.tenant.findUnique({ where: { sigla: 'PMBUGA' } });
  
  if (!buga) {
    console.log('No se encontró el tenant principal (PMBUGA)');
    return;
  }

  // Buscar el resto de tenants (ej. Pradera)
  const otherTenants = await prisma.tenant.findMany({
    where: { id: { not: buga.id } }
  });

  for (const tenant of otherTenants) {
    console.log(`\n🏢 Procesando tenant: ${tenant.name} (${tenant.sigla})`);
    
    const allRoles = await prisma.role.findMany({ where: { tenantId: tenant.id } });
    
    let deletedCount = 0;
    for (const role of allRoles) {
      // Verificamos si el codigo EXACTAMENTE es uno de los base,
      // O si el codigo empieza con el base code más un _ (para manejar variantes Multi-Tenant generadas por script)
      const isAllowed = allowedBaseCodes.some(base => 
        role.code === base || role.code.startsWith(`${base}_`) || role.code.endsWith(`_${tenant.sigla}`) && role.code.replace(`_${tenant.sigla}`, '') === base
      );
      
      if (!isAllowed) {
        console.log(` ❌ Borrando rol excedente: ${role.name} (${role.code})`);
        try {
          await prisma.role.delete({ where: { id: role.id } });
          deletedCount++;
        } catch(e) {
          console.log(`   ! No se pudo eliminar ${role.code} (quizás tiene usuarios asignados)`);
        }
      } else {
         console.log(` ✅ Conservando rol fijo: ${role.name} (${role.code})`);
      }
    }
    
    console.log(`🎉 Limpieza finalizada para ${tenant.name}: Se limpiaron ${deletedCount} cargos extra.`);
  }
}

cleanRoles()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
