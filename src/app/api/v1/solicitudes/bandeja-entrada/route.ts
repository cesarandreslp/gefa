/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const */
import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute, getBaseRoleCode } from '@/lib/auth';
import { calculateBusinessDeadline } from '@/lib/businessDays';

export async function GET(request: NextRequest) {
  try {
    // Proteger la ruta - solo usuarios autenticados pueden ver su bandeja
    const auth = await protectAPIRoute(request);

    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const db = auth.db;
    const userId = auth.user.userId;
    const userRole = getBaseRoleCode(auth.user.roleCode);
    const { searchParams } = new URL(request.url);
    const tab = (searchParams.get('tab') || 'nuevos') as any;

    // Lógica especial para el Revisor (Seguimiento, Invitaciones, Leídos)
    // Nota: 'nuevos' para Revisor se maneja como estándar (asignaciones por defecto = 0)
    const isRevisorSpecialTab = userRole === 'DIRECTOR' && (tab === 'seguimientoGeneral' || tab === 'invitaciones' || tab === 'leidos' || tab === 'cierreCasos');

    if (isRevisorSpecialTab) {
      const results = await getRevisorInbox(db, tab, auth.user.tenantId);
      return NextResponse.json(results);
    }

    // Lógica especial para Ventanilla Única (Seguimientos Leídos, Invitaciones Leídas)
    const isVUSpecialTab = userRole === 'VENTANILLA_UNICA' && (tab === 'seguimientosLeidos' || tab === 'invitacionesLeidas');

    if (isVUSpecialTab) {
      const results = await getVUClassifiedInbox(db, userId, tab, auth.user.tenantId);
      return NextResponse.json(results);
    }

    // Lógica estándar para todos los roles (incluido Revisor en pestañas normales)
    const results = await getStandardInbox(db, userId, tab, userRole, auth.user.tenantId);
    return NextResponse.json(results);

  } catch (error) {
    console.error('Error obteniendo bandeja de entrada:', error);
    return NextResponse.json(
      { error: 'Error al obtener las solicitudes' },
      { status: 500 }
    );
  }
}

async function getRevisorInbox(db: any, tab: string, tenantId: string) {
  let whereClause: any = { tenantId };

  if (tab === 'seguimientoGeneral') {
    whereClause = {
      tenantId,
      metadata: {
        path: ['revisorClassification'],
        string_contains: 'SEGUIMIENTO',
      }
    };
  } else if (tab === 'invitaciones') {
    whereClause = {
      tenantId,
      metadata: {
        path: ['revisorClassification'],
        string_contains: 'INVITACION',
      }
    };
  } else if (tab === 'leidos') {
    whereClause = {
      tenantId,
      metadata: {
        path: ['revisorClassification'],
        string_contains: 'LEIDO',
      }
    };
  } else if (tab === 'cierreCasos') {
    whereClause = {
      tenantId,
      metadata: {
        path: ['pendienteCierre'],
        equals: true
      }
    };
  }

  const cases = await db.case.findMany({
    where: whereClause,
    include: {
      citizen: true,
      caseType: true,
      state: true,
      documents: {
        orderBy: {
          uploadedAt: 'asc'
        }
      },
      stateHistory: {
        orderBy: {
          timestamp: 'desc'
        },
        include: {
          toState: true
        }
      }
    },
    orderBy: {
      filedAt: 'desc'
    }
  });

  return await Promise.all(cases.map((caso: any) => formatCase(caso)));
}

async function getVUClassifiedInbox(db: any, userId: string, tab: string, tenantId: string) {
  const classificationValue = tab === 'seguimientosLeidos' ? 'SEGUIMIENTO' : 'INVITACION';

  const assignments = await db.assignment.findMany({
    where: {
      tenantId,
      userId: userId,
      case: {
        metadata: {
          path: ['vuClassification'],
          equals: classificationValue
        }
      }
    },
    include: {
      case: {
        include: {
          citizen: true,
          caseType: true,
          state: true,
          documents: {
            where: {
              documentType: {
                in: ['PETITION', 'SUPPORTING_DOC']
              }
            },
            orderBy: {
              uploadedAt: 'asc'
            },
            take: 1
          },
          stateHistory: {
            orderBy: {
              timestamp: 'desc'
            },
            include: {
              toState: true
            }
          }
        }
      }
    },
    orderBy: {
      assignedAt: 'desc'
    }
  });

  const casosPorId = new Map<string, typeof assignments[0]>();
  for (const assignment of assignments) {
    if (!casosPorId.has(assignment.caseId)) {
      casosPorId.set(assignment.caseId, assignment);
    }
  }

  return await Promise.all(
    Array.from(casosPorId.values())
      .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())
      .slice(0, 50)
      .map((assignment) => formatCase(assignment.case, assignment.isFinalAssignment, assignment.assignedAt))
  );
}

async function getStandardInbox(db: any, userId: string, tab: string, userRole?: string | null, tenantId?: string) {
  let caseWhereFilter: any = { tenantId };

  if (tab === 'nuevos') {
    if (userRole === 'VENTANILLA_UNICA') {
      // Para VU: "Nuevos" = todos los casos sin clasificar (sin vuClassification),
      // independientemente del estado. Un caso es "nuevo para VU" hasta que VU lo clasifique,
      // aunque el funcionario ya lo haya movido a EN_ESTUDIO o REQUIERE_INFORMACION.
      const estadosFinales = await db.caseState.findMany({
        where: { OR: [{ code: 'CERRADO' }, { code: 'FINALIZADO' }, { code: 'RESUELTA' }, { code: 'CERRADA' }, { isFinal: true }] }
      });
      const idsFinales = estadosFinales.map((e: any) => e.id);
      if (idsFinales.length > 0) {
        caseWhereFilter.stateId = { notIn: idsFinales };
      }
    } else {
      // Para otros roles: solo RADICADO
      const estadoRadicado = await db.caseState.findFirst({ where: { code: 'RADICADO' } });
      caseWhereFilter.stateId = estadoRadicado ? estadoRadicado.id : 'none';
    }
  } else if (tab === 'rechazados') {
    // Pestaña Rechazados
    const estadoRechazado = await db.caseState.findFirst({ where: { code: 'REMITIDO_POR_COMPETENCIA' } });
    caseWhereFilter.stateId = estadoRechazado ? estadoRechazado.id : 'none';
  } else if (tab === 'finalizado') {
    // Pestaña Finalizado
    const estadosFinalizados = await db.caseState.findMany({
      where: {
        OR: [
          { code: 'FINALIZADO' }, { code: 'RESUELTA' }, { code: 'CERRADA' }, { code: 'CERRADO' }, { isFinal: true }
        ]
      }
    });
    caseWhereFilter.stateId = { in: estadosFinalizados.map((e: any) => e.id) };
  } else if (tab === 'leidos') {
    // Pestaña Leídos: Casos cerrados con clasificación 'LEIDO' (No requiere respuesta)
    const estadosCerrados = await db.caseState.findMany({
      where: {
        OR: [
          { code: 'CERRADO' }, { code: 'FINALIZADO' }, { code: 'RESUELTA' }, { code: 'CERRADA' }, { isFinal: true }
        ]
      }
    });
    caseWhereFilter.stateId = { in: estadosCerrados.map((e: any) => e.id) };
    caseWhereFilter.metadata = {
      path: ['revisorClassification'],
      equals: 'LEIDO'
    };
  } else {
    // Pestaña En Gestión
    const estadosEnGestion = await db.caseState.findMany({
      where: {
        code: {
          in: ['EN_ESTUDIO', 'REQUIERE_INFORMACION', 'ESCALADO_A_OTRA_DEPENDENCIA', 'REMITIDO_A_ENTIDAD_EXTERNA']
        }
      }
    });
    const ids = estadosEnGestion.map((e: any) => e.id);
    caseWhereFilter.stateId = ids.length > 0 ? { in: ids } : 'none';
  }

  // Buscar asignaciones
  const assignments = await db.assignment.findMany({
    where: {
      userId: userId,
      case: caseWhereFilter
    },
    include: {
      case: {
        include: {
          citizen: true,
          caseType: true,
          state: true,
          documents: {
            where: {
              documentType: {
                in: ['PETITION', 'SUPPORTING_DOC']
              }
            },
            orderBy: {
              uploadedAt: 'asc'
            },
            take: 1
          },
          stateHistory: {
            orderBy: {
              timestamp: 'desc'
            },
            include: {
              toState: true
            }
          },
          actionLogs: {
            where: { action: 'INTERNAL_NOTE' },
            select: { id: true },
            take: 1,
          }
        }
      }
    },
    orderBy: {
      assignedAt: 'desc'
    }
  });

  // Filtrar últimas asignaciones
  const casosPorId = new Map<string, typeof assignments[0]>();
  for (const assignment of assignments) {
    if (!casosPorId.has(assignment.caseId)) {
      casosPorId.set(assignment.caseId, assignment);
    }
  }

  let casosConAsignacion = Array.from(casosPorId.values())
    .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())
    .slice(0, 50);

  // Para VU en tab nuevos: excluir casos ya clasificados (en memoria, más confiable que JSON filter)
  if (tab === 'nuevos' && userRole === 'VENTANILLA_UNICA') {
    casosConAsignacion = casosConAsignacion.filter(assignment => {
      const metadata = assignment.case.metadata as any;
      return !metadata?.vuClassification;
    });
  }

  return await Promise.all(
    casosConAsignacion.map((assignment) => {
      return formatCase(assignment.case, assignment.isFinalAssignment, assignment.assignedAt);
    })
  );
}

async function formatCase(caso: any, isFinalAssignment: boolean = false, assignmentDate?: Date) {
  const historial = caso.stateHistory;
  let ciudadanoRespondio = false;
  let respuestaCiudadano = null;
  let fechaRechazo = null;
  let fechaRespuestaCiudadano = null;
  let fechaAsignacion = null;
  let fechaEnGestion = null;
  let fechaCierre = null;

  // Arreglo para almacenar la conversación completa
  const conversacion: {
    id: string;
    autor: string;
    rol: 'FUNCIONARIO' | 'CIUDADANO' | 'ENTIDAD_EXTERNA';
    mensaje: string;
    fecha: string;
    emailEntidad?: string;
  }[] = [];

  for (const entry of historial) {
    const estadoCodigo = entry.toState.code;
    if (estadoCodigo === 'ASIGNADO' && !fechaAsignacion) fechaAsignacion = entry.timestamp.toISOString();
    if (['EN_ESTUDIO', 'EN_GESTION', 'REQUIERE_INFORMACION'].includes(estadoCodigo) && !fechaEnGestion) fechaEnGestion = entry.timestamp.toISOString();
    if (estadoCodigo === 'REMITIDO_POR_COMPETENCIA' && !fechaRechazo) {
      fechaRechazo = entry.timestamp.toISOString();
    }

    // Clasificar cada comentario según su origen (orden: entidad > ciudadano > funcionario)
    if (entry.comment) {
      const comment = entry.comment;

      if (comment.startsWith('[ENTIDAD_EXTERNA:')) {
        // Respuesta de una entidad u oficina externa (formato nuevo con tag)
        const match = comment.match(/^\[ENTIDAD_EXTERNA:([^\]]+)\]\s*/);
        const emailEntidad = match ? match[1] : '';
        const mensajeLimpio = comment.replace(/^\[ENTIDAD_EXTERNA:[^\]]+\]\s*/, '').trim();
        conversacion.push({
          id: entry.id + '-entidad',
          autor: 'Respuesta de entidad externa',
          rol: 'ENTIDAD_EXTERNA',
          mensaje: mensajeLimpio,
          fecha: entry.timestamp.toISOString(),
          emailEntidad
        });
      } else if (comment.startsWith('Respuesta de entidad externa:')) {
        // Respuesta de entidad externa en formato antiguo (sin tag de email)
        conversacion.push({
          id: entry.id + '-entidad',
          autor: 'Respuesta de entidad externa',
          rol: 'ENTIDAD_EXTERNA',
          mensaje: comment.replace('Respuesta de entidad externa:', '').trim(),
          fecha: entry.timestamp.toISOString()
        });
      } else if (comment.includes('--- Respuesta del ciudadano ---')) {
        const parts = comment.split('--- Respuesta del ciudadano ---');
        const funcionarioPart = parts[0].trim();
        if (funcionarioPart) {
          conversacion.push({
            id: entry.id + '-func',
            autor: 'Funcionario Asignado',
            rol: 'FUNCIONARIO',
            mensaje: funcionarioPart,
            fecha: entry.timestamp.toISOString()
          });
        }
        ciudadanoRespondio = true;
        respuestaCiudadano = parts[1].trim();
        fechaRespuestaCiudadano = entry.timestamp.toISOString();
        conversacion.push({
          id: entry.id + '-ciud',
          autor: caso.citizen ? `${caso.citizen.firstName} ${caso.citizen.firstLastName}` : 'Ciudadano',
          rol: 'CIUDADANO',
          mensaje: respuestaCiudadano,
          fecha: entry.timestamp.toISOString()
        });
      } else if (comment.startsWith('Respuesta del ciudadano:')) {
        ciudadanoRespondio = true;
        respuestaCiudadano = comment.replace('Respuesta del ciudadano:', '').trim();
        fechaRespuestaCiudadano = entry.timestamp.toISOString();
        conversacion.push({
          id: entry.id + '-ciud',
          autor: caso.citizen ? `${caso.citizen.firstName} ${caso.citizen.firstLastName}` : 'Ciudadano',
          rol: 'CIUDADANO',
          mensaje: respuestaCiudadano,
          fecha: entry.timestamp.toISOString()
        });
      } else if (estadoCodigo === 'REQUIERE_INFORMACION') {
        // Mensaje del funcionario solicitando información
        conversacion.push({
          id: entry.id + '-func',
          autor: 'Funcionario Asignado',
          rol: 'FUNCIONARIO',
          mensaje: comment.trim(),
          fecha: entry.timestamp.toISOString()
        });
      }
    }

    if (['CERRADO', 'FINALIZADO', 'RESUELTA', 'CERRADA'].includes(estadoCodigo) && !fechaCierre) fechaCierre = entry.timestamp.toISOString();
  }

  // Ordenar la conversación cronológicamente (más antiguo primero)
  conversacion.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  const historialRechazo = historial.find((h: any) => h.toState.code === 'REMITIDO_POR_COMPETENCIA');

  // Safely handle citizen name if possibly null (though schema usually enforces it)
  const citizenName = caso.citizen ? `${caso.citizen.firstName} ${caso.citizen.firstLastName}` : 'N/A';

  // Calculate reassignment deadline exclusively if it's assigned to an official
  let reassignmentDeadlineStr: string | null = null;
  if (assignmentDate) {
    const deadlineDate = await calculateBusinessDeadline(assignmentDate, 3);
    reassignmentDeadlineStr = deadlineDate.toISOString();
  }

  // ── Cálculo del semáforo de término ──
  const now = new Date();
  const dueDate: Date | null = caso.dueDate || null;
  const estadoCode: string = caso.state?.code || 'SIN_ESTADO';
  const esEstadoFinal = ['CERRADO', 'FINALIZADO', 'RESUELTA', 'CERRADA', 'REMITIDO_POR_COMPETENCIA'].includes(estadoCode);
  const respondedAtDate: Date | null = caso.respondedAt || null;

  let semaforoTermino: 'verde' | 'amarillo' | 'rojo' | 'respondido' = 'verde';
  let respondidoDentroDelTermino: boolean | null = null;

  if (esEstadoFinal || respondedAtDate) {
    // El caso ya fue respondido o cerrado
    semaforoTermino = 'respondido';
    if (respondedAtDate && dueDate) {
      respondidoDentroDelTermino = respondedAtDate <= dueDate;
    } else if (fechaCierre && dueDate) {
      respondidoDentroDelTermino = new Date(fechaCierre) <= dueDate;
    }
  } else if (!dueDate) {
    semaforoTermino = 'verde'; // Sin fecha límite
  } else if (now > dueDate) {
    semaforoTermino = 'rojo'; // Vencido
  } else {
    // Calcular días calendario restantes para el umbral visual
    const msRestantes = dueDate.getTime() - now.getTime();
    const diasRestantes = msRestantes / (1000 * 60 * 60 * 24);
    if (diasRestantes <= 3) {
      semaforoTermino = 'amarillo'; // Próximo a vencer (≤3 días)
    } else {
      semaforoTermino = 'verde'; // En término
    }
  }

  return {
    id: caso.id,
    codigo: caso.filingNumber,
    tipo: caso.caseType?.name || 'General',
    asunto: caso.subject || 'Sin asunto',
    ciudadano: {
      nombre: citizenName,
      documento: caso.citizen?.documentNumber || 'N/A',
      email: caso.citizen?.email || 'N/A',
      telefono: caso.citizen?.phone || 'N/A'
    },
    fechaCreacion: caso.filedAt ? caso.filedAt.toISOString() : new Date().toISOString(),
    fechaVencimiento: dueDate ? dueDate.toISOString() : new Date().toISOString(),
    estado: estadoCode.toLowerCase(),
    prioridad: caso.priority > 60 ? 'alta' : caso.priority > 40 ? 'media' : 'baja',
    isFinalAssignment: isFinalAssignment,
    fechaAsignacionFuncionario: assignmentDate ? assignmentDate.toISOString() : null,
    reassignmentDeadline: reassignmentDeadlineStr,
    expiresAt: historialRechazo?.expiresAt?.toISOString() || null,
    ciudadanoRespondio: (caso.metadata as any)?.ciudadanoRespondio === false ? false : ciudadanoRespondio,
    respuestaCiudadano,
    fechaRechazo,
    fechaRespuestaCiudadano: (caso.metadata as any)?.ciudadanoRespondio === false ? null : fechaRespuestaCiudadano,
    fechaAsignacion,
    fechaEnGestion,
    fechaCierre,
    conversacion,
    metadata: caso.metadata ?? null,
    cierreRechazado: (caso.metadata as any)?.cierreRechazado === true && !(caso.metadata as any)?.cierreRechazadoLeido,
    readBy: ((caso.metadata as any)?.readBy as string[]) || [],
    tieneNotas: (caso.actionLogs?.length ?? 0) > 0 && !(caso.metadata as any)?.notasLeidas,
    tieneRespuestaEntidad: conversacion.some((m: any) => m.rol === 'ENTIDAD_EXTERNA') && !(caso.metadata as any)?.entidadRespLeida,
    // Semáforo de término legal
    semaforoTermino,
    respondedAt: respondedAtDate ? respondedAtDate.toISOString() : null,
    respondidoDentroDelTermino,
    documentos: caso.documents.map((doc: any) => ({
      id: doc.id,
      fileName: doc.originalName,
      fileUrl: doc.fileUrl,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      uploadedAt: doc.uploadedAt.toISOString(),
      isInternal: doc.isInternal ?? false
    }))
  };
}
