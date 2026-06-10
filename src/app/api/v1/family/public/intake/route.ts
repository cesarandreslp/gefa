import { NextRequest, NextResponse } from 'next/server';
import { getTenantFromRequest } from '@/lib/tenantResolver';
import { getTenantPrisma } from '@/lib/tenantDb';
import { prisma as mainPrisma } from '@/lib/prisma';
import { caseService } from '@/services/CaseService';
import { LegalTermsCalculator } from '@/domain/rules/LegalTermsCalculator';
import { CASE_TYPE_MODALITY } from '@/domain/catalogs/familyCaseTypes';
import { applyRateLimit, RATE_LIMIT_CONFIGS, addRateLimitHeaders } from '@/lib/rateLimit';
import { sanitizeString } from '@/lib/validation';
import { auditFamilyPublic } from '@/lib/familyApi';
import { CaseModality } from '@prisma/client';

export const dynamic = 'force-dynamic';

// POST /api/v1/family/public/intake
// Radicación en línea por la ciudadanía. Crea el caso en estado inicial para
// revisión del personal de la comisaría. Sin autenticación; tenant por host.
export async function POST(request: NextRequest) {
  // Rate limit anti-abuso
  const rl = applyRateLimit(request, RATE_LIMIT_CONFIGS.FORM_SUBMISSION);
  if (!rl.allowed) return rl.response;

  const tenant = await getTenantFromRequest(request);
  if (!tenant) {
    return NextResponse.json({ error: 'La entidad no está configurada para este dominio' }, { status: 400 });
  }
  if (!tenant.isActive) {
    return NextResponse.json({ error: 'La entidad se encuentra inactiva' }, { status: 403 });
  }

  const dbUrl = (tenant as unknown as { databaseUrl?: string }).databaseUrl;
  const db = dbUrl ? getTenantPrisma(dbUrl) : mainPrisma;
  const tenantId = tenant.id;

  try {
    const body = await request.json();
    const {
      documentType, documentNumber, firstName, secondName, firstLastName, secondLastName,
      phone, email, caseTypeCode, subject, description, esVictima,
    } = body;

    if (!documentType || !documentNumber || !firstName || !firstLastName || !caseTypeCode || !subject || !description) {
      return NextResponse.json(
        { error: 'Datos del solicitante, tipo, asunto y descripción son obligatorios' },
        { status: 400 }
      );
    }

    const caseType = await caseService.getCaseTypeByCode(caseTypeCode, tenantId, db);
    if (!caseType) {
      return NextResponse.json({ error: 'Tipo de caso no válido' }, { status: 400 });
    }

    const initialState = await db.caseState.findFirst({ where: { isInitial: true, isActive: true }, select: { id: true } });
    if (!initialState) {
      return NextResponse.json({ error: 'La entidad no tiene el flujo configurado. Acérquese presencialmente.' }, { status: 422 });
    }

    const baseCode = String(caseTypeCode).split('_')[0];
    const caseModality = (CASE_TYPE_MODALITY[baseCode] as CaseModality | undefined) ?? null;

    const filingNumber = await caseService.generateFilingNumber(tenantId, db);
    const filedAt = new Date();
    const dueDate = await LegalTermsCalculator.calculateDueDate(filedAt, caseType.defaultLegalTermDays);

    const docNum = sanitizeString(String(documentNumber));
    const data = {
      documentType: sanitizeString(String(documentType)),
      documentNumber: docNum,
      firstName: sanitizeString(firstName),
      secondName: secondName ? sanitizeString(secondName) : null,
      firstLastName: sanitizeString(firstLastName),
      secondLastName: secondLastName ? sanitizeString(secondLastName) : null,
      phone: phone ? sanitizeString(phone) : null,
      email: email ? sanitizeString(email) : null,
    };

    const created = await db.$transaction(async (tx) => {
      // Persona (denunciante / posible víctima)
      let person = await tx.person.findFirst({ where: { documentNumber: docNum, tenantId }, select: { id: true } });
      if (!person) {
        person = await tx.person.create({
          data: { tenantId, ...data, isPriorityGroup: false, dataConsent: true, dataConsentDate: new Date() },
          select: { id: true },
        });
      }

      // Citizen espejo (FK requerido por el modelo Case)
      let citizen = await tx.citizen.findFirst({ where: { documentNumber: docNum, tenantId }, select: { id: true } });
      if (!citizen) {
        citizen = await tx.citizen.create({
          data: { tenantId, ...data, city: 'No reporta', department: 'No reporta', dataConsent: true, dataConsentDate: new Date() },
          select: { id: true },
        });
      }

      const newCase = await tx.case.create({
        data: {
          tenantId,
          citizenId: citizen.id,
          caseTypeId: caseType.id,
          stateId: initialState.id,
          filingNumber,
          subject: sanitizeString(subject),
          description: sanitizeString(description),
          channel: 'WEB',
          priority: 40,
          filedAt,
          dueDate,
          legalTermDays: caseType.defaultLegalTermDays,
          caseModality,
          violenceTypes: [],
          metadata: { origen: 'portal_ciudadano', requiereRevision: true },
        },
      });

      await tx.caseParty.create({
        data: {
          tenantId,
          caseId: newCase.id,
          personId: person.id,
          role: esVictima === true ? 'VICTIMA' : 'DENUNCIANTE',
        },
      });

      await tx.caseStateHistory.create({
        data: {
          tenantId,
          caseId: newCase.id,
          fromStateId: null,
          toStateId: initialState.id,
          comment: 'Radicado por el portal ciudadano (Comisaría en línea)',
          reason: 'INITIAL',
        },
      });

      return newCase;
    }, { timeout: 20000 });

    // Trazabilidad inmutable: la radicación ciudadana queda en el ActionLog con
    // actor anónimo del portal (datos sensibles de víctima/NNA, Ley 1581/2012).
    await auditFamilyPublic(db, request, tenantId, 'FAMILY_PUBLIC_INTAKE', 'Case', created.id, {
      caseId: created.id,
      metadata: { filingNumber: created.filingNumber, caseTypeCode: baseCode, esVictima: esVictima === true },
    });

    const response = NextResponse.json(
      {
        message: `Su solicitud fue radicada. Conserve su número: ${created.filingNumber}`,
        filingNumber: created.filingNumber,
        documentNumber: docNum,
      },
      { status: 201 }
    );
    return addRateLimitHeaders(response, RATE_LIMIT_CONFIGS.FORM_SUBMISSION, rl.remaining, rl.resetTime);
  } catch (error) {
    console.error('Error en radicación ciudadana de familia:', error);
    return NextResponse.json({ error: 'No se pudo radicar la solicitud. Intente nuevamente.' }, { status: 500 });
  }
}
