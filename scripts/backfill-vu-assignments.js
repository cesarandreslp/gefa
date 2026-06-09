/**
 * Backfill: crear asignaciones VU para casos en RADICADO que nunca las tuvieron.
 * Ejecutar: node scripts/backfill-vu-assignments.js
 */
const { PrismaClient } = require('@prisma/client');

const TENANT_DBS = [
  { name: 'Guacarí',  url: process.env.DATABASE_URL_GUACARI },
  { name: 'Buga',     url: process.env.DATABASE_URL_BUGA },
];

async function backfillTenant({ name, url }) {
  if (!url) {
    console.log(`⚠️  [${name}] Sin DATABASE_URL — omitido`);
    return;
  }

  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    console.log(`\n🔄 [${name}] Conectando...`);

    // 1. Estado RADICADO
    const estadoRadicado = await db.caseState.findFirst({ where: { code: 'RADICADO' } });
    if (!estadoRadicado) {
      console.log(`⚠️  [${name}] No se encontró estado RADICADO`);
      return;
    }

    // 2. Usuarios VU activos
    const vuUsers = await db.user.findMany({
      where: { role: { code: 'VENTANILLA_UNICA' }, isActive: true },
      select: { id: true, email: true, tenantId: true },
    });
    if (vuUsers.length === 0) {
      console.log(`⚠️  [${name}] No hay usuarios VENTANILLA_UNICA activos`);
      return;
    }
    console.log(`👤 [${name}] VU activos: ${vuUsers.map(u => u.email).join(', ')}`);

    // 3. Usuario assignedBy: primer ADMIN o primer usuario activo
    const assignedByUser = await db.user.findFirst({
      where: { role: { code: 'ADMIN' }, isActive: true },
    }) ?? await db.user.findFirst({ where: { isActive: true } });
    if (!assignedByUser) {
      console.log(`⚠️  [${name}] No hay usuario para assignedBy`);
      return;
    }

    // 4. Casos RADICADO sin asignación VU
    const casosRadicados = await db.case.findMany({
      where: { stateId: estadoRadicado.id },
      select: {
        id: true,
        filingNumber: true,
        tenantId: true,
        assignments: {
          select: { userId: true },
        },
      },
    });

    const vuIds = new Set(vuUsers.map(u => u.id));
    const casosSinVU = casosRadicados.filter(c =>
      !c.assignments.some(a => vuIds.has(a.userId))
    );

    console.log(`📋 [${name}] Casos RADICADO: ${casosRadicados.length} | Sin asignación VU: ${casosSinVU.length}`);

    // 5. Crear asignaciones faltantes
    let creados = 0;
    let errores = 0;
    for (const caso of casosSinVU) {
      for (const vUser of vuUsers) {
        try {
          await db.assignment.create({
            data: {
              tenantId: caso.tenantId,
              caseId: caso.id,
              userId: vUser.id,
              assignedBy: assignedByUser.id,
              status: 'PENDING',
              notes: 'Backfill — asignación VU retroactiva',
            },
          });
          creados++;
          console.log(`  ✅ ${caso.filingNumber} → ${vUser.email}`);
        } catch (e) {
          errores++;
          console.error(`  ❌ ${caso.filingNumber} → ${vUser.email}: ${e.message}`);
        }
      }
    }

    console.log(`\n✅ [${name}] Listo: ${creados} asignaciones creadas, ${errores} errores`);
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  console.log('🚀 Backfill asignaciones VU para casos RADICADO sin VU\n');
  for (const tenant of TENANT_DBS) {
    await backfillTenant(tenant);
  }
  console.log('\n🎉 Backfill completado');
}

main().catch(e => {
  console.error('Error fatal:', e);
  process.exit(1);
});
