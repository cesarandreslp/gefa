/**
 * API v1 - Endpoint para crear solicitudes generales
 * 
 * POST /api/v1/cases/general-request
 * 
 * Funcionalidad:
 * - Recibe datos de ciudadano y solicitud
 * - Crea/actualiza ciudadano
 * - Crea caso tipo "Solicitud General"
 * - Registra en auditoría
 * - Retorna número de radicación
 * 
 * Seguridad:
 * - Rate limiting (5 requests/hora)
 * - Validación con Zod
 * - Sanitización de inputs
 * - Registro de IP y User Agent
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantFromRequest } from '@/lib/tenantResolver';
import { citizenService } from '@/services/CitizenService';
import { caseService } from '@/services/CaseService';
import { auditService } from '@/services/AuditService';
import { aiAssignmentService } from '@/services/AIAssignmentService';
import { EmailService } from '@/services/EmailService';
import {
  generalRequestSchema,
  successResponse,
  errorResponse,
  handleZodError,
  getClientIp,
  getUserAgent,
  sanitizeString,
} from '@/lib/validation';
import { applyRateLimit, RATE_LIMIT_CONFIGS, addRateLimitHeaders } from '@/lib/rateLimit';
import { CaseTypeCode } from '@/domain/types/CaseTypes';
import { getTenantPrisma } from '@/lib/tenantDb';
import { prisma as mainPrisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const tenant = await getTenantFromRequest(request);
  const dbUrl = (tenant as any)?.databaseUrl as string | undefined;
  const db = dbUrl ? getTenantPrisma(dbUrl) : mainPrisma;
  try {
    // 1. Rate Limiting
    const rateLimitResult = applyRateLimit(request, RATE_LIMIT_CONFIGS.FORM_SUBMISSION);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    // 2. Obtener contexto de auditoría
    const ipAddress = getClientIp(request.headers);
    const userAgent = getUserAgent(request.headers);

    // 3. Parsear body
    const body = await request.json();

    // 4. Validar con Zod
    const validation = generalRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(handleZodError(validation.error), { status: 400 });
    }

    const data = validation.data;

    const isAnonymous = data.isAnonymous === true;
    console.log('[API] Procesando Petición General Ciudadana...');

    // Obtener tenantId dinámicamente basado en el dominio de la petición
    const currentTenant = await getTenantFromRequest(request);
    
    if (!currentTenant) {
      return NextResponse.json(errorResponse('TENANT_NOT_FOUND', 'El dominio de la entidad no está configurado en el sistema'), { status: 400 });
    }
    
    if (!currentTenant.isActive) {
       return NextResponse.json(errorResponse('TENANT_INACTIVE', 'La entidad receptora se encuentra inactiva o suspendida'), { status: 403 });
    }
    
    const tenantId = currentTenant.id;

    // 5. Preparar datos y sanitizar strings
    const sanitizedData = {
      isAnonymous,
      citizen: isAnonymous ? {
        documentType: 'ANON',
        documentNumber: `ANON-${crypto.randomUUID()}`,
        firstName: 'Anónimo',
        lastName: 'Anónimo',
        email: undefined,
        phone: undefined,
        address: undefined,
        neighborhood: undefined,
        city: 'Anónimo',
        department: 'Anónimo',
        dataConsent: true, // Auto-consented since no real data is provided
      } : {
        documentType: data.citizen?.documentType || '',
        documentNumber: data.citizen?.documentNumber || '',
        firstName: sanitizeString(data.citizen?.firstName || ''),
        lastName: sanitizeString(data.citizen?.lastName || ''),
        email: data.citizen?.email,
        phone: data.citizen?.phone,
        address: data.citizen?.address ? sanitizeString(data.citizen.address) : undefined,
        neighborhood: data.citizen?.neighborhood ? sanitizeString(data.citizen.neighborhood) : undefined,
        city: data.citizen?.city ? sanitizeString(data.citizen.city) : 'Ciudad/Municipio',
        department: data.citizen?.department ? sanitizeString(data.citizen.department) : 'Valle del Cauca',
        dataConsent: data.citizen?.dataConsent || false,
      },
      subject: sanitizeString(data.subject),
      description: sanitizeString(data.description),
    };

    // 6. Crear o encontrar ciudadano
    const citizenResult = await citizenService.findOrCreate({
      tenantId,
      documentType: sanitizedData.citizen.documentType,
      documentNumber: sanitizedData.citizen.documentNumber,
      firstName: sanitizedData.citizen.firstName,
      lastName: sanitizedData.citizen.lastName,
      email: sanitizedData.citizen.email,
      phone: sanitizedData.citizen.phone,
      address: sanitizedData.citizen.address,
      neighborhood: sanitizedData.citizen.neighborhood,
      city: sanitizedData.citizen.city || 'Ciudad/Municipio',
      department: sanitizedData.citizen.department || 'Valle del Cauca',
      dataConsent: sanitizedData.citizen.dataConsent,
      dataConsentDate: new Date(),
      dataConsentIp: ipAddress,
      isAnonymous: sanitizedData.isAnonymous,
    }, db);

    // 7. Registrar creación/actualización de ciudadano en auditoría
    if (citizenResult.isNew) {
      await auditService.logCitizenAction(
        'CITIZEN_REQUEST',
        'CITIZEN',
        citizenResult.citizen.id,
        `${sanitizedData.citizen.firstName} ${sanitizedData.citizen.lastName}`,
        tenantId,
        ipAddress,
        userAgent,
        { channel: 'WEB', documentNumber: sanitizedData.citizen.documentNumber, action: 'CITIZEN_CREATED' }
      );
    }

    // 9. Crear caso (Solicitud General)
    const newCase = await caseService.create(
      {
        tenantId,
        citizenId: citizenResult.citizen.id,
        caseTypeCode: 'SG' as CaseTypeCode,
        subject: sanitizedData.subject,
        description: sanitizedData.description,
        folios: 0,
        channel: 'WEB',
        priority: 40,
        metadata: {
          source: 'web_form',
          userAgent,
          ipAddress,
        },
      },
      db
    );

    // 10. Registrar creación de caso en auditoría
    await auditService.logCitizenAction(
      'CITIZEN_REQUEST',
      'CASE',
      newCase.id,
      `${sanitizedData.citizen.firstName} ${sanitizedData.citizen.lastName}`,
      tenantId,
      ipAddress,
      userAgent,
      {
        filingNumber: newCase.filingNumber,
        caseType: 'SG',
        channel: 'WEB',
        action: 'CASE_CREATED',
      }
    );

    // 10. Asignación automática mediante IA
    let assignedRole = 'Pendiente de asignación';
    try {
      console.log('🤖 [AUTO-ASIGNACIÓN] Iniciando proceso de asignación automática...');

      // Obtener el usuario de IA del tenant actual
      const aiUser = await db.user.findFirst({
        where: {
          tenantId,
          role: { level: 90 }, // nivel 90 = ASIGNACION_DE_CASOS
          isActive: true,
        },
      }) ?? await db.user.findFirst({
        where: {
          role: { code: 'ASIGNACION_DE_CASOS' },
          isActive: true,
        },
      });

      console.log('🤖 [AUTO-ASIGNACIÓN] Usuario IA encontrado:', aiUser ? `${aiUser.email} (ID: ${aiUser.id})` : 'NO ENCONTRADO');

      if (aiUser) {
        console.log('🤖 [AUTO-ASIGNACIÓN] Llamando a aiAssignmentService.autoAssignCase...');

        // Analizar y asignar el caso automáticamente
        const assignmentResult = await aiAssignmentService.autoAssignCase({
          tenantId,
          caseId: newCase.id,
          aiUserId: aiUser.id,
          aiUserEmail: aiUser.email,
          ipAddress,
          userAgent,
          db,
        });

        console.log('🤖 [AUTO-ASIGNACIÓN] Resultado:', JSON.stringify(assignmentResult, null, 2));

        if (assignmentResult.success && assignmentResult.analysis) {
          assignedRole = assignmentResult.analysis.recommendedUserType;
          console.log('🤖 [AUTO-ASIGNACIÓN] ✅ Caso asignado al rol:', assignedRole);
        } else {
          console.log('🤖 [AUTO-ASIGNACIÓN] ⚠️ No se pudo asignar:', assignmentResult.error || 'Sin detalles');
        }
      } else {
        console.warn('⚠️ No existe usuario de IA activo con rol ASIGNACION_DE_CASOS. Notificando solo a VU...');
        // Sin usuario IA, notificar directamente a VU usando el primer admin disponible como assignedBy
        const assignedByFallback = await db.user.findFirst({
          where: { tenantId, role: { code: 'ADMIN' }, isActive: true },
        }) ?? await db.user.findFirst({
          where: { tenantId, isActive: true },
        });
        if (assignedByFallback) {
          const vuUsers = await db.user.findMany({
            where: { tenantId, role: { code: 'VENTANILLA_UNICA' }, isActive: true },
          });
          for (const vUser of vuUsers) {
            await db.assignment.create({
              data: {
                tenantId,
                caseId: newCase.id,
                userId: vUser.id,
                assignedBy: assignedByFallback.id,
                status: 'PENDING',
                notes: 'Nuevo caso recibido — pendiente de clasificación VU',
              },
            }).catch((e: unknown) => console.warn('⚠️ VU assignment fallback falló:', e));
          }
        }
      }
    } catch (aiError) {
      // Si falla la IA, el caso se queda sin asignar
      console.error('🤖 [AUTO-ASIGNACIÓN] ❌ Error en asignación automática con IA:', aiError);
    }

    // 11. Enviar email de confirmación al ciudadano
    try {
      const citizenEmail = sanitizedData.citizen.email || citizenResult.citizen.email;
      if (citizenEmail) {
        console.log(`📧 Enviando email de confirmación a ${citizenEmail}...`);
        const citizenFullName = `${sanitizedData.citizen.firstName} ${sanitizedData.citizen.lastName}`;
        await EmailService.sendCitizenConfirmationEmail(
          currentTenant.name,
          citizenEmail,
          citizenFullName,
          newCase.filingNumber,
          tenantId
        );
        console.log(`📧 ✅ Email de confirmación enviado exitosamente`);
      } else {
        console.log('📧 ⚠️ No se encontró email del ciudadano, omitiendo envío de confirmación');
      }
    } catch (emailError) {
      // No fallar el request si el email falla, solo loguear
      console.error('📧 ⚠️ Error enviando email de confirmación (no crítico):', emailError);
    }

    // 12. Preparar respuesta
    const response = NextResponse.json(
      successResponse(
        {
          filingNumber: newCase.filingNumber,
          caseId: newCase.id,
          citizenId: citizenResult.citizen.id,
          dueDate: newCase.dueDate,
          priority: newCase.priority,
          assignedTo: assignedRole,
          message: `Solicitud radicada exitosamente. Su número de radicación es: ${newCase.filingNumber}`,
        },
        {
          isNewCitizen: citizenResult.isNew,
        }
      ),
      { status: 201 }
    );

    // 13. Agregar headers de rate limit
    return addRateLimitHeaders(
      response,
      RATE_LIMIT_CONFIGS.FORM_SUBMISSION,
      rateLimitResult.remaining,
      rateLimitResult.resetTime
    );
  } catch (error: unknown) {
    console.error('Error creating general request:', error);

    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    return NextResponse.json(
      errorResponse(
        'INTERNAL_ERROR',
        'Error al procesar la solicitud. Por favor intente nuevamente.',
        process.env.NODE_ENV === 'development' ? errorMessage : undefined
      ),
      { status: 500 }
    );
  }
}

// Configurar CORS si es necesario
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
