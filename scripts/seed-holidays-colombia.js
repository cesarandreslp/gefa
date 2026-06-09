/**
 * Generador de Festivos de Colombia (2026-2036)
 * 
 * Calcula automáticamente TODOS los festivos nacionales usando:
 * - Fechas fijas (Año Nuevo, Independencia, Navidad, etc.)
 * - Ley Emiliani / Ley 51 de 1983 (traslado al lunes siguiente)
 * - Algoritmo de Pascua (Computus) para Semana Santa y festejos móviles
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Algoritmo de Pascua (Computus – variante anónima gregoriana) ──
function calcularPascua(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=marzo, 4=abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

// ── Utilidades de fecha ──
function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function siguienteLunes(date) {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
  if (day === 1) return d; // Ya es lunes
  const daysToAdd = day === 0 ? 1 : (8 - day); // Dom→+1, Mar→+6, Mié→+5, etc.
  return addDays(d, daysToAdd);
}

function fmt(date) {
  return date.toISOString().split('T')[0];
}

// ── Generar festivos para un año ──
function generarFestivos(year) {
  const pascua = calcularPascua(year);
  const festivos = [];

  // ════════════════════════════════════════
  // 1. FIESTAS FIJAS (no se mueven)
  // ════════════════════════════════════════
  festivos.push({ date: new Date(Date.UTC(year, 0, 1)),  name: 'Año Nuevo' });
  festivos.push({ date: new Date(Date.UTC(year, 4, 1)),  name: 'Día del Trabajo' });
  festivos.push({ date: new Date(Date.UTC(year, 6, 20)), name: 'Día de la Independencia' });
  festivos.push({ date: new Date(Date.UTC(year, 7, 7)),  name: 'Batalla de Boyacá' });
  festivos.push({ date: new Date(Date.UTC(year, 11, 8)), name: 'Inmaculada Concepción' });
  festivos.push({ date: new Date(Date.UTC(year, 11, 25)), name: 'Día de Navidad' });

  // ════════════════════════════════════════
  // 2. LEY EMILIANI (se mueven al lunes siguiente)
  // ════════════════════════════════════════
  festivos.push({ date: siguienteLunes(new Date(Date.UTC(year, 0, 6))),  name: 'Día de los Reyes Magos' });
  festivos.push({ date: siguienteLunes(new Date(Date.UTC(year, 2, 19))), name: 'Día de San José' });
  festivos.push({ date: siguienteLunes(new Date(Date.UTC(year, 5, 29))), name: 'San Pedro y San Pablo' });
  festivos.push({ date: siguienteLunes(new Date(Date.UTC(year, 7, 15))), name: 'Asunción de la Virgen' });
  festivos.push({ date: siguienteLunes(new Date(Date.UTC(year, 9, 12))), name: 'Día de la Raza' });
  festivos.push({ date: siguienteLunes(new Date(Date.UTC(year, 10, 1))), name: 'Todos los Santos' });
  festivos.push({ date: siguienteLunes(new Date(Date.UTC(year, 10, 11))), name: 'Independencia de Cartagena' });

  // ════════════════════════════════════════
  // 3. DEPENDIENTES DE PASCUA
  // ════════════════════════════════════════
  festivos.push({ date: addDays(pascua, -3), name: 'Jueves Santo' });
  festivos.push({ date: addDays(pascua, -2), name: 'Viernes Santo' });
  // Ascensión (Pascua+39 → trasladado al lunes = Pascua+43)
  festivos.push({ date: siguienteLunes(addDays(pascua, 39)), name: 'Ascensión del Señor' });
  // Corpus Christi (Pascua+60 → trasladado al lunes = Pascua+64)
  festivos.push({ date: siguienteLunes(addDays(pascua, 60)), name: 'Corpus Christi' });
  // Sagrado Corazón (Pascua+68 → trasladado al lunes = Pascua+71)
  festivos.push({ date: siguienteLunes(addDays(pascua, 68)), name: 'Sagrado Corazón de Jesús' });

  return festivos;
}

// ── Ejecutar ──
async function main() {
  const START_YEAR = 2026;
  const END_YEAR = 2036;
  let totalCreated = 0;

  console.log(`🇨🇴 Generando festivos de Colombia ${START_YEAR}-${END_YEAR} (${END_YEAR - START_YEAR + 1} años)\n`);

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const festivos = generarFestivos(year);
    console.log(`📅 ${year} (${festivos.length} festivos, Pascua: ${fmt(calcularPascua(year))})`);

    for (const festivo of festivos) {
      try {
        await prisma.nonBusinessDay.upsert({
          where: { date: festivo.date },
          update: { name: festivo.name, isActive: true },
          create: {
            date: festivo.date,
            name: festivo.name,
            type: 'NATIONAL_HOLIDAY',
            isNational: true,
            isLocal: false,
            isActive: true,
          }
        });
        totalCreated++;
      } catch (err) {
        console.log(`   ⚠️ Error: ${fmt(festivo.date)} - ${festivo.name}`);
      }
    }
    console.log(`   ✅ ${festivos.length} festivos cargados`);
  }

  const total = await prisma.nonBusinessDay.count({ where: { isActive: true } });
  console.log(`\n🎉 Total: ${totalCreated} registros procesados. ${total} festivos activos en BD.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
