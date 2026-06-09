/**
 * Script de diagnóstico para verificar por qué las solicitudes no llegan a bandeja de entrada
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnosticar() {
  console.log('🔍 DIAGNÓSTICO DE BANDEJA DE ENTRADA\n');
  console.log('='.repeat(60));

  // 1. Verificar roles en BD
  console.log('\n📋 1. ROLES EN LA BASE DE DATOS:');
  const roles = await prisma.role.findMany({
    where: { isActive: true },
    orderBy: { level: 'desc' }
  });
  console.log(`   Total: ${roles.length} roles activos`);
  roles.forEach(r => {
    console.log(`   - ${r.code} (${r.name}) - Nivel: ${r.level}`);
  });

  // 2. Verificar funcionarios
  console.log('\n👥 2. FUNCIONARIOS EN LA BASE DE DATOS:');
  const funcionarios = await prisma.user.findMany({
    where: {
      isActive: true,
      role: {
        code: {
          notIn: ['ASIGNACION_DE_CASOS', 'ADMIN']
        }
      }
    },
    include: {
      role: true
    }
  });
  console.log(`   Total: ${funcionarios.length} funcionarios activos`);
  funcionarios.forEach(f => {
    console.log(`   - ${f.email} (${f.role?.name || 'Sin rol'})`);
  });

  // 3. Verificar casos recientes
  console.log('\n📝 3. CASOS MÁS RECIENTES (últimos 5):');
  const casos = await prisma.case.findMany({
    take: 5,
    orderBy: { filedAt: 'desc' },
    include: {
      state: true,
      citizen: true
    }
  });
  console.log(`   Total casos en BD: ${await prisma.case.count()}`);
  for (const caso of casos) {
    console.log(`   - Radicado: ${caso.filingNumber}`);
    console.log(`     Estado: ${caso.state.code}`);
    console.log(`     Fecha: ${caso.filedAt.toISOString()}`);
    console.log(`     Ciudadano: ${caso.citizen.firstName} ${caso.citizen.firstLastName}`);
    
    // Verificar si tiene asignación
    const assignments = await prisma.assignment.findMany({
      where: { caseId: caso.id },
      include: { assignedByUser: true, user: true }
    });
    
    if (assignments.length === 0) {
      console.log(`     ❌ SIN ASIGNACIONES`);
    } else {
      console.log(`     ✅ ${assignments.length} asignación(es):`);
      assignments.forEach(a => {
        console.log(`        - Asignado a: ${a.user.email}`);
        console.log(`        - Estado: ${a.status}`);
        console.log(`        - Por: ${a.assignedByUser.email}`);
      });
    }
    console.log('');
  }

  // 4. Verificar usuario de IA
  console.log('\n🤖 4. USUARIO DE IA (ASIGNACION_DE_CASOS):');
  const aiUser = await prisma.user.findFirst({
    where: {
      role: { code: 'ASIGNACION_DE_CASOS' },
      isActive: true
    },
    include: { role: true }
  });
  
  if (aiUser) {
    console.log(`   ✅ Existe: ${aiUser.email}`);
  } else {
    console.log(`   ❌ NO EXISTE - Los casos no se pueden auto-asignar`);
  }

  // 5. Verificar estados
  console.log('\n📊 5. ESTADOS DE CASOS:');
  const estados = await prisma.caseState.findMany({
    orderBy: { displayOrder: 'asc' }
  });
  console.log(`   Total: ${estados.length} estados`);
  estados.forEach(e => {
    console.log(`   - ${e.code} (${e.name}) ${e.isFinal ? '🔒 FINAL' : ''}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ Diagnóstico completado\n');
}

diagnosticar()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
