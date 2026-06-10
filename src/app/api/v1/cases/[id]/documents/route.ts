/**
 * /api/v1/cases/[id]/documents - Gestión de documentos de un caso
 * 
 * FASE 2: Subida y listado de documentos
 * 
 * Endpoints:
 * - POST: Sube un documento al caso (requiere autenticación)
 * - GET: Lista documentos del caso
 * 
 * Protección: Solo ADMIN y FUNCIONARIO pueden subir documentos
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAPIRoute } from '@/lib/auth';
import { documentService } from '@/services/DocumentService';
import { FAMILY_CONFIDENTIAL_ROLES } from '@/lib/familyApi';
import { DocumentType } from '@prisma/client';

/**
 * POST /api/v1/cases/[id]/documents
 * Sube un documento a un caso
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Proteger ruta (solo roles internos habilitados)
  const authResult = await protectAPIRoute(req, ['ADMIN', 'FUNCIONARIO', 'VENTANILLA_UNICA', 'DIRECTOR']);
  if (!authResult.authorized || !authResult.user) {
    return authResult.response || NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  try {
    const db = authResult.db;
    const { user } = authResult;
    const caseId = params.id;

    // Verificar que el caso existe
    const caseExists = await db.case.findUnique({
      where: { id: caseId },
      select: { id: true, filingNumber: true },
    });

    if (!caseExists) {
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
    const isInternal = formData.get('isInternal') === 'true';
    const isConfidential = formData.get('isConfidential') === 'true';
    const aportanteId = (formData.get('aportanteId') as string | null) || null;

    if (!file) {
      return NextResponse.json(
        { error: 'Archivo requerido' },
        { status: 400 }
      );
    }

    if (!documentType) {
      return NextResponse.json(
        { error: 'Tipo de documento requerido' },
        { status: 400 }
      );
    }

    // Si se indica aportante (acervo probatorio), debe ser una parte de ESTE caso.
    if (aportanteId) {
      const party = await db.caseParty.findFirst({
        where: { id: aportanteId, caseId, tenantId: user.tenantId },
        select: { id: true },
      });
      if (!party) {
        return NextResponse.json(
          { error: 'El aportante indicado no es una parte de este caso' },
          { status: 400 }
        );
      }
    }

    // Subir documento
    const result = await documentService.uploadDocument({
      file,
      caseId,
      tenantId: user.tenantId,
      userId: user.userId,
      userEmail: user.email,
      userRole: user.roleCode,
      documentType,
      description,
      isInternal,
      isConfidential,
      aportanteId,
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
        message: 'Documento subido exitosamente',
        document: result.document,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error en POST /api/v1/cases/[id]/documents:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/cases/[id]/documents
 * Lista documentos de un caso
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Proteger ruta (solo roles internos habilitados)
  const authResult = await protectAPIRoute(req, ['ADMIN', 'FUNCIONARIO', 'VENTANILLA_UNICA', 'DIRECTOR']);
  if (!authResult.authorized || !authResult.user) {
    return authResult.response || NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  try {
    const db = authResult.db;
    const caseId = params.id;

    // Verificar que el caso existe
    const caseExists = await db.case.findUnique({
      where: { id: caseId },
      select: { id: true, filingNumber: true },
    });

    if (!caseExists) {
      return NextResponse.json(
        { error: 'Caso no encontrado' },
        { status: 404 }
      );
    }

    // Listar documentos del expediente con aportante (acervo probatorio) y valorador.
    const docs = await db.document.findMany({
      where: { caseId },
      include: {
        aportante: { include: { person: { select: { firstName: true, firstLastName: true } } } },
        valoradaPor: { select: { id: true, fullName: true } },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    // Las pruebas confidenciales (lesiones, NNA) solo las ve el equipo habilitado;
    // ventanilla/Secretaría no. El resto de documentos sí es visible.
    const visible = FAMILY_CONFIDENTIAL_ROLES.includes(authResult.user.roleCode)
      ? docs
      : docs.filter((d) => !d.isConfidential);

    return NextResponse.json({ documents: visible });
  } catch (error) {
    console.error('Error en GET /api/v1/cases/[id]/documents:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
