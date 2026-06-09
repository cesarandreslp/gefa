import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';

// PUT - Actualizar un rol
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
    const { id } = params;
    const body = await request.json();
    const { name, description, level } = body;

    // Verificar si el rol existe
    const existingRole = await db.role.findUnique({
      where: { id }
    });

    if (!existingRole) {
      return NextResponse.json(
        { error: 'Rol no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar el rol (el código no se puede cambiar)
    const updatedRole = await db.role.update({
      where: { id },
      data: {
        name,
        description,
        level
      }
    });

    return NextResponse.json(updatedRole);
  } catch (error) {
    console.error('Error actualizando rol:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el rol' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un rol
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
    const { id } = params;

    // Verificar si hay usuarios con este rol
    const usersCount = await db.user.count({
      where: { roleId: id }
    });

    if (usersCount > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar el rol porque tiene ${usersCount} usuario(s) asignado(s)` },
        { status: 400 }
      );
    }

    // Eliminar el rol
    await db.role.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Rol eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando rol:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el rol' },
      { status: 500 }
    );
  }
}
