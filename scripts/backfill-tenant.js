// Script para poblar la base de datos con el Tenant inicial (PMBUGA) 
// y asignar todos los registros existentes a este tenant.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando migración de datos Multi-Tenant (Backfill)...');

  // 1. Crear o buscar el Tenant por defecto (PMBUGA)
  let defaultTenant = await prisma.tenant.findUnique({
    where: { sigla: 'PMBUGA' }
  });

  if (!defaultTenant) {
    console.log('🏢 Creando Tenant por defecto: Personería Municipal de Guadalajara de Buga');
    defaultTenant = await prisma.tenant.create({
      data: {
        name: 'Personería Municipal de Guadalajara de Buga',
        sigla: 'PMBUGA',
        institutionalEmail: 'contacto@personeriabuga.gov.co',
        address: 'Calle 6 # 14-52, Buga, Valle del Cauca',
        isActive: true
      }
    });
  } else {
    console.log(`✅ Tenant PMBUGA encontrado (ID: ${defaultTenant.id})`);
  }

  const tenantId = defaultTenant.id;

  // 2. Actualizar Usuarios
  console.log('👥 Actualizando Usuarios...');
  const usersResult = await prisma.user.updateMany({
    where: { tenantId: null },
    data: { tenantId }
  });
  console.log(`   └─ ${usersResult.count} usuarios actualizados.`);

  // 3. Actualizar Roles
  console.log('🔑 Actualizando Roles...');
  const rolesResult = await prisma.role.updateMany({
    where: { tenantId: null },
    data: { tenantId }
  });
  console.log(`   └─ ${rolesResult.count} roles actualizados.`);

  // 4. Actualizar Tipos de Caso
  console.log('📋 Actualizando Tipos de Caso (CaseTypes)...');
  const caseTypesResult = await prisma.caseType.updateMany({
    where: { tenantId: null },
    data: { tenantId }
  });
  console.log(`   └─ ${caseTypesResult.count} tipos actualizados.`);

  // 5. Actualizar Ciudadanos
  console.log('👤 Actualizando Ciudadanos...');
  const citizensResult = await prisma.citizen.updateMany({
    where: { tenantId: null },
    data: { tenantId }
  });
  console.log(`   └─ ${citizensResult.count} ciudadanos actualizados.`);

  // 6. Actualizar Casos (PQRS)
  console.log('📁 Actualizando Casos...');
  const casesResult = await prisma.case.updateMany({
    where: { tenantId: null },
    data: { tenantId }
  });
  console.log(`   └─ ${casesResult.count} casos actualizados.`);

  // 7. Actualizar Asignaciones
  console.log('📎 Actualizando Asignaciones...');
  const assignmentsResult = await prisma.assignment.updateMany({
    where: { tenantId: null },
    data: { tenantId }
  });
  console.log(`   └─ ${assignmentsResult.count} asignaciones actualizadas.`);

  // 8. Actualizar Historial de Estados
  console.log('🕒 Actualizando Historial de Estados...');
  const historyResult = await prisma.caseStateHistory.updateMany({
    where: { tenantId: null },
    data: { tenantId }
  });
  console.log(`   └─ ${historyResult.count} registros de historial actualizados.`);

  console.log('\n✅ Migración de datos (Backfill) completada exitosamente.');
  console.log('👉 Siguiente paso: Modificar schema.prisma para hacer tenantId obligatorio.');
}

main()
  .catch((e) => {
    console.error('❌ Error general durante la migración:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
