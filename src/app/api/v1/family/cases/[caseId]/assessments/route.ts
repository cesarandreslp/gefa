import { NextRequest, NextResponse } from 'next/server';
import { AssessmentType, RiskLevel } from '@prisma/client';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_CONFIDENTIAL_ROLES, findCaseInTenant, isValidEnum, auditFamily } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// GET /api/v1/family/cases/[caseId]/assessments
// Lista valoraciones del caso. ACCESO RESTRINGIDO (datos sensibles NNA/víctimas).
export async function GET(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_CONFIDENTIAL_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const caseRow = await findCaseInTenant(db, params.caseId, auth.user.tenantId);
    if (!caseRow) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    }

    const assessments = await db.assessment.findMany({
      where: { caseId: params.caseId, tenantId: auth.user.tenantId },
      include: {
        assessor: { select: { id: true, fullName: true } },
        assessedPerson: { select: { id: true, firstName: true, firstLastName: true } },
      },
      orderBy: { conductedAt: 'desc' },
    });

    // Acceso a datos confidenciales: queda auditado (Ley 1581/2012 + Ley 1098/2006)
    await auditFamily(db, request, auth.user, 'FAMILY_ASSESSMENT_ACCESSED', 'Assessment', params.caseId, { caseId: params.caseId, metadata: { count: assessments.length } });

    return NextResponse.json({ data: assessments });
  } catch (error) {
    console.error('Error listando valoraciones:', error);
    return NextResponse.json({ error: 'Error al listar las valoraciones' }, { status: 500 });
  }
}

// POST /api/v1/family/cases/[caseId]/assessments
// Registra una valoración psicosocial/jurídica/de riesgo. ACCESO RESTRINGIDO.
export async function POST(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_CONFIDENTIAL_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const caseRow = await findCaseInTenant(db, params.caseId, auth.user.tenantId);
    if (!caseRow) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { assessmentType, findings, riskLevel, recommendations, assessedPersonId, conductedAt, isConfidential } = body;

    if (!assessmentType || !findings) {
      return NextResponse.json({ error: 'assessmentType y findings son obligatorios' }, { status: 400 });
    }
    if (!isValidEnum(AssessmentType, assessmentType)) {
      return NextResponse.json(
        { error: `assessmentType inválido. Valores: ${Object.values(AssessmentType).join(', ')}` },
        { status: 400 }
      );
    }
    if (riskLevel !== undefined && !isValidEnum(RiskLevel, riskLevel)) {
      return NextResponse.json(
        { error: `riskLevel inválido. Valores: ${Object.values(RiskLevel).join(', ')}` },
        { status: 400 }
      );
    }

    // Si se indica persona valorada, debe pertenecer al tenant
    if (assessedPersonId) {
      const person = await db.person.findFirst({
        where: { id: assessedPersonId, tenantId: auth.user.tenantId },
        select: { id: true },
      });
      if (!person) {
        return NextResponse.json({ error: 'La persona valorada no existe en la entidad' }, { status: 404 });
      }
    }

    const assessment = await db.assessment.create({
      data: {
        tenantId: auth.user.tenantId,
        caseId: params.caseId,
        assessmentType,
        findings,
        riskLevel: riskLevel || RiskLevel.BAJO,
        recommendations: recommendations || null,
        assessedPersonId: assessedPersonId || null,
        assessorUserId: auth.user.userId,
        conductedAt: conductedAt ? new Date(conductedAt) : new Date(),
        isConfidential: isConfidential !== false,
      },
      include: { assessor: { select: { id: true, fullName: true } } },
    });

    await auditFamily(db, request, auth.user, 'FAMILY_ASSESSMENT_CREATED', 'Assessment', assessment.id, { caseId: params.caseId, metadata: { assessmentType, riskLevel: assessment.riskLevel } });

    return NextResponse.json(assessment, { status: 201 });
  } catch (error) {
    console.error('Error registrando valoración:', error);
    return NextResponse.json({ error: 'Error al registrar la valoración' }, { status: 500 });
  }
}
