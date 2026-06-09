import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando carga de SUPER_ADMIN...');

  // 1. Crear el rol de SUPER_ADMIN de forma aislada (tenantId = null → global)
  const existingSuperRole = await prisma.role.findFirst({ where: { code: 'SUPER_ADMIN', tenantId: null } });
  const superAdminRole = existingSuperRole ?? await prisma.role.create({
    data: {
      code: 'SUPER_ADMIN',
      name: 'Super Administrador Global',
      description: 'Administrador central maestro del entorno multitenant',
      level: 1000,
      permissions: ['*'],
      canApprove: true,
      canReassign: true,
      canSign: true,
      isActive: true,
    },
  });

  console.log('✅ Rol SUPER_ADMIN verificado/creado');

  // 2. Crear el usuario administrador agnóstico al tenant
  const superAdminEmail = 'superadmin@system.local';
  const superAdminPassword = await bcrypt.hash('superadmin123', 10);

  const existingSuperUser = await prisma.user.findFirst({ where: { email: superAdminEmail } });
  const superAdminUser = existingSuperUser ?? await prisma.user.create({
    data: {
      email: superAdminEmail,
      passwordHash: superAdminPassword,
      fullName: 'Controlador Global (System Root)',
      documentType: 'CC',
      documentNumber: '0000000000',
      roleId: superAdminRole.id,
      isActive: true,
      // tenantId es deliberadamente NULL (flotante)
    },
  });

  console.log('✅ Usuario SUPER_ADMIN verificado/creado');
  console.log(`Email de ingreso: ${superAdminEmail}`);
  console.log(`Password temporal: superadmin123`);
  console.log('==============================================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
