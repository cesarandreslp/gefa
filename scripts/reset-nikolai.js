const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'nikolai@personeria.gov.co';
  const newPassword = '123456';
  
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.log(`❌ El usuario ${email} NO EXISTE en la base de datos.`);
    return;
  }

  console.log(`✅ Usuario encontrado: ${user.name} (${user.email})`);
  
  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  // Update the user
  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword }
  });
  
  console.log(`🔐 Contraseña restablecida exitosamente a: ${newPassword}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
