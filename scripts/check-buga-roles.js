const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const t = await p.tenant.findFirst({ where: { sigla: 'PMBUGA' } });
  if (!t) { console.log('No tenant PMBUGA'); return; }

  const roles = await p.role.findMany({
    where: { tenantId: t.id },
    select: { code: true, name: true, level: true }
  });
  console.log('Roles PMBUGA:');
  roles.forEach(r => console.log('  ', r.code, '->', r.name, '(level:' + r.level + ')'));

  const users = await p.user.findMany({
    where: { tenantId: t.id },
    select: { fullName: true, position: true, role: { select: { code: true, name: true } } }
  });
  console.log('\nUsuarios PMBUGA:');
  users.forEach(u => console.log('  ', u.fullName, '| cargo:', u.position, '| rol:', u.role?.code || 'SIN ROL'));

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
