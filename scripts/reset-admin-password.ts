/**
 * Script para resetear la contraseña del usuario admin
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Reseteando contraseña del admin...\n');

  const newPassword = 'Admin2026!';
  const passwordHash = await bcrypt.hash(newPassword, 10);

  // Actualizar el usuario admin
  const updatedUser = await prisma.user.update({
    where: { email: 'admin@personeria.gov.co' },
    data: {
      passwordHash: passwordHash,
      mustChangePassword: false,
    },
    include: {
      role: true
    }
  });

  console.log('✅ Contraseña actualizada correctamente\n');
  console.log('📧 Email: admin@personeria.gov.co');
  console.log('🔑 Contraseña: Admin2026!');
  console.log(`👤 Usuario: ${updatedUser.fullName}`);
  console.log(`🎭 Rol: ${updatedUser.role?.name || 'N/A'}`);

  // Verificar que la contraseña funciona
  const passwordMatch = await bcrypt.compare(newPassword, updatedUser.passwordHash);
  console.log(`\n✅ Verificación: ${passwordMatch ? 'Contraseña correcta' : 'Error en verificación'}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
