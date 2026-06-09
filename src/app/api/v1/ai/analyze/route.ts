/**
 * POST /api/v1/ai/analyze
 * 
 * Endpoint para análisis de casos mediante IA (sin asignación)
 * 
 * Permite analizar una solicitud y obtener recomendaciones
 * sin ejecutar la asignación automática
 * 
 * Protegido: ASIGNACION_DE_CASOS, REVISOR_MUNICIPAL, VENTANILLA_UNICA
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { aiAssignmentService } from '@/services/AIAssignmentService';
import { protectAPIRoute } from '@/lib/auth';

// Schema de validación
const analyzeSchema = z.object({
  caseId: z.string().uuid('ID de caso inválido').optional(),
  subject: z.string().min(5).max(500).optional(),
  description: z.string().min(10).optional(),
  caseType: z.string().optional(),
}).refine(
  (data) => data.caseId || (data.subject && data.description),
  {
    message: 'Debe proporcionar caseId o subject+description',
  }
);

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticación
    const auth = await protectAPIRoute(request, [
      'ASIGNACION_DE_CASOS',
      'DIRECTOR',
      'VENTANILLA_UNICA',
    ]);

    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const db = auth.db;

    // 2. Validar request body
    const body = await request.json();
    const validationResult = analyzeSchema.safeParse(body);

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

    const { caseId, subject, description, caseType } = validationResult.data;

    // 3. Obtener datos del caso si se proporciona caseId
    let caseData: { subject: string; description: string; caseType?: string };

    if (caseId) {
      const existingCase = await db.case.findUnique({
        where: { id: caseId },
        include: { caseType: true },
      });

      if (!existingCase) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Caso no encontrado',
            },
          },
          { status: 404 }
        );
      }

      caseData = {
        subject: existingCase.subject,
        description: existingCase.description || '',
        caseType: existingCase.caseType?.name,
      };
    } else {
      caseData = {
        subject: subject!,
        description: description!,
        caseType,
      };
    }

    // 4. Ejecutar análisis con IA
    const analysis = await aiAssignmentService.analyzeCase({
      ...caseData,
      tenantId: auth.user.tenantId,
    });

    return NextResponse.json({
      success: true,
      data: {
        analysis,
        caseData: {
          subject: caseData.subject,
          caseType: caseData.caseType,
        },
      },
    });
  } catch (error) {
    console.error('Error en endpoint analyze:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error al analizar el caso',
          details: error instanceof Error ? error.message : 'Error desconocido',
        },
      },
      { status: 500 }
    );
  }
}
