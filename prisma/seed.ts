/**
 * SEED PRINCIPAL - Sistema Ventanilla Única
 * Ejecuta todos los seeds necesarios para inicializar el sistema
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { FAMILY_CASE_TYPES } from '../src/domain/catalogs/familyCaseTypes';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed del sistema...\n');

  // 0. Seed de Tenant
  console.log('🏢 0. Seeding Tenant...');
  const defaultTenant = await prisma.tenant.upsert({
    where: { sigla: 'PMBUGA' },
    update: {},
    create: {
      name: 'Personería Municipal de Guadalajara de Buga',
      sigla: 'PMBUGA',
      isActive: true,
    }
  });

  // 1. Seed de roles
  console.log('👔 1. Seeding roles...');
  const roles = [
    {
      code: 'ADMIN',
      name: 'Administrador',
      description: 'Administrador del sistema con acceso total a todas las funcionalidades',
      level: 100,
      permissions: ['*:*:*'],
      canApprove: true,
      canReassign: true,
      canSign: true,
      isActive: true,
    },
    {
      code: 'PERSONERO_MUNICIPAL',
      name: 'Personero Municipal',
      description: 'Máxima autoridad de la Personería Municipal. Responsable de dirigir, coordinar y supervisar la gestión institucional, garantizando la defensa del interés público, la protección de los derechos fundamentales y la correcta atención de las solicitudes ciudadanas. Atiende casos críticos, tutelas y asuntos de alto impacto.',
      level: 100,
      permissions: ['*:*:*'],
      canApprove: true,
      canReassign: true,
      canSign: true,
      isActive: true,
    },
    {
      code: 'VENTANILLA_UNICA',
      name: 'Ventanilla Única',
      description: 'Personal de ventanilla única encargado de recibir, radicar y gestionar solicitudes ciudadanas',
      level: 80,
      permissions: ['cases:*:*', 'users:read:*'],
      canApprove: false,
      canReassign: true,
      canSign: false,
      isActive: true,
    },
    {
      code: 'ASIGNACION_DE_CASOS',
      name: 'Asignación de Casos',
      description: 'Agente de IA especializado en la asignación inteligente y distribución equilibrada de casos entre los funcionarios disponibles',
      level: 90,
      permissions: ['cases:assign:*', 'users:read:*', 'cases:read:*'],
      canApprove: false,
      canReassign: true,
      canSign: false,
      isActive: true,
    },
    {
      code: 'FUNCIONARIO',
      name: 'Funcionario',
      description: 'Personal técnico y profesional de la Personería. Cada funcionario tiene un tipo específico (Delegatura, Director, Coordinador, etc.) que define su área de especialización. La IA asigna casos según la especialidad del funcionario.',
      level: 85,
      permissions: ['cases:read:*', 'cases:update:assigned'],
      canApprove: true,
      canReassign: false,
      canSign: true,
      isActive: true,
    },
    {
      code: 'AUXILIAR_ATENCION_USUARIO',
      name: 'Auxiliar de Atención al Usuario',
      description: 'Personal auxiliar encargado de la atención directa al usuario. Tiene acceso a una tabla de registro de atenciones realizadas.',
      level: 75,
      permissions: ['cases:read:*', 'citizens:read:*'],
      canApprove: false,
      canReassign: false,
      canSign: false,
      isActive: true,
    },
  ];

  for (const roleData of roles) {
    const existing = await prisma.role.findFirst({ where: { code: roleData.code, tenantId: defaultTenant.id } });
    const role = existing
      ? await prisma.role.update({ where: { id: existing.id }, data: {} })
      : await prisma.role.create({ data: { ...roleData, tenantId: defaultTenant.id } });
    console.log(`   ✅ ${role.code} - ${role.name}`);
  }

  // 2. Seed de estados de casos
  console.log('\n📋 2. Seeding estados de casos...');
  const states = [
    {
      code: 'RADICADO',
      name: 'Radicado',
      description: 'Solicitud recibida y radicada oficialmente',
      isInitial: true,
      isFinal: false,
      requiresComment: false,
      color: '#3B82F6',
      displayOrder: 1,
    },
    {
      code: 'EN_ESTUDIO',
      name: 'En Estudio',
      description: 'Funcionario está analizando el caso',
      isInitial: false,
      isFinal: false,
      requiresComment: false,
      color: '#F59E0B',
      displayOrder: 2,
    },
    {
      code: 'REQUIERE_INFORMACION',
      name: 'Requiere Información',
      description: 'Se necesita información adicional del ciudadano',
      isInitial: false,
      isFinal: false,
      requiresComment: true,
      color: '#EAB308',
      displayOrder: 3,
    },
    {
      code: 'ESCALADO_A_OTRA_DEPENDENCIA',
      name: 'Escalado a Otra Dependencia',
      description: 'El caso fue enviado a una dependencia de la Alcaldía para su resolución',
      isInitial: false,
      isFinal: false,
      requiresComment: true,
      color: '#9333EA',
      displayOrder: 4,
    },
    {
      code: 'REMITIDO_A_ENTIDAD_EXTERNA',
      name: 'Remitido a Entidad Externa',
      description: 'El caso fue remitido a una entidad externa (EPS, empresa de servicios públicos, autoridad ambiental, etc.)',
      isInitial: false,
      isFinal: false,
      requiresComment: true,
      color: '#0891B2',
      displayOrder: 5,
    },
    {
      code: 'REMITIDO_POR_COMPETENCIA',
      name: 'Rechazado por Improcedencia',
      description: 'El caso no es competencia de la Personería',
      isInitial: false,
      isFinal: true,
      requiresComment: true,
      color: '#DC2626',
      displayOrder: 6,
    },
    {
      code: 'CERRADO',
      name: 'Cerrado',
      description: 'Trámite finalizado definitivamente',
      isInitial: false,
      isFinal: true,
      requiresComment: true,
      color: '#6B7280',
      displayOrder: 7,
    },
  ];

  for (const state of states) {
    const result = await prisma.caseState.upsert({
      where: { code: state.code },
      update: {},
      create: state,
    });
    console.log(`   ✅ ${result.code} - ${result.name}`);
  }

  // 3. Seed de usuarios administrativos
  console.log('\n👥 3. Seeding usuarios iniciales...');

  // Obtener IDs de roles
  const adminRole = await prisma.role.findFirst({ where: { code: 'ADMIN', tenantId: defaultTenant.id } });

  // 4. Seed de tipos de caso (catálogo canónico de comisaría de familia)
  console.log('\n📋 4. Seeding tipos de caso...');
  for (const caseType of FAMILY_CASE_TYPES) {
    const result = await prisma.caseType.upsert({
      where: { code: caseType.code },
      update: { defaultLegalTermDays: caseType.defaultLegalTermDays },
      create: { ...caseType, isActive: true, tenantId: defaultTenant.id },
    });
    console.log(`   ✅ ${result.code} - ${result.name}`);
  }

  // Continuar con usuarios
  console.log('\n👥 Seeding usuarios iniciales...');

  // Obtener roles
  const aiRole = await prisma.role.findFirst({ where: { code: 'ASIGNACION_DE_CASOS', tenantId: defaultTenant.id } });
  const funcionarioRole = await prisma.role.findFirst({ where: { code: 'FUNCIONARIO', tenantId: defaultTenant.id } });
  const personeroRole = await prisma.role.findFirst({ where: { code: 'DIRECTOR', tenantId: defaultTenant.id } });

  const users = [
    {
      email: 'admin@personeria.gov.co',
      passwordHash: await bcrypt.hash('Admin2026!', 10),
      fullName: 'Administrador Sistema',
      documentType: 'CC',
      documentNumber: '00000000',
      roleId: adminRole!.id,
      isActive: true,
      mustChangePassword: false,
    },
    {
      email: 'ia.asignacion@pmbuga.sistema.interno',
      passwordHash: await bcrypt.hash(`ia-internal-${defaultTenant.id}`, 10),
      fullName: 'Agente IA - Asignación Automática',
      documentType: 'SISTEMA',
      documentNumber: 'IA-PMBUGA',
      roleId: aiRole!.id,
      department: 'Sistema',
      position: 'Inteligencia Artificial',
      isActive: true,
      mustChangePassword: false,
      maxCaseLoad: 999999,
    },
    {
      email: 'personero@personeria.gov.co',
      passwordHash: await bcrypt.hash('Personero2026!', 10),
      fullName: 'Personero Municipal',
      documentType: 'CC',
      documentNumber: '99999999',
      roleId: personeroRole!.id,
      userType: 'Personero Municipal',
      userTypeDescription: 'Máxima autoridad. Atiende casos críticos, tutelas, asuntos de alto impacto institucional, vulneración grave de derechos fundamentales y cualquier caso que requiera la intervención de la máxima autoridad.',
      isActive: true,
      mustChangePassword: false,
    },
    {
      email: 'delegado.participacion@personeria.gov.co',
      passwordHash: await bcrypt.hash('Func2026!', 10),
      fullName: 'Delegado Participación Ciudadana',
      documentType: 'CC',
      documentNumber: '88888888',
      roleId: funcionarioRole!.id,
      userType: 'Delegatura Participación Ciudadana',
      userTypeDescription: 'Responsable de promover la participación ciudadana, defender el interés público y atender solicitudes relacionadas con mecanismos de participación, veedurías, control social, rendición de cuentas y participación democrática.',
      isActive: true,
      mustChangePassword: false,
    },
    {
      email: 'delegada.salud@personeria.gov.co',
      passwordHash: await bcrypt.hash('Func2026!', 10),
      fullName: 'Delegada Rama Judicial y Salud',
      documentType: 'CC',
      documentNumber: '77777777',
      roleId: funcionarioRole!.id,
      userType: 'Delegatura Rama Judicial y Salud',
      userTypeDescription: 'Encargada de atender asuntos ante la rama judicial, defender el derecho a la salud (EPS, IPS, medicamentos, tratamientos), acciones de cumplimiento, habeas corpus y juzgamiento disciplinario en primera instancia. NO atiende tutelas (van al Personero).',
      isActive: true,
      mustChangePassword: false,
    },
    {
      email: 'delegado.vigilancia@personeria.gov.co',
      passwordHash: await bcrypt.hash('Func2026!', 10),
      fullName: 'Delegado Vigilancia Conducta Oficial',
      documentType: 'CC',
      documentNumber: '66666666',
      roleId: funcionarioRole!.id,
      userType: 'Delegatura Vigilancia Conducta Oficial',
      userTypeDescription: 'Responsable de vigilar la conducta oficial de servidores públicos, supervisar la contratación estatal, denuncias de corrupción, prestación de servicios públicos domiciliarios y asuntos relacionados con la administración pública.',
      isActive: true,
      mustChangePassword: false,
    },
    {
      email: 'delegada.ddhh@personeria.gov.co',
      passwordHash: await bcrypt.hash('Func2026!', 10),
      fullName: 'Delegada Derechos Humanos y Medio Ambiente',
      documentType: 'CC',
      documentNumber: '55555555',
      roleId: funcionarioRole!.id,
      userType: 'Delegatura DDHH y Medio Ambiente',
      userTypeDescription: 'Encargada de promover y defender los derechos humanos fundamentales, proteger poblaciones vulnerables, defender el derecho a un medio ambiente sano, protección de recursos naturales y sostenibilidad ambiental.',
      isActive: true,
      mustChangePassword: false,
    },
  ];

  for (const userData of users) {
    const existing = await prisma.user.findFirst({ where: { email: userData.email, tenantId: defaultTenant.id } });
    const user = existing
      ? await prisma.user.update({ where: { id: existing.id }, data: {} })
      : await prisma.user.create({ data: { ...userData, tenantId: defaultTenant.id } });
    console.log(`   ✅ ${user.email} (${user.fullName})`);
  }

  // 5. Configuración del sistema
  console.log('\n⚙️  5. Seeding configuración del sistema...');

  // Obtener el primer usuario admin creado
  const adminUser = await prisma.user.findFirst({ where: { email: 'admin@personeria.gov.co', tenantId: defaultTenant.id } });

  const systemSettings: Array<{
    key: 'INSTITUTION_NAME' | 'INSTITUTION_ADDRESS' | 'INSTITUTION_PHONE' | 'MAX_CASE_LOAD' | 'AUTO_ASSIGNMENT_ENABLED';
    value: string | number | boolean;
    description: string;
    updatedByUserId: string;
  }> = [
      {
        key: 'INSTITUTION_NAME',
        value: 'Personería Municipal de Guadalajara de Buga',
        description: 'Nombre oficial de la institución',
        updatedByUserId: adminUser!.id,
      },
      {
        key: 'INSTITUTION_ADDRESS',
        value: 'Carrera 13 No. 6-45',
        description: 'Dirección física de la institución',
        updatedByUserId: adminUser!.id,
      },
      {
        key: 'INSTITUTION_PHONE',
        value: '(+57) 2 2363636',
        description: 'Teléfono de contacto',
        updatedByUserId: adminUser!.id,
      },
      {
        key: 'MAX_CASE_LOAD',
        value: 50,
        description: 'Carga máxima de casos por funcionario',
        updatedByUserId: adminUser!.id,
      },
      {
        key: 'AUTO_ASSIGNMENT_ENABLED',
        value: true,
        description: 'Asignación automática de casos habilitada',
        updatedByUserId: adminUser!.id,
      },
    ];

  for (const setting of systemSettings) {
    const result = await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: {
        key: setting.key,
        value: setting.value,
        description: setting.description,
        updatedByUserId: setting.updatedByUserId,
      },
    });
    console.log(`   ✅ ${result.key}: ${JSON.stringify(result.value)}`);
  }

  console.log('\n✅ ¡Seed completado exitosamente!\n');
  console.log('📝 Usuario creado:');
  console.log('   • admin@personeria.gov.co / Admin2026!');
  console.log('\n🚀 El sistema está listo para usarse\n');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
