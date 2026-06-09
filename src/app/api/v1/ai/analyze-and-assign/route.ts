/**
 * POST /api/v1/ai/analyze-and-assign
 * 
 * Endpoint para asignación automática mediante IA
 * 
 * Permite al agente de IA analizar una solicitud y asignarla
 * automáticamente al Revisor Delegado más apropiado
 * 
 * Protegido: Solo rol ASIGNACION_DE_CASOS
 */

export const maxDuration = 60; // Configuración permitida para ejecución prolongada de la IA

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { aiAssignmentService } from '@/services/AIAssignmentService';
import { EmailService } from '@/services/EmailService';
import { protectAPIRoute } from '@/lib/auth';
import { getClientIp, getUserAgent } from '@/lib/validation';
import crypto from 'crypto';

// Schema de validación - Acepta tanto caso existente como datos para crear nuevo caso
const analyzeAndAssignSchema = z.union([
  // Opción 1: Caso existente
  z.object({
    caseId: z.string().uuid('ID de caso inválido'),
  }),
  // Opción 2: Crear nuevo caso
  z.object({
    isAnonymous: z.boolean().optional(),
    citizen: z.object({
      documentType: z.string().optional(),
      documentNumber: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      department: z.string().optional(),
      dataConsent: z.boolean().optional(),
    }).optional(),
    subject: z.string().min(5),
    description: z.string().min(10),
  }),
]);

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticación - Roles permitidos: VENTANILLA_UNICA, REVISOR_MUNICIPAL, FUNCIONARIO, SUPERVISOR, ADMIN
    const auth = await protectAPIRoute(request, ['VENTANILLA_UNICA', 'DIRECTOR', 'FUNCIONARIO', 'ADMIN']);

    if (!auth.authorized || !auth.user) {
      console.error('❌ AUTH FAILED - User role not authorized. Auth result:', JSON.stringify(auth));
      return auth.response!;
    }

    const db = auth.db;

    console.log('✅ AUTH OK - User:', auth.user.email, '| RoleCode:', auth.user.roleCode, '| RoleName:', auth.user.roleName);

    // 2. Validar request body
    const body = await request.json();
    const validationResult = analyzeAndAssignSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Datos de entrada inválidos',
            details: validationResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    let caseId: string;

    // Si los datos incluyen información del ciudadano o es anónimo, crear el caso primero
    if ('citizen' in data || ('isAnonymous' in data && data.isAnonymous)) {
      try {
        console.log('📝 Creando nuevo caso desde ventanilla única...');

        let citizen;
        const isAnonymous = data.isAnonymous === true;

        if (isAnonymous) {
          console.log('👤 Petición Anónima');
          citizen = await db.citizen.create({
            data: {
              tenantId: auth.user!.tenantId,
              documentType: 'ANON',
              documentNumber: `ANON-${crypto.randomUUID()}`,
              firstName: 'Anónimo',
              firstLastName: 'Anónimo',
              city: 'Anónimo',
              department: 'Anónimo',
              dataConsent: true,
              isAnonymous: true,
            },
          });
          console.log('✅ Ciudadano anónimo creado:', citizen.id);
        } else if (data.citizen) {
          console.log('👤 Datos del ciudadano:', data.citizen);
          // 1. Buscar o crear ciudadano
          citizen = await db.citizen.findFirst({
            where: {
              tenantId: auth.user!.tenantId,
              documentType: data.citizen.documentType,
              documentNumber: data.citizen.documentNumber,
            },
          });

          if (!citizen) {
            console.log('➕ Creando nuevo ciudadano...');
            citizen = await db.citizen.create({
              data: {
                tenantId: auth.user!.tenantId,
                documentType: data.citizen.documentType || '',
                documentNumber: data.citizen.documentNumber || '',
                firstName: data.citizen.firstName || '',
                firstLastName: data.citizen.lastName || '',
                email: data.citizen.email,
                phone: data.citizen.phone,
                address: data.citizen.address,
                neighborhood: data.citizen.neighborhood,
                city: data.citizen.city || '',
                department: data.citizen.department || '',
                dataConsent: data.citizen.dataConsent || false,
                isAnonymous: false,
              },
            });
            console.log('✅ Ciudadano creado:', citizen.id);
          } else {
            console.log('✅ Ciudadano encontrado:', citizen.id);
          }
        }

        if (!citizen) {
          throw new Error('No se pudo crear ni encontrar el ciudadano');
        }

        // 2. Obtener tipo de caso y estado inicial
        console.log('🔍 Buscando tipo de caso y estado inicial...');
        const caseType = await db.caseType.findFirst({
          where: { isActive: true, tenantId: auth.user!.tenantId },
        });

        const initialState = await db.caseState.findFirst({
          where: { isInitial: true },
        });

        if (!caseType || !initialState) {
          console.error('❌ No se encontró tipo de caso o estado inicial');
          console.error('CaseType:', caseType);
          console.error('InitialState:', initialState);
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'CONFIG_ERROR',
                message: 'No se encontró tipo de caso o estado inicial',
              },
            },
            { status: 500 }
          );
        }

        console.log('✅ Tipo de caso:', caseType.name);
        console.log('✅ Estado inicial:', initialState.name);

        const tenantInfo = await db.tenant.findUnique({ where: { id: auth.user!.tenantId } });
        const sigla = tenantInfo?.sigla || 'VU';
        const tenantName = tenantInfo?.name || 'GEFA — Gestión Familiar';

        // 3. Generar número de radicación
        console.log('🔢 Generando número de radicación...');
        const year = new Date().getFullYear();
        const lastCase = await db.case.findFirst({
          where: {
            tenantId: auth.user!.tenantId,
            filingNumber: {
              startsWith: `${sigla}-${year}`,
            },
          },
          orderBy: {
            filingNumber: 'desc',
          },
        });

        let sequential = 1;
        if (lastCase) {
          const match = lastCase.filingNumber.match(/-(\d+)$/);
          if (match) {
            sequential = parseInt(match[1]) + 1;
          }
        }

        const filingNumber = `${sigla}-${year}-${String(sequential).padStart(5, '0')}`;
        console.log('✅ Número de radicación:', filingNumber);

        // 4. Crear el caso
        console.log('📄 Creando caso...');
        const newCase = await db.case.create({
          data: {
            tenantId: auth.user!.tenantId,
            filingNumber,
            citizenId: citizen.id,
            caseTypeId: caseType.id,
            stateId: initialState.id,
            channel: 'PRESENCIAL',
            subject: data.subject,
            description: data.description,
            priority: 40,
            legalTermDays: 15,
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          },
        });
        console.log('✅ Caso creado:', newCase.id);
        caseId = newCase.id;

        // 4.5. Enviar email de confirmación al ciudadano
        try {
          if (!data.isAnonymous) {
            // Intentar obtener el email directamente del input o de la DB si ya existía
            let citizenEmail = data.citizen?.email;
            let citizenFullName = data.citizen ? `${data.citizen.firstName || ''} ${data.citizen.lastName || ''}`.trim() : '';

            if (!citizenEmail && citizen.email) {
              citizenEmail = citizen.email;
              const fName = citizen.firstName || '';
              const lName = citizen.firstLastName || '';
              citizenFullName = `${fName} ${lName}`.trim();
            }

            if (citizenEmail) {
              console.log(`📧 [VENTANILLA] Enviando email de confirmación a ${citizenEmail}...`);
              await EmailService.sendCitizenConfirmationEmail(
                tenantName,
                citizenEmail,
                citizenFullName,
                newCase.filingNumber,
                auth.user!.tenantId
              );
              console.log(`📧 ✅ [VENTANILLA] Email de confirmación enviado exitosamente`);
            } else {
              console.log('📧 ⚠️ [VENTANILLA] No se encontró email del ciudadano, omitiendo envío');
            }
          } else {
            console.log('📧 ⚠️ [VENTANILLA] Caso anónimo, omitiendo envío de confirmación');
          }
        } catch (emailError) {
          console.error('📧 ❌ [VENTANILLA] Error enviando email de confirmación (no crítico):', emailError);
        }

        // 5. Asignar automáticamente con IA
        console.log('🤖 Asignando con IA...');
        const assignResult = await aiAssignmentService.autoAssignCase({
          tenantId: auth.user!.tenantId,
          caseId: newCase.id,
          aiUserId: auth.user!.userId,
          aiUserEmail: auth.user!.email,
          ipAddress: getClientIp(request.headers),
          userAgent: getUserAgent(request.headers),
          db,
        });
        console.log('✅ Asignación completada:', assignResult.success);

        return NextResponse.json({
          success: true,
          data: {
            case: {
              id: newCase.id,
              filingNumber: newCase.filingNumber,
            },
            assignment: assignResult.assignment,
            recommendedUserType: assignResult.analysis?.recommendedUserType,
            assignedTo: assignResult.analysis?.recommendedUserId,
          },
          message: 'Solicitud radicada y asignada exitosamente',
        });

      } catch (error) {
        console.error('❌ Error creating case:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
        console.error('Error message:', error instanceof Error ? error.message : error);
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'CREATION_ERROR',
              message: 'Error al crear el caso',
            },
          },
          { status: 500 }
        );
      } finally {
        await db.$disconnect();
      }
    }

    // Si solo se proporciona caseId, asignar caso existente
    caseId = (data as { caseId: string }).caseId;

    // 3. Ejecutar análisis y asignación automática
    const result = await aiAssignmentService.autoAssignCase({
      tenantId: auth.user!.tenantId,
      caseId,
      aiUserId: auth.user!.userId,
      aiUserEmail: auth.user!.email,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      db,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ASSIGNMENT_FAILED',
            message: result.error || 'No se pudo asignar el caso automáticamente',
          },
          analysis: result.analysis,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Caso asignado automáticamente por IA',
        analysis: result.analysis,
        assignment: result.assignment,
      },
    });
  } catch (error) {
    console.error('Error en endpoint analyze-and-assign:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error al procesar la asignación automática',
          details: error instanceof Error ? error.message : 'Error desconocido',
        },
      },
      { status: 500 }
    );
  }
}
