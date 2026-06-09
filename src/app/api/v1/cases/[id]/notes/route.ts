import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { protectAPIRoute } from '@/lib/auth';
import { getClientIp, getUserAgent } from '@/lib/validation';

// Schema Validation
const createNoteSchema = z.object({
    content: z.string().min(1, 'El contenido de la nota es requerido').max(2000, 'La nota no puede exceder 2000 caracteres'),
});

/**
 * POST /api/v1/cases/[id]/notes
 * Crea una nueva nota interna para un caso.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // 1. Check Authentication & Authorization
        const auth = await protectAPIRoute(request, ['DIRECTOR', 'ADMIN', 'FUNCIONARIO']);
        if (!auth.authorized || !auth.user) {
            return auth.response!;
        }

        const db = auth.db;
        const caseId = params.id;

        // 2. Validate request body
        const body = await request.json();
        const validationResult = createNoteSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Datos inválidos',
                        details: validationResult.error.errors,
                    },
                },
                { status: 400 }
            );
        }

        const { content } = validationResult.data;

        // 3. Verify case exists
        const caseExists = await db.case.findUnique({
            where: { id: caseId },
            select: { id: true }
        });

        if (!caseExists) {
            return NextResponse.json(
                { success: false, error: { message: 'Caso no encontrado' } },
                { status: 404 }
            );
        }

        // 4. Create the note as an ActionLog mapping to 'INTERNAL_NOTE'
        const ipAddress = getClientIp(request.headers);
        const userAgent = getUserAgent(request.headers);

        // Generate simple checksum to satisfy db constraint
        const checksumStr = JSON.stringify({
            action: 'INTERNAL_NOTE',
            caseId,
            timestamp: new Date().toISOString()
        });
        const checksum = Buffer.from(checksumStr).toString('base64').substring(0, 64);

        // Obtener datos del caso y funcionario asignado para la notificación
        const caseWithAssignment = await db.case.findUnique({
            where: { id: caseId },
            select: {
                filingNumber: true,
                tenantId: true,
                metadata: true,
                assignments: {
                    where: {
                        status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
                        user: { role: { level: 85 } }, // Solo FUNCIONARIO, no Director ni VU
                    },
                    include: {
                        user: { select: { id: true, fullName: true, email: true } }
                    },
                    orderBy: { assignedAt: 'desc' },
                    take: 1,
                }
            }
        });

        const actionLog = await db.actionLog.create({
            data: {
                userId: auth.user.userId,
                userEmail: auth.user.email,
                userRole: auth.user.roleCode,
                action: 'INTERNAL_NOTE',
                entityType: 'Case',
                entityId: caseId,
                caseId: caseId,
                ipAddress,
                userAgent,
                metadata: {
                    content,
                    authorName: auth.user.email,
                    isPrivate: true
                },
                checksum
            }
        });

        // Resetear flag de "notas leídas" para que el badge vuelva a aparecer
        const currentMeta = (caseWithAssignment?.metadata as Record<string, unknown>) || {};
        await db.case.update({
            where: { id: caseId },
            data: { metadata: { ...currentMeta, notasLeidas: false } }
        });

        // Notificar al funcionario asignado (no bloquea la respuesta si falla)
        const funcionario = caseWithAssignment?.assignments?.[0]?.user;
        if (funcionario && funcionario.email && caseWithAssignment) {
            const { NotificationHooks } = await import('@/services/NotificationHooks');
            await NotificationHooks.onInternalNote({
                caseId,
                filingNumber: caseWithAssignment.filingNumber,
                authorName: auth.user.email,
                funcionarioId: funcionario.id,
                funcionarioName: funcionario.fullName || funcionario.email,
                funcionarioEmail: funcionario.email,
                tenantId: caseWithAssignment.tenantId!,
            });
        }

        return NextResponse.json(
            { success: true, data: { note: actionLog } },
            { status: 201 }
        );

    } catch (error) {
        console.error('Error creando nota interna:', error);
        return NextResponse.json(
            { success: false, error: { message: 'Error interno del servidor' } },
            { status: 500 }
        );
    }
}

/**
 * GET /api/v1/cases/[id]/notes
 * Obtiene todas las notas internas para un caso.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // 1. Check Authentication & Authorization
        const auth = await protectAPIRoute(request, ['DIRECTOR', 'ADMIN', 'FUNCIONARIO']);
        if (!auth.authorized || !auth.user) {
            return auth.response!;
        }

        const db = auth.db;
        const caseId = params.id;

        // 2. Fetch the notes (ActionLogs filtered by action)
        const notes = await db.actionLog.findMany({
            where: {
                caseId,
                action: 'INTERNAL_NOTE'
            },
            orderBy: {
                timestamp: 'desc'
            },
            select: {
                id: true,
                timestamp: true,
                userId: true,
                userEmail: true,
                userRole: true,
                metadata: true,
                user: {
                    select: {
                        fullName: true
                    }
                }
            }
        });

        // Formatting output to be easier for frontend
        const formattedNotes = notes.map(note => {
            // Extract content from metadata
            const meta = typeof note.metadata === 'object' && note.metadata !== null ? note.metadata as Record<string, string> : {} as Record<string, string>;

            return {
                id: note.id,
                timestamp: note.timestamp,
                content: meta.content || '',
                author: {
                    id: note.userId,
                    name: note.user?.fullName || meta.authorName || note.userEmail,
                    email: note.userEmail,
                    role: note.userRole
                }
            };
        });

        return NextResponse.json(
            { success: true, data: { notes: formattedNotes } },
            { status: 200 }
        );

    } catch (error) {
        console.error('Error obteniendo notas internas:', error);
        return NextResponse.json(
            { success: false, error: { message: 'Error interno del servidor' } },
            { status: 500 }
        );
    }
}
