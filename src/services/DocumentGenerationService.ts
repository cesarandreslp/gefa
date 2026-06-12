/**
 * Generación del archivo final del documento del despacho: PDF (Chromium headless
 * vía @sparticuz/chromium en Vercel) y DOCX (html-to-docx, JS puro). Se invoca solo
 * al EMITIR (no en cada tecla): el PDF es pesado en serverless y queda aislado aquí.
 *
 * Requiere runtime Node (no Edge). El endpoint que lo usa fija `runtime='nodejs'`.
 */

import htmlToDocx from 'html-to-docx';

/** Descarga una imagen pública y la devuelve como data URI (para incrustar en el HTML). */
export async function fetchAsDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || 'image/png';
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${ct};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

/** Renderiza HTML a PDF (A4) con Chromium headless. */
export async function htmlToPdf(html: string): Promise<Buffer> {
  // En Vercel/Lambda se usa el Chromium empaquetado; en local, un Chrome del sistema
  // vía PUPPETEER_EXECUTABLE_PATH (la emisión es una operación de servidor).
  const onServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_VERSION;

  const chromium = (await import('@sparticuz/chromium')).default;
  const puppeteer = (await import('puppeteer-core')).default;

  chromium.setHeadlessMode = true;
  chromium.setGraphicsMode = false;

  const executablePath = onServerless
    ? await chromium.executablePath()
    : process.env.PUPPETEER_EXECUTABLE_PATH;

  if (!executablePath) {
    throw new Error('No hay un Chromium disponible para generar el PDF (configure PUPPETEER_EXECUTABLE_PATH en local).');
  }

  const browser = await puppeteer.launch({
    args: onServerless ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath,
    headless: true,
    defaultViewport: chromium.defaultViewport,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

/**
 * Renderiza varios HTML a PDF en UNA sola instancia de Chromium (para anexar varias
 * piezas al expediente sin pagar el arranque del navegador por cada una).
 */
export async function htmlToPdfBatch(htmls: string[]): Promise<Buffer[]> {
  if (htmls.length === 0) return [];
  const onServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_VERSION;

  const chromium = (await import('@sparticuz/chromium')).default;
  const puppeteer = (await import('puppeteer-core')).default;

  chromium.setHeadlessMode = true;
  chromium.setGraphicsMode = false;

  const executablePath = onServerless ? await chromium.executablePath() : process.env.PUPPETEER_EXECUTABLE_PATH;
  if (!executablePath) {
    throw new Error('No hay un Chromium disponible para generar el PDF (configure PUPPETEER_EXECUTABLE_PATH en local).');
  }

  const browser = await puppeteer.launch({
    args: onServerless ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath,
    headless: true,
    defaultViewport: chromium.defaultViewport,
  });
  try {
    const out: Buffer[] = [];
    for (const html of htmls) {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true });
      out.push(Buffer.from(pdf));
      await page.close();
    }
    return out;
  } finally {
    await browser.close();
  }
}

/** Renderiza el fragmento HTML a un .docx editable. */
export async function htmlToDocxBuffer(fragmentHtml: string, title: string): Promise<Buffer> {
  const full = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>${fragmentHtml}</body></html>`;
  const out = await htmlToDocx(full, null, {
    title,
    font: 'Times New Roman',
    fontSize: 22, // half-points (≈11pt)
    margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
  });
  if (Buffer.isBuffer(out)) return out;
  if (out instanceof ArrayBuffer) return Buffer.from(out);
  // Blob
  return Buffer.from(await (out as Blob).arrayBuffer());
}
