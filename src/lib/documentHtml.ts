/**
 * Armado del HTML final del documento del despacho: encabezado institucional
 * (Alcaldía=tenant + comisaría=sede) + cuerpo redactado + bloques de firma
 * electrónica. Las imágenes (escudo, firmas) se incrustan como data URI para que
 * tanto el PDF (Chromium) como el DOCX (html-to-docx) las rendericen sin depender
 * de fetch externo. Sin dependencias: se usa en el endpoint de emisión.
 */

import { escapeHtml } from './documentsApi';

export interface HeaderInfo {
  tenantName: string;
  tenantNit?: string | null;
  tenantAddress?: string | null;
  tenantPhone?: string | null;
  tenantEmail?: string | null;
  logoDataUri?: string | null;
  comisariaName?: string | null;
  comisariaAddress?: string | null;
  comisariaPhone?: string | null;
  comisariaEmail?: string | null;
  comisarioNombre?: string | null;
}

export interface SignatureBlock {
  name: string;
  role?: string | null;
  imageDataUri?: string | null;
  signedAt: Date;
  hash: string;
}

const ROLE_LABELS: Record<string, string> = {
  DIRECTOR: 'Comisario(a) de Familia',
  JURIDICA: 'Profesional Jurídico',
  PSICOLOGIA: 'Profesional de Psicología',
  TRABAJO_SOCIAL: 'Profesional de Trabajo Social',
};

function headerHtml(h: HeaderInfo): string {
  const lines: string[] = [];
  lines.push(`<div style="font-size:13pt;font-weight:bold;text-transform:uppercase;">${escapeHtml(h.tenantName)}</div>`);
  if (h.comisariaName) lines.push(`<div style="font-size:11pt;font-weight:bold;">${escapeHtml(h.comisariaName)}</div>`);

  // Línea 1: identificación de la Alcaldía (NIT + contacto del tenant).
  const lineaTenant: string[] = [];
  if (h.tenantNit) lineaTenant.push(`NIT ${escapeHtml(h.tenantNit)}`);
  if (h.tenantAddress) lineaTenant.push(escapeHtml(h.tenantAddress));
  if (h.tenantPhone) lineaTenant.push(`Tel. ${escapeHtml(h.tenantPhone)}`);
  if (h.tenantEmail) lineaTenant.push(escapeHtml(h.tenantEmail));
  if (lineaTenant.length) lines.push(`<div style="font-size:8.5pt;color:#444;">${lineaTenant.join(' · ')}</div>`);

  // Línea 2: contacto de la sede (comisaría), si difiere.
  const lineaSede: string[] = [];
  if (h.comisariaAddress) lineaSede.push(escapeHtml(h.comisariaAddress));
  if (h.comisariaPhone) lineaSede.push(`Tel. ${escapeHtml(h.comisariaPhone)}`);
  if (h.comisariaEmail) lineaSede.push(escapeHtml(h.comisariaEmail));
  if (lineaSede.length) lines.push(`<div style="font-size:8.5pt;color:#444;">${lineaSede.join(' · ')}</div>`);
  if (h.comisarioNombre) lines.push(`<div style="font-size:8.5pt;color:#444;">Comisario/a: ${escapeHtml(h.comisarioNombre)}</div>`);

  const logo = h.logoDataUri
    ? `<td style="width:90px;vertical-align:middle;"><img src="${h.logoDataUri}" style="max-height:70px;max-width:90px;" /></td>`
    : '';

  return `
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
    <tr>
      ${logo}
      <td style="vertical-align:middle;text-align:${h.logoDataUri ? 'left' : 'center'};padding-left:${h.logoDataUri ? '12px' : '0'};">
        ${lines.join('')}
      </td>
    </tr>
  </table>
  <hr style="border:none;border-top:1.5px solid #1f2937;margin:0 0 16px;" />`;
}

function signaturesHtml(signatures: SignatureBlock[]): string {
  if (signatures.length === 0) return '';
  const fmt = (d: Date) => d.toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' });

  const blocks = signatures.map((s) => {
    const img = s.imageDataUri
      ? `<img src="${s.imageDataUri}" style="max-height:55px;max-width:200px;" />`
      : '<div style="height:55px;"></div>';
    const role = s.role && ROLE_LABELS[s.role] ? ROLE_LABELS[s.role] : (s.role ? escapeHtml(s.role) : '');
    return `
    <td style="vertical-align:bottom;text-align:center;padding:0 16px;width:50%;">
      ${img}
      <div style="border-top:1px solid #111;margin-top:4px;padding-top:4px;font-size:10pt;font-weight:bold;">${escapeHtml(s.name)}</div>
      ${role ? `<div style="font-size:9pt;color:#333;">${role}</div>` : ''}
      <div style="font-size:7.5pt;color:#666;margin-top:3px;">Firmado electrónicamente · ${fmt(s.signedAt)}</div>
      <div style="font-size:6.5pt;color:#999;word-break:break-all;">SHA-256: ${escapeHtml(s.hash.slice(0, 32))}…</div>
    </td>`;
  });

  // Agrupar de a dos firmas por fila.
  const rows: string[] = [];
  for (let i = 0; i < blocks.length; i += 2) {
    rows.push(`<tr>${blocks[i]}${blocks[i + 1] ?? '<td style="width:50%;"></td>'}</tr>`);
  }

  return `
  <div style="margin-top:48px;">
    <table style="width:100%;border-collapse:collapse;">${rows.join('')}</table>
  </div>
  <p style="font-size:7.5pt;color:#777;margin-top:24px;text-align:justify;">
    Documento firmado electrónicamente conforme a la Ley 527 de 1999. La firma electrónica, el sello de tiempo
    y la huella criptográfica (SHA-256) garantizan la integridad y autoría del presente acto.
  </p>`;
}

/** Fragmento HTML del documento (encabezado + cuerpo + firmas). Para DOCX. */
export function buildDocumentFragment(opts: {
  header: HeaderInfo;
  title: string;
  bodyHtml: string;
  signatures: SignatureBlock[];
}): string {
  return `
  ${headerHtml(opts.header)}
  <h1 style="font-size:14pt;text-align:center;margin:0 0 18px;text-transform:uppercase;">${escapeHtml(opts.title)}</h1>
  <div style="font-size:11pt;line-height:1.5;text-align:justify;">${opts.bodyHtml}</div>
  ${signaturesHtml(opts.signatures)}`;
}

/** Documento HTML completo (con estilos de página). Para el PDF de Chromium. */
export function buildPdfHtml(fragment: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 2.5cm 2.5cm; }
    * { box-sizing: border-box; }
    body { font-family: 'Times New Roman', Georgia, serif; color: #111; margin: 0; }
    p { margin: 0 0 10px; }
    h1, h2, h3 { font-family: 'Times New Roman', Georgia, serif; }
    ul, ol { margin: 0 0 10px 1.2em; }
    table { page-break-inside: avoid; }
  </style></head><body>${fragment}</body></html>`;
}
