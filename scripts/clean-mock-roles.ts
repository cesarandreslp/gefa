/**
 * Script para limpiar roles mock (SUPERVISOR, FUNCIONARIO, SOPORTE) 
 * y sus usuarios asociados de la base de datos
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanMockRoles() {
  console.log('🧹 Limpiando roles mock de la base de datos...\n');

  try {
    // Roles a eliminar
    const mockRoles = ['SUPERVISOR', 'FUNCIONARIO', 'SOPORTE'];
    
    for (const roleCode of mockRoles) {
      const role = await prisma.role.findUnique({
        where: { code: roleCode }
      });

      if (role) {
        console.log(`📋 Encontrado rol: ${roleCode}`);

        // Eliminar usuarios asociados
        const usersDeleted = await prisma.user.deleteMany({
          where: { roleId: role.id }
        });
        
        if (usersDeleted.count > 0) {
          console.log(`   ✅ Eliminados ${usersDeleted.count} usuario(s)`);
        }

        // Eliminar el rol
        await prisma.role.delete({
          where: { id: role.id }
        });
        
        console.log(`   ✅ Rol ${roleCode} eliminado\n`);
      }
    }

    console.log('✅ Limpieza completada exitosamente!\n');
    console.log('📊 Roles actuales en el sistema:');
    
    const remainingRoles = await prisma.role.findMany({
      select: { code: true, name: true, level: true }
    });
    
    remainingRoles.forEach(role => {
      console.log(`   • ${role.code} - ${role.name} (Nivel ${role.level})`);
    });

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanMockRoles();
