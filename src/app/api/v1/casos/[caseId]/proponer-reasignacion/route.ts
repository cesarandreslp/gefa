import { NextResponse, NextRequest } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';

/**
 * POST /api/v1/casos/[caseId]/proponer-reasignacion
 * Ventanilla Única propone una reasignación al Revisor
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const authResult = await protectAPIRoute(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const db = authResult.db;
    const { user } = authResult;
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    const { caseId } = params;

    // Verificar que el usuario sea VENTANILLA_UNICA
    if (user.roleCode !== 'VENTANILLA_UNICA') {
      return NextResponse.json(
        { error: 'No autorizado. Solo Ventanilla Única puede proponer reasignaciones.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { funcionarioId } = body;

    if (!funcionarioId) {
      return NextResponse.json(
        { error: 'El ID del funcionario propuesto es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el caso existe
    const caso = await db.case.findUnique({
      where: { id: caseId },
      include: {
        citizen: true,
        caseType: true,
        state: true
      }
    });

    if (!caso) {
      return NextResponse.json(
        { error: 'Caso no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el funcionario existe
    const funcionario = await db.user.findUnique({
      where: { id: funcionarioId },
      include: { role: true }
    });

    if (!funcionario) {
      return NextResponse.json(
        { error: 'Funcionario no encontrado' },
        { status: 404 }
      );
    }

    // Construir metadata
    const metadata = {
      funcionarioPropuestoId: funcionarioId, // ID del funcionario al que se quiere reasignar
      proposedUserId: funcionarioId,
      proposedUserName: funcionario.fullName,
      proposedUserRole: funcionario.role?.name,
      proposedBy: user.userId,
      proposedByName: user.email,
      proposedByRole: user.roleName,
      proposedAt: new Date().toISOString(),
      caseCode: caso.filingNumber,
      caseSubject: caso.subject
    };

    // Generar checksum
    const logData = {
      userId: user.userId,
      action: 'REASSIGNMENT_PROPOSED',
      entityType: 'CASE',
      entityId: caseId,
      metadata
    };
    const checksum = Buffer.from(JSON.stringify(logData)).toString('base64').substring(0, 64);

    // Crear ActionLog
    await db.actionLog.create({
      data: {
        caseId: caseId, // Agregar caseId directamente
        userId: user.userId,
        userEmail: user.email,
        userRole: user.roleCode,
        action: 'REASSIGNMENT_PROPOSED',
        entityType: 'CASE',
        entityId: caseId,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        metadata,
        checksum
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Propuesta de reasignación enviada al Revisor'
    });

  } catch (error) {
    console.error('Error proponiendo reasignación:', error);
    return NextResponse.json(
      { error: 'Error al proponer reasignación' },
      { status: 500 }
    );
  }
}
