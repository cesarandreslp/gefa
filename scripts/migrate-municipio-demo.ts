/**
 * MIGRACIÓN DEMO — Municipio + Comisarías + Secretaría de Gobierno
 * ---------------------------------------------------------------------------
 * Reconceptualiza el tenant demo CFBUGA: de "Comisaría de Familia de Buga" a
 * "Municipio de Guadalajara de Buga" con 3 comisarías (sedes), reparte los datos
 * existentes entre ellas y crea el rol + usuario de Secretaría de Gobierno
 * (seguimiento estadístico, sin acceso a expedientes). Idempotente.
 *
 * Uso: npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/migrate-municipio-demo.ts
 * ---------------------------------------------------------------------------
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { sigla: 'CFBUGA' } });
  if (!tenant) { console.error('No existe el tenant CFBUGA. Ejecuta primero seed-demo-gefa.ts'); process.exit(1); }

  // 1. Tenant = Municipio
  await prisma.tenant.update({ where: { id: tenant.id }, data: { name: 'Municipio de Guadalajara de Buga' } });
  console.log('🏛️  Tenant → Municipio de Guadalajara de Buga');

  // 2. Tres comisarías (sedes)
  const comisariaDefs = [
    { code: 'CF1', name: 'Comisaría de Familia Primera', address: 'Calle 6 No. 11-40, Centro' },
    { code: 'CF2', name: 'Comisaría de Familia Segunda', address: 'Carrera 14 No. 4-22, Barrio La Merced' },
    { code: 'CF3', name: 'Comisaría de Familia Tercera (móvil)', address: 'Unidad móvil — zona rural', isMobile: true },
  ];
  const comisarias: Record<string, string> = {};
  for (const c of comisariaDefs) {
    const existing = await prisma.comisaria.findFirst({ where: { code: c.code, tenantId: tenant.id } });
    const com = existing
      ? await prisma.comisaria.update({ where: { id: existing.id }, data: { name: c.name, address: c.address, isMobile: c.isMobile ?? false, isActive: true } })
      : await prisma.comisaria.create({ data: { tenantId: tenant.id, code: c.code, name: c.name, address: c.address, isMobile: c.isMobile ?? false, isActive: true } });
    comisarias[c.code] = com.id;
    console.log(`   ✅ ${c.code} — ${c.name}`);
  }

  // 3. Repartir casos entre comisarías (desigual, para ver diferencias en el seguimiento)
  const cases = await prisma.case.findMany({ where: { tenantId: tenant.id }, orderBy: { filingNumber: 'asc' }, select: { id: true, filingNumber: true } });
  const plan = [comisarias.CF1, comisarias.CF1, comisarias.CF2]; // CF1: 2 casos, CF2: 1, CF3: 0
  for (let i = 0; i < cases.length; i++) {
    await prisma.case.update({ where: { id: cases[i].id }, data: { comisariaId: plan[i] ?? comisarias.CF1 } });
    console.log(`   📂 ${cases[i].filingNumber} → comisaría`);
  }

  // 4. Repartir funcionarios en comisarías (admin y secretaría quedan a nivel municipio)
  const userComisaria: Record<string, string> = {
    'comisaria@cfbuga.gov.co': comisarias.CF1,
    'psicologa@cfbuga.gov.co': comisarias.CF1,
    'abogada@cfbuga.gov.co': comisarias.CF1,
    'trabajo.social@cfbuga.gov.co': comisarias.CF2,
    'ventanilla@cfbuga.gov.co': comisarias.CF1,
  };
  for (const [email, comId] of Object.entries(userComisaria)) {
    const u = await prisma.user.findFirst({ where: { email, tenantId: tenant.id } });
    if (u) await prisma.user.update({ where: { id: u.id }, data: { comisariaId: comId } });
  }
  console.log('   👥 Funcionarios asignados a sus comisarías');

  // 5. Rol Secretaría de Gobierno + usuario (solo seguimiento estadístico)
  const secRole = await prisma.role.findFirst({ where: { code: 'SECRETARIA_GOBIERNO', tenantId: tenant.id } })
    ?? await prisma.role.create({ data: { tenantId: tenant.id, code: 'SECRETARIA_GOBIERNO', name: 'Secretaría de Gobierno', description: 'Dependencia de la administración municipal que hace seguimiento estadístico al desempeño de las comisarías de familia. Acceso solo a tableros agregados; sin acceso a expedientes ni datos personales.', level: 95, permissions: ['stats:read:*'], canApprove: false, canReassign: false, canSign: false, isActive: true } });
  const secEmail = 'secretaria.gobierno@buga.gov.co';
  const existingSec = await prisma.user.findFirst({ where: { email: secEmail, tenantId: tenant.id } });
  if (!existingSec) {
    await prisma.user.create({ data: { tenantId: tenant.id, email: secEmail, passwordHash: await bcrypt.hash('Secretaria2026!', 10), fullName: 'Secretaría de Gobierno Municipal', documentType: 'CC', documentNumber: '14820099', roleId: secRole.id, userType: 'Secretaría de Gobierno', isActive: true, mustChangePassword: false } });
  }
  console.log(`   🏛️  Secretaría de Gobierno: ${secEmail} / Secretaria2026!`);

  console.log('\n✅ Migración completa. El municipio ahora tiene 3 comisarías y la Secretaría de Gobierno puede hacer seguimiento.');
}

main().catch((e) => { console.error('❌', e); process.exit(1); }).finally(() => prisma.$disconnect());
