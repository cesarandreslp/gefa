import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await protectAPIRoute(request);
  if (!authResult.authorized || !authResult.user) {
    return authResult.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const db = authResult.db;
  const { id } = params;
  const body = await request.json();
  const { isInternal } = body;

  if (typeof isInternal !== 'boolean') {
    return NextResponse.json({ error: 'isInternal debe ser booleano' }, { status: 400 });
  }

  try {
    const doc = await db.document.update({
      where: { id },
      data: { isInternal },
      select: { id: true, isInternal: true },
    });
    return NextResponse.json({ success: true, isInternal: doc.isInternal });
  } catch {
    return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
  }
}
