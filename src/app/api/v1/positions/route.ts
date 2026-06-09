import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';

// GET - Obtener todos los cargos (posiciones)
export async function GET(request: NextRequest) {
    try {
        const auth = await protectAPIRoute(request);
        if (!auth.authorized || !auth.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const db = auth.db;
        const positions = await db.position.findMany({
            where: {
                tenantId: auth.user.tenantId,
                isActive: true
            },
            orderBy: [
                { roleCode: 'asc' },
                { name: 'asc' }
            ]
        });

        return NextResponse.json(positions);
    } catch (error) {
        console.error('Error obteniendo cargos:', error);
        return NextResponse.json(
            { error: 'Error al obtener los cargos' },
            { status: 500 }
        );
    }
}

// POST - Crear un nuevo cargo
export async function POST(request: NextRequest) {
    try {
        const auth = await protectAPIRoute(request);
        if (!auth.authorized || !auth.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const db = auth.db;
        const body = await request.json();
        const { name, roleCode, description } = body;

        if (!name || !roleCode) {
            return NextResponse.json(
                { error: 'El nombre y el tipo de rol son requeridos' },
                { status: 400 }
            );
        }

        // Validar que el nombre no exista en el tenant actual
        const existingPosition = await db.position.findFirst({
            where: {
                name,
                tenantId: auth.user.tenantId
            }
        });

        if (existingPosition) {
            return NextResponse.json(
                { error: 'Ya existe un cargo con ese nombre en tu entidad' },
                { status: 400 }
            );
        }

        // Crear el cargo para este tenant específicamente
        const newPosition = await db.position.create({
            data: {
                name,
                roleCode,
                description: description?.trim() || null,
                tenantId: auth.user.tenantId,
                isActive: true
            }
        });

        return NextResponse.json(newPosition, { status: 201 });
    } catch (error) {
        console.error('Error creando cargo:', error);
        return NextResponse.json(
            { error: 'Error al crear el cargo' },
            { status: 500 }
        );
    }
}
