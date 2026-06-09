/**
 * API Endpoint - Registro de Nueva Entidad (Multi-Tenant Onboarding)
 * 
 * POST /api/v1/registro-entidad
 * 
 * Crea una nueva entidad con su estructura base:
 * 1. Tenant (entidad)
 * 2. Roles base (ADMIN, FUNCIONARIO, REVISOR_MUNICIPAL)
 * 3. Tipos de caso base
 * 4. Usuario administrador
 * 
 * Este endpoint es PÚBLICO (no requiere autenticación)
 * Solo para NUEVAS entidades - las entidades base existentes no pasan por aquí
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { auditService } from '@/services/AuditService';

const SALT_ROUNDS = 10;

interface RegistroEntidadInput {
  // Datos de la entidad
  nombre: string;
  sigla: string;
  correoInstitucional?: string;
  telefono?: string;
  direccion?: string;
  logoUrl?: string;

  // Datos del administrador
  adminNombre: string;
  adminEmail: string;
  adminPassword: string;
}

// Roles base que se crean para cada nueva entidad
const ROLES_BASE = [
  {
    code: 'ADMIN',
    name: 'Administrador',
    description: 'Administrador del sistema con acceso total a todas las funcionalidades',
    level: 100,
    permissions: ['*:*:*'],
    canApprove: true,
    canReassign: true,
    canSign: true,
  },
  {
    code: 'DIRECTOR',
    name: 'Director',
    description: 'Máxima autoridad institucional. Atiende casos críticos y es fallback de la IA.',
    level: 100,
    permissions: ['*:*:*'],
    canApprove: true,
    canReassign: true,
    canSign: true,
  },
  {
    code: 'ASIGNACION_DE_CASOS',
    name: 'Asignación de Casos (IA)',
    description: 'Agente de IA que distribuye automáticamente los casos entre funcionarios.',
    level: 90,
    permissions: ['cases:assign:*', 'users:read:*', 'cases:read:*'],
    canApprove: false,
    canReassign: false,
    canSign: false,
  },
  {
    code: 'FUNCIONARIO',
    name: 'Funcionario',
    description: 'Personal técnico o profesional. La IA le asigna casos según su especialidad.',
    level: 85,
    permissions: ['cases:read:*', 'cases:update:assigned'],
    canApprove: true,
    canReassign: false,
    canSign: true,
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
  },
];

// Tipos de caso base
const CASE_TYPES_BASE = [
  {
    code: 'DP',
    name: 'Derecho de Petición',
    description: 'Solicitud de información o documentos',
    defaultLegalTermDays: 15,
    legalReference: 'Ley 1755 de 2015',
    requiresSupervisorApproval: false,
    requiresSignature: true,
    displayOrder: 1,
  },
  {
    code: 'Q',
    name: 'Queja',
    description: 'Queja sobre funcionarios o servicios',
    defaultLegalTermDays: 15,
    legalReference: 'Código Contencioso Administrativo',
    requiresSupervisorApproval: true,
    requiresSignature: true,
    displayOrder: 2,
  },
  {
    code: 'SG',
    name: 'Solicitud General',
    description: 'Solicitudes generales de la ciudadanía',
    defaultLegalTermDays: 15,
    legalReference: 'Ley 1755 de 2015',
    requiresSupervisorApproval: false,
    requiresSignature: false,
    displayOrder: 3,
  },
];

export async function POST(request: NextRequest) {
  try {
    const body: RegistroEntidadInput = await request.json();

    // ========================================
    // VALIDACIONES
    // ========================================

    // Campos obligatorios
    if (!body.nombre?.trim() || !body.sigla?.trim() || !body.adminNombre?.trim() || !body.adminEmail?.trim() || !body.adminPassword?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Todos los campos obligatorios deben ser completados' },
        { status: 400 }
      );
    }

    // Normalizar sigla a mayúsculas sin espacios
    const sigla = body.sigla.trim().toUpperCase().replace(/\s+/g, '');

    // Validar formato de sigla (solo letras y números, 3-20 caracteres)
    if (!/^[A-Z0-9]{3,20}$/.test(sigla)) {
      return NextResponse.json(
        { success: false, error: 'La sigla debe tener entre 3 y 20 caracteres alfanuméricos (ej: ENTIDAD, DEFCOL)' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.adminEmail)) {
      return NextResponse.json(
        { success: false, error: 'El correo del administrador no es válido' },
        { status: 400 }
      );
    }

    // Validar contraseña mínima (8 caracteres)
    if (body.adminPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Verificar sigla única
    const existingSigla = await prisma.tenant.findUnique({
      where: { sigla },
    });

    if (existingSigla) {
      return NextResponse.json(
        { success: false, error: `Ya existe una entidad registrada con la sigla "${sigla}"` },
        { status: 409 }
      );
    }

    // Verificar email único
    const existingEmail = await prisma.user.findFirst({
      where: { email: body.adminEmail.toLowerCase().trim() },
    });

    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un usuario registrado con ese correo electrónico' },
        { status: 409 }
      );
    }

    // ========================================
    // CREACIÓN EN TRANSACCIÓN
    // ========================================
    const result = await prisma.$transaction(async (tx) => {

      // 1. Crear Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: body.nombre.trim(),
          sigla,
          institutionalEmail: body.correoInstitucional?.trim() || null,
          phone: body.telefono?.trim() || null,
          address: body.direccion?.trim() || null,
          logoUrl: body.logoUrl?.trim() || null,
          isActive: true,
        },
      });

      // 2. Crear roles base para el tenant
      const createdRoles: Record<string, string> = {};

      for (const roleData of ROLES_BASE) {
        // Generar un código único por tenant para evitar conflicto con el @unique del code
        const uniqueCode = `${roleData.code}_${sigla}`;
        const role = await tx.role.create({
          data: {
            tenantId: tenant.id,
            code: uniqueCode,
            name: roleData.name,
            description: roleData.description,
            level: roleData.level,
            permissions: roleData.permissions,
            canApprove: roleData.canApprove,
            canReassign: roleData.canReassign,
            canSign: roleData.canSign,
            isActive: true,
          },
        });
        createdRoles[roleData.code] = role.id;
      }

      // 3. Crear tipos de caso base para el tenant
      for (const ctData of CASE_TYPES_BASE) {
        const uniqueCode = `${ctData.code}_${sigla}`;
        await tx.caseType.create({
          data: {
            tenantId: tenant.id,
            code: uniqueCode,
            name: ctData.name,
            description: ctData.description,
            defaultLegalTermDays: ctData.defaultLegalTermDays,
            legalReference: ctData.legalReference,
            requiresSupervisorApproval: ctData.requiresSupervisorApproval,
            requiresSignature: ctData.requiresSignature,
            isActive: true,
            displayOrder: ctData.displayOrder,
            allowedStateIds: [],
          },
        });
      }

      // 3.5 Crear cargos base para el tenant
      const POSITIONS_BASE = [
        { name: 'Administrador', roleCode: 'ADMIN' },
        { name: 'Ventanilla Única', roleCode: 'VENTANILLA_UNICA' },
        { name: 'Auxiliar de Atención al Usuario', roleCode: 'AUXILIAR_ATENCION_USUARIO' },
      ];

      for (const pos of POSITIONS_BASE) {
        await tx.position.create({
          data: {
            tenantId: tenant.id,
            name: pos.name,
            roleCode: pos.roleCode,
            isActive: true,
          },
        });
      }

      // 4. Crear usuario administrador
      const passwordHash = await bcrypt.hash(body.adminPassword, SALT_ROUNDS);

      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: body.adminEmail.toLowerCase().trim(),
          passwordHash,
          fullName: body.adminNombre.trim(),
          documentType: 'CC',
          documentNumber: `ADMIN-${sigla}-${Date.now()}`, // Temporal, el admin puede actualizarlo después
          roleId: createdRoles['ADMIN'],
          isActive: true,
          mustChangePassword: false,
        },
        include: {
          role: true,
        },
      });

      return { tenant, adminUser };
    });

    // ========================================
    // LOG DE AUDITORÍA (TENANT CREADO)
    // ========================================
    const reqHeaderEmail = result.adminUser.email; // Simulamos que él mismo inició el proceso
    
    await auditService.logTenantCreated(
      result.tenant.id,
      result.adminUser.id,
      reqHeaderEmail,
      'SUPER_ADMIN', 
      request.headers.get('x-forwarded-for') || '127.0.0.1',
      request.headers.get('user-agent') || 'Onboarding Automático',
      { sigla: result.tenant.sigla, nombre: result.tenant.name }
    );

    await auditService.logAdminCreated(
      result.adminUser.id,
      result.adminUser.email,
      result.tenant.id,
      result.adminUser.id,
      reqHeaderEmail,
      'SUPER_ADMIN',
      request.headers.get('x-forwarded-for') || '127.0.0.1',
      request.headers.get('user-agent') || 'Onboarding Automático'
    );

    // ========================================
    // RESPUESTA EXITOSA
    // ========================================
    console.log(`✅ Nueva entidad registrada: ${result.tenant.sigla} - ${result.tenant.name}`);
    console.log(`   Admin: ${result.adminUser.email}`);

    return NextResponse.json({
      success: true,
      message: 'Entidad registrada exitosamente',
      data: {
        tenant: {
          id: result.tenant.id,
          nombre: result.tenant.name,
          sigla: result.tenant.sigla,
        },
        admin: {
          id: result.adminUser.id,
          email: result.adminUser.email,
          nombre: result.adminUser.fullName,
          rol: result.adminUser.role?.name || 'Administrador',
        },
      },
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Error en registro de entidad:', error);

    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    return NextResponse.json(
      {
        success: false,
        error: 'Error interno al registrar la entidad',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
