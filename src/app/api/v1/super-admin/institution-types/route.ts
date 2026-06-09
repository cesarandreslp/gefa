import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/v1/super-admin/institution-types
 * Retorna los tipos de institución disponibles
 */
export async function GET() {
  try {
    const types = await prisma.institutionType.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        primaryColor: true,
        secondaryColor: true,
      }
    });

    return NextResponse.json({ success: true, data: types });
  } catch (error) {
    console.error('Error obteniendo tipos de institución:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
