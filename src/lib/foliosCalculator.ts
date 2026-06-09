/**
 * Calculadora de Folios
 * 
 * Calcula cuántas hojas tamaño carta (216mm x 279mm) ocupa un texto
 * con formato estándar de oficina.
 * 
 * Parámetros de página carta:
 * - Tamaño: 216mm x 279mm (8.5" x 11")
 * - Márgenes: 25mm (2.5cm) en cada lado
 * - Área útil: 166mm x 229mm
 * - Fuente: Arial 12pt
 * - Interlineado: 1.5
 * - Justificado
 * 
 * Estimación:
 * - ~65 caracteres por línea
 * - ~40 líneas por página
 * - ~2,600 caracteres por página
 */

/**
 * Calcula el número de folios (páginas) que ocupará un texto
 * @param text Texto a evaluar (sin formato markdown)
 * @returns Número de páginas (mínimo 1)
 */
export function calculateFolios(text: string): number {
  if (!text || text.trim().length === 0) {
    return 1; // Al menos 1 página incluso si está vacío
  }

  // Limpiar el texto de marcado markdown si lo tiene
  const cleanText = text
    .replace(/\*\*/g, '') // Eliminar negrillas
    .replace(/\*/g, '')   // Eliminar cursivas
    .replace(/\_\_/g, '') // Eliminar negrillas alternativas
    .replace(/\_/g, '')   // Eliminar cursivas alternativas
    .replace(/\#/g, '')   // Eliminar encabezados
    .trim();

  // Caracteres por página en formato carta con Arial 12pt, justificado
  // Considerando:
  // - 65 caracteres por línea (ancho útil de 166mm)
  // - 40 líneas por página (alto útil de 229mm con interlineado 1.5)
  const CHARS_PER_PAGE = 2600;

  // Calcular páginas
  const pages = Math.ceil(cleanText.length / CHARS_PER_PAGE);

  // Retornar al menos 1 página
  return Math.max(1, pages);
}

/**
 * Limpia texto de marcas markdown
 * @param text Texto con posible formato markdown
 * @returns Texto limpio sin marcas
 */
export function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\_\_/g, '')
    .replace(/\_/g, '')
    .replace(/\#/g, '')
    .trim();
}
