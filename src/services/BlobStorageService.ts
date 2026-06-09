/**
 * Servicio de almacenamiento de archivos con Vercel Blob Storage
 * 
 * Maneja la subida, descarga y eliminación de archivos en Vercel Blob
 * Soporte para múltiples tipos de archivos (PDF, Word, Imágenes)
 */

import { put, del } from '@vercel/blob';

interface UploadFileParams {
  file: File;
  folder?: string; // Organización por carpetas: 'casos', 'evidencias', etc.
  caseId?: string;
}

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  metadata?: {
    filename: string;
    size: number;
    contentType: string;
    uploadedAt: Date;
  };
}

export class BlobStorageService {
  private readonly MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
  private readonly ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'audio/mpeg',
    'audio/mp3',
    'video/mp4',
  ];
  /**
   * Sube un archivo a Vercel Blob Storage
   */
  async uploadFile({ file, folder = 'general', caseId }: UploadFileParams): Promise<UploadResult> {
    try {
      // Validar tamaño
      if (file.size > this.MAX_FILE_SIZE) {
        return {
          success: false,
          error: `El archivo excede el tamaño máximo de ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
        };
      }

      // Validar tipo
      if (!this.ALLOWED_TYPES.includes(file.type)) {
        return {
          success: false,
          error: 'Tipo de archivo no permitido. Solo PDF, Word (doc/docx), imágenes (jpg/png), audio (mp3) y video (mp4)',
        };
      }

      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const blobPath = caseId 
        ? `${folder}/${caseId}/${timestamp}_${sanitizedName}`
        : `${folder}/${timestamp}_${sanitizedName}`;

      // Subir a Vercel Blob
      const blob = await put(blobPath, file, {
        access: 'public',
        addRandomSuffix: false,
      });

      return {
        success: true,
        url: blob.url,
        metadata: {
          filename: file.name,
          size: file.size,
          contentType: file.type,
          uploadedAt: new Date(),
        },
      };
    } catch (error) {
      console.error('Error uploading file to Vercel Blob:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al subir archivo',
      };
    }
  }

  /**
   * Elimina un archivo de Vercel Blob Storage
   */
  async deleteFile(url: string): Promise<{ success: boolean; error?: string }> {
    try {
      await del(url);
      return { success: true };
    } catch (error) {
      console.error('Error deleting file from Vercel Blob:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al eliminar archivo',
      };
    }
  }

  /**
   * Lista archivos de una carpeta específica
   */
  /**
   * Lista archivos (no implementado para local storage)
   */
  async listFiles(): Promise<{ success: boolean; files?: unknown[]; error?: string }> {
    return {
      success: true,
      files: [],
    };
  }

  /**
   * Valida que un archivo cumpla con los requisitos
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `El archivo excede el tamaño máximo de ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      };
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'Tipo de archivo no permitido',
      };
    }

    return { valid: true };
  }
}

// Exportar instancia singleton
export const blobStorageService = new BlobStorageService();
