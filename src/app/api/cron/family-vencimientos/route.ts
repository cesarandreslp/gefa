import { NextRequest, NextResponse } from 'next/server';
import { prisma as mainPrisma } from '@/lib/prisma';
import { getTenantPrisma } from '@/lib/tenantDb';
import { markExpiredMeasures, computeVencimientos } from '@/lib/familyVencimientos';
import { sendVencimientoNotifications } from '@/lib/familyNotifications';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST/GET /api/cron/family-vencimientos
 * Job de control de términos (Vercel Cron). Recorre los tenants activos y, en
 * la BD de cada uno, marca como VENCIDA las medidas cuyo plazo pasó y reúne un
 * resumen de vencimientos. Vercel Cron invoca por GET; se acepta también POST.
 *
 * Seguridad: si CRON_SECRET está definido, exige `Authorization: Bearer <secret>`.
 * Vercel Cron envía ese header automáticamente cuando el secreto está configurado.
 */
async function handler(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  }

  try {
    // Tenants activos con BD propia + (opcional) el control plane como fallback.
    const tenants = await mainPrisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, sigla: true, databaseUrl: true },
    });

    const summary: Array<{ tenant: string; expiredMarked: number; overdue: number; upcoming: number; pardOverdue: number; notified: number; error?: string }> = [];

    for (const t of tenants) {
      const db = t.databaseUrl ? getTenantPrisma(t.databaseUrl) : mainPrisma;
      try {
        const expiredMarked = await markExpiredMeasures(db, t.id);
        const v = await computeVencimientos(db, t.id);
        // Notificar a los profesionales asignados (best-effort; no aborta el job)
        let notified = 0;
        try {
          notified = await sendVencimientoNotifications(db, t.id);
        } catch (notifyErr) {
          console.error(`Error notificando vencimientos (tenant ${t.sigla}):`, notifyErr);
        }
        summary.push({
          tenant: t.sigla,
          expiredMarked,
          overdue: v.measuresOverdue.length,
          upcoming: v.measuresUpcoming.length,
          pardOverdue: v.pardOverdue.length,
          notified,
        });
      } catch (e) {
        summary.push({ tenant: t.sigla, expiredMarked: 0, overdue: 0, upcoming: 0, pardOverdue: 0, notified: 0, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return NextResponse.json({ ranAt: new Date().toISOString(), tenants: summary.length, summary });
  } catch (error) {
    console.error('Error en cron de vencimientos de familia:', error);
    return NextResponse.json({ error: 'Error ejecutando el job de vencimientos' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) { return handler(request); }
export async function POST(request: NextRequest) { return handler(request); }
