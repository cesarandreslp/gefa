/**
 * Script de reparación: asigna todos los casos existentes a los usuarios VENTANILLA_UNICA
 * de cada tenant que aún no los tengan en su bandeja.
 *
 * Uso: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/repair-ventanilla-assignments.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  console.log(`Procesando ${tenants.length} tenants...\n`);

  let totalCreados = 0;
  let totalOmitidos = 0;

  for (const tenant of tenants) {
    // Usuarios VENTANILLA_UNICA activos en este tenant
    const ventanillaUsers = await prisma.user.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
        role: { code: 'VENTANILLA_UNICA' },
      },
      select: { id: true, email: true },
    });

    if (ventanillaUsers.length === 0) {
      console.log(`[${tenant.name}] Sin usuarios VENTANILLA_UNICA. Omitiendo.`);
      continue;
    }

    // Todos los casos del tenant
    const cases = await prisma.case.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, filingNumber: true },
    });

    if (cases.length === 0) {
      console.log(`[${tenant.name}] Sin casos. Omitiendo.`);
      continue;
    }

    // Necesitamos un usuario para el campo assignedBy — usamos el primer admin disponible
    const adminUser = await prisma.user.findFirst({
      where: { tenantId: tenant.id, isActive: true, role: { code: 'ADMIN' } },
      select: { id: true },
    });

    // Si no hay admin, usar el primer ventanilla como assignedBy
    const assignedById = adminUser?.id ?? ventanillaUsers[0].id;

    console.log(`[${tenant.name}] ${cases.length} casos, ${ventanillaUsers.length} usuario(s) VENTANILLA_UNICA`);

    for (const vUser of ventanillaUsers) {
      // IDs de casos donde este usuario ya tiene assignment
      const existingAssignments = await prisma.assignment.findMany({
        where: { tenantId: tenant.id, userId: vUser.id },
        select: { caseId: true },
      });
      const existingCaseIds = new Set(existingAssignments.map(a => a.caseId));

      const casesACrear = cases.filter(c => !existingCaseIds.has(c.id));

      if (casesACrear.length === 0) {
        console.log(`  ✓ ${vUser.email}: ya tiene todos los casos`);
        totalOmitidos += cases.length;
        continue;
      }

      // Crear asignaciones en lote
      await prisma.assignment.createMany({
        data: casesACrear.map(c => ({
          tenantId: tenant.id,
          caseId: c.id,
          userId: vUser.id,
          assignedBy: assignedById,
          status: 'PENDING' as const,
          workload: 1,
          notes: 'Asignación retroactiva a Ventanilla Única',
        })),
      });

      console.log(`  ✓ ${vUser.email}: ${casesACrear.length} casos asignados`);
      totalCreados += casesACrear.length;
      totalOmitidos += existingCaseIds.size;
    }
  }

  console.log(`\n✅ Listo. Creados: ${totalCreados} | Ya existían: ${totalOmitidos}`);
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
