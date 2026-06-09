const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.nonBusinessDay.count({ where: { isActive: true } });
  console.log('Total festivos activos:', count);
  
  if (count > 0) {
    const festivos = await prisma.nonBusinessDay.findMany({
      where: { isActive: true },
      orderBy: { date: 'asc' },
      take: 5
    });
    console.log('Primeros 5:', festivos.map(f => `${f.date.toISOString().split('T')[0]} - ${f.name}`));
  } else {
    console.log('NO HAY FESTIVOS CARGADOS EN LA BASE DE DATOS');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
