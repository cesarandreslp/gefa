/**
 * /api/v1/cases/[id]/documents/public - Subida de documentos por ciudadanos
 * 
 * POST: Permite a los ciudadanos subir documentos a sus propios casos
 * 
 * Protección:
 * - No requiere autenticación (público)
 * - Solo permite tipos PETITION y SUPPORTING_DOC
 * - Límite de tamaño de archivo
 * - Rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '@/services/DocumentService';
import { getTenantFromRequest } from '@/lib/tenantResolver';
import { getTenantPrisma } from '@/lib/tenantDb';
import { prisma as mainPrisma } from '@/lib/prisma';
import { DocumentType } from '@prisma/client';

/**
 * POST /api/v1/cases/[id]/documents/public
 * Sube un documento desde el formulario público del ciudadano
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const tenant = await getTenantFromRequest(req);
  const dbUrl = (tenant as any)?.databaseUrl as string | undefined;
  const db = dbUrl ? getTenantPrisma(dbUrl) : mainPrisma;
  try {
    const caseId = params.id;

    // Verificar que el caso existe
    const caseData = await db.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        filingNumber: true,
        tenantId: true,
        citizenId: true,
        citizen: {
          select: {
            id: true,
            email: true
          }
        }
      },
    });

    if (!caseData) {
      return NextResponse.json(
        { error: 'Caso no encontrado' },
        { status: 404 }
      );
    }

    // Obtener formData
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('documentType') as DocumentType;
    const description = formData.get('description') as string | undefined;

    if (!file) {
      return NextResponse.json(
        { error: 'Archivo requerido' },
        { status: 400 }
      );
    }

    // Validar que solo sean documentos permitidos para ciudadanos
    if (documentType !== 'PETITION' && documentType !== 'SUPPORTING_DOC') {
      return NextResponse.json(
        { error: 'Tipo de documento no permitido. Solo se permiten PETITION y SUPPORTING_DOC.' },
        { status: 400 }
      );
    }

    // Validar tamaño del archivo (máximo 25MB)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo no debe superar 25MB' },
        { status: 400 }
      );
    }

    // Subir documento
    const result = await documentService.uploadDocument({
      file,
      caseId,
      tenantId: caseData.tenantId,
      userId: caseData.citizenId,
      userEmail: caseData.citizen.email || 'sin-email@ciudadano.local',
      userRole: 'CIUDADANO',
      documentType,
      description: description || 'Documento adjunto por el ciudadano',
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      db,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Documento subido exitosamente',
        document: {
          id: result.document?.id,
          fileName: result.document?.fileName,
          fileSize: result.document?.fileSize
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error subiendo documento público:', error);
    return NextResponse.json(
      { error: 'Error al subir el documento' },
      { status: 500 }
    );
  }
}
