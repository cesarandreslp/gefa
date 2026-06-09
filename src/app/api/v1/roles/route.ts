import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';

// GET - Obtener todos los roles
export async function GET(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const roles = await db.role.findMany({
      where: {
        tenantId: auth.user.tenantId,
        isActive: true,
        // Excluir rol de IA que no se debe asignar manualmente
        code: {
          notIn: ['ASIGNACION_DE_CASOS']
        }
      },
      orderBy: [
        { level: 'desc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.error('Error obteniendo roles:', error);
    return NextResponse.json(
      { error: 'Error al obtener los roles' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo rol
export async function POST(request: NextRequest) {
  try {
    const auth = await protectAPIRoute(request);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = auth.db;
    const body = await request.json();
    const { code, name, description, level } = body;

    // Validar que el código no exista DENTRO del tenant
    const existingRole = await db.role.findFirst({
      where: { code, tenantId: auth.user.tenantId }
    });

    if (existingRole) {
      return NextResponse.json(
        { error: 'Ya existe un rol con ese código' },
        { status: 400 }
      );
    }

    // Crear el rol
    const newRole = await db.role.create({
      data: {
        tenantId: auth.user.tenantId,
        code,
        name,
        description,
        level: level || 50,
        permissions: [],
        canApprove: false,
        canReassign: false,
        canSign: false,
        isActive: true
      }
    });

    return NextResponse.json(newRole, { status: 201 });
  } catch (error) {
    console.error('Error creando rol:', error);
    return NextResponse.json(
      { error: 'Error al crear el rol' },
      { status: 500 }
    );
  }
}
