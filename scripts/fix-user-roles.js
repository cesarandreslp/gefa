const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const ROLES_BASE = [
  {
    code: 'VENTANILLA_UNICA',
    name: 'Ventanilla Única',
    description: 'Personal de ventanilla única encargado de recibir, radicar y gestionar solicitudes ciudadanas',
    level: 80,
    permissions: ['cases:*:*', 'users:read:*'],
    canApprove: false,
    canReassign: true,
    canSign: false,
  },
  {
    code: 'AUXILIAR_ATENCION_USUARIO',
    name: 'Auxiliar de Atención al Usuario',
    description: 'Personal auxiliar encargado de la atención directa al usuario',
    level: 75,
    permissions: ['cases:read:*', 'citizens:read:*'],
    canApprove: false,
    canReassign: false,
    canSign: false,
  },
  {
    code: 'PERSONERO_MUNICIPAL',
    name: 'Personero Municipal',
    description: 'Máxima autoridad de la entidad.',
    level: 100,
    permissions: ['*:*:*'],
    canApprove: true,
    canReassign: true,
    canSign: true,
  },
];

async function main() {
  const tenants = await p.tenant.findMany({ select: { id: true, sigla: true, name: true } });

  for (const tenant of tenants) {
    console.log(`\n--- ${tenant.sigla} (${tenant.name}) ---`);
    for (const roleData of ROLES_BASE) {
      const uniqueCode = `${roleData.code}_${tenant.sigla}`;
      const exists = await p.role.findFirst({ where: { code: uniqueCode, tenantId: tenant.id } });
      if (exists) {
        console.log(`  Ya existe: ${uniqueCode}`);
        continue;
      }
      await p.role.create({
        data: {
          tenantId: tenant.id,
          code: uniqueCode,
          name: roleData.name,
          description: roleData.description,
          level: roleData.level,
          permissions: roleData.permissions,
          canApprove: roleData.canApprove,
          canReassign: roleData.canReassign,
          canSign: roleData.canSign,
          isActive: true,
        },
      });
      console.log(`  Creado: ${uniqueCode}`);
    }
  }

  // Ahora asignar roles a usuarios sin rol
  console.log('\n--- Asignando roles a usuarios sin rol ---');
  const usersNoRole = await p.user.findMany({
    where: { roleId: null },
    select: { id: true, fullName: true, position: true, tenantId: true }
  });

  for (const u of usersNoRole) {
    if (!u.position || !u.tenantId) continue;
    const pos = await p.position.findFirst({ where: { tenantId: u.tenantId, name: u.position } });
    if (!pos) continue;
    const role = await p.role.findFirst({
      where: { tenantId: u.tenantId, code: { startsWith: pos.roleCode + '_' } }
    });
    if (!role) { console.log(`  No role for ${u.fullName} (${pos.roleCode})`); continue; }
    await p.user.update({ where: { id: u.id }, data: { roleId: role.id } });
    console.log(`  ${u.fullName} -> ${role.name}`);
  }

  console.log('\nListo!');
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
