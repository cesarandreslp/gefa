/**
 * Seed: Tipos de Institución con colores predefinidos
 * Ejecutar: node scripts/seed-institution-types.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const institutionTypes = [
  { name: 'Alcaldía',     primaryColor: '#003d82', secondaryColor: '#0056b3' },
  { name: 'Personería',   primaryColor: '#2e7d32', secondaryColor: '#4caf50' },
  { name: 'Contraloría',  primaryColor: '#c62828', secondaryColor: '#ef5350' },
  { name: 'Hospital',     primaryColor: '#0277bd', secondaryColor: '#29b6f6' },
  { name: 'Otra',         primaryColor: '#3b82f6', secondaryColor: '#60a5fa' },
];

async function main() {
  console.log('🏛️  Insertando tipos de institución...\n');
  
  for (const type of institutionTypes) {
    const existing = await prisma.institutionType.findUnique({ where: { name: type.name } });
    if (existing) {
      console.log(`  ⏭️  ${type.name} ya existe (${existing.id})`);
    } else {
      const created = await prisma.institutionType.create({ data: type });
      console.log(`  ✅ ${created.name} creado → Primary: ${created.primaryColor}, Secondary: ${created.secondaryColor}`);
    }
  }
  
  console.log('\n✅ Seed completado.');
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
