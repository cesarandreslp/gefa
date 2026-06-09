import { NextRequest, NextResponse } from 'next/server';
import { PardStage } from '@prisma/client';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_READ_ROLES, FAMILY_WRITE_ROLES, isValidEnum } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// GET /api/v1/family/restoration/[id]
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_READ_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const process = await db.restorationProcess.findFirst({
      where: { id: params.id, tenantId: auth.user.tenantId },
      include: {
        child: true,
        responsibleUser: { select: { id: true, fullName: true } },
        case: { select: { id: true, filingNumber: true } },
      },
    });
    if (!process) {
      return NextResponse.json({ error: 'Proceso PARD no encontrado' }, { status: 404 });
    }

    return NextResponse.json(process);
  } catch (error) {
    console.error('Error obteniendo proceso PARD:', error);
    return NextResponse.json({ error: 'Error al obtener el proceso' }, { status: 500 });
  }
}

// PATCH /api/v1/family/restoration/[id]
// Avanza etapa, registra hallazgos/recomendaciones/medida, programa seguimiento o cierra.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_WRITE_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const existing = await db.restorationProcess.findFirst({
      where: { id: params.id, tenantId: auth.user.tenantId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Proceso PARD no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.stage !== undefined) {
      if (!isValidEnum(PardStage, body.stage)) {
        return NextResponse.json(
          { error: `stage inválido. Valores: ${Object.values(PardStage).join(', ')}` },
          { status: 400 }
        );
      }
      data.stage = body.stage;
      if (body.stage === PardStage.CIERRE && body.closedAt === undefined) {
        data.closedAt = new Date();
      }
    }

    if (body.findings !== undefined) data.findings = body.findings || null;
    if (body.recommendations !== undefined) data.recommendations = body.recommendations || null;
    if (body.measureAdopted !== undefined) data.measureAdopted = body.measureAdopted || null;
    if (body.closureReason !== undefined) data.closureReason = body.closureReason || null;
    if (body.responsibleUserId !== undefined) data.responsibleUserId = body.responsibleUserId || null;
    if (body.followUpMonths !== undefined) data.followUpMonths = body.followUpMonths ?? null;
    if (body.nextFollowUpAt !== undefined) {
      data.nextFollowUpAt = body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null;
    }
    if (body.closedAt !== undefined) data.closedAt = body.closedAt ? new Date(body.closedAt) : null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No hay cambios para aplicar' }, { status: 400 });
    }

    const process = await db.restorationProcess.update({
      where: { id: params.id },
      data,
      include: {
        child: { select: { id: true, firstName: true, firstLastName: true } },
        responsibleUser: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json(process);
  } catch (error) {
    console.error('Error actualizando proceso PARD:', error);
    return NextResponse.json({ error: 'Error al actualizar el proceso' }, { status: 500 });
  }
}
