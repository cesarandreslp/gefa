import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';

// PUT - Actualizar un cargo existente
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await protectAPIRoute(request);
        if (!auth.authorized || !auth.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const db = auth.db;
        const id = params.id;
        const body = await request.json();
        const { name, roleCode, isActive, description } = body;

        // Verificar si el cargo existe y pertenece al tenant
        const existingPosition = await db.position.findFirst({
            where: { id, tenantId: auth.user.tenantId }
        });

        if (!existingPosition) {
            return NextResponse.json(
                { error: 'Cargo no encontrado o no pertenece a tu entidad' },
                { status: 404 }
            );
        }

        // Si se está cambiando el nombre, verificar que no exista ya en EL MISMO TENANT
        if (name && name !== existingPosition.name) {
            const positionWithName = await db.position.findFirst({
                where: { 
                    name,
                    tenantId: auth.user.tenantId
                }
            });

            if (positionWithName) {
                return NextResponse.json(
                    { error: 'Ya existe un cargo con ese nombre en tu entidad' },
                    { status: 400 }
                );
            }
        }

        const newName = name !== undefined ? name : existingPosition.name;
        const newRoleCode = roleCode !== undefined ? roleCode : existingPosition.roleCode;

        // Actualizar el cargo y, si el nombre cambió, cascadear a todos los usuarios que lo tenían
        const [updatedPosition] = await db.$transaction([
            db.position.update({
                where: { id },
                data: {
                    name: newName,
                    roleCode: newRoleCode,
                    isActive: isActive !== undefined ? isActive : existingPosition.isActive,
                    ...(description !== undefined && { description: description?.trim() || null }),
                }
            }),
            // Sincronizar user.position con el nuevo nombre
            ...(name && name !== existingPosition.name ? [
                db.user.updateMany({
                    where: {
                        tenantId: auth.user.tenantId,
                        position: existingPosition.name,
                    },
                    data: { position: newName },
                })
            ] : []),
            // Si el roleCode cambió, actualizar también el roleId de los usuarios con ese cargo
            ...(newRoleCode !== existingPosition.roleCode ? [
                db.$executeRaw`
                    UPDATE users u
                    SET "roleId" = r.id
                    FROM roles r
                    WHERE u."tenantId" = ${auth.user.tenantId}
                      AND u.position = ${newName}
                      AND r.code = ${newRoleCode}
                      AND r."tenantId" = ${auth.user.tenantId}
                `
            ] : []),
        ]);

        return NextResponse.json(updatedPosition);
    } catch (error) {
        console.error('Error actualizando cargo:', error);
        return NextResponse.json(
            { error: 'Error al actualizar el cargo' },
            { status: 500 }
        );
    }
}

// DELETE - Eliminación lógica o física de cargo
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await protectAPIRoute(request);
        if (!auth.authorized || !auth.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const db = auth.db;
        const id = params.id;

        // Buscar la posición y asegurar que le pertenece al Tenant
        const position = await db.position.findFirst({
            where: { id, tenantId: auth.user.tenantId }
        });

        if (!position) {
            return NextResponse.json(
                { error: 'Cargo no encontrado o no autorizado' },
                { status: 404 }
            );
        }

        const usersWithPosition = await db.user.count({
            where: { position: position.name, tenantId: auth.user.tenantId }
        });

        if (usersWithPosition > 0) {
            return NextResponse.json(
                { error: 'No se puede eliminar porque hay usuarios con este cargo en la entidad' },
                { status: 400 }
            );
        }

        await db.position.delete({
            where: { id }
        });

        return NextResponse.json({ message: 'Cargo eliminado correctamente' });
    } catch (error) {
        console.error('Error eliminando cargo:', error);
        return NextResponse.json(
            { error: 'Error al eliminar el cargo' },
            { status: 500 }
        );
    }
}
