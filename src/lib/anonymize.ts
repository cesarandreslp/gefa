/**
 * Anonimización de datos sensibles antes de enviarlos a un proveedor de IA externo
 * (Ley 1581/2012 — habeas data; Ley 1098/2006 — NNA). Redacta identificadores
 * directos: correos, teléfonos, documentos y los nombres de las partes del caso.
 * No es infalible; su fin es minimizar la exposición de PII en el prompt.
 */

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Secuencias largas de dígitos (documentos, teléfonos): 7+ dígitos seguidos (con espacios/guiones)
const NUMERO_LARGO = /\b\d[\d .-]{6,}\d\b/g;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param text   texto a anonimizar
 * @param nombres tokens de nombres/apellidos de las partes a redactar
 */
export function anonymize(text: string, nombres: string[] = []): string {
  if (!text) return text;
  let out = text;

  // Nombres y apellidos de las partes (tokens de 3+ letras, sin duplicar)
  const tokens = Array.from(
    new Set(
      nombres
        .flatMap((n) => (n || '').split(/\s+/))
        .map((t) => t.trim())
        .filter((t) => t.length >= 3)
    )
  ).sort((a, b) => b.length - a.length); // primero los largos para no partir nombres compuestos

  for (const tok of tokens) {
    out = out.replace(new RegExp(`\\b${escapeRegExp(tok)}\\b`, 'gi'), '[nombre]');
  }

  out = out.replace(EMAIL, '[correo]');
  out = out.replace(NUMERO_LARGO, '[número]');
  return out;
}
