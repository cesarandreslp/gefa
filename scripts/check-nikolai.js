const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: { contains: 'nikol' } }
  });
  
  if (user) {
    console.log('✅ Usuario encontrado en BD local:', user.email);
  } else {
    console.log('❌ Usuario nikolai NO EXISTE en la BD local conectada desde .env');
    
    // Lista los usuarios que sí existen localmente
    const all = await prisma.user.findMany({ select: { email: true }});
    console.log('Usuarios que SÍ existen localmente:', all.map(u => u.email).join(', '));
  }
}

main().finally(() => prisma.$disconnect());
