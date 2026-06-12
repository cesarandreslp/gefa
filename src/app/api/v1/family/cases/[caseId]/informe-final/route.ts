/**
 * Informe final del caso (decisión del comisario).
 *  - PATCH: registra/edita la "versión de los hechos del comisario".
 *  - POST:  compila por IA el informe final (pre-informe del equipo + versión del
 *           comisario) y ANEXA al expediente, como documentos PDF, cada pieza previa
 *           (descripción preliminar, informes del equipo, pre-informe consolidado,
 *           versión del comisario) más el informe final compilado.
 *
 * Solo el comisario (DIRECTOR). Runtime Node + maxDuration alto (genera varios PDF).
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { put } from '@vercel/blob';
import { protectAPIRoute } from '@/lib/auth';
import { FAMILY_REPORT_APPROVER_ROLES, auditFamily } from '@/lib/familyApi';
import { escapeHtml } from '@/lib/documentsApi';
import { buildDocumentFragment, buildPdfHtml, HeaderInfo } from '@/lib/documentHtml';
import { fetchAsDataUri, htmlToPdfBatch } from '@/services/DocumentGenerationService';
import { compileFinalReport } from '@/services/FinalReportService';
import { DocumentType } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

const textToHtml = (t: string) =>
  t.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`).join('');

// PATCH — versión de los hechos del comisario
export async function PATCH(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_REPORT_APPROVER_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const caseRow = await db.case.findFirst({ where: { id: params.caseId, tenantId: auth.user.tenantId }, select: { id: true } });
    if (!caseRow) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });

    const body = await request.json();
    const texto = typeof body.versionHechosComisario === 'string' ? body.versionHechosComisario : '';

    await db.case.update({
      where: { id: params.caseId },
      data: { versionHechosComisario: texto.trim() || null, versionHechosAt: texto.trim() ? new Date() : null },
    });
    await auditFamily(db, request, auth.user, 'FAMILY_VERSION_HECHOS_SAVED', 'Case', params.caseId, { caseId: params.caseId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error guardando versión de los hechos:', error);
    return NextResponse.json({ error: 'Error al guardar la versión de los hechos' }, { status: 500 });
  }
}

// POST — compilar informe final por IA + anexar piezas al expediente
export async function POST(request: NextRequest, { params }: { params: { caseId: string } }) {
  try {
    const auth = await protectAPIRoute(request, FAMILY_REPORT_APPROVER_ROLES);
    if (!auth.authorized || !auth.user) {
      return auth.response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = auth.db;
    const tenantId = auth.user.tenantId;

    const caseRow = await db.case.findFirst({
      where: { id: params.caseId, tenantId },
      select: {
        id: true, filingNumber: true, comisariaId: true,
        descripcionPreliminar: true, description: true,
        preInformeConsolidado: true, preInformeEstado: true,
        versionHechosComisario: true, informeCompilado: true,
      },
    });
    if (!caseRow) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    if (caseRow.preInformeEstado !== 'APROBADO') {
      return NextResponse.json({ error: 'El pre-informe consolidado del equipo debe estar APROBADO antes de compilar el informe final.' }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const force = body.force === true;
    if (caseRow.informeCompilado && !force) {
      return NextResponse.json({ error: 'El informe final ya fue compilado. Use force=true para regenerarlo.' }, { status: 409 });
    }

    // 1. Compilar por IA.
    const compiled = await compileFinalReport(db, params.caseId, tenantId);
    if (!compiled.ok || !compiled.report) {
      return NextResponse.json({ error: compiled.error }, { status: 400 });
    }
    const compiledAt = new Date();
    await db.case.update({ where: { id: params.caseId }, data: { informeCompilado: compiled.report, informeCompiladoAt: compiledAt } });

    // 2. Encabezado institucional (Alcaldía + sede) para los PDF.
    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { name: true, nit: true, address: true, phone: true, institutionalEmail: true, logoUrl: true } });
    let comisaria: { name: string; address: string | null; phone: string | null; email: string | null; comisarioNombre: string | null } | null = null;
    if (caseRow.comisariaId) {
      comisaria = await db.comisaria.findFirst({ where: { id: caseRow.comisariaId, tenantId }, select: { name: true, address: true, phone: true, email: true, comisarioNombre: true } });
    }
    const header: HeaderInfo = {
      tenantName: tenant?.name ?? 'Alcaldía', tenantNit: tenant?.nit, tenantAddress: tenant?.address, tenantPhone: tenant?.phone, tenantEmail: tenant?.institutionalEmail,
      logoDataUri: await fetchAsDataUri(tenant?.logoUrl),
      comisariaName: comisaria?.name, comisariaAddress: comisaria?.address, comisariaPhone: comisaria?.phone,
      comisariaEmail: comisaria?.email, comisarioNombre: comisaria?.comisarioNombre,
    };

    // 3. Piezas a anexar (todo lo previo + el informe final).
    const assessments = await db.assessment.findMany({
      where: { caseId: params.caseId, tenantId, informePreliminar: { not: null } },
      select: { informePreliminar: true, instrumento: { select: { name: true } } },
      orderBy: { conductedAt: 'asc' },
    });

    interface Pieza { title: string; texto: string; tipo: DocumentType; official?: boolean; internal?: boolean; confidential?: boolean }
    const piezas: Pieza[] = [];
    if (caseRow.descripcionPreliminar?.trim()) piezas.push({ title: 'Descripción preliminar', texto: caseRow.descripcionPreliminar, tipo: 'OTHER', internal: true });
    assessments.forEach((a, i) => {
      if (a.informePreliminar?.trim()) piezas.push({ title: `Informe del equipo — ${a.instrumento?.name ?? `instrumento ${i + 1}`}`, texto: a.informePreliminar, tipo: 'VALORACION', internal: true, confidential: true });
    });
    if (caseRow.preInformeConsolidado?.trim()) piezas.push({ title: 'Pre-informe consolidado del equipo', texto: caseRow.preInformeConsolidado, tipo: 'INFORME_JURIDICO', internal: true });
    if (caseRow.versionHechosComisario?.trim()) piezas.push({ title: 'Versión de los hechos del comisario', texto: caseRow.versionHechosComisario, tipo: 'INFORME_JURIDICO', internal: true });
    piezas.push({ title: 'Informe final del caso', texto: compiled.report, tipo: 'INFORME_JURIDICO', official: true });

    // 4. Generar todos los PDF en una sola instancia de Chromium.
    const htmls = piezas.map((p) => buildPdfHtml(buildDocumentFragment({ header, title: p.title, bodyHtml: textToHtml(p.texto), signatures: [] })));
    let pdfs: Buffer[];
    try {
      pdfs = await htmlToPdfBatch(htmls);
    } catch (e) {
      console.error('Error generando PDFs del informe final:', e);
      return NextResponse.json({ error: 'El informe se compiló, pero falló la generación de los PDF anexos.' }, { status: 500 });
    }

    // 5. Subir cada PDF y crear el Document anexo.
    const stamp = Date.now();
    let anexados = 0;
    for (let i = 0; i < piezas.length; i++) {
      const p = piezas[i];
      const safe = p.title.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 50);
      const blob = await put(`documentos/${params.caseId}/${stamp}_${i}_${safe}.pdf`, pdfs[i], { access: 'public', contentType: 'application/pdf', addRandomSuffix: false });
      const fileHash = crypto.createHash('sha256').update(pdfs[i]).digest('hex');
      await db.document.create({
        data: {
          tenantId, caseId: params.caseId,
          fileName: `${safe}.pdf`, originalName: `${p.title}.pdf`,
          fileUrl: blob.url, mimeType: 'application/pdf', fileSize: pdfs[i].length, fileHash,
          documentType: p.tipo,
          description: `Anexo del informe final — ${p.title}`,
          isOfficial: !!p.official, isInternal: !!p.internal, isConfidential: !!p.confidential,
          uploadedBy: auth.user.userId, uploadedByType: 'USER',
        },
      });
      anexados++;
    }

    await auditFamily(db, request, auth.user, 'FAMILY_INFORME_FINAL_COMPILADO', 'Case', params.caseId, { caseId: params.caseId, metadata: { anexados } });
    return NextResponse.json({ ok: true, informeCompilado: compiled.report, anexados });
  } catch (error) {
    console.error('Error compilando el informe final:', error);
    return NextResponse.json({ error: 'Error al compilar el informe final' }, { status: 500 });
  }
}
