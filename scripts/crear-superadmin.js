/**
 * Script para crear un nuevo Super Admin
 * Ejecutar: node scripts/crear-superadmin.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  // ========================================
  // CONFIGURACIÓN - Cambia estos valores
  // ========================================
  const EMAIL = 'admin@ventanillaunica.com';
  const PASSWORD = 'Admin2026!';
  const NOMBRE = 'Administrador Principal';
  // ========================================

  // 1. Buscar el rol SUPER_ADMIN existente
  const role = await p.role.findFirst({
    where: { code: { contains: 'SUPER_ADMIN' } }
  });

  if (!role) {
    console.log('ERROR: No existe el rol SUPER_ADMIN. Ejecuta primero prisma/seed-superadmin.ts');
    return;
  }

  // 2. Verificar que no exista ya
  const existing = await p.user.findFirst({ where: { email: EMAIL } });
  if (existing) {
    console.log('ERROR: Ya existe un usuario con email ' + EMAIL);
    return;
  }

  // 3. Crear usuario
  const hash = await bcrypt.hash(PASSWORD, 10);
  const user = await p.user.create({
    data: {
      email: EMAIL,
      passwordHash: hash,
      fullName: NOMBRE,
      documentType: 'CC',
      documentNumber: 'SA-' + Date.now(),
      roleId: role.id,
      isActive: true,
      mustChangePassword: false,
      // tenantId: null  → Super Admin global
    }
  });

  console.log('');
  console.log('=== SUPER ADMIN CREADO ===');
  console.log('Email:    ' + EMAIL);
  console.log('Password: ' + PASSWORD);
  console.log('ID:       ' + user.id);
  console.log('Rol:      ' + role.code + ' (' + role.name + ')');
  console.log('==========================');
  console.log('');

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
