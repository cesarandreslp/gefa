/**
 * Script de migración: Actualiza usuarios con roles antiguos de delegados
 * Los convierte al rol FUNCIONARIO con userType correspondiente
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando migración de usuarios...\n');

  // Obtener el rol FUNCIONARIO
  const funcionarioRole = await prisma.role.findUnique({
    where: { code: 'FUNCIONARIO' }
  });

  if (!funcionarioRole) {
    throw new Error('Rol FUNCIONARIO no encontrado. Ejecuta el seed primero.');
  }

  // Mapeo de roles antiguos a tipos de usuario
  const roleMigrationMap = [
    {
      oldRoleCode: 'DELEGADO_PARTICIPACION_CIUDADANA',
      userType: 'Delegatura Participación Ciudadana',
      userTypeDescription: 'Responsable de promover la participación ciudadana, defender el interés público y atender solicitudes relacionadas con mecanismos de participación, veedurías, control social, rendición de cuentas y participación democrática.'
    },
    {
      oldRoleCode: 'DELEGADA_RAMA_JUDICIAL_SALUD',
      userType: 'Delegatura Rama Judicial y Salud',
      userTypeDescription: 'Encargada de atender asuntos ante la rama judicial, defender el derecho a la salud (EPS, IPS, medicamentos, tratamientos), acciones de cumplimiento, habeas corpus y juzgamiento disciplinario en primera instancia. NO atiende tutelas (van al Personero).'
    },
    {
      oldRoleCode: 'DELEGADO_VIGILANCIA_CONDUCTA_OFICIAL',
      userType: 'Delegatura Vigilancia Conducta Oficial',
      userTypeDescription: 'Responsable de vigilar la conducta oficial de servidores públicos, supervisar la contratación estatal, denuncias de corrupción, prestación de servicios públicos domiciliarios y asuntos relacionados con la administración pública.'
    },
    {
      oldRoleCode: 'DELEGADA_DDHH_MEDIO_AMBIENTE',
      userType: 'Delegatura DDHH y Medio Ambiente',
      userTypeDescription: 'Encargada de promover y defender los derechos humanos fundamentales, proteger poblaciones vulnerables, defender el derecho a un medio ambiente sano, protección de recursos naturales y sostenibilidad ambiental.'
    }
  ];

  let totalMigrated = 0;

  for (const migration of roleMigrationMap) {
    // Buscar el rol antiguo
    const oldRole = await prisma.role.findFirst({
      where: { code: migration.oldRoleCode }
    });

    if (!oldRole) {
      console.log(`⚠️  Rol antiguo no encontrado: ${migration.oldRoleCode} (ignorando)`);
      continue;
    }

    // Buscar usuarios con este rol
    const users = await prisma.user.findMany({
      where: { roleId: oldRole.id }
    });

    console.log(`📋 Migrando ${users.length} usuarios de ${migration.oldRoleCode}...`);

    for (const user of users) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          roleId: funcionarioRole.id,
          userType: migration.userType,
          userTypeDescription: migration.userTypeDescription
        }
      });

      console.log(`   ✅ ${user.email} → ${migration.userType}`);
      totalMigrated++;
    }

    // Desactivar el rol antiguo (no eliminar por integridad referencial)
    await prisma.role.update({
      where: { id: oldRole.id },
      data: { isActive: false }
    });

    console.log(`   🔒 Rol ${migration.oldRoleCode} desactivado\n`);
  }

  console.log(`\n✅ Migración completada: ${totalMigrated} usuarios actualizados`);
  console.log('📝 Los roles antiguos fueron desactivados pero no eliminados');
  console.log('🚀 El sistema ahora usa solo 4 roles: ADMIN, PERSONERO_MUNICIPAL, FUNCIONARIO, VENTANILLA_UNICA\n');
}

main()
  .catch((error) => {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
