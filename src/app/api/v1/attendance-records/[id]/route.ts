import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';

// PATCH /api/v1/attendance-records/[id]
// Updates an existing record
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(req);
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const db = auth.db;
    const id = params.id;
    const updates = await req.json();

    const updatedRecord = await db.attendanceRecord.update({
      where: { id },
      data: updates
    });

    return NextResponse.json({ data: updatedRecord }, { status: 200 });
  } catch (error) {
    console.error(`Error updating attendance record ${params.id}:`, error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE /api/v1/attendance-records/[id]
// Deletes a record
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(req);
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const db = auth.db;
    const id = params.id;

    await db.attendanceRecord.delete({
      where: { id }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(`Error deleting attendance record ${params.id}:`, error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
