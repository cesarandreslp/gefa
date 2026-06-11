/**
 * Firma del usuario (firma electrónica Ley 527/1999).
 *  - POST: sube/actualiza la imagen PNG de la firma (alta de usuario con rol firmante).
 *  - GET:  metadata de la firma activa (no expone más de lo necesario).
 *
 * Solo ADMIN/DIRECTOR (que administran el personal) o el propio dueño de la firma.
 * La firma es dato sensible: se restringe a roles habilitados a firmar
 * (comisario + jurídica/psicología/trabajo social).
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { protectAPIRoute } from '@/lib/auth';
import { blobStorageService } from '@/services/BlobStorageService';
import { auditService } from '@/services/AuditService';
import { getClientIp, getUserAgent } from '@/lib/validation';
import { canUserSign } from '@/lib/documentsApi';

export const dynamic = 'force-dynamic';

const MANAGE_ROLES = ['ADMIN', 'DIRECTOR'];

// GET /api/v1/users/[id]/signature
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const isOwner = auth.user.userId === params.id;
    if (!isOwner && !MANAGE_ROLES.includes(auth.user.roleCode)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    const db = auth.db;
    const sig = await db.userSignature.findFirst({
      where: { userId: params.id, tenantId: auth.user.tenantId, isActive: true },
      select: { id: true, type: true, blobUrl: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ signature: sig });
  } catch (error) {
    console.error('Error obteniendo firma:', error);
    return NextResponse.json({ error: 'Error al obtener la firma' }, { status: 500 });
  }
}

// POST /api/v1/users/[id]/signature
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const isOwner = auth.user.userId === params.id;
    if (!isOwner && !MANAGE_ROLES.includes(auth.user.roleCode)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    const db = auth.db;

    // El usuario debe existir en el tenant y tener perfil habilitado para firmar.
    const target = await db.user.findFirst({
      where: { id: params.id, tenantId: auth.user.tenantId },
      select: { id: true, fullName: true, profesion: true, role: { select: { code: true } } },
    });
    if (!target) {
      return NextResponse.json({ error: 'El usuario no existe en la entidad' }, { status: 404 });
    }
    if (!canUserSign(target.role?.code ?? '', target.profesion)) {
      return NextResponse.json(
        { error: 'Este usuario no tiene un rol/profesión habilitado para firmar (comisario, jurídica, psicología o trabajo social).' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Imagen de firma requerida' }, { status: 400 });
    }
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      return NextResponse.json({ error: 'La firma debe ser una imagen PNG o JPG' }, { status: 400 });
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen de firma no debe superar 2 MB' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const fileHash = crypto.createHash('sha256').update(bytes).digest('hex');

    const upload = await blobStorageService.uploadFile({ file, folder: 'firmas' });
    if (!upload.success || !upload.url) {
      return NextResponse.json({ error: upload.error || 'Error al subir la firma' }, { status: 400 });
    }

    // Una sola firma activa por usuario: desactivar las anteriores.
    await db.userSignature.updateMany({
      where: { userId: target.id, tenantId: auth.user.tenantId, isActive: true },
      data: { isActive: false },
    });

    const sig = await db.userSignature.create({
      data: {
        tenantId: auth.user.tenantId,
        userId: target.id,
        type: 'IMAGEN',
        blobUrl: upload.url,
        fileHash,
        isActive: true,
      },
      select: { id: true, type: true, blobUrl: true, createdAt: true },
    });

    await auditService.log({
      action: 'USER_SIGNATURE_UPLOADED',
      userId: auth.user.userId,
      userEmail: auth.user.email,
      userRole: auth.user.roleCode,
      tenantId: auth.user.tenantId || null,
      entityType: 'UserSignature',
      entityId: sig.id,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { targetUserId: target.id, fileHash },
    });

    return NextResponse.json({ signature: sig }, { status: 201 });
  } catch (error) {
    console.error('Error subiendo firma:', error);
    return NextResponse.json({ error: 'Error al subir la firma' }, { status: 500 });
  }
}
