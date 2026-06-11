/**
 * ============================================================================
 * HELPERS COMPARTIDOS — DOCUMENTOS DEL DESPACHO (plantillas + firmas)
 * ============================================================================
 * RBAC y utilidades reutilizadas por las rutas de plantillas, borradores y
 * firmas. Centralizar el control de acceso evita divergencias sobre quién puede
 * redactar/firmar actos del despacho (datos sensibles de NNA/víctimas).
 * ============================================================================
 */

import { DocumentType, TemplateKind } from '@prisma/client';

/** Roles que administran las PLANTILLAS del despacho (crear/editar/desactivar). */
export const TEMPLATE_ADMIN_ROLES = ['ADMIN', 'DIRECTOR'];

/** Roles que pueden REDACTAR un documento (abrir borrador, editar, corregir con IA). */
export const DOCUMENT_DRAFT_ROLES = ['ADMIN', 'DIRECTOR', 'FUNCIONARIO'];

/**
 * Profesiones del equipo interdisciplinario habilitadas para FIRMAR documentos
 * del despacho (jurídica, psicología, trabajo social). El comisario (DIRECTOR)
 * firma por su rol, sin necesidad de profesión.
 */
export const SIGNING_PROFESSIONS = ['JURIDICA', 'PSICOLOGIA', 'TRABAJO_SOCIAL'];

/**
 * ¿Este usuario puede tener firma y firmar documentos del despacho?
 * - El comisario (DIRECTOR) firma por su rol.
 * - Un FUNCIONARIO firma si su profesión es jurídica / psicología / trabajo social.
 */
export function canUserSign(roleCode: string, profesion?: string | null): boolean {
  if (roleCode === 'DIRECTOR') return true;
  if (roleCode === 'FUNCIONARIO' && profesion && SIGNING_PROFESSIONS.includes(profesion)) {
    return true;
  }
  return false;
}

/** Etiqueta legible de cada tipo de plantilla (los 11 actos del despacho). */
export const TEMPLATE_KIND_LABELS: Record<TemplateKind, string> = {
  DECLARACION: 'Declaración',
  ACTA_AUDIENCIA: 'Acta de audiencia',
  CITACION: 'Citación',
  OFICIO: 'Oficio',
  AUTO: 'Auto',
  RESOLUCION: 'Resolución',
  MEDIDA_PROTECCION: 'Medida de protección',
  CONSTANCIA_CONCILIACION: 'Constancia de conciliación',
  INFORME_JURIDICO: 'Informe jurídico',
  SEGUIMIENTO: 'Seguimiento',
  RECURSO: 'Recurso',
};

export const TEMPLATE_KINDS = Object.keys(TEMPLATE_KIND_LABELS) as TemplateKind[];

/**
 * Mapea el tipo de plantilla al `DocumentType` con que se archiva el documento
 * emitido en el expediente.
 */
const KIND_TO_DOCTYPE: Record<TemplateKind, DocumentType> = {
  DECLARACION: 'DECLARACION',
  ACTA_AUDIENCIA: 'ACTA',
  CITACION: 'CITACION',
  OFICIO: 'OFICIO',
  AUTO: 'AUTO',
  RESOLUCION: 'RESOLUCION',
  MEDIDA_PROTECCION: 'MEDIDA_PROTECCION',
  CONSTANCIA_CONCILIACION: 'CONSTANCIA_CONCILIACION',
  INFORME_JURIDICO: 'INFORME_JURIDICO',
  SEGUIMIENTO: 'SEGUIMIENTO',
  RECURSO: 'RECURSO',
};

export function documentTypeForKind(kind: TemplateKind): DocumentType {
  return KIND_TO_DOCTYPE[kind];
}

/** Definición de una variable de plantilla (campo a diligenciar al redactar). */
export interface TemplateVariable {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'number' | 'multiline';
  required?: boolean;
}

/** Valida y normaliza el arreglo de variables recibido al guardar una plantilla. */
export function normalizeVariables(input: unknown): TemplateVariable[] {
  if (!Array.isArray(input)) return [];
  const out: TemplateVariable[] = [];
  for (const v of input) {
    if (!v || typeof v !== 'object') continue;
    const key = String((v as Record<string, unknown>).key ?? '').trim();
    if (!key || !/^[a-zA-Z0-9_]+$/.test(key)) continue;
    const label = String((v as Record<string, unknown>).label ?? key).trim();
    const type = (v as Record<string, unknown>).type as TemplateVariable['type'];
    out.push({
      key,
      label,
      type: ['text', 'date', 'number', 'multiline'].includes(type as string) ? type : 'text',
      required: Boolean((v as Record<string, unknown>).required),
    });
  }
  return out;
}

/**
 * Reemplaza los marcadores `{{clave}}` del cuerpo por los valores provistos.
 * Escapa el valor para evitar inyección de HTML (los valores son texto plano).
 * Marcadores sin valor se conservan visibles entre corchetes para que el redactor
 * note lo que falta.
 */
export function mergeTemplateBody(bodyHtml: string, data: Record<string, unknown>): string {
  return bodyHtml.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    const value = data[key];
    if (value === undefined || value === null || value === '') {
      return `[${key}]`;
    }
    return escapeHtml(String(value));
  });
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
