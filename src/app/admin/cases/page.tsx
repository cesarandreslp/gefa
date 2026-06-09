/**
 * Listado de expedientes - /admin/cases
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import CaseFilters from './CaseFilters';
import CaseList from './CaseList';

interface SearchParams {
  state?: string;
  from?: string;
  to?: string;
}

export default async function CasesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Construir filtros
  const where: Prisma.CaseWhereInput = {};

  if (searchParams.state) {
    const caseState = await prisma.caseState.findUnique({
      where: { code: searchParams.state },
    });
    if (caseState) {
      where.stateId = caseState.id;
    }
  }

  if (searchParams.from || searchParams.to) {
    where.filedAt = {};
    if (searchParams.from) {
      where.filedAt.gte = new Date(searchParams.from);
    }
    if (searchParams.to) {
      where.filedAt.lte = new Date(searchParams.to);
    }
  }

  // Obtener casos
  const cases = await prisma.case.findMany({
    where,
    include: {
      citizen: true,
      state: true,
    },
    orderBy: { filedAt: 'desc' },
    take: 50,
  });

  // Obtener todos los estados para el filtro
  const states = await prisma.caseState.findMany({
    orderBy: { displayOrder: 'asc' },
  });

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem', fontSize: '1.75rem' }}>Expedientes</h1>
      
      <CaseFilters states={states} />
      
      <CaseList cases={cases} />
    </div>
  );
}
