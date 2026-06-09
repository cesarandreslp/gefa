import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const auth = await protectAPIRoute(request);
        if (!auth.authorized) return auth.response;
        const db = auth.db;
        
        // Ensure the user has permission to delete options
        const allowedRoles = ['ADMIN', 'DIRECTOR', 'AUXILIAR_ATENCION_USUARIO', 'VENTANILLA_UNICA'];
        if (!allowedRoles.includes(auth.user!.roleCode)) {
            return NextResponse.json({ success: false, message: 'No permissions' }, { status: 403 });
        }

        const id = params.id;
        
        // Ensure Option exists
        const opt = await db.dropdownOption.findUnique({ where: { id } });
        if (!opt) return NextResponse.json({ success: false, message: 'Opción no encontrada' }, { status: 404 });

        await db.dropdownOption.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'Opción eliminada' });
    } catch (error) {
        console.error('Error deleting dropdown option:', error);
        return NextResponse.json({ success: false, message: 'Server error deleting option' }, { status: 500 });
    }
}
