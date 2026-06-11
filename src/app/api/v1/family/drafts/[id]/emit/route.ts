/**
 * Emisión del documento del despacho (Fase 3).
 * Arma el HTML final (encabezado Alcaldía + sede + cuerpo + firmas), genera PDF y
 * DOCX, estampa la(s) firma(s) electrónica(s) (imagen + SHA-256 + sello de tiempo),
 * sube ambos a blob y materializa un `Document` oficial del expediente con su traza.
 *
 * Runtime Node (Chromium) + maxDuration alto: es una operación pesada y puntual.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { put } from '@vercel/blob';
import { protectAPIRoute, getBaseRoleCode } from '@/lib/auth';
import { auditFamily } from '@/lib/familyApi';
import { DOCUMENT_DRAFT_ROLES, canUserSign } from '@/lib/documentsApi';
import { buildDocumentFragment, buildPdfHtml, SignatureBlock } from '@/lib/documentHtml';
import { fetchAsDataUri, htmlToPdf, htmlToDocxBuffer } from '@/services/DocumentGenerationService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await protectAPIRoute(request, DOCUMENT_DRAFT_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const tenantId = auth.user.tenantId;
    const userId = auth.user.userId;

    const draft = await db.documentDraft.findFirst({
      where: { id: params.id, tenantId },
      include: { case: { select: { id: true, filingNumber: true, comisariaId: true } } },
    });
    if (!draft) return NextResponse.json({ error: 'Borrador no encontrado' }, { status: 404 });
    if (draft.status === 'EMITIDO') {
      return NextResponse.json({ error: 'El documento ya fue emitido.' }, { status: 409 });
    }
    if (!draft.bodyHtml || !draft.bodyHtml.trim()) {
      return NextResponse.json({ error: 'El documento está vacío.' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const requestedSigners: string[] = Array.isArray(body.signerUserIds) ? body.signerUserIds : [];

    // Resolver los firmantes: los solicitados, o por defecto el emisor (si puede firmar).
    const signerIds = requestedSigners.length ? [...new Set(requestedSigners.map(String))] : [auth.user.userId];

    const signedAt = new Date();
    const contentHash = crypto.createHash('sha256').update(`${draft.title}\n${draft.bodyHtml}`).digest('hex');

    const signatures: SignatureBlock[] = [];
    const signatureRecords: { signerUserId: string; signerName: string; role: string | null; signatureImageUrl: string | null }[] = [];

    for (const uid of signerIds) {
      const user = await db.user.findFirst({
        where: { id: uid, tenantId, isActive: true },
        select: { id: true, fullName: true, profesion: true, role: { select: { code: true } } },
      });
      if (!user) {
        // Si el emisor por defecto no puede firmar, se permite emisión sin firma.
        if (requestedSigners.length) return NextResponse.json({ error: 'Un firmante no existe o está inactivo.' }, { status: 400 });
        continue;
      }
      const baseRole = getBaseRoleCode(user.role?.code ?? '');
      if (!canUserSign(baseRole, user.profesion)) {
        if (requestedSigners.length) return NextResponse.json({ error: `${user.fullName} no está habilitado para firmar.` }, { status: 400 });
        continue;
      }
      const sig = await db.userSignature.findFirst({
        where: { userId: user.id, tenantId, isActive: true },
        select: { blobUrl: true },
        orderBy: { createdAt: 'desc' },
      });
      if (!sig) {
        if (requestedSigners.length) return NextResponse.json({ error: `${user.fullName} no tiene firma registrada.` }, { status: 400 });
        continue;
      }
      const displayRole = baseRole === 'DIRECTOR' ? 'DIRECTOR' : (user.profesion ?? null);
      const imageDataUri = await fetchAsDataUri(sig.blobUrl);
      signatures.push({ name: user.fullName, role: displayRole, imageDataUri, signedAt, hash: contentHash });
      signatureRecords.push({ signerUserId: user.id, signerName: user.fullName, role: displayRole, signatureImageUrl: sig.blobUrl });
    }

    // Encabezado: Alcaldía (tenant) + comisaría (sede).
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, nit: true, address: true, phone: true, logoUrl: true },
    });
    let comisaria: { name: string; address: string | null; phone: string | null } | null = null;
    if (draft.case?.comisariaId) {
      comisaria = await db.comisaria.findFirst({
        where: { id: draft.case.comisariaId, tenantId },
        select: { name: true, address: true, phone: true },
      });
    }
    const logoDataUri = await fetchAsDataUri(tenant?.logoUrl);

    const fragment = buildDocumentFragment({
      header: {
        tenantName: tenant?.name ?? 'Alcaldía',
        tenantNit: tenant?.nit, tenantAddress: tenant?.address, tenantPhone: tenant?.phone,
        logoDataUri,
        comisariaName: comisaria?.name, comisariaAddress: comisaria?.address, comisariaPhone: comisaria?.phone,
      },
      title: draft.title,
      bodyHtml: draft.bodyHtml,
      signatures,
    });

    // Generar PDF + DOCX.
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await htmlToPdf(buildPdfHtml(fragment));
    } catch (e) {
      console.error('Error generando PDF:', e);
      return NextResponse.json({ error: 'No se pudo generar el PDF. Verifique la configuración del generador.' }, { status: 500 });
    }
    const docxBuffer = await htmlToDocxBuffer(fragment, draft.title);

    const safeTitle = draft.title.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 60);
    const stamp = Date.now();
    const base = `documentos/${draft.caseId}/${stamp}_${safeTitle}`;
    const pdfBlob = await put(`${base}.pdf`, pdfBuffer, { access: 'public', contentType: 'application/pdf', addRandomSuffix: false });
    const docxBlob = await put(`${base}.docx`, docxBuffer, { access: 'public', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', addRandomSuffix: false });

    const fileHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    // Materializar el Document oficial (el PDF) + actualizar el borrador, en transacción.
    const document = await db.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          tenantId,
          caseId: draft.caseId,
          fileName: `${safeTitle}.pdf`,
          originalName: `${draft.title}.pdf`,
          fileUrl: pdfBlob.url,
          mimeType: 'application/pdf',
          fileSize: pdfBuffer.length,
          fileHash,
          documentType: draft.documentType,
          description: `Documento del despacho emitido (${signatures.length} firma(s)).`,
          isOfficial: true,
          isSigned: signatures.length > 0,
          signedBy: signatures.length > 0 ? userId : null,
          signedAt: signatures.length > 0 ? signedAt : null,
          uploadedBy: userId,
          uploadedByType: 'USER',
        },
      });

      await tx.documentDraft.update({
        where: { id: draft.id },
        data: { status: 'EMITIDO', documentId: doc.id, docxUrl: docxBlob.url, emittedAt: signedAt },
      });

      if (signatureRecords.length) {
        await tx.documentSignature.createMany({
          data: signatureRecords.map((s) => ({
            tenantId, draftId: draft.id,
            signerUserId: s.signerUserId, signerName: s.signerName, role: s.role,
            signatureImageUrl: s.signatureImageUrl, documentHash: contentHash, signedAt,
          })),
        });
      }
      return doc;
    });

    await auditFamily(db, request, auth.user, 'FAMILY_DOCUMENT_EMITTED', 'DocumentDraft', draft.id, {
      caseId: draft.caseId,
      metadata: { documentId: document.id, documentType: draft.documentType, signers: signatureRecords.length, fileHash },
    });

    return NextResponse.json({
      ok: true,
      documentId: document.id,
      pdfUrl: pdfBlob.url,
      docxUrl: docxBlob.url,
      signers: signatureRecords.length,
    });
  } catch (error) {
    console.error('Error emitiendo documento:', error);
    return NextResponse.json({ error: 'Error al emitir el documento' }, { status: 500 });
  }
}
