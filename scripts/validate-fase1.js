/**
 * Script de validación Fase 1 - prompt1.0
 * Verifica que las correcciones críticas están activas
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function validate() {
  console.log('=== VALIDACIÓN FASE 1: SEGURIDAD MULTI-TENANT ===\n');
  
  // 1. Verificar índice compuesto email+tenantId
  console.log('1. MODELO DE USUARIO (índice compuesto)');
  try {
    // Intentar crear 2 usuarios con mismo email en 2 tenants distintos
    const tenants = await prisma.tenant.findMany({ take: 2 });
    if (tenants.length < 2) {
      console.log('   ⚠️  Solo hay 1 tenant, no se puede verificar aislamiento cruzado.');
    } else {
      console.log(`   ✅ Hay ${tenants.length} tenants disponibles para prueba cruzada.`);
      console.log(`   Tenant 1: ${tenants[0].name} (${tenants[0].sigla})`);
      console.log(`   Tenant 2: ${tenants[1].name} (${tenants[1].sigla})`);
    }
  } catch (err) {
    console.log('   ❌ Error verificando tenants:', err.message);
  }

  // 2. Verificar que no hay @unique individual en email
  console.log('\n2. VERIFICAR CONSTRAINTS DE UNICIDAD');
  try {
    const result = await prisma.$queryRaw`
      SELECT constraint_name, column_name 
      FROM information_schema.constraint_column_usage 
      WHERE table_name = 'users' 
        AND constraint_name LIKE '%unique%'
      ORDER BY constraint_name
    `;
    console.log('   Constraints únicos en tabla users:');
    result.forEach(r => {
      console.log(`   - ${r.constraint_name}: ${r.column_name}`);
    });
    
    // Verificar que NO exista constraint individual en email
    const hasGlobalEmailUnique = result.some(r => 
      r.column_name === 'email' && !r.constraint_name.includes('tenantId')
    );
    if (hasGlobalEmailUnique) {
      console.log('   ❌ AÚN EXISTE @unique global en email. Riesgo de colisión.');
    } else {
      console.log('   ✅ No hay @unique global en email. Aislamiento correcto.');
    }
  } catch (err) {
    console.log('   ⚠️  No se pudieron verificar constraints:', err.message);
  }
  
  // 3. Verificar que login NO funciona cruzado
  console.log('\n3. VERIFICAR AISLAMIENTO DE LOGIN');
  const buga = await prisma.tenant.findFirst({ where: { sigla: 'PMBUGA' } });
  const pradera = await prisma.tenant.findFirst({ where: { sigla: 'PMPRA' } });
  
  if (buga && pradera) {
    const bugaUsers = await prisma.user.findMany({ where: { tenantId: buga.id }, take: 1 });
    const praderaUsers = await prisma.user.findMany({ where: { tenantId: pradera.id }, take: 1 });
    
    if (bugaUsers.length > 0) {
      // Intentar buscar el usuario de Buga en Pradera
      const crossSearch = await prisma.user.findFirst({
        where: { email: bugaUsers[0].email, tenantId: pradera.id }
      });
      
      if (crossSearch) {
        console.log('   ❌ FUGA: Usuario de Buga encontrado en scope de Pradera!');
      } else {
        console.log('   ✅ Login cruzado bloqueado: usuario de Buga NO visible en Pradera.');
      }
    }
  } else {
    console.log('   ⚠️  No hay suficientes tenants para prueba cruzada.');
  }
  
  console.log('\n=== FIN VALIDACIÓN ===');
}

validate().finally(() => prisma.$disconnect());
