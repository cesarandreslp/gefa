/**
 * /api/v1/documents/upload-public - Endpoint público para subida de documentos
 * 
 * Este endpoint NO requiere autenticación
 * Usado por ciudadanos al radicar casos
 */

import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '@/services/DocumentService';
import { getTenantFromRequest } from '@/lib/tenantResolver';
import { getTenantPrisma } from '@/lib/tenantDb';
import { prisma as mainPrisma } from '@/lib/prisma';
import { DocumentType } from '@prisma/client';
import { applyRateLimit } from '@/lib/rateLimit';

// Extensiones de archivo permitidas
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.xls', '.xlsx', '.mp3', '.mp4'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png', 'image/gif',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'audio/mpeg',
  'audio/mp3',
  'video/mp4',
];

/**
 * POST /api/v1/documents/upload-public
 * Sube un documento público (sin autenticación)
 */
export async function POST(req: NextRequest) {
  const tenant = await getTenantFromRequest(req);
  const dbUrl = (tenant as any)?.databaseUrl as string | undefined;
  let db = dbUrl ? getTenantPrisma(dbUrl) : mainPrisma;
  try {
    // Rate limiting: 10 subidas por IP cada 15 minutos
    const rateLimitResult = applyRateLimit(req, {
      maxRequests: 10,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    const formData = await req.formData();
    const caseId = formData.get('caseId') as string;
    const file = formData.get('file') as File | null;
    const documentType = formData.get('documentType') as DocumentType;
    const description = formData.get('description') as string | undefined;
    const filingNumber = formData.get('filingNumber') as string | null;

    // Fallback: si no se resolvió el tenant por dominio, inferirlo desde la sigla del radicado
    if (!tenant && filingNumber) {
      const siglaMatch = filingNumber.trim().toUpperCase().match(/^([A-Z]+)-/);
      if (siglaMatch) {
        const tenantBySigla = await mainPrisma.tenant.findFirst({
          where: { sigla: { equals: siglaMatch[1], mode: 'insensitive' } },
          select: { databaseUrl: true },
        }) as { databaseUrl?: string } | null;
        if (tenantBySigla?.databaseUrl) {
          db = getTenantPrisma(tenantBySigla.databaseUrl);
        }
      }
    }

    if (!caseId) {
      return NextResponse.json(
        { error: 'caseId es requerido' },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: 'Archivo es requerido' },
        { status: 400 }
      );
    }

    // Validar extensión del archivo
    const fileName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
    if (!hasValidExtension) {
      return NextResponse.json(
        { error: `Tipo de archivo no permitido. Extensiones válidas: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validar MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'El tipo MIME del archivo no está permitido' },
        { status: 400 }
      );
    }

    // Verificar que el caso existe y obtener citizenId
    const caseExists = await db.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        filingNumber: true,
        tenantId: true,
        citizenId: true,
        citizen: {
          select: {
            id: true,
            firstName: true,
            firstLastName: true,
          }
        }
      },
    });

    if (!caseExists) {
      return NextResponse.json(
        { error: 'Caso no encontrado' },
        { status: 404 }
      );
    }

    // Validar tipo de documento (solo PETITION o SUPPORTING_DOC)
    if (documentType !== 'PETITION' && documentType !== 'SUPPORTING_DOC') {
      return NextResponse.json(
        { error: 'Tipo de documento no permitido. Solo PETITION o SUPPORTING_DOC' },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 25MB)
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'El archivo excede el tamaño máximo de 25MB' },
        { status: 400 }
      );
    }

    // Subir documento
    console.log(`[upload-public] Subiendo doc: caseId=${caseId} tenantId=${caseExists.tenantId} citizenId=${caseExists.citizenId} tipo=${documentType} usandoTenantDB=${!!dbUrl}`);
    const result = await documentService.uploadDocument({
      caseId,
      file,
      documentType,
      tenantId: caseExists.tenantId,
      userId: caseExists.citizenId,
      userEmail: caseExists.citizen.firstName + ' ' + caseExists.citizen.firstLastName,
      userRole: 'CITIZEN',
      description: description || `Documento adjunto por ${caseExists.citizen.firstName} ${caseExists.citizen.firstLastName}`,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      db,
    });

    console.log(`[upload-public] Resultado: success=${result.success} docId=${result.document?.id} error=${result.error}`);

    if (!result.success || !result.document) {
      return NextResponse.json(
        { error: result.error || 'Error al subir documento' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: result.document.id,
        fileName: result.document.fileName,
        fileUrl: result.document.fileUrl,
        fileSize: result.document.fileSize,
      },
      message: 'Documento subido exitosamente',
    });

  } catch (error) {
    console.error('❌ Error uploading public document:', error);
    return NextResponse.json(
      {
        error: 'Error al subir documento. Intente de nuevo.',
      },
      { status: 500 }
    );
  }
}
