const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  const newPassword = 'SuperAdmin2026!';
  const hash = await bcrypt.hash(newPassword, 10);
  
  const updated = await p.user.updateMany({
    where: { email: 'superadmin@system.local' },
    data: { 
      passwordHash: hash,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lockedUntil: null
    }
  });
  
  if (updated.count > 0) {
    console.log('=== PASSWORD RESETEADO ===');
    console.log('Email: superadmin@system.local');
    console.log('Nueva password: ' + newPassword);
    console.log('mustChangePassword: false');
    console.log('=========================');
  } else {
    console.log('ERROR: No se encontró el usuario superadmin@system.local');
  }
  
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
