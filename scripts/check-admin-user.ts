/**
 * Script para verificar si el usuario admin existe en la base de datos
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando usuario admin...\n');

  // Buscar el usuario admin
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@personeria.gov.co' },
    include: {
      role: true
    }
  });

  if (!adminUser) {
    console.log('❌ El usuario admin NO existe en la base de datos');
    console.log('\n📝 Para crear el usuario, ejecuta:');
    console.log('   npx prisma db seed');
    return;
  }

  if (!adminUser.role) {
    console.log('❌ El usuario admin existe pero NO tiene un rol asignado');
    return;
  }

  console.log('✅ Usuario admin encontrado:');
  console.log(`   Email: ${adminUser.email}`);
  console.log(`   Nombre: ${adminUser.fullName}`);
  console.log(`   Rol: ${adminUser.role.name} (${adminUser.role.code})`);
  console.log(`   Activo: ${adminUser.isActive}`);
  console.log(`   Debe cambiar contraseña: ${adminUser.mustChangePassword}`);

  // Verificar la contraseña
  console.log('\n🔐 Verificando contraseña...');
  const passwordTest = 'Admin2026!';
  const passwordMatch = await bcrypt.compare(passwordTest, adminUser.passwordHash);

  if (passwordMatch) {
    console.log(`✅ La contraseña "${passwordTest}" es correcta`);
  } else {
    console.log(`❌ La contraseña "${passwordTest}" NO coincide`);
    console.log('\n💡 Para resetear la contraseña:');
    console.log('   1. Ejecuta: npx prisma db seed --force');
    console.log('   2. O actualiza manualmente:');
    console.log(`      UPDATE users SET "passwordHash" = '${await bcrypt.hash(passwordTest, 10)}' WHERE email = 'admin@personeria.gov.co';`);
  }

  // Contar total de usuarios
  const totalUsers = await prisma.user.count();
  console.log(`\n👥 Total de usuarios en el sistema: ${totalUsers}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
