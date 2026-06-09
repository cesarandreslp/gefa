/**
 * API v1 - Endpoint para formulario de contacto simple
 * 
 * POST /api/v1/contact
 * 
 * Funcionalidad:
 * - Recibe mensaje de contacto
 * - Lo registra como caso tipo "Contacto"
 * - Audita la acción
 * - NO envía email (pendiente FASE 2)
 * 
 * Diferencia con general-request:
 * - Más simple, no requiere documento
 * - No crea ciudadano
 * - Solo registra mensaje
 */

import { NextRequest, NextResponse } from 'next/server';
import { auditService } from '@/services/AuditService';
import { getTenantFromRequest } from '@/lib/tenantResolver';
import {
  contactSchema,
  successResponse,
  errorResponse,
  handleZodError,
  getClientIp,
  getUserAgent,
  sanitizeString,
} from '@/lib/validation';
import { applyRateLimit, RATE_LIMIT_CONFIGS, addRateLimitHeaders } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting
    const rateLimitResult = applyRateLimit(request, RATE_LIMIT_CONFIGS.FORM_SUBMISSION);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    // 2. Obtener contexto
    const ipAddress = getClientIp(request.headers);
    const userAgent = getUserAgent(request.headers);

    // 3. Parsear y validar
    const body = await request.json();
    const validation = contactSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(handleZodError(validation.error), { status: 400 });
    }

    const data = validation.data;

    // 4. Sanitizar
    const sanitizedData = {
      name: sanitizeString(data.name),
      email: data.email,
      phone: data.phone,
      subject: sanitizeString(data.subject),
      message: sanitizeString(data.message),
    };

    // 5. Crear registro en una tabla simple
    // Para FASE 1, lo guardamos como metadata en un caso especial
    // o en una tabla dedicada futura
    
    // Por ahora, registrar en auditoría como "CONTACT_FORM"
    const contactId = `contact_${Date.now()}`;
    const tenant = await getTenantFromRequest(request);
    const tenantId = tenant?.id || '';

    await auditService.logCitizenAction(
      'CITIZEN_CONTACT',
      'CONTACT',
      contactId,
      sanitizedData.name,
      tenantId,
      ipAddress,
      userAgent,
      {
        email: sanitizedData.email,
        phone: sanitizedData.phone,
        subject: sanitizedData.subject,
        message: sanitizedData.message,
        action: 'CONTACT_FORM_SUBMITTED',
      }
    );

    // 6. Respuesta
    const response = NextResponse.json(
      successResponse({
        id: contactId,
        message: 'Mensaje recibido correctamente. Pronto nos pondremos en contacto.',
      }),
      { status: 201 }
    );

    return addRateLimitHeaders(
      response,
      RATE_LIMIT_CONFIGS.FORM_SUBMISSION,
      rateLimitResult.remaining,
      rateLimitResult.resetTime
    );
  } catch (error: unknown) {
    console.error('Error processing contact form:', error);

    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    return NextResponse.json(
      errorResponse(
        'INTERNAL_ERROR',
        'Error al procesar el formulario',
        process.env.NODE_ENV === 'development' ? errorMessage : undefined
      ),
      { status: 500 }
    );
  }
}
