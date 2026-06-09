/**
 * Seed de Festivos de Colombia 2026
 * Fuente: Ley 51 de 1983 + festivos trasladados al lunes (Ley Emiliani)
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Festivos de Colombia 2026
  // Los que tienen (*) son trasladados al lunes siguiente según Ley Emiliani
  const festivos2026 = [
    { date: '2026-01-01', name: 'Año Nuevo', type: 'NATIONAL_HOLIDAY' },
    { date: '2026-01-12', name: 'Día de los Reyes Magos (*)', type: 'NATIONAL_HOLIDAY' },       // 6 ene → lunes 12
    { date: '2026-03-23', name: 'Día de San José (*)', type: 'NATIONAL_HOLIDAY' },               // 19 mar → lunes 23
    { date: '2026-04-02', name: 'Jueves Santo', type: 'NATIONAL_HOLIDAY' },
    { date: '2026-04-03', name: 'Viernes Santo', type: 'NATIONAL_HOLIDAY' },
    { date: '2026-05-01', name: 'Día del Trabajo', type: 'NATIONAL_HOLIDAY' },
    { date: '2026-05-18', name: 'Ascensión del Señor (*)', type: 'NATIONAL_HOLIDAY' },           // 14 may → lunes 18
    { date: '2026-06-08', name: 'Corpus Christi (*)', type: 'NATIONAL_HOLIDAY' },                 // 4 jun → lunes 8
    { date: '2026-06-15', name: 'Sagrado Corazón de Jesús (*)', type: 'NATIONAL_HOLIDAY' },      // 11 jun → lunes 15
    { date: '2026-06-29', name: 'San Pedro y San Pablo (*)', type: 'NATIONAL_HOLIDAY' },          // 29 jun → lunes 29 (ya es lunes)
    { date: '2026-07-20', name: 'Día de la Independencia', type: 'NATIONAL_HOLIDAY' },
    { date: '2026-08-07', name: 'Batalla de Boyacá', type: 'NATIONAL_HOLIDAY' },
    { date: '2026-08-17', name: 'Asunción de la Virgen (*)', type: 'NATIONAL_HOLIDAY' },          // 15 ago → lunes 17
    { date: '2026-10-12', name: 'Día de la Raza (*)', type: 'NATIONAL_HOLIDAY' },                 // 12 oct → lunes 12 (ya es lunes)
    { date: '2026-11-02', name: 'Todos los Santos (*)', type: 'NATIONAL_HOLIDAY' },               // 1 nov → lunes 2
    { date: '2026-11-16', name: 'Independencia de Cartagena (*)', type: 'NATIONAL_HOLIDAY' },     // 11 nov → lunes 16
    { date: '2026-12-08', name: 'Día de la Inmaculada Concepción', type: 'NATIONAL_HOLIDAY' },
    { date: '2026-12-25', name: 'Día de Navidad', type: 'NATIONAL_HOLIDAY' },
  ];

  console.log(`🇨🇴 Cargando ${festivos2026.length} festivos de Colombia 2026...\n`);

  let created = 0;
  let skipped = 0;

  for (const festivo of festivos2026) {
    const dateObj = new Date(festivo.date + 'T00:00:00.000Z');
    
    try {
      await prisma.nonBusinessDay.upsert({
        where: { date: dateObj },
        update: { name: festivo.name, isActive: true },
        create: {
          date: dateObj,
          name: festivo.name,
          type: festivo.type,
          isNational: true,
          isLocal: false,
          isActive: true,
        }
      });
      console.log(`   ✅ ${festivo.date} - ${festivo.name}`);
      created++;
    } catch (err) {
      console.log(`   ⚠️ ${festivo.date} - ${festivo.name} (ya existía o error)`);
      skipped++;
    }
  }

  console.log(`\n🎉 Resultado: ${created} festivos cargados, ${skipped} omitidos.`);
  
  // Verificar total
  const total = await prisma.nonBusinessDay.count({ where: { isActive: true } });
  console.log(`📊 Total de festivos activos en BD: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
