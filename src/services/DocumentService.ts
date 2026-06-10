/**
 * DocumentService - Gestión documental con Vercel Blob Storage
 * 
 * FASE 2: Almacenamiento externo de documentos
 * 
 * Funcionalidades:
 * - Subida de archivos a Vercel Blob
 * - Validación de tipo y tamaño
 * - Metadata persistida en BD
 * - Asociación con Case
 * - Auditoría de uploads
 * 
 * Tipos permitidos: PDF, DOCX, JPG, PNG
 * Tamaño máximo: 25 MB
 */

import { prisma } from '@/lib/prisma';
import { auditService } from './AuditService';
import { blobStorageService } from './BlobStorageService';
import { DocumentType, PrismaClient } from '@prisma/client';

// Tipos de archivo permitidos
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'image/jpeg',
  'image/png',
  'audio/mpeg',
  'audio/mp3',
  'video/mp4',
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export interface UploadDocumentInput {
  file: File;
  caseId: string;
  tenantId: string;
  userId: string | null; // null para ciudadanos (no tienen cuenta de usuario)
  userEmail: string;
  userRole: string;
  documentType: DocumentType;
  description?: string;
  isInternal?: boolean;
  isConfidential?: boolean;     // contenido sensible (lesiones, NNA): acceso restringido
  aportanteId?: string | null;  // CaseParty que aporta la prueba (acervo probatorio)
  ipAddress: string;
  userAgent: string;
  db?: PrismaClient;
}

export class DocumentService {
  /**
   * Valida tipo y tamaño de archivo
   */
  private validateFile(file: File): { valid: boolean; error?: string } {
    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `Archivo muy grande. Máximo ${MAX_FILE_SIZE / 1024 / 1024} MB`,
      };
    }

    // Validar tipo
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'Tipo de archivo no permitido. Solo PDF, DOCX, JPG, PNG, MP3 o MP4',
      };
    }

    return { valid: true };
  }

  /**
   * Sube un documento a Vercel Blob y guarda metadata en BD
   */
  async uploadDocument(input: UploadDocumentInput): Promise<{
    success: boolean;
    document?: {
      id: string;
      fileName: string;
      fileUrl: string;
      fileSize: number;
    };
    error?: string;
  }> {
    try {
      // 1. Validar archivo
      const validation = this.validateFile(input.file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      const db = input.db || prisma;
      console.log(`[DocumentService] uploadDocument: caseId=${input.caseId} tenantId=${input.tenantId} usandoDbCustom=${!!input.db}`);

      // 2. Generar nombre único y subir a local storage
      const uploadResult = await blobStorageService.uploadFile({
        file: input.file,
        folder: 'casos',
        caseId: input.caseId
      });

      if (!uploadResult.success || !uploadResult.url) {
        return {
          success: false,
          error: uploadResult.error || 'Error al subir el archivo',
        };
      }

      console.log(`[DocumentService] blob OK url=${uploadResult.url?.substring(0, 60)} — guardando en BD...`);
      // 4. Guardar metadata en BD
      const document = await db.document.create({
        data: {
          tenantId: input.tenantId,
          caseId: input.caseId,
          fileName: uploadResult.metadata!.filename,
          originalName: input.file.name,
          mimeType: input.file.type,
          fileSize: input.file.size,
          fileUrl: uploadResult.url,
          fileHash: '',
          documentType: input.documentType,
          description: input.description,
          isInternal: input.isInternal ?? false,
          isConfidential: input.isConfidential ?? false,
          aportanteId: input.aportanteId ?? null,
          // Una evidencia aportada nace PENDIENTE de valoración por el Comisario.
          evidenceStatus: input.documentType === 'EVIDENCE' ? 'PENDIENTE' : null,
          uploadedBy: input.userId!,
          uploadedByType: input.userRole === 'CITIZEN' ? 'CITIZEN' : 'USER',
          uploadedAt: new Date(),
        },
      });

      console.log(`[DocumentService] documento creado en BD: id=${document.id} caseId=${document.caseId} tipo=${document.documentType}`);
      // 5. Registrar en auditoría (null userId para ciudadanos — no son usuarios del sistema)
      await auditService.logDocumentUploaded(
        document.id,
        input.userRole === 'CITIZEN' ? null : input.userId,
        input.userEmail,
        input.userRole,
        input.tenantId,
        input.caseId,
        input.ipAddress,
        input.userAgent,
        {
          fileName: input.file.name,
          fileSize: input.file.size,
          mimeType: input.file.type,
          documentType: input.documentType,
        }
      );

      return {
        success: true,
        document: {
          id: document.id,
          fileName: document.fileName,
          fileUrl: document.fileUrl,
          fileSize: document.fileSize,
        },
      };
    } catch (error) {
      console.error('Error al subir documento:', error);
      return {
        success: false,
        error: 'Error al subir documento',
      };
    }
  }

  /**
   * Obtiene un documento por ID
   */
  async getDocument(documentId: string) {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          case: {
            select: {
              id: true,
              filingNumber: true,
            },
          },
        },
      });

      if (!document) {
        return {
          success: false,
          error: 'Documento no encontrado',
        };
      }

      return {
        success: true,
        document,
      };
    } catch (error) {
      console.error('Error al obtener documento:', error);
      return {
        success: false,
        error: 'Error al obtener documento',
      };
    }
  }

  /**
   * Lista documentos de un caso
   */
  async listDocumentsByCase(caseId: string) {
    try {
      const documents = await prisma.document.findMany({
        where: { caseId },
        orderBy: { uploadedAt: 'desc' },
      });

      return {
        success: true,
        documents,
      };
    } catch (error) {
      console.error('Error al listar documentos:', error);
      return {
        success: false,
        error: 'Error al listar documentos',
        documents: [],
      };
    }
  }

  /**
   * Elimina un documento (soft delete)
   */
  async deleteDocument(
    documentId: string,
    userId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // 1. Obtener documento
      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        return {
          success: false,
          error: 'Documento no encontrado',
        };
      }

      // 2. Eliminar de Vercel Blob
      await blobStorageService.deleteFile(document.fileUrl);

      // 3. Eliminar registro de BD
      await prisma.document.delete({
        where: { id: documentId },
      });

      // 4. Auditoría
      await auditService.log({
        action: 'DOCUMENT_DELETED',
        userId,
        userEmail: '',
        userRole: '',
        tenantId: document.tenantId || '',
        entityType: 'Document',
        entityId: documentId,
        ipAddress,
        userAgent,
        metadata: {
          caseId: document.caseId,
          fileName: document.fileName,
        },
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error al eliminar documento:', error);
      return {
        success: false,
        error: 'Error al eliminar documento',
      };
    }
  }
}

// Singleton
export const documentService = new DocumentService();
