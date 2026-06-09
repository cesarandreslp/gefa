import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addPermission() {
  try {
    console.log('🔧 Agregando permiso CREAR_SOLICITUDES al rol VENTANILLA_UNICA...\n');
    
    const result = await prisma.role.updateMany({
      where: {
        code: 'VENTANILLA_UNICA'
      },
      data: {
        permissions: {
          push: 'CREAR_SOLICITUDES'
        }
      }
    });

    console.log('✅ Permiso agregado exitosamente');
    console.log(`📊 Roles actualizados: ${result.count}`);

    // Verificar
    const role = await prisma.role.findFirst({
      where: { code: 'VENTANILLA_UNICA' }
    });

    console.log('\n--- Permisos actuales ---');
    role?.permissions.forEach(perm => {
      console.log(`  - ${perm}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addPermission();
