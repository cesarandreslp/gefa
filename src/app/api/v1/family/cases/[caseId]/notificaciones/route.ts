/**
 * Notificaciones a las partes (debido proceso del querellado).
 *  - GET:  lista las notificaciones del caso.
 *  - POST: registra una notificación (citación / medida / resolución) con su acuse.
 *          Si es una decisión recurrible y queda NOTIFICADA, calcula el plazo del recurso.
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_READ_ROLES, FAMILY_WRITE_ROLES, findCaseInTenant, auditFamily, isValidEnum } from '@/lib/familyApi';
import { TipoNotificacion, MedioNotificacion, EstadoNotificacion } from '@prisma/client';
import { LegalTermsCalculator } from '@/domain/rules/LegalTermsCalculator';

export const dynamic = 'force-dynamic';

const RECURRIBLES: TipoNotificacion[] = ['MEDIDA_PROTECCION', 'RESOLUCION', 'AUTO'];

// GET
export async function GET(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_READ_ROLES);
    if (!auth.authorized || !auth.user) return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const db = auth.db;
    const caseRow = await findCaseInTenant(db, params.caseId, auth.user.tenantId);
    if (!caseRow) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });

    const notificaciones = await db.notificacionParte.findMany({
      where: { caseId: params.caseId, tenantId: auth.user.tenantId },
      select: {
        id: true, tipo: true, medio: true, estado: true, fechaNotificacion: true, notas: true,
        plazoRecursoDias: true, recursoVenceAt: true, recursoInterpuesto: true, recursoAt: true, createdAt: true,
        party: { select: { id: true, role: true, person: { select: { firstName: true, firstLastName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ data: notificaciones });
  } catch (error) {
    console.error('Error listando notificaciones:', error);
    return NextResponse.json({ error: 'Error al listar las notificaciones' }, { status: 500 });
  }
}

// POST
export async function POST(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_WRITE_ROLES);
    if (!auth.authorized || !auth.user) return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const db = auth.db;
    const tenantId = auth.user.tenantId;
    const caseRow = await findCaseInTenant(db, params.caseId, tenantId);
    if (!caseRow) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });

    const body = await request.json();
    const { partyId, tipo, medio, estado, fechaNotificacion, notas, documentId, plazoRecursoDias } = body;

    if (!partyId || !isValidEnum(TipoNotificacion, tipo) || !isValidEnum(MedioNotificacion, medio)) {
      return NextResponse.json({ error: 'Datos inválidos: parte, tipo y medio son obligatorios.' }, { status: 400 });
    }
    const estadoVal: EstadoNotificacion = isValidEnum(EstadoNotificacion, estado) ? estado : 'PENDIENTE';

    // La parte debe pertenecer al caso.
    const party = await db.caseParty.findFirst({ where: { id: partyId, caseId: params.caseId, tenantId }, select: { id: true } });
    if (!party) return NextResponse.json({ error: 'La parte indicada no pertenece al caso.' }, { status: 400 });

    const fecha = estadoVal === 'NOTIFICADO' ? (fechaNotificacion ? new Date(fechaNotificacion) : new Date()) : (fechaNotificacion ? new Date(fechaNotificacion) : null);

    // Plazo del recurso: solo para decisiones recurribles ya notificadas.
    let plazo: number | null = null;
    let recursoVenceAt: Date | null = null;
    if (RECURRIBLES.includes(tipo) && estadoVal === 'NOTIFICADO') {
      plazo = typeof plazoRecursoDias === 'number' && plazoRecursoDias > 0 ? plazoRecursoDias : 3; // def. 3 días hábiles (reposición)
      recursoVenceAt = await LegalTermsCalculator.calculateDueDate(fecha ?? new Date(), plazo);
    }

    const noti = await db.notificacionParte.create({
      data: {
        tenantId, caseId: params.caseId, partyId,
        tipo, medio, estado: estadoVal,
        fechaNotificacion: fecha,
        notas: typeof notas === 'string' ? notas.trim() || null : null,
        documentId: documentId || null,
        plazoRecursoDias: plazo, recursoVenceAt,
        createdByUserId: auth.user.userId,
      },
      select: { id: true, tipo: true, estado: true, recursoVenceAt: true },
    });

    await auditFamily(db, request, auth.user, 'FAMILY_NOTIFICACION_REGISTRADA', 'NotificacionParte', noti.id, { caseId: params.caseId, metadata: { tipo, medio, estado: estadoVal } });
    return NextResponse.json(noti, { status: 201 });
  } catch (error) {
    console.error('Error registrando notificación:', error);
    return NextResponse.json({ error: 'Error al registrar la notificación' }, { status: 500 });
  }
}
