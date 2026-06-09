/**
 * API Endpoint para subir archivos a Vercel Blob Storage
 * POST /api/v1/upload
 * 
 * Acepta multipart/form-data con:
 * - file: archivo a subir
 * - folder: carpeta destino (opcional)
 * - caseId: ID del caso asociado (opcional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { blobStorageService } from '@/services/BlobStorageService';
import { protectAPIRoute } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Autenticar usuario (opcional: podrías permitir subidas públicas para ciudadanos)
    const auth = await protectAPIRoute(request);
    if (!auth.authorized) {
      // Para el formulario público, permitir sin autenticación
      // Descomentar la siguiente línea si quieres requerir autenticación:
      // return auth.response;
    }

    // Obtener FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'casos';
    const caseId = formData.get('caseId') as string | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se proporcionó ningún archivo',
        },
        { status: 400 }
      );
    }

    // Validar archivo
    const validation = blobStorageService.validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
        },
        { status: 400 }
      );
    }

    // Subir archivo
    const result = await blobStorageService.uploadFile({
      file,
      folder,
      caseId: caseId || undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          url: result.url,
          metadata: result.metadata,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in upload endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al procesar la subida del archivo',
      },
      { status: 500 }
    );
  }
}

// Next.js 14 App Router maneja la configuración de otra manera.
// Se elimina export const config = { api: { bodyParser: false } };
// ya que en App Router (app/api/...) el formData() se lee directamente del request
// sin necesidad de deshabilitar el bodyParser globalmente.
