import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';

// POST /api/v1/attendance-records/bulk
// Inserts an array of existing localStorage records into the database
export async function POST(req: NextRequest) {
  try {
    const auth = await protectAPIRoute(req);
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const db = auth.db;
    const body = await req.json();
    const { records } = body;

    if (!Array.isArray(records)) {
      return NextResponse.json({ error: 'Formato inválido, se esperaba un array de records' }, { status: 400 });
    }

    // Filter out completely empty rows
    const validRecords = records.filter(row => Object.values(row).some(val => val && String(val).trim() !== ''));

    if (validRecords.length === 0) {
      return NextResponse.json({ success: true, count: 0 }, { status: 200 });
    }

    // Map localStorage JSON keys to Prisma model fields
    const mappedRecords = validRecords.map((row: Record<string, string>) => {
      return {
        tenantId: auth.user!.tenantId,
        fecha: row['FECHA'] || null,
        nombreCompleto: row['NOMBRE COMPLETO'] || null,
        tipoDocumento: row['TIPO DE DOCUMENTO'] || null,
        numeroDocumento: row['NÚMERO DE DOCUMENTO'] || null,
        edad: row['EDAD'] || null,
        telefono: row['TELÉFONO'] || null,
        genero: row['GÉNERO'] || null,
        discapacidad: row['DISCAPACIDAD'] || null,
        etnia: row['ETNIA'] || null,
        escolaridad: row['ESCOLARIDAD'] || null,
        barrio: row['BARRIO'] || null,
        dependencia: row['DEPENDENCIA'] || null,
        asunto: row['ASUNTO'] || null,
        descripcion: row['DESCRIPCIÓN'] || null,
        eps: row['EPS'] || null,
        responsableCaso: row['RESPONSABLE DEL CASO'] || null,
        createdBy: auth.user!.userId
      };
    });

    const result = await db.attendanceRecord.createMany({
      data: mappedRecords,
      skipDuplicates: true
    });

    return NextResponse.json({ success: true, count: result.count }, { status: 201 });
  } catch (error) {
    console.error('Error in bulk migration of attendance records:', error);
    return NextResponse.json({ error: 'Error interno del servidor durante la migración' }, { status: 500 });
  }
}
