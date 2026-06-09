/**
 * Script para actualizar niveles jerárquicos de roles
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateRoleLevels() {
  console.log('🔧 Actualizando niveles jerárquicos de roles...\n');

  try {
    const updates = [
      { code: 'PERSONERO_MUNICIPAL', level: 100, name: 'Personero Municipal' },
      { code: 'VENTANILLA_UNICA', level: 80, name: 'Ventanilla Única' },
    ];
    
    for (const update of updates) {
      const role = await prisma.role.findUnique({
        where: { code: update.code }
      });

      if (role) {
        await prisma.role.update({
          where: { id: role.id },
          data: { level: update.level }
        });
        console.log(`✅ ${update.name}: Nivel ${role.level} → ${update.level}`);
      }
    }

    console.log('\n✅ Actualización completada!\n');
    console.log('📊 Roles actuales:');
    
    const roles = await prisma.role.findMany({
      select: { code: true, name: true, level: true },
      orderBy: { level: 'desc' }
    });
    
    roles.forEach(role => {
      console.log(`   • ${role.name} (Nivel ${role.level})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateRoleLevels();
