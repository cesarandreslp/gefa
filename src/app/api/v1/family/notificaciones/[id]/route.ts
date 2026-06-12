/**
 * Notificación a una parte (detalle).
 *  - PATCH: actualiza el estado/medio/fecha o marca el recurso como interpuesto.
 *           Si pasa a NOTIFICADO una decisión recurrible, recalcula el plazo del recurso.
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_WRITE_ROLES, auditFamily, isValidEnum } from '@/lib/familyApi';
import { MedioNotificacion, EstadoNotificacion, TipoNotificacion } from '@prisma/client';
import { LegalTermsCalculator } from '@/domain/rules/LegalTermsCalculator';

export const dynamic = 'force-dynamic';

const RECURRIBLES: TipoNotificacion[] = ['MEDIDA_PROTECCION', 'RESOLUCION', 'AUTO'];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_WRITE_ROLES);
    if (!auth.authorized || !auth.user) return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const db = auth.db;
    const existing = await db.notificacionParte.findFirst({
      where: { id: params.id, tenantId: auth.user.tenantId },
      select: { id: true, caseId: true, tipo: true, fechaNotificacion: true, plazoRecursoDias: true },
    });
    if (!existing) return NextResponse.json({ error: 'Notificación no encontrada' }, { status: 404 });

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (isValidEnum(MedioNotificacion, body.medio)) data.medio = body.medio;
    if (typeof body.notas === 'string') data.notas = body.notas.trim() || null;

    if (isValidEnum(EstadoNotificacion, body.estado)) {
      data.estado = body.estado;
      const fecha = body.fechaNotificacion ? new Date(body.fechaNotificacion) : (existing.fechaNotificacion ?? new Date());
      if (body.estado === 'NOTIFICADO') {
        data.fechaNotificacion = fecha;
        // Recalcular el plazo del recurso para decisiones recurribles.
        if (RECURRIBLES.includes(existing.tipo)) {
          const plazo = (typeof body.plazoRecursoDias === 'number' && body.plazoRecursoDias > 0) ? body.plazoRecursoDias : (existing.plazoRecursoDias ?? 3);
          data.plazoRecursoDias = plazo;
          data.recursoVenceAt = await LegalTermsCalculator.calculateDueDate(fecha, plazo);
        }
      }
    }

    if (body.recursoInterpuesto === true) {
      data.recursoInterpuesto = true;
      data.recursoAt = body.recursoAt ? new Date(body.recursoAt) : new Date();
    } else if (body.recursoInterpuesto === false) {
      data.recursoInterpuesto = false;
      data.recursoAt = null;
    }

    if (Object.keys(data).length === 0) return NextResponse.json({ error: 'No hay cambios' }, { status: 400 });

    await db.notificacionParte.update({ where: { id: existing.id }, data });
    await auditFamily(db, request, auth.user, 'FAMILY_NOTIFICACION_ACTUALIZADA', 'NotificacionParte', existing.id, { caseId: existing.caseId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error actualizando notificación:', error);
    return NextResponse.json({ error: 'Error al actualizar la notificación' }, { status: 500 });
  }
}
