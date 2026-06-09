const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Renombrar todos los roles PERSONERO_MUNICIPAL_* a DIRECTOR_ENCARGADO_*
  const roles = await p.role.findMany({
    where: { code: { startsWith: 'PERSONERO_MUNICIPAL_' } },
    select: { id: true, code: true, tenantId: true }
  });

  console.log(`Roles a renombrar: ${roles.length}`);

  for (const role of roles) {
    const newCode = role.code.replace('PERSONERO_MUNICIPAL_', 'DIRECTOR_ENCARGADO_');
    await p.role.update({
      where: { id: role.id },
      data: {
        code: newCode,
        name: 'Director Encargado',
        description: 'Director o funcionario designado como responsable de la gestión y toma de decisiones sobre PQRS en la entidad.',
      }
    });
    console.log(`  ${role.code} -> ${newCode}`);
  }

  console.log('Listo!');
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
