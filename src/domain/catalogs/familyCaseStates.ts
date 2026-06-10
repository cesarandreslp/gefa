/**
 * ============================================================================
 * CATÁLOGO CANÓNICO DE ESTADOS DE CASO — COMISARÍA DE FAMILIA (GEFA)
 * ============================================================================
 * Workflow del expediente de comisaría de familia. Fuente única de verdad,
 * sembrada por:
 *   - src/app/api/v1/super-admin/tenants/route.ts  (provisioning multitenant)
 *   - src/app/api/v1/registro-entidad/route.ts     (auto-registro)
 *   - prisma/seed-family.ts                         (seed/migración)
 *
 * Cada objeto contiene EXCLUSIVAMENTE campos del modelo Prisma `CaseState`,
 * apto para spread en `caseState.upsert/create`.
 *
 * Flujo típico:
 *   RADICADO → EN_VALORACION → EN_AUDIENCIA → MEDIDA_ADOPTADA → EN_SEGUIMIENTO
 *            → CERRADO. REMITIDO es salida por falta de competencia.
 * ============================================================================
 */

export interface FamilyCaseStateSeed {
  code: string;
  name: string;
  description: string;
  isInitial: boolean;
  isFinal: boolean;
  requiresComment: boolean;
  color: string;
  displayOrder: number;
}

export const FAMILY_CASE_STATES: FamilyCaseStateSeed[] = [
  {
    code: 'RADICADO',
    name: 'Radicado',
    description: 'Caso recibido y radicado oficialmente en la comisaría.',
    isInitial: true,
    isFinal: false,
    requiresComment: false,
    color: '#3B82F6',
    displayOrder: 1,
  },
  {
    code: 'EN_VALORACION',
    name: 'En Valoración',
    description: 'El equipo interdisciplinario realiza la valoración psicosocial, jurídica o de riesgo.',
    isInitial: false,
    isFinal: false,
    requiresComment: false,
    color: '#0e7490',
    displayOrder: 2,
  },
  {
    code: 'EN_AUDIENCIA',
    name: 'En Audiencia / Conciliación',
    description: 'El caso está en trámite de audiencia (conciliación, descargos o fallo).',
    isInitial: false,
    isFinal: false,
    requiresComment: false,
    color: '#F59E0B',
    displayOrder: 3,
  },
  {
    code: 'MEDIDA_ADOPTADA',
    name: 'Medida Adoptada',
    description: 'Se impuso una medida de protección o de restablecimiento de derechos.',
    isInitial: false,
    isFinal: false,
    requiresComment: true,
    color: '#10B981',
    displayOrder: 4,
  },
  {
    code: 'EN_SEGUIMIENTO',
    name: 'En Seguimiento',
    description: 'Seguimiento al cumplimiento de las medidas o al proceso PARD.',
    isInitial: false,
    isFinal: false,
    requiresComment: false,
    color: '#0891B2',
    displayOrder: 5,
  },
  {
    code: 'REMITIDO',
    name: 'Remitido por Competencia',
    description: 'El caso fue remitido a otra autoridad por no ser competencia de la comisaría.',
    isInitial: false,
    isFinal: true,
    requiresComment: true,
    color: '#DC2626',
    displayOrder: 6,
  },
  {
    code: 'CERRADO',
    name: 'Cerrado',
    description: 'Expediente finalizado y archivado.',
    isInitial: false,
    isFinal: true,
    requiresComment: true,
    color: '#6B7280',
    displayOrder: 7,
  },
];
