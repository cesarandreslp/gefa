import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Proteger la ruta - solo usuarios autenticados
    const auth = await protectAPIRoute(request);

    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const db = auth.db;
    const userId = auth.user.userId;
    const userRoleCode = auth.user.roleCode;

    // ADMIN no tiene bandeja, retornar 0
    if (userRoleCode === 'ADMIN') {
      return NextResponse.json({ count: 0 });
    }

    let assignments;

    if (userRoleCode === 'VENTANILLA_UNICA') {
      // VU: contar todos los casos sin clasificar (sin vuClassification) en estados no finales.
      // Misma lógica que la pestaña "Nuevos" de bandeja-entrada — un caso es "nuevo para VU"
      // hasta que VU pone vuClassification, aunque el funcionario ya haya avanzado el estado.
      const estadosFinales = await db.caseState.findMany({
        where: {
          OR: [
            { code: 'CERRADO' }, { code: 'FINALIZADO' },
            { code: 'RESUELTA' }, { code: 'CERRADA' }, { isFinal: true }
          ]
        }
      });
      const idsFinales = estadosFinales.map((e: { id: string }) => e.id);

      assignments = await db.assignment.findMany({
        where: {
          userId: userId,
          case: idsFinales.length > 0
            ? { stateId: { notIn: idsFinales } }
            : {},
        },
        include: {
          case: { select: { id: true, metadata: true } }
        }
      });
    } else {
      // Otros roles: solo estado RADICADO / NUEVA / RECIBIDO
      const estadosNuevos = await db.caseState.findMany({
        where: { code: { in: ['RADICADO', 'NUEVA', 'RECIBIDO'] } }
      });

      if (estadosNuevos.length === 0) {
        return NextResponse.json({ count: 0 });
      }

      const estadoIds = estadosNuevos.map((e: { id: string }) => e.id);
      assignments = await db.assignment.findMany({
        where: {
          userId: userId,
          case: { stateId: { in: estadoIds } }
        },
        include: {
          case: { select: { id: true, metadata: true } }
        }
      });
    }

    // Una asignación por caso (la más reciente ya viene primera por assignedAt desc implícito)
    const casosPorId = new Map<string, typeof assignments[0]>();
    for (const assignment of assignments) {
      if (!casosPorId.has(assignment.caseId)) {
        casosPorId.set(assignment.caseId, assignment);
      }
    }

    // Para VU: excluir casos ya clasificados
    let casosUnicos = Array.from(casosPorId.values());
    if (userRoleCode === 'VENTANILLA_UNICA') {
      casosUnicos = casosUnicos.filter(a => {
        const meta = a.case.metadata as Record<string, unknown> | null;
        return !meta?.vuClassification;
      });
    }

    const count = casosUnicos.length;

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error contando solicitudes nuevas:', error);
    return NextResponse.json(
      { error: 'Error al obtener el contador de solicitudes' },
      { status: 500 }
    );
  }
}
