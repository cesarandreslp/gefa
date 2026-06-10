import { NextRequest, NextResponse } from 'next/server';
import { PartyRole, ViolenceType, CaseModality } from '@prisma/client';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_READ_ROLES, FAMILY_INTAKE_ROLES, isValidEnum, auditFamily } from '@/lib/familyApi';
import { caseService } from '@/services/CaseService';
import { LegalTermsCalculator } from '@/domain/rules/LegalTermsCalculator';
import { CASE_TYPE_MODALITY } from '@/domain/catalogs/familyCaseTypes';

export const dynamic = 'force-dynamic';

interface PartyInput {
  role: string;
  personId?: string;
  legalRepresentativeName?: string;
  legalRepresentativeUserId?: string;
  notes?: string;
  person?: {
    documentType: string;
    documentNumber: string;
    firstName: string;
    secondName?: string;
    firstLastName: string;
    secondLastName?: string;
    birthDate?: string;
    gender?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    department?: string;
    isMinor?: boolean;
    dataConsent?: boolean;
  };
}

function deriveIsMinor(birthDate?: string, explicit?: boolean): boolean {
  if (explicit === true) return true;
  if (birthDate) {
    const age = (Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 3600 * 1000);
    return age < 18;
  }
  return false;
}

// GET /api/v1/family/cases?search=&modality=&stateCode=&page=&limit=
// Lista los casos de familia (los que tienen caseModality) con sus partes.
export async function GET(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_READ_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const modality = searchParams.get('modality')?.trim();
    const stateCode = searchParams.get('stateCode')?.trim();
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);

    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
      caseModality: { not: null },
    };
    if (modality && isValidEnum(CaseModality, modality)) where.caseModality = modality;
    if (stateCode) where.state = { code: stateCode };
    if (search) {
      where.OR = [
        { filingNumber: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [cases, total] = await Promise.all([
      db.case.findMany({
        where,
        include: {
          caseType: { select: { code: true, name: true } },
          state: { select: { code: true, name: true, color: true } },
          comisaria: { select: { id: true, code: true, name: true } },
          caseParties: { include: { person: { select: { id: true, firstName: true, firstLastName: true, isMinor: true } } } },
        },
        orderBy: { filedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.case.count({ where }),
    ]);

    return NextResponse.json({
      data: cases,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error listando casos de familia:', error);
    return NextResponse.json({ error: 'Error al listar los casos' }, { status: 500 });
  }
}

// POST /api/v1/family/cases
// Radica un caso de comisaría de familia: crea el Case, calcula el término legal,
// crea/vincula las personas como partes y siembra el estado inicial.
export async function POST(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_INTAKE_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const tenantId = auth.user.tenantId;
    const body = await request.json();
    const {
      caseTypeCode, subject, description, channel,
      violenceTypes, modality, priority, folios, comisariaId,
    } = body;
    const parties: PartyInput[] = Array.isArray(body.parties) ? body.parties : [];

    // --- Validaciones de entrada ---
    if (!caseTypeCode || !subject || !description) {
      return NextResponse.json(
        { error: 'caseTypeCode, subject y description son obligatorios' },
        { status: 400 }
      );
    }
    if (parties.length === 0) {
      return NextResponse.json(
        { error: 'Debe incluir al menos una parte (parties): víctima o denunciante' },
        { status: 400 }
      );
    }
    for (const p of parties) {
      if (!p.role || !isValidEnum(PartyRole, p.role)) {
        return NextResponse.json(
          { error: `Parte con role inválido. Valores: ${Object.values(PartyRole).join(', ')}` },
          { status: 400 }
        );
      }
      if (!p.personId && !p.person) {
        return NextResponse.json(
          { error: 'Cada parte requiere personId (existente) o person (datos para crearla)' },
          { status: 400 }
        );
      }
    }

    // violenceTypes: validar cada valor contra el enum
    const validViolence: ViolenceType[] = [];
    if (Array.isArray(violenceTypes)) {
      for (const v of violenceTypes) {
        if (!isValidEnum(ViolenceType, v)) {
          return NextResponse.json(
            { error: `violenceType inválido: ${v}. Valores: ${Object.values(ViolenceType).join(', ')}` },
            { status: 400 }
          );
        }
        validViolence.push(v as ViolenceType);
      }
    }

    // --- Resolver tipo de caso (acepta código base; en BD está sufijado con _SIGLA) ---
    const caseType = await caseService.getCaseTypeByCode(caseTypeCode, tenantId, db);
    if (!caseType) {
      return NextResponse.json(
        { error: `Tipo de caso no encontrado: ${caseTypeCode}` },
        { status: 404 }
      );
    }

    // --- Comisaría (sede) que atiende el caso: opcional, pero si viene debe ser
    //     una comisaría activa del tenant ---
    if (comisariaId) {
      const comisaria = await db.comisaria.findFirst({
        where: { id: comisariaId, tenantId, isActive: true },
        select: { id: true },
      });
      if (!comisaria) {
        return NextResponse.json(
          { error: 'La comisaría seleccionada no existe o no está activa en la entidad' },
          { status: 400 }
        );
      }
    }

    // Modalidad: explícita o derivada del código base del tipo de caso
    const baseCode = String(caseTypeCode).split('_')[0];
    let caseModality: CaseModality | null =
      (CASE_TYPE_MODALITY[baseCode] as CaseModality | undefined) ?? null;
    if (modality) {
      if (!isValidEnum(CaseModality, modality)) {
        return NextResponse.json(
          { error: `modality inválida. Valores: ${Object.values(CaseModality).join(', ')}` },
          { status: 400 }
        );
      }
      caseModality = modality as CaseModality;
    }

    // --- Estado inicial del workflow ---
    const initialState = await db.caseState.findFirst({
      where: { isInitial: true, isActive: true },
      select: { id: true },
    });
    if (!initialState) {
      return NextResponse.json(
        { error: 'La entidad no tiene estados de workflow configurados. Ejecute el seed de familia.' },
        { status: 422 }
      );
    }

    // --- Número de radicado y término legal ---
    const filingNumber = await caseService.generateFilingNumber(tenantId, db);
    const filedAt = new Date();
    const dueDate = await LegalTermsCalculator.calculateDueDate(filedAt, caseType.defaultLegalTermDays);

    // Prioridad: explícita; si hay NNA o es VIF/PARD/PNNA, elevar
    const hasNNA = parties.some((p) => p.role === PartyRole.NNA);
    const sensitiveModality = ['VIOLENCIA_INTRAFAMILIAR', 'PARD', 'MEDIDA_PROTECCION_NNA'].includes(caseModality || '');
    const finalPriority = typeof priority === 'number' ? priority : (hasNNA || sensitiveModality ? 60 : 40);

    // --- Transacción: personas + citizen espejo + caso + historial + partes ---
    const created = await db.$transaction(async (tx) => {
      // 1. Resolver cada parte a una Person (creándola si viene con datos), y
      //    capturar los datos de la persona para poder construir el Citizen espejo.
      const resolved: Array<{ party: PartyInput; personId: string; data: PartyInput['person'] }> = [];

      for (const p of parties) {
        let personId = p.personId;
        let data = p.person;

        if (personId) {
          const owned = await tx.person.findFirst({ where: { id: personId, tenantId } });
          if (!owned) {
            throw new Error(`La persona ${personId} no existe en la entidad`);
          }
          data = data ?? {
            documentType: owned.documentType,
            documentNumber: owned.documentNumber,
            firstName: owned.firstName,
            secondName: owned.secondName ?? undefined,
            firstLastName: owned.firstLastName,
            secondLastName: owned.secondLastName ?? undefined,
            email: owned.email ?? undefined,
            phone: owned.phone ?? undefined,
            address: owned.address ?? undefined,
            city: owned.city ?? undefined,
            department: owned.department ?? undefined,
          };
        } else if (p.person) {
          const existing = await tx.person.findFirst({
            where: { documentNumber: String(p.person.documentNumber), tenantId },
            select: { id: true },
          });
          if (existing) {
            personId = existing.id;
          } else {
            const isMinor = deriveIsMinor(p.person.birthDate, p.person.isMinor);
            const newPerson = await tx.person.create({
              data: {
                tenantId,
                documentType: p.person.documentType,
                documentNumber: String(p.person.documentNumber),
                firstName: p.person.firstName,
                secondName: p.person.secondName || null,
                firstLastName: p.person.firstLastName,
                secondLastName: p.person.secondLastName || null,
                birthDate: p.person.birthDate ? new Date(p.person.birthDate) : null,
                gender: p.person.gender || null,
                phone: p.person.phone || null,
                email: p.person.email || null,
                address: p.person.address || null,
                city: p.person.city || null,
                department: p.person.department || null,
                isMinor,
                isPriorityGroup: isMinor,
                priorityReason: isMinor ? 'NNA' : null,
                dataConsent: p.person.dataConsent === true,
                dataConsentDate: p.person.dataConsent === true ? new Date() : null,
              },
              select: { id: true },
            });
            personId = newPerson.id;
          }
        }

        resolved.push({ party: p, personId: personId!, data });
      }

      // 2. Citizen espejo del radicante principal (víctima > denunciante > primero).
      //    El modelo Case exige citizenId; el radicante real se modela vía CaseParty.
      const principal =
        resolved.find((r) => r.party.role === PartyRole.VICTIMA) ??
        resolved.find((r) => r.party.role === PartyRole.DENUNCIANTE) ??
        resolved[0];
      const pd = principal.data;
      if (!pd) {
        throw new Error('No se pudieron resolver los datos del radicante principal');
      }

      let citizen = await tx.citizen.findFirst({
        where: { documentNumber: String(pd.documentNumber), tenantId },
        select: { id: true },
      });
      if (!citizen) {
        citizen = await tx.citizen.create({
          data: {
            tenantId,
            documentType: pd.documentType,
            documentNumber: String(pd.documentNumber),
            firstName: pd.firstName,
            secondName: pd.secondName || null,
            firstLastName: pd.firstLastName,
            secondLastName: pd.secondLastName || null,
            email: pd.email || null,
            phone: pd.phone || null,
            address: pd.address || null,
            city: pd.city || 'No reporta',
            department: pd.department || 'No reporta',
            dataConsent: pd.dataConsent === true,
            dataConsentDate: pd.dataConsent === true ? new Date() : null,
          },
          select: { id: true },
        });
      }

      // 3. Crear el caso
      const newCase = await tx.case.create({
        data: {
          tenantId,
          citizenId: citizen.id,
          caseTypeId: caseType.id,
          stateId: initialState.id,
          filingNumber,
          subject,
          description,
          folios: typeof folios === 'number' ? folios : null,
          channel: channel || 'PRESENCIAL',
          priority: finalPriority,
          filedAt,
          dueDate,
          legalTermDays: caseType.defaultLegalTermDays,
          caseModality,
          violenceTypes: validViolence,
          comisariaId: comisariaId || null,
          metadata: { radicadoPor: auth.user!.userId, origen: 'family_intake' },
        },
      });

      // 4. Historial de estado inicial
      await tx.caseStateHistory.create({
        data: {
          tenantId,
          caseId: newCase.id,
          fromStateId: null,
          toStateId: initialState.id,
          changedBy: auth.user!.userId,
          comment: `Caso de familia radicado (canal ${channel || 'PRESENCIAL'})`,
          reason: 'INITIAL',
        },
      });

      // 5. Vincular las partes
      for (const r of resolved) {
        await tx.caseParty.create({
          data: {
            tenantId,
            caseId: newCase.id,
            personId: r.personId,
            role: r.party.role as PartyRole,
            legalRepresentativeName: r.party.legalRepresentativeName || null,
            legalRepresentativeUserId: r.party.legalRepresentativeUserId || null,
            notes: r.party.notes || null,
          },
        });
      }

      return newCase;
    }, { timeout: 20000 });

    // Releer con relaciones para la respuesta
    const full = await db.case.findUnique({
      where: { id: created.id },
      include: {
        caseType: { select: { code: true, name: true } },
        state: { select: { code: true, name: true } },
        comisaria: { select: { id: true, code: true, name: true } },
        caseParties: { include: { person: true } },
      },
    });

    await auditFamily(db, request, auth.user, 'FAMILY_CASE_CREATED', 'Case', created.id, { caseId: created.id, metadata: { filingNumber: created.filingNumber, caseModality, parties: parties.length } });

    return NextResponse.json(
      {
        message: `Caso radicado exitosamente. Radicado: ${created.filingNumber}`,
        filingNumber: created.filingNumber,
        caseId: created.id,
        dueDate: created.dueDate,
        case: full,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error radicando caso de familia:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { error: 'Error al radicar el caso', details: process.env.NODE_ENV === 'development' ? message : undefined },
      { status: 500 }
    );
  }
}
