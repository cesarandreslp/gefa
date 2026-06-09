import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_READ_ROLES, FAMILY_INTAKE_ROLES, auditFamily } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

// GET /api/v1/family/persons?search=&isMinor=&limit=&page=
// Lista/busca personas del tenant (víctimas, agresores, NNA, testigos).
export async function GET(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_READ_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const isMinorParam = searchParams.get('isMinor');
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);

    const where: Record<string, unknown> = { tenantId: auth.user.tenantId };
    if (isMinorParam === 'true') where.isMinor = true;
    if (isMinorParam === 'false') where.isMinor = false;
    if (search) {
      where.OR = [
        { documentNumber: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { firstLastName: { contains: search, mode: 'insensitive' } },
        { secondLastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [persons, total] = await Promise.all([
      db.person.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.person.count({ where }),
    ]);

    return NextResponse.json({
      data: persons,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error listando personas:', error);
    return NextResponse.json({ error: 'Error al listar personas' }, { status: 500 });
  }
}

// POST /api/v1/family/persons
// Crea una persona. Si ya existe (mismo documento en el tenant), devuelve 409.
export async function POST(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_INTAKE_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const body = await request.json();
    const {
      documentType, documentNumber, firstName, secondName,
      firstLastName, secondLastName, birthDate, gender, ethnicity,
      disability, email, phone, address, neighborhood, city, department,
      isPriorityGroup, priorityReason, dataConsent,
    } = body;

    if (!documentType || !documentNumber || !firstName || !firstLastName) {
      return NextResponse.json(
        { error: 'documentType, documentNumber, firstName y firstLastName son obligatorios' },
        { status: 400 }
      );
    }

    const existing = await db.person.findFirst({
      where: { documentNumber: String(documentNumber), tenantId: auth.user.tenantId },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una persona con ese número de documento en la entidad', personId: existing.id },
        { status: 409 }
      );
    }

    // NNA: menor de 18 años. Se deriva de birthDate si viene; el cliente puede forzarlo.
    let isMinor = body.isMinor === true;
    if (birthDate) {
      const age = (Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 3600 * 1000);
      if (age < 18) isMinor = true;
    }

    const person = await db.person.create({
      data: {
        tenantId: auth.user.tenantId,
        documentType,
        documentNumber: String(documentNumber),
        firstName,
        secondName: secondName || null,
        firstLastName,
        secondLastName: secondLastName || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        gender: gender || null,
        ethnicity: ethnicity || null,
        disability: disability || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        neighborhood: neighborhood || null,
        city: city || null,
        department: department || null,
        isMinor,
        isPriorityGroup: isPriorityGroup === true || isMinor,
        priorityReason: priorityReason || (isMinor ? 'NNA' : null),
        dataConsent: dataConsent === true,
        dataConsentDate: dataConsent === true ? new Date() : null,
      },
    });

    await auditFamily(db, request, auth.user, 'FAMILY_PERSON_CREATED', 'Person', person.id, { metadata: { isMinor: person.isMinor } });

    return NextResponse.json(person, { status: 201 });
  } catch (error) {
    console.error('Error creando persona:', error);
    return NextResponse.json({ error: 'Error al crear la persona' }, { status: 500 });
  }
}
