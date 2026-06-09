import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/v1/attendance-records
// Returns all attendance records
export async function GET(req: NextRequest) {
  try {
    const auth = await protectAPIRoute(req);
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const db = auth.db;
    const records = await db.attendanceRecord.findMany({
      where: {
        tenantId: auth.user.tenantId
      },
      orderBy: {
        createdAt: 'asc' // Maintain chronological order of creation
      }
    });

    return NextResponse.json({ data: records }, { status: 200 });
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST /api/v1/attendance-records
// Creates a new empty or partially filled attendance record
export async function POST(req: NextRequest) {
  try {
    const auth = await protectAPIRoute(req);
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const db = auth.db;
    const body = await req.json();

    const newRecord = await db.attendanceRecord.create({
      data: {
        ...body,
        tenantId: auth.user.tenantId,
        createdBy: auth.user.userId
      }
    });

    return NextResponse.json({ data: newRecord }, { status: 201 });
  } catch (error) {
    console.error('Error creating attendance record:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
