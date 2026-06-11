/**
 * SEED PRINCIPAL — GEFA (Gestión Familiar)
 * ---------------------------------------------------------------------------
 * Siembra una BD demo multitenant que refleja la jerarquía real del dominio:
 *
 *   TENANT = ALCALDÍA (municipio)
 *     ├─ ADMIN ................. administra usuarios/config del municipio
 *     ├─ ASIGNACION_DE_CASOS ... agente IA de asignación
 *     ├─ SECRETARIA_GOBIERNO ... dashboard de control (estadísticas, sin expedientes)
 *     └─ COMISARÍAS (sedes CF1/CF2/CF3), cada una con su equipo:
 *           ├─ DIRECTOR ............... el/la Comisario/a (autoridad: firma, aprueba)
 *           ├─ FUNCIONARIO ........... equipo interdisciplinario (psico/trabajo social)
 *           ├─ VENTANILLA_UNICA ...... recibe y radica
 *           └─ AUXILIAR_ATENCION_USUARIO
 *
 * 3 tenants en una sola BD (separados por tenantId). Los estados de caso son
 * globales (sin tenantId). El catálogo de instrumentos es global y se siembra
 * con `scripts/seed-instrumentos.ts`.
 *
 * Uso: npx prisma db push --force-reset --accept-data-loss  (limpia)
 *      npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" prisma/seed.ts
 * ---------------------------------------------------------------------------
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { FAMILY_CASE_TYPES } from '../src/domain/catalogs/familyCaseTypes';
import { FAMILY_CASE_STATES } from '../src/domain/catalogs/familyCaseStates';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Gefa2026!';

const ROLES = [
  { code: 'ADMIN', name: 'Administrador', level: 100, permissions: ['*:*:*'], canApprove: true, canReassign: true, canSign: true,
    description: 'Administrador del municipio (Alcaldía): gestiona usuarios y configuración. No es autoridad procesal ni equipo clínico.' },
  { code: 'DIRECTOR', name: 'Comisario/a de Familia', level: 100, permissions: ['*:*:*'], canApprove: true, canReassign: true, canSign: true,
    description: 'Autoridad de la comisaría de familia. Toma declaraciones, valora pruebas y aprueba/firma los informes; sus actos tienen peso procesal.' },
  { code: 'SECRETARIA_GOBIERNO', name: 'Secretaría de Gobierno', level: 95, permissions: ['stats:read:*'], canApprove: false, canReassign: false, canSign: false,
    description: 'Supervisión municipal: tablero de control con estadísticas agregadas de todas las comisarías. No accede a expedientes ni a datos confidenciales.' },
  { code: 'ASIGNACION_DE_CASOS', name: 'Asignación de Casos (IA)', level: 90, permissions: ['cases:assign:*', 'cases:read:*'], canApprove: false, canReassign: true, canSign: false,
    description: 'Agente de IA para la asignación inteligente de casos entre funcionarios.' },
  { code: 'FUNCIONARIO', name: 'Funcionario (equipo interdisciplinario)', level: 85, permissions: ['cases:read:*', 'cases:update:assigned'], canApprove: true, canReassign: false, canSign: true,
    description: 'Equipo interdisciplinario de la comisaría (psicología / trabajo social): atiende casos, aplica instrumentos y elabora valoraciones.' },
  { code: 'VENTANILLA_UNICA', name: 'Ventanilla Única', level: 80, permissions: ['cases:*:*', 'users:read:*'], canApprove: false, canReassign: true, canSign: false,
    description: 'Recibe y radica las solicitudes ciudadanas en la comisaría.' },
  { code: 'AUXILIAR_ATENCION_USUARIO', name: 'Auxiliar de Atención al Usuario', level: 75, permissions: ['cases:read:*', 'citizens:read:*'], canApprove: false, canReassign: false, canSign: false,
    description: 'Apoyo en la atención directa al usuario en la comisaría.' },
];

// Estados del workflow de comisaría de familia (fuente única: FAMILY_CASE_STATES).
const STATES = FAMILY_CASE_STATES;

const TENANTS = [
  { sigla: 'BUGA', name: 'Alcaldía de Guadalajara de Buga', domain: 'gefa-cfbuga.vercel.app' },
  { sigla: 'TULUA', name: 'Alcaldía de Tuluá', domain: 'gefa-black.vercel.app' },
  { sigla: 'PALMIRA', name: 'Alcaldía de Palmira', domain: 'gefa-palmira.vercel.app' },
];

const COMISARIAS = [
  { code: 'CF1', name: 'Comisaría de Familia Primera' },
  { code: 'CF2', name: 'Comisaría de Familia Segunda' },
  { code: 'CF3', name: 'Comisaría de Familia Tercera' },
];

async function main() {
  console.log('🌱 Seed GEFA — BD demo multitenant\n');

  // 1. Estados de caso (GLOBALES, sin tenantId)
  console.log('📋 Estados de caso (globales)…');
  for (const s of STATES) {
    await prisma.caseState.upsert({ where: { code: s.code }, update: {}, create: s });
  }
  console.log(`   ✅ ${STATES.length} estados`);

  const credenciales: string[] = [];
  let firstAdminId = '';

  // 2. Por cada TENANT (alcaldía)
  for (const t of TENANTS) {
    console.log(`\n🏛️  Tenant: ${t.name} [${t.sigla}] (${t.domain})`);
    const tenant = await prisma.tenant.upsert({
      where: { sigla: t.sigla },
      update: { name: t.name, domain: t.domain, isActive: true },
      create: { name: t.name, sigla: t.sigla, domain: t.domain, isActive: true },
    });

    // 2a. Roles (por tenant)
    const roleId: Record<string, string> = {};
    for (const r of ROLES) {
      const existing = await prisma.role.findFirst({ where: { code: r.code, tenantId: tenant.id } });
      const role = existing
        ? await prisma.role.update({ where: { id: existing.id }, data: { name: r.name, description: r.description, level: r.level, permissions: r.permissions, canApprove: r.canApprove, canReassign: r.canReassign, canSign: r.canSign, isActive: true } })
        : await prisma.role.create({ data: { ...r, tenantId: tenant.id, isActive: true } });
      roleId[r.code] = role.id;
    }
    console.log(`   ✅ ${ROLES.length} roles`);

    // 2b. Tipos de caso (por tenant)
    for (const ct of FAMILY_CASE_TYPES) {
      const existing = await prisma.caseType.findFirst({ where: { code: ct.code, tenantId: tenant.id } });
      if (existing) await prisma.caseType.update({ where: { id: existing.id }, data: { defaultLegalTermDays: ct.defaultLegalTermDays } });
      else await prisma.caseType.create({ data: { ...ct, tenantId: tenant.id, isActive: true } });
    }
    console.log(`   ✅ ${FAMILY_CASE_TYPES.length} tipos de caso`);

    const sgla = t.sigla.toLowerCase();
    let doc = 1000;
    const pass = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const mkUser = async (email: string, fullName: string, code: string, comisariaId: string | null, opts: Record<string, unknown> = {}) => {
      const existing = await prisma.user.findFirst({ where: { email, tenantId: tenant.id } });
      const data = {
        email, fullName, tenantId: tenant.id, roleId: roleId[code], comisariaId,
        documentType: 'CC', documentNumber: String(doc++),
        passwordHash: pass, isActive: true, mustChangePassword: false, ...opts,
      };
      const u = existing ? await prisma.user.update({ where: { id: existing.id }, data }) : await prisma.user.create({ data });
      if (!firstAdminId && code === 'ADMIN') firstAdminId = u.id;
      return u;
    };

    // 2c. Usuarios a nivel ALCALDÍA
    await mkUser(`admin@${sgla}.gov.co`, `Administrador ${t.sigla}`, 'ADMIN', null);
    await mkUser(`secretaria.gobierno@${sgla}.gov.co`, `Secretaría de Gobierno ${t.sigla}`, 'SECRETARIA_GOBIERNO', null);
    await mkUser(`ia.asignacion@${sgla}.interno`, `Agente IA — Asignación`, 'ASIGNACION_DE_CASOS', null, {
      passwordHash: await bcrypt.hash(`ia-internal-${tenant.id}`, 10), documentType: 'SISTEMA', maxCaseLoad: 999999,
    });
    credenciales.push(`[${t.sigla}] admin@${sgla}.gov.co · secretaria.gobierno@${sgla}.gov.co`);

    // 2d. Comisarías (sedes) + su equipo
    for (const c of COMISARIAS) {
      const existing = await prisma.comisaria.findFirst({ where: { code: c.code, tenantId: tenant.id } });
      const comisaria = existing
        ? await prisma.comisaria.update({ where: { id: existing.id }, data: { name: c.name, isActive: true } })
        : await prisma.comisaria.create({ data: { code: c.code, name: c.name, tenantId: tenant.id, isActive: true } });

      const cf = c.code.toLowerCase();
      await mkUser(`comisario.${cf}@${sgla}.gov.co`, `Comisario/a ${c.code} ${t.sigla}`, 'DIRECTOR', comisaria.id, { userType: 'Comisario de Familia' });
      await mkUser(`psicologo.${cf}@${sgla}.gov.co`, `Psicólogo/a ${c.code} ${t.sigla}`, 'FUNCIONARIO', comisaria.id, { userType: 'Psicología', profesion: 'PSICOLOGIA' });
      await mkUser(`trabajador.social.${cf}@${sgla}.gov.co`, `Trabajador/a Social ${c.code} ${t.sigla}`, 'FUNCIONARIO', comisaria.id, { userType: 'Trabajo social', profesion: 'TRABAJO_SOCIAL' });
      await mkUser(`ventanilla.${cf}@${sgla}.gov.co`, `Ventanilla ${c.code} ${t.sigla}`, 'VENTANILLA_UNICA', comisaria.id);
      await mkUser(`auxiliar.${cf}@${sgla}.gov.co`, `Auxiliar ${c.code} ${t.sigla}`, 'AUXILIAR_ATENCION_USUARIO', comisaria.id);
    }
    console.log(`   ✅ ${COMISARIAS.length} comisarías × (comisario + psicólogo + trabajador social + ventanilla + auxiliar)`);
  }

  // 3. Configuración global mínima del sistema
  if (firstAdminId) {
    const settings: Array<{ key: 'MAX_CASE_LOAD' | 'AUTO_ASSIGNMENT_ENABLED'; value: number | boolean; description: string }> = [
      { key: 'MAX_CASE_LOAD', value: 50, description: 'Carga máxima de casos por funcionario' },
      { key: 'AUTO_ASSIGNMENT_ENABLED', value: true, description: 'Asignación automática de casos habilitada' },
    ];
    for (const s of settings) {
      await prisma.systemSetting.upsert({ where: { key: s.key }, update: { value: s.value }, create: { key: s.key, value: s.value, description: s.description, updatedByUserId: firstAdminId } });
    }
  }

  console.log('\n✅ Seed completado.');
  console.log(`\n🔑 Contraseña de todos los usuarios: ${DEFAULT_PASSWORD}`);
  console.log('   Patrón de correos por tenant (sigla en minúscula):');
  console.log('     admin@<sigla>.gov.co · secretaria.gobierno@<sigla>.gov.co');
  console.log('     comisario.<cf>@<sigla>.gov.co · psicologo.<cf>@<sigla>.gov.co · trabajador.social.<cf>@<sigla>.gov.co · ventanilla.<cf>@<sigla>.gov.co · auxiliar.<cf>@<sigla>.gov.co');
  console.log('   Tenants:', TENANTS.map((t) => `${t.sigla}→${t.domain}`).join(' · '));
  console.log('\n   Recuerda: el catálogo global de instrumentos se siembra con scripts/seed-instrumentos.ts\n');
}

main()
  .catch((e) => { console.error('❌ Error durante el seed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
