import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { aiAssignmentService } from '@/services/AIAssignmentService';

export async function POST(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    // Verificar autenticación
    const auth = await protectAPIRoute(request);

    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }
const db = auth.db;

    const { motivo } = await request.json();

    if (!motivo || !motivo.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'El motivo de reasignación es requerido'
          }
        },
        { status: 400 }
      );
    }

    const caseId = params.caseId;

    // Verificar que el caso existe (incluir info para la IA)
    const caso = await db.case.findUnique({
      where: { id: caseId },
      include: {
        caseType: true,
        assignments: {
          where: { userId: auth.user.userId },
          orderBy: { assignedAt: 'desc' },
          take: 1
        }
      }
    });

    if (!caso) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CASE_NOT_FOUND',
            message: 'Caso no encontrado'
          }
        },
        { status: 404 }
      );
    }

    // Verificar que el usuario tiene este caso asignado
    if (caso.assignments.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_ASSIGNED',
            message: 'Este caso no está asignado a ti'
          }
        },
        { status: 403 }
      );
    }

    // Pedir a la IA que proponga un nuevo funcionario, excluyendo el actual
    let proposedFuncionario: { id: string; nombre: string; rol: string } | null = null;
    try {
      const analysis = await aiAssignmentService.analyzeCase({
        tenantId: auth.user.tenantId,
        subject: caso.subject,
        description: caso.description || '',
        caseType: caso.caseType?.name,
        excludeUserId: auth.user.userId // Excluir al funcionario que pide reasignación
      });

      if (analysis.recommendedUserId) {
        const funcPropuesto = await db.user.findUnique({
          where: { id: analysis.recommendedUserId },
          include: { role: true }
        });
        if (funcPropuesto) {
          proposedFuncionario = {
            id: funcPropuesto.id,
            nombre: funcPropuesto.fullName || funcPropuesto.email,
            rol: funcPropuesto.role?.name || 'Funcionario'
          };
        }
      }
      console.log('🤖 IA propone reasignar a:', proposedFuncionario?.nombre);
    } catch (aiError) {
      console.error('⚠️ Error en IA al proponer funcionario:', aiError);
      // Continuar sin propuesta de IA
    }

    // Crear log de acción para registrar la solicitud de reasignación
    const userInfo = await db.user.findUnique({
      where: { id: auth.user.userId },
      include: { role: true }
    });

    const logData = {
      caseId: caseId,
      userId: auth.user.userId,
      userEmail: userInfo?.email || 'unknown',
      userRole: userInfo?.role?.code || 'UNKNOWN',
      action: 'REASSIGNMENT_REQUESTED',
      entityType: 'Case',
      entityId: caseId,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      metadata: {
        reason: motivo,
        previousAssignmentId: caso.assignments[0].id,
        requestedAt: new Date().toISOString(),
        // Propuesta de la IA
        funcionarioPropuestoId: proposedFuncionario?.id || null,
        proposedUserId: proposedFuncionario?.id || null,
        proposedUserName: proposedFuncionario?.nombre || null,
        proposedUserRole: proposedFuncionario?.rol || null,
      }
    };

    // Generar checksum simple
    const checksum = Buffer.from(JSON.stringify(logData)).toString('base64').substring(0, 64);

    await db.actionLog.create({
      data: {
        ...logData,
        checksum
      }
    });

    // Actualizar el estado de la asignación a REASSIGNED para que desaparezca de la bandeja
    await db.assignment.update({
      where: { id: caso.assignments[0].id },
      data: {
        status: 'REASSIGNED',
        completedAt: new Date()
      }
    });

    console.log('✅ Asignación marcada como REASSIGNED:', caso.assignments[0].id);

    return NextResponse.json({
      success: true,
      message: 'Solicitud de reasignación enviada exitosamente',
      funcionarioPropuesto: proposedFuncionario
    });

  } catch (error) {
    console.error('Error solicitando reasignación:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error interno del servidor'
        }
      },
      { status: 500 }
    );
  }
}
