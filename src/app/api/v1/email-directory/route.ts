import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';

/**
 * GET /api/v1/email-directory
 * Returns all active emails in the directory
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await protectAPIRoute(request);
    if (!authResult.authorized) {
      return authResult.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = authResult.db;
    const emails = await db.emailDirectory.findMany({
      where: { isActive: true },
      orderBy: { email: 'asc' },
      select: { id: true, email: true, label: true }
    });

    return NextResponse.json({ success: true, emails });
  } catch (error) {
    console.error('Error fetching email directory:', error);
    return NextResponse.json({ error: 'Error al obtener directorio de correos' }, { status: 500 });
  }
}

/**
 * POST /api/v1/email-directory
 * Add a new email to the directory
 * Body: { email: string, label?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await protectAPIRoute(request);
    if (!authResult.authorized) {
      return authResult.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = authResult.db;
    const body = await request.json();
    const { email, label } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'El correo es requerido' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: 'Formato de correo inválido' }, { status: 400 });
    }

    // Check if email already exists (including inactive)
    const existing = await db.emailDirectory.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (existing) {
      // If it was inactive, reactivate it
      if (!existing.isActive) {
        const updated = await db.emailDirectory.update({
          where: { id: existing.id },
          data: { isActive: true, label: label || existing.label }
        });
        return NextResponse.json({ success: true, email: updated, reactivated: true });
      }
      return NextResponse.json({ error: 'Este correo ya existe en el directorio' }, { status: 409 });
    }

    const newEmail = await db.emailDirectory.create({
      data: {
        email: email.trim().toLowerCase(),
        label: label?.trim() || null
      }
    });

    return NextResponse.json({ success: true, email: newEmail });
  } catch (error) {
    console.error('Error creating email directory entry:', error);
    return NextResponse.json({ error: 'Error al guardar correo' }, { status: 500 });
  }
}

/**
 * PUT /api/v1/email-directory
 * Update an existing email in the directory
 * Body: { id: string, email: string, label?: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await protectAPIRoute(request);
    if (!authResult.authorized) {
      return authResult.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = authResult.db;
    const body = await request.json();
    const { id, email, label } = body;

    if (!id || !email || !email.trim()) {
      return NextResponse.json({ error: 'ID y correo son requeridos' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: 'Formato de correo inválido' }, { status: 400 });
    }

    // Check if the new email already exists under a different ID
    const conflict = await db.emailDirectory.findFirst({
      where: { email: email.trim().toLowerCase(), id: { not: id } }
    });

    if (conflict) {
      return NextResponse.json({ error: 'Este correo ya existe en el directorio' }, { status: 409 });
    }

    const updated = await db.emailDirectory.update({
      where: { id },
      data: {
        email: email.trim().toLowerCase(),
        label: label?.trim() || null
      }
    });

    return NextResponse.json({ success: true, email: updated });
  } catch (error) {
    console.error('Error updating email directory entry:', error);
    return NextResponse.json({ error: 'Error al actualizar correo' }, { status: 500 });
  }
}
