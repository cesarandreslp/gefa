/**
 * SEED DEMO — GEFA (Comisaría de Familia)
 * ---------------------------------------------------------------------------
 * Deja el entorno listo para probar de extremo a extremo:
 *   1. SUPER_ADMIN del control plane (SaaS).
 *   2. Un tenant de ejemplo: Comisaría de Familia de Guadalajara de Buga (CFBUGA).
 *      Vive en la BD global (databaseUrl = null), así que el patrón
 *      `dbUrl ? getTenantPrisma(dbUrl) : mainPrisma` lo resuelve a la BD principal.
 *   3. Roles del tenant (incl. DIRECTOR = comisaria), usuarios por rol, estados,
 *      tipos de caso de familia y TenantSettings.
 *   4. Tres expedientes con partes, medidas, audiencia, valoraciones (confidenciales),
 *      PARD, equipo asignado, historial de estados y auditoría encadenada (ActionLog).
 *
 * Idempotente: borra SOLO los datos de dominio del tenant demo antes de re-sembrar.
 *
 * Uso:  npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/seed-demo-gefa.ts
 * ---------------------------------------------------------------------------
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { FAMILY_CASE_TYPES } from '../src/domain/catalogs/familyCaseTypes';
import { FAMILY_CASE_STATES } from '../src/domain/catalogs/familyCaseStates';

const prisma = new PrismaClient();

const SIGLA = 'CFBUGA';
const YEAR = 2026;
const DEMO_IP = '190.85.10.20';
const DEMO_UA = 'seed-demo-gefa/1.0';

// Mismo cálculo que `computeAuditChecksum` en src/lib/familyApi.ts (cadena de integridad)
function checksum(input: { action: string; userId?: string | null; entityType: string; entityId: string; timestamp: Date; previousHash: string }) {
  return crypto.createHash('sha256').update(JSON.stringify({
    action: input.action, userId: input.userId, entityType: input.entityType,
    entityId: input.entityId, timestamp: input.timestamp.toISOString(), previousHash: input.previousHash,
  })).digest('hex');
}

async function main() {
  console.log('🌱 Seed DEMO GEFA — Comisaría de Familia\n');

  // ───────────────────────────────────────────────────────── 1. SUPER_ADMIN
  console.log('🔐 1. SUPER_ADMIN (control plane)');
  const superRole = await prisma.role.findFirst({ where: { code: 'SUPER_ADMIN', tenantId: null } })
    ?? await prisma.role.create({ data: { code: 'SUPER_ADMIN', name: 'Super Administrador Global', description: 'Administrador central del entorno multitenant', level: 1000, permissions: ['*'], canApprove: true, canReassign: true, canSign: true, isActive: true } });
  const superEmail = 'superadmin@system.local';
  const existingSuper = await prisma.user.findFirst({ where: { email: superEmail } });
  if (!existingSuper) {
    await prisma.user.create({ data: { email: superEmail, passwordHash: await bcrypt.hash('superadmin123', 10), fullName: 'Controlador Global (System Root)', documentType: 'CC', documentNumber: '0000000000', roleId: superRole.id, isActive: true, mustChangePassword: false } });
  }
  console.log(`   ✅ ${superEmail} / superadmin123\n`);

  // ───────────────────────────────────────────────────────── 2. Tenant demo
  console.log('🏢 2. Tenant de ejemplo');
  const tenant = await prisma.tenant.upsert({
    where: { sigla: SIGLA },
    update: { name: 'Comisaría de Familia de Guadalajara de Buga', isActive: true },
    create: {
      name: 'Comisaría de Familia de Guadalajara de Buga',
      sigla: SIGLA,
      domain: 'gefa-cfbuga.vercel.app',
      institutionalEmail: 'comisaria1@buga.gov.co',
      phone: '(+57) 602 236 0000',
      address: 'Calle 6 No. 11-40, Guadalajara de Buga, Valle del Cauca',
      primaryColor: '#003d7a',
      secondaryColor: '#1a5fb4',
      isActive: true,
      // databaseUrl null → opera en la BD global (modo demo / desarrollo)
    },
  });
  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      address: 'Calle 6 No. 11-40, Guadalajara de Buga, Valle del Cauca',
      businessHours: 'Lunes a viernes, 8:00 a.m. – 5:00 p.m.',
      phone: '(+57) 602 236 0000',
      institutionalEmail: 'comisaria1@buga.gov.co',
      primaryColor: '#003d7a',
      secondaryColor: '#1a5fb4',
    },
  });
  console.log(`   ✅ ${tenant.name} (${SIGLA}) — id ${tenant.id}\n`);

  // ───────────────────────────────────────────────────────── 3. Roles del tenant
  console.log('👔 3. Roles del tenant');
  const roleDefs = [
    { code: 'ADMIN', name: 'Administrador', description: 'Administrador del sistema de la comisaría con acceso total.', level: 100, permissions: ['*:*:*'], canApprove: true, canReassign: true, canSign: true },
    { code: 'DIRECTOR', name: 'Comisario(a) de Familia', description: 'Máxima autoridad de la comisaría. Adopta medidas de protección, preside audiencias y supervisa el equipo interdisciplinario. Único rol con acceso al visor de trazabilidad.', level: 100, permissions: ['*:*:*'], canApprove: true, canReassign: true, canSign: true },
    { code: 'FUNCIONARIO', name: 'Equipo Interdisciplinario', description: 'Profesional del equipo (psicología, trabajo social, jurídica). Opera el expediente y registra valoraciones.', level: 85, permissions: ['cases:read:*', 'cases:update:assigned'], canApprove: true, canReassign: false, canSign: true },
    { code: 'VENTANILLA_UNICA', name: 'Recepción / Ventanilla', description: 'Recibe y radica solicitudes y denuncias en el mostrador.', level: 80, permissions: ['cases:*:*', 'users:read:*'], canApprove: false, canReassign: true, canSign: false },
  ];
  const roles: Record<string, string> = {};
  for (const r of roleDefs) {
    const existing = await prisma.role.findFirst({ where: { code: r.code, tenantId: tenant.id } });
    const role = existing ?? await prisma.role.create({ data: { ...r, tenantId: tenant.id, isActive: true } });
    roles[r.code] = role.id;
    console.log(`   ✅ ${r.code} — ${r.name}`);
  }
  console.log('');

  // ───────────────────────────────────────────────────────── 4. Estados (globales)
  console.log('📋 4. Estados del workflow de familia');
  const stateIds: Record<string, string> = {};
  for (const st of FAMILY_CASE_STATES) {
    const s = await prisma.caseState.upsert({ where: { code: st.code }, update: {}, create: { ...st, isActive: true } });
    stateIds[st.code] = s.id;
  }
  console.log(`   ✅ ${Object.keys(stateIds).length} estados\n`);

  // ───────────────────────────────────────────────────────── 5. Tipos de caso
  console.log('📂 5. Tipos de caso de familia');
  const typeIds: Record<string, string> = {};
  for (const ct of FAMILY_CASE_TYPES) {
    const code = `${ct.code}_${SIGLA}`;
    const t = await prisma.caseType.upsert({
      where: { code },
      update: { name: ct.name, defaultLegalTermDays: ct.defaultLegalTermDays, isActive: true },
      create: { tenantId: tenant.id, code, name: ct.name, description: ct.description, defaultLegalTermDays: ct.defaultLegalTermDays, legalReference: ct.legalReference, requiresSupervisorApproval: ct.requiresSupervisorApproval, requiresSignature: ct.requiresSignature, displayOrder: ct.displayOrder, isActive: true, allowedStateIds: [] },
    });
    typeIds[ct.code] = t.id;
  }
  console.log(`   ✅ ${Object.keys(typeIds).length} tipos\n`);

  // ───────────────────────────────────────────────────────── 6. Usuarios
  console.log('👥 6. Usuarios del tenant');
  const userDefs = [
    { key: 'admin', email: 'admin@cfbuga.gov.co', pass: 'Admin2026!', fullName: 'Administrador del Sistema', doc: '16110011', role: 'ADMIN', userType: 'Administrador' },
    { key: 'comisaria', email: 'comisaria@cfbuga.gov.co', pass: 'Comisaria2026!', fullName: 'Marta Lucía Rodríguez', doc: '31920022', role: 'DIRECTOR', userType: 'Comisaria de Familia' },
    { key: 'psicologa', email: 'psicologa@cfbuga.gov.co', pass: 'Equipo2026!', fullName: 'Diana Carolina Gómez', doc: '29655033', role: 'FUNCIONARIO', userType: 'Psicología' },
    { key: 'trabajosocial', email: 'trabajo.social@cfbuga.gov.co', pass: 'Equipo2026!', fullName: 'Luz Helena Vargas', doc: '66877044', role: 'FUNCIONARIO', userType: 'Trabajo Social' },
    { key: 'abogada', email: 'abogada@cfbuga.gov.co', pass: 'Equipo2026!', fullName: 'Sandra Milena Ortiz', doc: '38455055', role: 'FUNCIONARIO', userType: 'Jurídica' },
    { key: 'ventanilla', email: 'ventanilla@cfbuga.gov.co', pass: 'Ventanilla2026!', fullName: 'Carlos Andrés Mejía', doc: '94233066', role: 'VENTANILLA_UNICA', userType: 'Recepción' },
  ];
  const users: Record<string, string> = {};
  for (const u of userDefs) {
    const existing = await prisma.user.findFirst({ where: { email: u.email, tenantId: tenant.id } });
    const user = existing ?? await prisma.user.create({ data: { tenantId: tenant.id, email: u.email, passwordHash: await bcrypt.hash(u.pass, 10), fullName: u.fullName, documentType: 'CC', documentNumber: u.doc, roleId: roles[u.role], userType: u.userType, isActive: true, mustChangePassword: false } });
    users[u.key] = user.id;
    console.log(`   ✅ ${u.email} / ${u.pass}  (${u.userType})`);
  }
  console.log('');

  // ───────────────────────────────────────────────────── 7. Limpiar datos demo
  console.log('🧹 7. Limpiando datos de dominio previos del tenant demo');
  await prisma.actionLog.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.assessment.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.hearing.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.restorationProcess.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.protectionMeasure.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.caseParty.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.assignment.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.caseStateHistory.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.case.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.person.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.citizen.deleteMany({ where: { tenantId: tenant.id } });
  console.log('   ✅ Listo\n');

  // Cadena de auditoría: previousHash arranca en el último del tenant (ninguno) → GENESIS
  let lastHash = 'GENESIS_BLOCK';
  const audit = async (userId: string, email: string, role: string, action: string, entityType: string, entityId: string, caseId: string, when: Date, metadata?: Record<string, unknown>) => {
    const ts = when;
    const cs = checksum({ action, userId, entityType, entityId, timestamp: ts, previousHash: lastHash });
    await prisma.actionLog.create({ data: { tenantId: tenant.id, timestamp: ts, userId, userEmail: email, userRole: role, action, entityType, entityId, ipAddress: DEMO_IP, userAgent: DEMO_UA, caseId, checksum: cs, previousHash: lastHash, success: true, ...(metadata ? { metadata: metadata as never } : {}) } });
    lastHash = cs;
  };

  // Helpers de persona / ciudadano espejo / caso
  let seq = 0;
  const filing = () => `${SIGLA}-${YEAR}-${(++seq).toString().padStart(6, '0')}`;

  const mkPerson = (p: { doc: string; docType?: string; first: string; second?: string; last1: string; last2?: string; gender?: string; minor?: boolean; birth?: Date; phone?: string; priority?: string }) =>
    prisma.person.create({ data: { tenantId: tenant.id, documentType: p.docType ?? 'CC', documentNumber: p.doc, firstName: p.first, secondName: p.second ?? null, firstLastName: p.last1, secondLastName: p.last2 ?? null, gender: p.gender ?? null, isMinor: p.minor ?? false, birthDate: p.birth ?? null, phone: p.phone ?? null, city: 'Guadalajara de Buga', department: 'Valle del Cauca', isPriorityGroup: !!p.priority, priorityReason: p.priority ?? null, dataConsent: true, dataConsentDate: new Date(`${YEAR}-01-15`) } });

  const mkCitizen = (p: { doc: string; first: string; last1: string; phone?: string }) =>
    prisma.citizen.create({ data: { tenantId: tenant.id, documentType: 'CC', documentNumber: p.doc, firstName: p.first, firstLastName: p.last1, phone: p.phone ?? null, city: 'Guadalajara de Buga', department: 'Valle del Cauca', dataConsent: true, dataConsentDate: new Date(`${YEAR}-01-15`) } });

  console.log('🗂️  8. Expedientes de ejemplo');

  // ===================== CASO 1 — Violencia Intrafamiliar (VIF) =====================
  {
    const filedAt = new Date(`${YEAR}-05-04T09:15:00`);
    const victima = await mkPerson({ doc: '1116250101', first: 'Ana', second: 'María', last1: 'Salazar', last2: 'Ríos', gender: 'F', phone: '3104445566', priority: 'VICTIMA_VIF' });
    const agresor = await mkPerson({ doc: '1116250102', first: 'Jorge', last1: 'Cardona', last2: 'León', gender: 'M' });
    const citizen = await mkCitizen({ doc: victima.documentNumber, first: victima.firstName, last1: victima.firstLastName, phone: '3104445566' });

    const c = await prisma.case.create({ data: {
      tenantId: tenant.id, filingNumber: filing(), citizenId: citizen.id, caseTypeId: typeIds['VIF'], stateId: stateIds['MEDIDA_ADOPTADA'],
      channel: 'PRESENCIAL', subject: 'Denuncia por violencia física y psicológica de la pareja',
      description: 'La denunciante manifiesta agresiones físicas reiteradas y amenazas por parte de su compañero permanente durante los últimos seis meses. Solicita medida de protección.',
      priority: 80, legalTermDays: 10, filedAt, dueDate: new Date(`${YEAR}-05-18T17:00:00`),
      caseModality: 'VIOLENCIA_INTRAFAMILIAR', violenceTypes: ['FISICA', 'PSICOLOGICA'],
      metadata: { origen: 'mostrador' },
    } });
    await audit(users.ventanilla, 'ventanilla@cfbuga.gov.co', 'VENTANILLA_UNICA', 'FAMILY_CASE_CREATED', 'Case', c.id, c.id, filedAt);

    const pVictima = await prisma.caseParty.create({ data: { tenantId: tenant.id, caseId: c.id, personId: victima.id, role: 'VICTIMA' } });
    const pAgresor = await prisma.caseParty.create({ data: { tenantId: tenant.id, caseId: c.id, personId: agresor.id, role: 'AGRESOR' } });
    await prisma.caseParty.create({ data: { tenantId: tenant.id, caseId: c.id, personId: victima.id, role: 'DENUNCIANTE' } });
    await audit(users.ventanilla, 'ventanilla@cfbuga.gov.co', 'VENTANILLA_UNICA', 'FAMILY_PARTY_ADDED', 'CaseParty', pVictima.id, c.id, new Date(`${YEAR}-05-04T09:20:00`), { role: 'VICTIMA' });
    await audit(users.ventanilla, 'ventanilla@cfbuga.gov.co', 'VENTANILLA_UNICA', 'FAMILY_PARTY_ADDED', 'CaseParty', pAgresor.id, c.id, new Date(`${YEAR}-05-04T09:21:00`), { role: 'AGRESOR' });

    await prisma.caseStateHistory.create({ data: { tenantId: tenant.id, caseId: c.id, fromStateId: null, toStateId: stateIds['RADICADO'], changedBy: users.ventanilla, reason: 'INITIAL', comment: 'Radicado en el mostrador.', timestamp: filedAt } });
    await prisma.caseStateHistory.create({ data: { tenantId: tenant.id, caseId: c.id, fromStateId: stateIds['RADICADO'], toStateId: stateIds['EN_VALORACION'], changedBy: users.comisaria, reason: 'NORMAL', comment: 'Asignado a psicología para valoración de riesgo.', timestamp: new Date(`${YEAR}-05-04T11:00:00`) } });
    await prisma.caseStateHistory.create({ data: { tenantId: tenant.id, caseId: c.id, fromStateId: stateIds['EN_VALORACION'], toStateId: stateIds['MEDIDA_ADOPTADA'], changedBy: users.comisaria, reason: 'NORMAL', comment: 'Se adopta medida de protección provisional.', timestamp: new Date(`${YEAR}-05-06T15:30:00`) } });
    await audit(users.comisaria, 'comisaria@cfbuga.gov.co', 'DIRECTOR', 'FAMILY_CASE_STATE_CHANGED', 'Case', c.id, c.id, new Date(`${YEAR}-05-06T15:30:00`), { to: 'MEDIDA_ADOPTADA' });

    const asg = await prisma.assignment.create({ data: { tenantId: tenant.id, caseId: c.id, userId: users.psicologa, assignedBy: users.comisaria, status: 'IN_PROGRESS', assignedAt: new Date(`${YEAR}-05-04T11:05:00`) } });
    await audit(users.comisaria, 'comisaria@cfbuga.gov.co', 'DIRECTOR', 'FAMILY_TEAM_ASSIGNED', 'Assignment', asg.id, c.id, new Date(`${YEAR}-05-04T11:05:00`));

    const valoracion = await prisma.assessment.create({ data: { tenantId: tenant.id, caseId: c.id, assessmentType: 'RIESGO', assessorUserId: users.psicologa, assessedPersonId: victima.id, conductedAt: new Date(`${YEAR}-05-05T10:00:00`), findings: 'Aplicado instrumento de valoración de riesgo. Se identifican factores de alto riesgo: amenazas con arma, escalamiento de la frecuencia e intentos de control económico.', riskLevel: 'ALTO', recommendations: 'Medida de protección inmediata con prohibición de acercamiento. Activar red de apoyo familiar.', isConfidential: true } });
    await audit(users.psicologa, 'psicologa@cfbuga.gov.co', 'FUNCIONARIO', 'FAMILY_ASSESSMENT_CREATED', 'Assessment', valoracion.id, c.id, new Date(`${YEAR}-05-05T10:00:00`), { type: 'RIESGO', riskLevel: 'ALTO' });
    await audit(users.comisaria, 'comisaria@cfbuga.gov.co', 'DIRECTOR', 'FAMILY_ASSESSMENT_ACCESSED', 'Assessment', valoracion.id, c.id, new Date(`${YEAR}-05-06T14:50:00`), { type: 'RIESGO' });

    const medida = await prisma.protectionMeasure.create({ data: { tenantId: tenant.id, caseId: c.id, measureType: 'PROHIBICION_APROXIMACION', description: 'Prohibición al agresor de acercarse a la víctima, su lugar de trabajo y su residencia a menos de 200 metros.', legalBasis: 'Art. 17 Ley 294/1996 (mod. Ley 575/2000); Art. 11 Ley 1257/2008', issuedAt: new Date(`${YEAR}-05-06T15:30:00`), expiresAt: new Date(`${YEAR}-11-06T23:59:00`), status: 'VIGENTE', issuedByUserId: users.comisaria, policeStation: 'Estación de Policía Buga Centro', policeNotifiedAt: new Date(`${YEAR}-05-06T16:00:00`) } });
    await audit(users.comisaria, 'comisaria@cfbuga.gov.co', 'DIRECTOR', 'FAMILY_MEASURE_ISSUED', 'ProtectionMeasure', medida.id, c.id, new Date(`${YEAR}-05-06T15:30:00`), { type: 'PROHIBICION_APROXIMACION' });

    const aud = await prisma.hearing.create({ data: { tenantId: tenant.id, caseId: c.id, hearingType: 'DESCARGOS', scheduledAt: new Date(`${YEAR}-05-20T09:00:00`), location: 'Despacho de la Comisaría — Sala 1', presidedByUserId: users.comisaria, wasHeld: false } });
    await audit(users.comisaria, 'comisaria@cfbuga.gov.co', 'DIRECTOR', 'FAMILY_HEARING_SCHEDULED', 'Hearing', aud.id, c.id, new Date(`${YEAR}-05-06T15:40:00`), { type: 'DESCARGOS' });
    console.log(`   ✅ ${c.filingNumber} — VIF (medida vigente, riesgo ALTO)`);
  }

  // ===================== CASO 2 — PARD (Restablecimiento de Derechos de NNA) =====================
  {
    const filedAt = new Date(`${YEAR}-03-10T08:40:00`);
    const nna = await mkPerson({ doc: '1090250303', docType: 'TI', first: 'Samuel', last1: 'Tobón', last2: 'Marín', gender: 'M', minor: true, birth: new Date('2016-07-12'), priority: 'NNA' });
    const denunciante = await mkPerson({ doc: '66120404', first: 'Gloria', last1: 'Marín', last2: 'Ospina', gender: 'F', phone: '3158889900' });
    const citizen = await mkCitizen({ doc: denunciante.documentNumber, first: denunciante.firstName, last1: denunciante.firstLastName, phone: '3158889900' });

    const c = await prisma.case.create({ data: {
      tenantId: tenant.id, filingNumber: filing(), citizenId: citizen.id, caseTypeId: typeIds['PARD'], stateId: stateIds['EN_SEGUIMIENTO'],
      channel: 'PRESENCIAL', subject: 'Presunta negligencia y abandono de niño de 9 años',
      description: 'La abuela materna reporta que el NNA permanece solo largas jornadas, con inasistencia escolar reiterada y signos de desnutrición. Se abre proceso de restablecimiento de derechos.',
      priority: 90, legalTermDays: 80, filedAt, dueDate: new Date(`${YEAR}-07-04T17:00:00`),
      caseModality: 'PARD', violenceTypes: ['NEGLIGENCIA', 'ABANDONO'],
      metadata: { origen: 'mostrador' },
    } });
    await audit(users.ventanilla, 'ventanilla@cfbuga.gov.co', 'VENTANILLA_UNICA', 'FAMILY_CASE_CREATED', 'Case', c.id, c.id, filedAt);

    const pNNA = await prisma.caseParty.create({ data: { tenantId: tenant.id, caseId: c.id, personId: nna.id, role: 'NNA', legalRepresentativeName: 'Gloria Marín Ospina (abuela materna)' } });
    await prisma.caseParty.create({ data: { tenantId: tenant.id, caseId: c.id, personId: denunciante.id, role: 'DENUNCIANTE' } });
    await audit(users.ventanilla, 'ventanilla@cfbuga.gov.co', 'VENTANILLA_UNICA', 'FAMILY_PARTY_ADDED', 'CaseParty', pNNA.id, c.id, new Date(`${YEAR}-03-10T08:50:00`), { role: 'NNA' });

    await prisma.caseStateHistory.create({ data: { tenantId: tenant.id, caseId: c.id, fromStateId: null, toStateId: stateIds['RADICADO'], changedBy: users.ventanilla, reason: 'INITIAL', timestamp: filedAt } });
    await prisma.caseStateHistory.create({ data: { tenantId: tenant.id, caseId: c.id, fromStateId: stateIds['RADICADO'], toStateId: stateIds['EN_VALORACION'], changedBy: users.comisaria, reason: 'NORMAL', comment: 'Verificación de derechos por el equipo interdisciplinario.', timestamp: new Date(`${YEAR}-03-11T09:00:00`) } });
    await prisma.caseStateHistory.create({ data: { tenantId: tenant.id, caseId: c.id, fromStateId: stateIds['EN_VALORACION'], toStateId: stateIds['EN_SEGUIMIENTO'], changedBy: users.comisaria, reason: 'NORMAL', comment: 'Medida de ubicación en medio familiar con seguimiento.', timestamp: new Date(`${YEAR}-03-25T16:00:00`) } });
    await audit(users.comisaria, 'comisaria@cfbuga.gov.co', 'DIRECTOR', 'FAMILY_CASE_STATE_CHANGED', 'Case', c.id, c.id, new Date(`${YEAR}-03-25T16:00:00`), { to: 'EN_SEGUIMIENTO' });

    const asg = await prisma.assignment.create({ data: { tenantId: tenant.id, caseId: c.id, userId: users.trabajosocial, assignedBy: users.comisaria, status: 'IN_PROGRESS', assignedAt: new Date(`${YEAR}-03-11T09:10:00`) } });
    await audit(users.comisaria, 'comisaria@cfbuga.gov.co', 'DIRECTOR', 'FAMILY_TEAM_ASSIGNED', 'Assignment', asg.id, c.id, new Date(`${YEAR}-03-11T09:10:00`));

    const vPsico = await prisma.assessment.create({ data: { tenantId: tenant.id, caseId: c.id, assessmentType: 'PSICOLOGICA', assessorUserId: users.psicologa, assessedPersonId: nna.id, conductedAt: new Date(`${YEAR}-03-14T10:00:00`), findings: 'NNA con afectación emocional asociada a la negligencia parental; vínculo seguro con la abuela materna.', riskLevel: 'MEDIO', recommendations: 'Ubicación en medio familiar (abuela), acompañamiento psicológico y reintegro escolar inmediato.', isConfidential: true } });
    await audit(users.psicologa, 'psicologa@cfbuga.gov.co', 'FUNCIONARIO', 'FAMILY_ASSESSMENT_CREATED', 'Assessment', vPsico.id, c.id, new Date(`${YEAR}-03-14T10:00:00`), { type: 'PSICOLOGICA' });
    const vSocial = await prisma.assessment.create({ data: { tenantId: tenant.id, caseId: c.id, assessmentType: 'TRABAJO_SOCIAL', assessorUserId: users.trabajosocial, assessedPersonId: nna.id, conductedAt: new Date(`${YEAR}-03-15T11:00:00`), findings: 'Visita domiciliaria: condiciones de habitabilidad mínimas garantizadas en casa de la abuela. Madre con consumo problemático de sustancias.', riskLevel: 'MEDIO', recommendations: 'Remitir a la madre a programa de adicciones. Seguimiento mensual por tres meses.', isConfidential: true } });
    await audit(users.trabajosocial, 'trabajo.social@cfbuga.gov.co', 'FUNCIONARIO', 'FAMILY_ASSESSMENT_CREATED', 'Assessment', vSocial.id, c.id, new Date(`${YEAR}-03-15T11:00:00`), { type: 'TRABAJO_SOCIAL' });

    const pard = await prisma.restorationProcess.create({ data: { tenantId: tenant.id, caseId: c.id, childId: nna.id, responsibleUserId: users.trabajosocial, stage: 'SEGUIMIENTO', legalBasis: 'Arts. 52 y 99 Ley 1098/2006', openedAt: new Date(`${YEAR}-03-11T09:15:00`), findings: 'Vulneración de derechos a la educación, salud y cuidado. Sin maltrato físico activo.', recommendations: 'Ubicación en medio familiar con la abuela materna; corresponsabilidad de la madre.', measureAdopted: 'Ubicación en medio familiar (abuela materna) — Art. 56 Ley 1098/2006.', followUpMonths: 3, nextFollowUpAt: new Date(`${YEAR}-06-25T09:00:00`) } });
    await audit(users.trabajosocial, 'trabajo.social@cfbuga.gov.co', 'FUNCIONARIO', 'FAMILY_PARD_OPENED', 'RestorationProcess', pard.id, c.id, new Date(`${YEAR}-03-11T09:15:00`), { stage: 'APERTURA' });
    await audit(users.comisaria, 'comisaria@cfbuga.gov.co', 'DIRECTOR', 'FAMILY_PARD_UPDATED', 'RestorationProcess', pard.id, c.id, new Date(`${YEAR}-03-25T16:05:00`), { stage: 'SEGUIMIENTO' });
    console.log(`   ✅ ${c.filingNumber} — PARD (NNA, en seguimiento)`);
  }

  // ===================== CASO 3 — Custodia, Alimentos y Visitas (CAV) =====================
  {
    const filedAt = new Date(`${YEAR}-06-02T14:10:00`);
    const madre = await mkPerson({ doc: '1116250505', first: 'Paola', last1: 'Henao', last2: 'Cruz', gender: 'F', phone: '3001112233' });
    const padre = await mkPerson({ doc: '94250506', first: 'Andrés', last1: 'Loaiza', last2: 'Pérez', gender: 'M', phone: '3002223344' });
    const hija = await mkPerson({ doc: '1090250507', docType: 'RC', first: 'Valentina', last1: 'Loaiza', last2: 'Henao', gender: 'F', minor: true, birth: new Date('2019-02-20'), priority: 'NNA' });
    const citizen = await mkCitizen({ doc: madre.documentNumber, first: madre.firstName, last1: madre.firstLastName, phone: '3001112233' });

    const c = await prisma.case.create({ data: {
      tenantId: tenant.id, filingNumber: filing(), citizenId: citizen.id, caseTypeId: typeIds['CAV'], stateId: stateIds['EN_AUDIENCIA'],
      channel: 'WEB', subject: 'Solicitud de conciliación de custodia, alimentos y visitas',
      description: 'Los padres, separados, solicitan conciliación para fijar custodia, cuota alimentaria y régimen de visitas de su hija de 7 años. Sin hechos de violencia reportados.',
      priority: 40, legalTermDays: 30, filedAt, dueDate: new Date(`${YEAR}-07-15T17:00:00`),
      caseModality: 'CUSTODIA_ALIMENTOS_VISITAS', violenceTypes: [],
      metadata: { origen: 'portal_ciudadano', requiereRevision: true },
    } });
    await audit(users.ventanilla, 'ventanilla@cfbuga.gov.co', 'VENTANILLA_UNICA', 'FAMILY_CASE_CREATED', 'Case', c.id, c.id, filedAt);

    await prisma.caseParty.create({ data: { tenantId: tenant.id, caseId: c.id, personId: madre.id, role: 'DENUNCIANTE' } });
    await prisma.caseParty.create({ data: { tenantId: tenant.id, caseId: c.id, personId: padre.id, role: 'INTERVINIENTE' } });
    const pHija = await prisma.caseParty.create({ data: { tenantId: tenant.id, caseId: c.id, personId: hija.id, role: 'NNA', legalRepresentativeName: 'Paola Henao Cruz (madre)' } });
    await audit(users.ventanilla, 'ventanilla@cfbuga.gov.co', 'VENTANILLA_UNICA', 'FAMILY_PARTY_ADDED', 'CaseParty', pHija.id, c.id, new Date(`${YEAR}-06-02T14:20:00`), { role: 'NNA' });

    await prisma.caseStateHistory.create({ data: { tenantId: tenant.id, caseId: c.id, fromStateId: null, toStateId: stateIds['RADICADO'], changedBy: null, reason: 'INITIAL', comment: 'Radicado por el portal ciudadano (Comisaría en línea).', timestamp: filedAt } });
    await prisma.caseStateHistory.create({ data: { tenantId: tenant.id, caseId: c.id, fromStateId: stateIds['RADICADO'], toStateId: stateIds['EN_AUDIENCIA'], changedBy: users.abogada, reason: 'NORMAL', comment: 'Citación a audiencia de conciliación.', timestamp: new Date(`${YEAR}-06-03T10:00:00`) } });
    await audit(users.abogada, 'abogada@cfbuga.gov.co', 'FUNCIONARIO', 'FAMILY_CASE_STATE_CHANGED', 'Case', c.id, c.id, new Date(`${YEAR}-06-03T10:00:00`), { to: 'EN_AUDIENCIA' });

    const asg = await prisma.assignment.create({ data: { tenantId: tenant.id, caseId: c.id, userId: users.abogada, assignedBy: users.comisaria, status: 'IN_PROGRESS', assignedAt: new Date(`${YEAR}-06-03T09:30:00`) } });
    await audit(users.comisaria, 'comisaria@cfbuga.gov.co', 'DIRECTOR', 'FAMILY_TEAM_ASSIGNED', 'Assignment', asg.id, c.id, new Date(`${YEAR}-06-03T09:30:00`));

    const aud = await prisma.hearing.create({ data: { tenantId: tenant.id, caseId: c.id, hearingType: 'CONCILIACION', scheduledAt: new Date(`${YEAR}-06-18T10:00:00`), location: 'Despacho de la Comisaría — Sala 2', presidedByUserId: users.comisaria, wasHeld: false, attendees: [{ name: 'Paola Henao Cruz', role: 'Madre', documentNumber: '1116250505' }, { name: 'Andrés Loaiza Pérez', role: 'Padre', documentNumber: '94250506' }] } });
    await audit(users.abogada, 'abogada@cfbuga.gov.co', 'FUNCIONARIO', 'FAMILY_HEARING_SCHEDULED', 'Hearing', aud.id, c.id, new Date(`${YEAR}-06-03T10:10:00`), { type: 'CONCILIACION' });
    console.log(`   ✅ ${c.filingNumber} — CAV (audiencia de conciliación programada)`);
  }

  const totalLogs = await prisma.actionLog.count({ where: { tenantId: tenant.id } });
  console.log(`\n📜 Auditoría encadenada: ${totalLogs} registros en el ActionLog del tenant.`);

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('✅ SEED DEMO COMPLETO');
  console.log('══════════════════════════════════════════════════════════');
  console.log('SUPER ADMIN (SaaS):  superadmin@system.local / superadmin123');
  console.log(`TENANT: ${tenant.name} (${SIGLA})  ·  dominio cf-buga.gov.co`);
  console.log('Usuarios del tenant:');
  for (const u of userDefs) console.log(`  • ${u.email.padEnd(30)} ${u.pass.padEnd(16)} ${u.userType}`);
  console.log('══════════════════════════════════════════════════════════');
}

main()
  .catch((e) => { console.error('❌ Error en seed demo:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
