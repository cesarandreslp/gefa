import { NextResponse, NextRequest } from 'next/server';
import { protectAPIRoute, getBaseRoleCode } from '@/lib/auth';

/**
 * GET /api/v1/peticiones-reasignacion/count
 * Obtiene el contador de peticiones de reasignación pendientes
 * Accesible para REVISOR_MUNICIPAL y VENTANILLA_UNICA
 */
export async function GET(request: NextRequest) {
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

    // Verificar que el usuario sea DIRECTOR o VENTANILLA_UNICA
    const baseRole = getBaseRoleCode(user.roleCode);
    if (baseRole !== 'DIRECTOR' && baseRole !== 'VENTANILLA_UNICA') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Obtener IDs de casos de este tenant
    const casosDelTenant = await db.case.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true }
    });
    const caseIdsDelTenant = casosDelTenant.map(c => c.id);

    // Contar ActionLogs con acción REASSIGNMENT_REQUESTED o REASSIGNMENT_PROPOSED que no tienen respuesta
    const peticionesPendientes = await db.actionLog.findMany({
      where: {
        action: { in: ['REASSIGNMENT_REQUESTED', 'REASSIGNMENT_PROPOSED'] },
        entityId: { in: caseIdsDelTenant }
      },
      select: {
        id: true,
        entityId: true
      }
    });

    // Obtener IDs de casos únicos
    const caseIds = [...new Set(peticionesPendientes.map(p => p.entityId))];

    // Buscar si hay respuestas (APPROVED o REJECTED) para cada caso
    const respuestas = await db.actionLog.findMany({
      where: {
        action: { in: ['REASSIGNMENT_APPROVED', 'REASSIGNMENT_REJECTED'] },
        entityId: { in: caseIds }
      },
      select: {
        entityId: true
      }
    });

    const casosConRespuesta = new Set(respuestas.map(r => r.entityId));

    // Contar solo las peticiones sin respuesta
    const count = caseIds.filter(id => !casosConRespuesta.has(id)).length;

    return NextResponse.json({ count });

  } catch (error) {
    console.error('Error obteniendo contador de peticiones:', error);
    return NextResponse.json(
      { error: 'Error al obtener contador' },
      { status: 500 }
    );
  }
}
