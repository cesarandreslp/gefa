import { NextResponse } from 'next/server';
import { prisma as mainPrisma } from '@/lib/prisma';
import { getTenantPrisma } from '@/lib/tenantDb';
import type { PrismaClient } from '@prisma/client';

/**
 * POST /api/v1/solicitudes/expire-rejected
 *
 * Cierra automáticamente los casos rechazados por improcedencia cuyo tiempo
 * de respuesta ha expirado. Opera sobre todos los tenants activos.
 */
export async function POST() {
  try {
    const now = new Date();

    // Obtener todos los tenants activos con su databaseUrl
    const tenants = await mainPrisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, sigla: true, databaseUrl: true } as any,
    });

    let totalCerrados = 0;
    const resumenPorTenant: Record<string, string[]> = {};

    for (const tenant of tenants) {
      const dbUrl = (tenant as any).databaseUrl as string | undefined;
      const db: PrismaClient = dbUrl ? getTenantPrisma(dbUrl) : mainPrisma;
      const sigla = (tenant as any).sigla as string;

      try {
        const cerrados = await procesarTenant(db, now, sigla);
        if (cerrados.length > 0) {
          resumenPorTenant[sigla] = cerrados;
          totalCerrados += cerrados.length;
        }
      } catch (tenantError) {
        console.error(`❌ Error procesando tenant ${sigla}:`, tenantError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${totalCerrados} casos cerrados automáticamente`,
      resumenPorTenant,
    });

  } catch (error) {
    console.error('❌ Error al cerrar casos expirados:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

async function procesarTenant(db: PrismaClient, now: Date, sigla: string): Promise<string[]> {
  const estadoRechazado = await db.caseState.findUnique({
    where: { code: 'REMITIDO_POR_COMPETENCIA' },
  });

  const estadoCerrado = await db.caseState.findUnique({
    where: { code: 'CERRADO' },
  });

  if (!estadoRechazado || !estadoCerrado) {
    console.warn(`⚠️ [${sigla}] Estados REMITIDO_POR_COMPETENCIA o CERRADO no encontrados, omitiendo`);
    return [];
  }

  const historialesExpirados = await db.caseStateHistory.findMany({
    where: {
      toStateId: estadoRechazado.id,
      expiresAt: { lte: now },
    },
    include: {
      case: { include: { state: true } },
    },
  });

  console.log(`🔍 [${sigla}] Casos rechazados expirados: ${historialesExpirados.length}`);

  if (historialesExpirados.length === 0) return [];

  const systemUser = await db.user.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!systemUser) {
    console.warn(`⚠️ [${sigla}] No se encontró usuario del sistema, omitiendo`);
    return [];
  }

  const casosActualizados: string[] = [];

  for (const historial of historialesExpirados) {
    if (historial.case.stateId !== estadoRechazado.id) {
      console.log(`⏭️ [${sigla}] Caso ${historial.case.filingNumber} ya no está rechazado, saltando`);
      continue;
    }

    await db.$transaction(async (tx) => {
      await tx.case.update({
        where: { id: historial.caseId },
        data: { stateId: estadoCerrado.id, updatedAt: new Date() },
      });

      await tx.caseStateHistory.create({
        data: {
          tenantId: historial.case.tenantId,
          caseId: historial.caseId,
          fromStateId: estadoRechazado.id,
          toStateId: estadoCerrado.id,
          changedBy: null,
          comment: 'Caso cerrado automáticamente por expiración del tiempo de respuesta (3 minutos sin respuesta del ciudadano tras rechazo por improcedencia)',
          reason: 'AUTO_EXPIRED',
          expiresAt: null,
        },
      });

      await tx.actionLog.create({
        data: {
          caseId: historial.caseId,
          userId: systemUser.id,
          userEmail: 'system@auto',
          userRole: 'SYSTEM',
          action: 'CASE_AUTO_CLOSED',
          entityType: 'Case',
          entityId: historial.caseId,
          ipAddress: 'system',
          userAgent: 'auto-expiration-service',
          metadata: {
            reason: 'Caso cerrado automáticamente por expiración',
            originalState: 'REMITIDO_POR_COMPETENCIA',
            newState: 'CERRADO',
            expiredAt: now.toISOString(),
          },
          checksum: Buffer.from(
            JSON.stringify({ action: 'CASE_AUTO_CLOSED', caseId: historial.caseId, timestamp: now.toISOString() })
          ).toString('base64').substring(0, 64),
        },
      });
    });

    casosActualizados.push(historial.case.filingNumber);
    console.log(`✅ [${sigla}] Caso ${historial.case.filingNumber} cerrado automáticamente`);
  }

  return casosActualizados;
}
