import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { protectAPIRoute } from '@/lib/auth';
import { auditService } from '@/services/AuditService';
import { getClientIp, getUserAgent } from '@/lib/validation';
import { getTenantPrisma } from '@/lib/tenantDb';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function checkSuperAdmin(request: NextRequest) {
  const auth = await protectAPIRoute(request);
  if (!auth.authorized || !auth.user || auth.user.roleCode !== 'SUPER_ADMIN') {
    console.error('SUPER_ADMIN CHECK FAILED:', JSON.stringify(auth, null, 2));
    return { error: NextResponse.json({ error: 'No autorizado o no es Super Administrador', details: auth }, { status: 403 }) };
  }
  return { user: auth.user };
}

export async function GET(request: NextRequest) {
  const check = await checkSuperAdmin(request);
  if (check.error) return check.error;

  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, cases: true } },
        settings: { select: { groqApiKey: true, smtpUser: true, smtpPass: true, smtpFromName: true } },
      }
    });

    return NextResponse.json({ success: true, data: tenants });
  } catch (error) {
    console.error('Error obteniendo tenants:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const check = await checkSuperAdmin(request);
  if (check.error) return check.error;

  try {
    const body = await request.json();
    const {
      name, sigla, domain, logoUrl, faviconUrl,
      institutionTypeId, institutionalEmail, phone, address,
      groqApiKey, databaseUrl, databaseUrlDirect
    } = body;

    if (!name || !sigla || !domain) {
      return NextResponse.json({ success: false, error: 'Nombre, sigla y dominio son obligatorios' }, { status: 400 });
    }
    if (!logoUrl) {
      return NextResponse.json({ success: false, error: 'El logo es obligatorio' }, { status: 400 });
    }
    if (!institutionTypeId) {
      return NextResponse.json({ success: false, error: 'El tipo de institución es obligatorio' }, { status: 400 });
    }
    if (!groqApiKey) {
      return NextResponse.json({ success: false, error: 'La GROQ API Key es obligatoria' }, { status: 400 });
    }

    const institutionType = await prisma.institutionType.findUnique({ where: { id: institutionTypeId } });
    if (!institutionType) {
      return NextResponse.json({ success: false, error: 'Tipo de institución no válido' }, { status: 400 });
    }

    const existingDomain = await prisma.tenant.findFirst({
      where: { OR: [{ domain }, { sigla }] }
    });
    if (existingDomain) {
      return NextResponse.json({ success: false, error: 'La sigla o el dominio ya están en uso por otra entidad' }, { status: 400 });
    }

    // Credentials generated before transactions
    const adminEmail = `admin@${sigla.toLowerCase()}.gov.co`;
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Step 1: Create Tenant + TenantSettings in global DB (registry)
    const tenant = await prisma.$transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = await tx.tenant.create({
        data: {
          name, sigla, domain,
          primaryColor: institutionType.primaryColor,
          secondaryColor: institutionType.secondaryColor,
          logoUrl,
          faviconUrl: faviconUrl || null,
          institutionTypeId,
          institutionalEmail,
          phone,
          address,
          isActive: true,
          databaseUrl: databaseUrl || null,
          databaseUrlDirect: databaseUrlDirect || null,
        } as any
      });

      await tx.tenantSettings.create({
        data: {
          tenantId: t.id,
          groqApiKey: groqApiKey || null,
          smtpUser: body.smtpUser || null,
          smtpPass: body.smtpPass || null,
          smtpFromName: body.smtpFromName || null,
        },
      });

      return t;
    });

    // Step 2: Provision tenant-specific data in the tenant's own DB (or global as fallback).
    // INVARIANTE: todo tenant creado debe tener su usuario ADMIN. Por eso el aprovisionamiento
    // completo (roles + tipos + ADMIN + IA) corre dentro de UNA transacción interactiva.
    // Si cualquier paso falla, la transacción revierte TODO y además se elimina el registro
    // global del Paso 1, de modo que nunca quede una entidad a medio crear ni sin administrador.
    const db = databaseUrl ? getTenantPrisma(databaseUrl) : prisma;
    const iaPasswordHash = await bcrypt.hash(`ia-internal-${tenant.id}`, 10);

    let adminUser;
    try {
      adminUser = await db.$transaction(async (tx) => {
        // When using a dedicated tenant DB, first create a Tenant replica so FK constraints are satisfied
        if (databaseUrl) {
          await tx.tenant.create({
            data: {
              id: tenant.id,
              name, sigla, domain,
              primaryColor: institutionType.primaryColor,
              secondaryColor: institutionType.secondaryColor,
              logoUrl,
              faviconUrl: faviconUrl || null,
              institutionalEmail,
              phone,
              address,
              isActive: true,
              databaseUrl,
              databaseUrlDirect: databaseUrlDirect || null,
            } as any
          });
        }

        // Create 6 standard roles in tenant DB
        const adminRole = await tx.role.create({
          data: { tenantId: tenant.id, code: 'ADMIN', name: 'Administrador', description: 'Gestión técnica del sistema. NO opera casos.', level: 100, isActive: true }
        });
        const iaRoleRecord = await tx.role.create({
          data: { tenantId: tenant.id, code: 'ASIGNACION_DE_CASOS', name: 'Asignación de Casos (IA)', description: 'Agente de IA que distribuye automáticamente los casos entre funcionarios.', level: 90, isActive: true }
        });
        await tx.role.create({
          data: { tenantId: tenant.id, code: 'DIRECTOR', name: 'Director', description: 'Máxima autoridad institucional. Atiende casos críticos y es fallback de la IA.', level: 100, isActive: true }
        });
        await tx.role.create({
          data: { tenantId: tenant.id, code: 'FUNCIONARIO', name: 'Funcionario', description: 'Personal técnico o profesional. La IA le asigna casos según su especialidad.', level: 85, isActive: true }
        });
        await tx.role.create({
          data: { tenantId: tenant.id, code: 'VENTANILLA_UNICA', name: 'Ventanilla Única', description: 'Recibe, radica y tramita solicitudes ciudadanas en el mostrador.', level: 80, isActive: true }
        });
        await tx.role.create({
          data: { tenantId: tenant.id, code: 'AUXILIAR_ATENCION_USUARIO', name: 'Auxiliar de Atención al Usuario', description: 'Atención directa al ciudadano. Solo lectura de casos y ciudadanos.', level: 75, isActive: true }
        });

        // Create 5 base case types in tenant DB
        const baseCaseTypes = [
          { code: 'DP', name: 'Derecho de Petición', description: 'Solicitud de información o documentos', defaultLegalTermDays: 15, legalReference: 'Ley 1755 de 2015', requiresSupervisorApproval: false, requiresSignature: true, displayOrder: 1 },
          { code: 'Q',  name: 'Queja', description: 'Queja sobre funcionarios o servicios', defaultLegalTermDays: 15, legalReference: 'Código Contencioso Administrativo', requiresSupervisorApproval: true, requiresSignature: true, displayOrder: 2 },
          { code: 'SG', name: 'Solicitud General', description: 'Solicitudes generales de la ciudadanía', defaultLegalTermDays: 15, legalReference: 'Ley 1755 de 2015', requiresSupervisorApproval: false, requiresSignature: false, displayOrder: 3 },
          { code: 'DH', name: 'Derechos Humanos', description: 'Casos de vulneración de derechos humanos', defaultLegalTermDays: 15, legalReference: 'Ley 24 de 1992', requiresSupervisorApproval: true, requiresSignature: true, displayOrder: 4 },
          { code: 'MA', name: 'Medio Ambiente', description: 'Denuncias ambientales', defaultLegalTermDays: 15, legalReference: 'Ley 99 de 1993', requiresSupervisorApproval: true, requiresSignature: true, displayOrder: 5 },
        ];
        for (const ct of baseCaseTypes) {
          await tx.caseType.create({
            data: { ...ct, code: `${ct.code}_${sigla.toUpperCase()}`, tenantId: tenant.id, isActive: true },
          });
        }

        // Create admin user in tenant DB (OBLIGATORIO — define la invariante de esta operación)
        const createdAdmin = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email: adminEmail,
            passwordHash,
            fullName: 'Administrador Principal',
            documentType: 'CC',
            documentNumber: `ADMIN-${sigla}`,
            roleId: adminRole.id,
            mustChangePassword: true,
            isActive: true
          }
        });

        // Create IA user in tenant DB
        await tx.user.create({
          data: {
            tenantId: tenant.id,
            email: `ia.asignacion@${sigla.toLowerCase()}.sistema.interno`,
            passwordHash: iaPasswordHash,
            fullName: 'Agente IA - Asignación Automática',
            documentType: 'SISTEMA',
            documentNumber: `IA-${sigla.toUpperCase()}`,
            roleId: iaRoleRecord.id,
            department: 'Sistema',
            position: 'Inteligencia Artificial',
            isActive: true,
            mustChangePassword: false,
            maxCaseLoad: 999999,
          }
        });

        return createdAdmin;
      }, { timeout: 20000 });
    } catch (provisionError: any) {
      // El aprovisionamiento falló: la transacción ya revirtió la BD del tenant.
      // Revertimos también el registro global del Paso 1 para no dejar un tenant sin admin.
      await prisma.tenantSettings.deleteMany({ where: { tenantId: tenant.id } }).catch(() => {});
      await prisma.tenant.delete({ where: { id: tenant.id } }).catch(() => {});
      console.error('Error aprovisionando tenant (rollback aplicado, no se creó ningún registro):', provisionError);
      return NextResponse.json(
        { success: false, error: 'No se pudo aprovisionar la entidad y su administrador. No se creó ningún registro.', details: provisionError?.message || String(provisionError) },
        { status: 500 }
      );
    }

    // Salvaguarda de la invariante: si por cualquier razón no quedó el ADMIN, revertir todo.
    if (!adminUser) {
      await prisma.tenantSettings.deleteMany({ where: { tenantId: tenant.id } }).catch(() => {});
      await prisma.tenant.delete({ where: { id: tenant.id } }).catch(() => {});
      return NextResponse.json(
        { success: false, error: 'No se pudo crear el administrador del tenant. Operación revertida.' },
        { status: 500 }
      );
    }

    const ipAddress = getClientIp(request.headers);
    const userAgent = getUserAgent(request.headers);

    await auditService.logTenantCreated(
      tenant.id,
      check.user!.userId,
      check.user!.email,
      check.user!.roleCode,
      ipAddress,
      userAgent,
      { domain: tenant.domain, sigla: tenant.sigla, actorEmail: check.user!.email, actorRole: check.user!.roleCode }
    );

    await auditService.logAdminCreated(
      adminUser.id,
      adminEmail,
      tenant.id,
      check.user!.userId,
      check.user!.email,
      check.user!.roleCode,
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      data: {
        tenant,
        credentials: {
          email: adminEmail,
          temporaryPassword: tempPassword
        }
      }
    });

  } catch (error: any) {
    console.error('Error creando tenant:', error);
    return NextResponse.json({ success: false, error: 'Hubo un problema registrando el nuevo tenant', details: error?.message || String(error) }, { status: 500 });
  }
}
