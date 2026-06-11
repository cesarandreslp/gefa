/**
 * GET /api/v1/family/locate?q=<texto>
 *
 * LOCALIZADOR DE PROCESOS para el Auxiliar de Atención al Usuario (y roles
 * operativos). Responde a la pregunta del mostrador: «¿en qué comisaría de esta
 * entidad tiene proceso esta persona?». Busca por número de radicado/proceso,
 * cédula o nombre, tanto en el radicante (Citizen) como en las partes del caso
 * (Person: víctima/agresor/NNA/testigo).
 *
 * Minimización de datos (Ley 1581/2012 + Ley 1098/2006): devuelve SOLO lo
 * necesario para localizar y remitir — comisaría, radicado, tipo, estado, fecha
 * y las personas coincidentes. NO expone el contenido del expediente (asunto,
 * descripción, tipos de violencia, valoraciones). Cada consulta se audita.
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_LOCATE_ROLES, auditFamily } from '@/lib/familyApi';

export const dynamic = 'force-dynamic';

/** Construye condiciones OR de nombre por token sobre una relación Person/Citizen. */
function nameTokenConditions(tokens: string[]) {
  const fields = ['firstName', 'secondName', 'firstLastName', 'secondLastName'];
  const conditions: Record<string, unknown>[] = [];
  for (const token of tokens) {
    for (const field of fields) {
      conditions.push({ [field]: { contains: token, mode: 'insensitive' } });
    }
  }
  return conditions;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_LOCATE_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const tenantId = auth.user.tenantId;
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';

    if (q.length < 3) {
      return NextResponse.json(
        { error: 'Ingrese al menos 3 caracteres (radicado, cédula o nombre).' },
        { status: 400 }
      );
    }

    const tokens = q.split(/\s+/).filter(Boolean);
    const digits = q.replace(/\D/g, '');
    const nameConds = nameTokenConditions(tokens);

    // Coincidencia en el radicante (Citizen)
    const citizenOr: Record<string, unknown>[] = [...nameConds];
    if (digits.length >= 4) citizenOr.push({ documentNumber: { contains: digits } });

    // Coincidencia en las partes del caso (Person)
    const personOr: Record<string, unknown>[] = [...nameConds];
    if (digits.length >= 4) personOr.push({ documentNumber: { contains: digits } });

    const where: Record<string, unknown> = {
      tenantId,
      OR: [
        { filingNumber: { contains: q, mode: 'insensitive' } },
        { citizen: { is: { OR: citizenOr } } },
        { caseParties: { some: { person: { OR: personOr } } } },
      ],
    };

    const cases = await db.case.findMany({
      where,
      select: {
        id: true,
        filingNumber: true,
        filedAt: true,
        caseType: { select: { name: true } },
        state: { select: { name: true, color: true } },
        comisaria: { select: { name: true, code: true, phone: true, address: true } },
        citizen: {
          select: { firstName: true, secondName: true, firstLastName: true, secondLastName: true, documentType: true, documentNumber: true },
        },
        caseParties: {
          select: {
            role: true,
            person: {
              select: { firstName: true, secondName: true, firstLastName: true, secondLastName: true, documentType: true, documentNumber: true, isMinor: true },
            },
          },
        },
      },
      orderBy: { filedAt: 'desc' },
      take: 50,
    });

    const fullName = (p: { firstName: string; secondName?: string | null; firstLastName: string; secondLastName?: string | null }) =>
      [p.firstName, p.secondName, p.firstLastName, p.secondLastName].filter(Boolean).join(' ');

    const results = cases.map((c) => {
      // Personas del caso: preferimos las partes del dominio de familia; si no hay
      // (casos heredados), mostramos el radicante (Citizen).
      const people =
        c.caseParties.length > 0
          ? c.caseParties.map((cp) => ({
              name: fullName(cp.person),
              documentType: cp.person.documentType,
              documentNumber: cp.person.documentNumber,
              role: cp.role as string,
              isMinor: cp.person.isMinor,
            }))
          : c.citizen
            ? [{
                name: fullName(c.citizen),
                documentType: c.citizen.documentType,
                documentNumber: c.citizen.documentNumber,
                role: 'RADICANTE',
                isMinor: false,
              }]
            : [];

      return {
        caseId: c.id,
        filingNumber: c.filingNumber,
        filedAt: c.filedAt,
        caseType: c.caseType?.name ?? null,
        state: c.state ? { name: c.state.name, color: c.state.color } : null,
        comisaria: c.comisaria
          ? { name: c.comisaria.name, code: c.comisaria.code, phone: c.comisaria.phone, address: c.comisaria.address }
          : null,
        people,
      };
    });

    await auditFamily(db, request, auth.user, 'FAMILY_CASE_LOCATE_SEARCH', 'Case', 'search', {
      metadata: { query: q, results: results.length },
    });

    // Comisarías distintas donde la persona tiene proceso (resumen para el mostrador)
    const sedes = Array.from(
      new Set(results.map((r) => (r.comisaria ? `${r.comisaria.code} · ${r.comisaria.name}` : 'Sin comisaría asignada')))
    );

    return NextResponse.json({ data: results, total: results.length, sedes });
  } catch (error) {
    console.error('Error localizando procesos:', error);
    return NextResponse.json({ error: 'Error al realizar la consulta' }, { status: 500 });
  }
}
