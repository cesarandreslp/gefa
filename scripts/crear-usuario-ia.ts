/**
 * Script para crear el usuario de IA (ASIGNACION_DE_CASOS)
 * Este es un usuario interno del sistema que no debe aparecer en listados
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function crearUsuarioIA() {
  console.log('🤖 Creando usuario de IA para asignación automática...');

  const defaultTenant = await prisma.tenant.findUnique({ where: { sigla: 'PMBUGA' } });
  if (!defaultTenant) {
    console.error('❌ Error: El Tenant PMBUGA no existe. Ejecuta el seed primero.');
    return;
  }

  // 1. Verificar si el rol existe
  const rolIA = await prisma.role.findFirst({
    where: { code: 'ASIGNACION_DE_CASOS', tenantId: defaultTenant.id }
  });

  if (!rolIA) {
    console.error('❌ Error: El rol ASIGNACION_DE_CASOS no existe en la BD');
    console.log('   Ejecuta primero el seed: npx tsx prisma/seed.ts');
    return;
  }

  console.log(`✅ Rol encontrado: ${rolIA.name} (ID: ${rolIA.id})`);

  // 2. Verificar si ya existe el usuario
  const existente = await prisma.user.findFirst({
    where: { roleId: rolIA.id }
  });

  if (existente) {
    console.log(`\n⚠️  Usuario IA ya existe:`);
    console.log(`   Email: ${existente.email}`);
    console.log(`   ID: ${existente.id}`);
    console.log(`   Estado: ${existente.isActive ? 'Activo' : 'Inactivo'}`);

    if (!existente.isActive) {
      await prisma.user.update({
        where: { id: existente.id },
        data: { isActive: true }
      });
      console.log(`\n✅ Usuario reactivado`);
    }
    return;
  }

  // 3. Crear el usuario IA
  const passwordHash = await bcrypt.hash('groq-ai-internal-2026', 12);

  const usuarioIA = await prisma.user.create({
    data: {
      tenantId: defaultTenant.id,
      email: 'ia.groq@sistema.interno',
      passwordHash: passwordHash,
      fullName: 'Groq AI - Asignación Automática',
      documentType: 'SISTEMA',
      documentNumber: 'IA-GROQ-001',
      roleId: rolIA.id,
      department: 'Sistema',
      position: 'Inteligencia Artificial',
      isActive: true,
      mustChangePassword: false,
      maxCaseLoad: 999999 // Sin límite para IA
    }
  });

  console.log(`\n✅ Usuario IA creado exitosamente:`);
  console.log(`   Email: ${usuarioIA.email}`);
  console.log(`   ID: ${usuarioIA.id}`);
  console.log(`   Nombre: ${usuarioIA.fullName}`);
  console.log(`\n⚙️  Este usuario es INTERNO y no aparecerá en listados de usuarios`);
  console.log(`\n🎯 Los casos ahora se asignarán automáticamente a los funcionarios\n`);
}

crearUsuarioIA()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
