import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const auth = await protectAPIRoute(request);
        if (!auth.authorized) return auth.response;
const db = auth.db;

        // Obtain all options and group them by category using Prisma
        const options = await db.dropdownOption.findMany({
            orderBy: [{ category: 'asc' }, { value: 'asc' }]
        });

        // Grouping
        const grouped: Record<string, string[]> = {};
        options.forEach((opt: { category: string; value: string }) => {
            if (!grouped[opt.category]) grouped[opt.category] = [];
            grouped[opt.category].push(opt.value);
        });

        return NextResponse.json({
            success: true,
            data: grouped,
            rawData: options // to easily get the ID for deletion on frontend
        });
    } catch (error) {
        console.error('Error fetching dropdowns:', error);
        return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await protectAPIRoute(request);
        if (!auth.authorized) return auth.response;
        const db = auth.db;
        
        // Ensure the user has permission to add options. Ventanilla Unica / Auxiliar or Admins
        const allowedRoles = ['ADMIN', 'DIRECTOR', 'AUXILIAR_ATENCION_USUARIO', 'VENTANILLA_UNICA'];
        if (!allowedRoles.includes(auth.user!.roleCode)) {
            return NextResponse.json({ success: false, message: 'No permissions' }, { status: 403 });
        }

        const body = await request.json();
        const { category, value } = body;

        if (!category || !value || typeof category !== 'string' || typeof value !== 'string') {
            return NextResponse.json({ success: false, message: 'Categoría y valor son requeridos' }, { status: 400 });
        }

        // Check for duplicates
        const existing = await db.dropdownOption.findUnique({
            where: {
                category_value: {
                    category: category.trim(),
                    value: value.trim()
                }
            }
        });

        if (existing) {
            return NextResponse.json({ success: false, message: 'La opción ya existe en esta categoría' }, { status: 400 });
        }

        const newOption = await db.dropdownOption.create({
            data: {
                category: category.trim(),
                value: value.trim()
            }
        });

        return NextResponse.json({ success: true, data: newOption }, { status: 201 });
    } catch (error) {
        console.error('Error adding dropdown option:', error);
        return NextResponse.json({ success: false, message: 'Server error adding option' }, { status: 500 });
    }
}
