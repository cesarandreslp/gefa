import { NextRequest, NextResponse } from 'next/server';
import { RiskLevel } from '@prisma/client';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_CONFIDENTIAL_ROLES, isValidEnum } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// GET /api/v1/family/assessments/[id]
// Detalle de una valoración. ACCESO RESTRINGIDO (datos sensibles).
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_CONFIDENTIAL_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const assessment = await db.assessment.findFirst({
      where: { id: params.id, tenantId: auth.user.tenantId },
      include: {
        assessor: { select: { id: true, fullName: true } },
        assessedPerson: { select: { id: true, firstName: true, firstLastName: true, documentNumber: true } },
        case: { select: { id: true, filingNumber: true } },
      },
    });
    if (!assessment) {
      return NextResponse.json({ error: 'Valoración no encontrada' }, { status: 404 });
    }

    return NextResponse.json(assessment);
  } catch (error) {
    console.error('Error obteniendo valoración:', error);
    return NextResponse.json({ error: 'Error al obtener la valoración' }, { status: 500 });
  }
}

// PATCH /api/v1/family/assessments/[id]
// Corrige hallazgos/nivel de riesgo/recomendaciones. ACCESO RESTRINGIDO.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_CONFIDENTIAL_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const existing = await db.assessment.findFirst({
      where: { id: params.id, tenantId: auth.user.tenantId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Valoración no encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.findings !== undefined) data.findings = body.findings;
    if (body.recommendations !== undefined) data.recommendations = body.recommendations || null;
    if (body.isConfidential !== undefined) data.isConfidential = body.isConfidential !== false;
    if (body.riskLevel !== undefined) {
      if (!isValidEnum(RiskLevel, body.riskLevel)) {
        return NextResponse.json(
          { error: `riskLevel inválido. Valores: ${Object.values(RiskLevel).join(', ')}` },
          { status: 400 }
        );
      }
      data.riskLevel = body.riskLevel;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No hay cambios para aplicar' }, { status: 400 });
    }

    const assessment = await db.assessment.update({
      where: { id: params.id },
      data,
      include: { assessor: { select: { id: true, fullName: true } } },
    });

    return NextResponse.json(assessment);
  } catch (error) {
    console.error('Error actualizando valoración:', error);
    return NextResponse.json({ error: 'Error al actualizar la valoración' }, { status: 500 });
  }
}
