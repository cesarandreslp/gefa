/**
 * API v1 - Endpoint para consultar caso por número de radicación
 * 
 * GET /api/v1/cases/filing/:filingNumber
 * 
 * Funcionalidad:
 * - Consulta caso por número de radicación
 * - Retorna información básica del caso
 * - No requiere autenticación (público)
 * - Rate limiting aplicado
 * 
 * Uso: Ciudadanos pueden consultar el estado de sus casos
 */

import { NextRequest, NextResponse } from 'next/server';
import { caseService } from '@/services/CaseService';
import { successResponse, errorResponse } from '@/lib/validation';
import { applyRateLimit, RATE_LIMIT_CONFIGS, addRateLimitHeaders } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { filingNumber: string } }
) {
  try {
    // 1. Rate Limiting
    const rateLimitResult = applyRateLimit(request, RATE_LIMIT_CONFIGS.QUERY);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    // 2. Obtener número de radicación
    const { filingNumber } = params;

    if (!filingNumber) {
      return NextResponse.json(
        errorResponse('MISSING_PARAMETER', 'Número de radicación requerido'),
        { status: 400 }
      );
    }

    // Resolver tenant dinámicamente: primero por dominio, luego por env var
    const { resolveTenantByHost } = await import('@/lib/tenantResolver');
    let defaultTenant = await resolveTenantByHost(request.headers.get('host'));
    if (!defaultTenant) {
      const fallbackSigla = process.env.DEFAULT_TENANT_SIGLA;
      if (fallbackSigla) {
        defaultTenant = await prisma.tenant.findUnique({ where: { sigla: fallbackSigla } });
      }
    }
    if (!defaultTenant) {
      return NextResponse.json(errorResponse('TENANT_NOT_FOUND', 'No se pudo determinar la entidad'), { status: 500 });
    }
    const tenantId = defaultTenant.id;

    // 3. Buscar caso
    const caseData = await caseService.findByFilingNumber(filingNumber, tenantId);

    if (!caseData) {
      return NextResponse.json(
        errorResponse('CASE_NOT_FOUND', 'No se encontró un caso con ese número de radicación'),
        { status: 404 }
      );
    }

    // 4. Calcular estado del semáforo
    const termStatus = await caseService.calculateCaseStatus(caseData.id, tenantId);

    // 5. Generar mensaje descriptivo según estado
    let statusMessage = '';
    if (termStatus.isOverdue) {
      statusMessage = `Vencido hace ${Math.abs(termStatus.daysRemaining)} días hábiles`;
    } else if (termStatus.status === 'GREEN') {
      statusMessage = `En término. Quedan ${termStatus.daysRemaining} días hábiles`;
    } else if (termStatus.status === 'YELLOW') {
      statusMessage = `Próximo a vencer. Quedan ${termStatus.daysRemaining} días hábiles`;
    } else if (termStatus.status === 'RED') {
      statusMessage = `Por vencer. Quedan ${termStatus.daysRemaining} días hábiles`;
    }

    // 6. Preparar respuesta con datos públicos (sin información sensible completa)
    const publicData = {
      filingNumber: caseData.filingNumber,
      subject: caseData.subject,
      type: {
        code: caseData.caseType.code,
        name: caseData.caseType.name,
      },
      state: {
        code: caseData.state.code,
        name: caseData.state.name,
      },
      priority: caseData.priority,
      filingDate: caseData.filedAt,
      dueDate: caseData.dueDate,
      termStatus: {
        status: termStatus.status,
        percentage: termStatus.percentage,
        message: statusMessage,
        daysElapsed: termStatus.daysElapsed,
        daysRemaining: termStatus.daysRemaining,
        isOverdue: termStatus.isOverdue,
      },
      citizen: {
        firstName: caseData.citizen.firstName,
        lastName: caseData.citizen.firstLastName,
        // No exponer documento completo por privacidad
      },
    };

    const response = NextResponse.json(successResponse(publicData));

    // 7. Agregar headers de rate limit
    return addRateLimitHeaders(
      response,
      RATE_LIMIT_CONFIGS.QUERY,
      rateLimitResult.remaining,
      rateLimitResult.resetTime
    );
  } catch (error: unknown) {
    console.error('Error querying case:', error);

    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    return NextResponse.json(
      errorResponse(
        'INTERNAL_ERROR',
        'Error al consultar el caso',
        process.env.NODE_ENV === 'development' ? errorMessage : undefined
      ),
      { status: 500 }
    );
  }
}
