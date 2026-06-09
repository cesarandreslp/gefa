import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@/lib/tenantDb';
import { prisma as mainPrisma } from '@/lib/prisma';
import { verifySessionToken } from '@/lib/externalEntitySession';

/**
 * GET /api/v1/entidad/[token]
 * Valida el token de acceso externo y retorna la información mínima del caso.
 * Requiere sesión activa obtenida desde POST /api/v1/entidad/[token]/auth
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token || token.length < 10) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    // Validar sesión
    const authHeader = request.headers.get('authorization');
    const sessionToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const session = sessionToken ? verifySessionToken(sessionToken, token) : null;
    if (!session) {
      return NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 });
    }

    // Resolver BD del tenant desde el índice global
    const tokenRoute = await mainPrisma.externalTokenRoute.findUnique({ where: { token } });
    if (!tokenRoute) {
      return NextResponse.json(
        { error: 'El enlace de acceso no es válido o ha expirado.' },
        { status: 404 }
      );
    }
    const db = getTenantPrisma(tokenRoute.databaseUrl);

    const historial = await db.caseStateHistory.findUnique({
      where: { externalToken: token },
      select: {
        id: true,
        externalToken: true,
        externalTokenUsed: true,
        comment: true,
        timestamp: true,
        isInternal: true,
        caseId: true,
        case: {
          select: {
            id: true,
            filingNumber: true,
            subject: true,
            filedAt: true,
            state: {
              select: { code: true, name: true }
            },
            tenant: {
              select: {
                name: true,
                institutionalEmail: true,
                phone: true,
              }
            },
            caseType: {
              select: { name: true }
            },
            documents: {
              select: {
                id: true,
                originalName: true,
                fileUrl: true,
                mimeType: true,
                fileSize: true,
                uploadedAt: true,
                isInternal: true,
              },
              orderBy: { uploadedAt: 'asc' },
            },
          }
        },
        toState: {
          select: { code: true, name: true }
        }
      }
    });

    if (!historial) {
      return NextResponse.json(
        { error: 'El enlace de acceso no es válido o ha expirado.' },
        { status: 404 }
      );
    }

    // Verificar si el caso ya fue cerrado o resuelto por el funcionario
    const estadosCerrados = ['CERRADO', 'RESUELTO', 'ARCHIVADO'];
    const casoCerrado = estadosCerrados.includes(historial.case.state.code);

    // Obtener conversación desde el momento del escalamiento
    // Solo incluye: el mensaje de escalamiento del funcionario + respuestas de la entidad
    const conversationHistory = await db.caseStateHistory.findMany({
      where: {
        caseId: historial.caseId,
        timestamp: { gte: historial.timestamp },
        OR: [
          // Mensaje del funcionario que escaló
          { changedBy: { not: null } },
          // Respuestas de la entidad
          { comment: { startsWith: '[ENTIDAD_EXTERNA:' } },
        ],
      },
      select: {
        id: true,
        comment: true,
        timestamp: true,
        changedBy: true,
        changedByUser: {
          select: { fullName: true }
        },
        toState: {
          select: { code: true, name: true }
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    const timeline = conversationHistory.map(entry => {
      const isEntity = entry.comment?.startsWith('[ENTIDAD_EXTERNA:') || false;
      const message = isEntity
        ? entry.comment!.replace(/^\[ENTIDAD_EXTERNA:[^\]]+\]\s*/, '')
        : entry.comment || '';

      return {
        id: entry.id,
        message,
        date: entry.timestamp.toISOString(),
        authorType: isEntity ? 'ENTIDAD' as const : 'FUNCIONARIO' as const,
        authorLabel: isEntity ? 'Su respuesta' : 'Funcionario',
      };
    });

    // Auditoría: visualización del caso
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const ua = request.headers.get('user-agent') || 'unknown';
    await db.actionLog.create({
      data: {
        tenantId: tokenRoute.tenantId,
        caseId: historial.case.id,
        userId: null,
        userEmail: session.email,
        userRole: 'EXTERNAL',
        action: 'EXTERNAL_ENTITY_CASE_VIEWED',
        entityType: 'Case',
        entityId: historial.case.id,
        ipAddress: ip,
        userAgent: ua,
        metadata: { filingNumber: historial.case.filingNumber },
        checksum: Buffer.from(JSON.stringify({
          action: 'EXTERNAL_ENTITY_CASE_VIEWED',
          caseId: historial.case.id,
          timestamp: new Date().toISOString(),
        })).toString('base64').substring(0, 64),
      },
    });

    return NextResponse.json({
      valid: true,
      filingNumber: historial.case.filingNumber,
      subject: historial.case.subject,
      filedAt: historial.case.filedAt,
      caseType: historial.case.caseType?.name,
      message: historial.comment,
      requestedAt: historial.timestamp,
      state: historial.toState.name,
      currentState: historial.case.state.code,
      casoCerrado,
      timeline,
      tenant: {
        name: historial.case.tenant.name,
        email: historial.case.tenant.institutionalEmail,
        phone: historial.case.tenant.phone,
      },
      documents: historial.case.documents.map(d => ({
        id: d.id,
        name: d.originalName,
        url: d.fileUrl,
        mimeType: d.mimeType,
        size: d.fileSize,
        isInternal: d.isInternal,
      })),
    });

  } catch (error) {
    console.error('Error en GET /api/v1/entidad/[token]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
