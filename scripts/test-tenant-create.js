const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ log: ['error'] });

async function test() {
  try {
    console.log('Testing Tenant + Role creation...');

    const result = await p.$transaction(async (tx) => {
      // 1. Crear Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: 'ENTIDAD DE PRUEBA',
          sigla: 'TESTXX',
          isActive: true,
        },
      });
      console.log('  Tenant creado:', tenant.id);

      // 2. Crear Role
      const role = await tx.role.create({
        data: {
          tenantId: tenant.id,
          code: 'ADMIN_TESTXX',
          name: 'Administrador',
          description: 'Admin de prueba',
          level: 100,
          permissions: ['*:*:*'],
          canApprove: true,
          canReassign: true,
          canSign: true,
          isActive: true,
        },
      });
      console.log('  Role creado:', role.id);

      // 3. Crear CaseType
      const ct = await tx.caseType.create({
        data: {
          tenantId: tenant.id,
          code: 'DP_TESTXX',
          name: 'Derecho de Peticion',
          description: 'Test',
          defaultLegalTermDays: 15,
          legalReference: 'Ley 1755',
          isActive: true,
          displayOrder: 1,
          allowedStateIds: [],
        },
      });
      console.log('  CaseType creado:', ct.id);

      // 4. Crear User
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: 'test@testxx.com',
          passwordHash: '$2a$10$fakehash',
          fullName: 'Test Admin',
          documentType: 'CC',
          documentNumber: 'ADMIN-TESTXX-' + Date.now(),
          roleId: role.id,
          isActive: true,
          mustChangePassword: false,
        },
      });
      console.log('  User creado:', user.id);

      return { tenant, role, ct, user };
    });

    console.log('\nOK - Todo creado correctamente');

    // Limpiar
    await p.user.delete({ where: { email: 'test@testxx.com' } });
    await p.caseType.delete({ where: { id: result.ct.id } });
    await p.role.delete({ where: { id: result.role.id } });
    await p.tenant.delete({ where: { id: result.tenant.id } });
    console.log('Limpieza completa');

  } catch (e) {
    console.error('\nERROR:', e.message);
    console.error('CODE:', e.code);
    if (e.meta) console.error('META:', JSON.stringify(e.meta));
  }

  await p.$disconnect();
}

test();
