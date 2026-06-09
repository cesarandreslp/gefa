import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPermissions() {
  try {
    console.log('🔍 Verificando permisos del rol VENTANILLA_UNICA...\n');
    
    // Buscar el rol
    const role = await prisma.role.findFirst({
      where: {
        code: 'VENTANILLA_UNICA'
      }
    });

    if (!role) {
      console.log('❌ Rol VENTANILLA_UNICA no encontrado');
      return;
    }

    console.log('✅ Rol encontrado:', role.name);
    console.log('📊 Permisos asignados:', role.permissions.length);
    console.log('\n--- Lista de Permisos ---');
    role.permissions.forEach(perm => {
      console.log(`  - ${perm}`);
    });

    // Verificar si tiene CREAR_SOLICITUDES
    const hasCreatePermission = role.permissions.includes('CREAR_SOLICITUDES');

    console.log('\n--- Verificación ---');
    console.log(`¿Tiene CREAR_SOLICITUDES? ${hasCreatePermission ? '✅ SÍ' : '❌ NO'}`);

    if (!hasCreatePermission) {
      console.log('\n⚠️  SOLUCIÓN: Necesitas agregar el permiso CREAR_SOLICITUDES al rol VENTANILLA_UNICA');
      console.log('Ejecuta el siguiente SQL:');
      console.log(`UPDATE roles SET permissions = array_append(permissions, 'CREAR_SOLICITUDES') WHERE code = 'VENTANILLA_UNICA';`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPermissions();
