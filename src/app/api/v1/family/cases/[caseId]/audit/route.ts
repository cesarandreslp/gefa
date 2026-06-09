import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_AUDIT_ROLES, findCaseInTenant, computeAuditChecksum } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// GET /api/v1/family/cases/[caseId]/audit
// Visor de trazabilidad del expediente: historial inmutable del `ActionLog`
// del caso. Solo dirección/administración (control interno). Cada entrada se
// re-verifica recalculando su checksum SHA-256 — si no coincide, la fila fue
// alterada en BD fuera del flujo de auditoría.
export async function GET(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_AUDIT_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const caseRow = await findCaseInTenant(db, params.caseId, auth.user.tenantId);
    if (!caseRow) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    }

    const logs = await db.actionLog.findMany({
      where: { caseId: params.caseId, tenantId: auth.user.tenantId },
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        timestamp: true,
        userId: true,
        userEmail: true,
        userRole: true,
        action: true,
        entityType: true,
        entityId: true,
        ipAddress: true,
        metadata: true,
        success: true,
        checksum: true,
        previousHash: true,
      },
    });

    let tampered = 0;
    const entries = logs.map((log) => {
      const recalculated = computeAuditChecksum({
        action: log.action,
        userId: log.userId,
        entityType: log.entityType,
        entityId: log.entityId,
        timestamp: log.timestamp,
        previousHash: log.previousHash ?? 'GENESIS_BLOCK',
      });
      const integrityValid = recalculated === log.checksum;
      if (!integrityValid) tampered += 1;
      return {
        id: log.id,
        timestamp: log.timestamp.toISOString(),
        userEmail: log.userEmail,
        userRole: log.userRole,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        ipAddress: log.ipAddress,
        metadata: log.metadata,
        success: log.success,
        integrityValid,
      };
    });

    return NextResponse.json({
      data: entries,
      summary: { total: entries.length, tampered, chainIntact: tampered === 0 },
    });
  } catch (error) {
    console.error('Error consultando la auditoría del caso:', error);
    return NextResponse.json({ error: 'Error al consultar la auditoría' }, { status: 500 });
  }
}
