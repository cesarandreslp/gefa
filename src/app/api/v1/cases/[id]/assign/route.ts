/**
 * POST /api/v1/cases/[id]/assign
 * 
 * FASE 3 MÓDULO 2: Asignar o reasignar expediente
 * 
 * Protegido: Solo REVISOR_MUNICIPAL, VENTANILLA_UNICA y ASIGNACION_DE_CASOS pueden reasignar
 * Auditoría: Cada asignación se registra
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assignmentService } from '@/services/AssignmentService';
import { protectAPIRoute } from '@/lib/auth';
import { getClientIp, getUserAgent } from '@/lib/validation';

// Schema de validación
const assignCaseSchema = z.object({
  newAssigneeId: z.string().uuid('ID de usuario inválido'),
  reason: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verificar autenticación - Solo REVISOR_MUNICIPAL, VENTANILLA_UNICA y ASIGNACION_DE_CASOS pueden reasignar
    const auth = await protectAPIRoute(request, ['DIRECTOR', 'VENTANILLA_UNICA', 'ASIGNACION_DE_CASOS']);

    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const db = auth.db;

    // 2. Validar body
    const body = await request.json();
    const validationResult = assignCaseSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Datos inválidos',
            details: validationResult.error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
        },
        { status: 400 }
      );
    }

    const { newAssigneeId, reason } = validationResult.data;
    const caseId = params.id;

    // 3. Asignar o reasignar
    const result = await assignmentService.assignCase({
      tenantId: auth.user.tenantId,
      caseId,
      newAssigneeId,
      assignedByUserId: auth.user.userId,
      assignedByEmail: auth.user.email,
      assignedByRole: auth.user.roleCode,
      reason: reason || '',
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ASSIGNMENT_FAILED',
            message: result.error || 'No se pudo asignar el expediente',
          },
        },
        { status: 400 }
      );
    }

    // Notificar al funcionario asignado por email
    try {
      await import('@prisma/client');
            const { NotificationHooks } = await import('@/services/NotificationHooks');

      const [caseInfo, assignedUser] = await Promise.all([
        db.case.findUnique({
          where: { id: caseId },
          include: { caseType: true, citizen: true }
        }),
        db.user.findUnique({ where: { id: newAssigneeId } })
      ]);

      if (caseInfo && assignedUser) {
        await NotificationHooks.onCaseAssigned({
          caseId,
          filingNumber: caseInfo.filingNumber,
          userId: assignedUser.id,
          userName: assignedUser.fullName || assignedUser.email,
          userEmail: assignedUser.email,
          citizenName: caseInfo.citizen ? `${caseInfo.citizen.firstName} ${caseInfo.citizen.firstLastName}` : 'Ciudadano',
          caseType: caseInfo.caseType?.name || 'General',
          dueDate: caseInfo.dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          tenantId: auth.user.tenantId,
        });
        console.log(`📧 Notificación de asignación enviada a ${assignedUser.email}`);
      }

      await db.$disconnect();
    } catch (notifError) {
      console.error('⚠️ Error enviando notificación de asignación (no crítico):', notifError);
    }

    return NextResponse.json({
      success: true,
      data: {
        assignment: result.assignment,
        message: result.assignment?.isReassignment
          ? 'Expediente reasignado exitosamente'
          : 'Expediente asignado exitosamente',
      },
    });
  } catch (error) {
    console.error('Error en endpoint assign:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error al asignar expediente',
        },
      },
      { status: 500 }
    );
  }
}
