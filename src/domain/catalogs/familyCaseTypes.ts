/**
 * ============================================================================
 * CATÁLOGO CANÓNICO DE TIPOS DE CASO — COMISARÍA DE FAMILIA (GEFA)
 * ============================================================================
 * Fuente única de verdad para los tipos de caso que provisiona cada comisaría.
 * Se importa desde:
 *   - src/app/api/v1/super-admin/tenants/route.ts  (provisioning multitenant)
 *   - src/app/api/v1/registro-entidad/route.ts     (auto-registro de entidad)
 *   - prisma/seed-family.ts                         (seed de BD existente)
 *
 * Cada objeto contiene EXCLUSIVAMENTE campos del modelo Prisma `CaseType`,
 * de modo que puede pasarse por spread a `caseType.create({ data: { ... } })`.
 * El mapeo a la modalidad funcional (enum `CaseModality`) vive aparte en
 * `CASE_TYPE_MODALITY` para no contaminar el `create`.
 *
 * Marco normativo de la comisaría de familia:
 *   - Art. 42 Constitución Política
 *   - Ley 294/1996 y Ley 575/2000: violencia intrafamiliar y medidas de protección
 *   - Ley 1098/2006: Código de Infancia y Adolescencia (PARD)
 *   - Ley 1257/2008: no violencia contra la mujer
 *   - Ley 640/2001: conciliación extrajudicial
 *   - Decreto 4840/2007 y Ley 2126/2021: comisarías de familia
 * ============================================================================
 */

/** Campos de `CaseType` que define el catálogo (compatibles con el modelo Prisma). */
export interface FamilyCaseTypeSeed {
  code: string;
  name: string;
  description: string;
  defaultLegalTermDays: number; // días HÁBILES
  legalReference: string;
  requiresSupervisorApproval: boolean;
  requiresSignature: boolean;
  displayOrder: number;
}

/**
 * Tipos de caso base de una comisaría de familia.
 * Los términos están en días hábiles (los calcula `LegalTermsCalculator`).
 */
export const FAMILY_CASE_TYPES: FamilyCaseTypeSeed[] = [
  {
    code: 'VIF',
    name: 'Violencia Intrafamiliar',
    description:
      'Denuncia de violencia intrafamiliar (física, psicológica, sexual, económica o patrimonial). Da lugar a la apertura del caso y a la imposición de medidas de protección.',
    defaultLegalTermDays: 10,
    legalReference: 'Ley 294/1996, Ley 575/2000 y Ley 1257/2008',
    requiresSupervisorApproval: false,
    requiresSignature: true,
    displayOrder: 1,
  },
  {
    code: 'MP',
    name: 'Medida de Protección',
    description:
      'Solicitud, renovación o incumplimiento de medidas de protección a víctimas de violencia intrafamiliar.',
    defaultLegalTermDays: 10,
    legalReference: 'Art. 17 Ley 294/1996 (mod. Ley 575/2000)',
    requiresSupervisorApproval: false,
    requiresSignature: true,
    displayOrder: 2,
  },
  {
    code: 'PARD',
    name: 'Restablecimiento de Derechos (PARD)',
    description:
      'Proceso Administrativo de Restablecimiento de Derechos de niños, niñas y adolescentes con derechos amenazados o vulnerados. Término de 4 meses prorrogable.',
    defaultLegalTermDays: 80,
    legalReference: 'Arts. 99 y 100 Ley 1098/2006',
    requiresSupervisorApproval: true,
    requiresSignature: true,
    displayOrder: 3,
  },
  {
    code: 'CAV',
    name: 'Custodia, Alimentos y Visitas',
    description:
      'Conciliación sobre custodia y cuidado personal, cuota alimentaria y régimen de visitas de niños, niñas y adolescentes.',
    defaultLegalTermDays: 30,
    legalReference: 'Art. 111 Ley 1098/2006 y Ley 640/2001',
    requiresSupervisorApproval: false,
    requiresSignature: true,
    displayOrder: 4,
  },
  {
    code: 'PNNA',
    name: 'Protección a NNA',
    description:
      'Atención y protección de niños, niñas y adolescentes víctimas de maltrato infantil, abuso o negligencia, fuera del proceso PARD.',
    defaultLegalTermDays: 10,
    legalReference: 'Ley 1098/2006 (Código de Infancia y Adolescencia)',
    requiresSupervisorApproval: true,
    requiresSignature: true,
    displayOrder: 5,
  },
  {
    code: 'CF',
    name: 'Conciliación Familiar',
    description:
      'Conciliación de conflictos familiares: separación de cuerpos y bienes, fijación de aportes y demás asuntos conciliables en materia de familia.',
    defaultLegalTermDays: 30,
    legalReference: 'Ley 640/2001 y Ley 2126/2021',
    requiresSupervisorApproval: false,
    requiresSignature: true,
    displayOrder: 6,
  },
  {
    code: 'OJ',
    name: 'Orientación Jurídica',
    description:
      'Orientación y asesoría jurídica y psicosocial al ciudadano, sin apertura de proceso formal.',
    defaultLegalTermDays: 5,
    legalReference: 'Decreto 4840/2007 y Ley 2126/2021',
    requiresSupervisorApproval: false,
    requiresSignature: false,
    displayOrder: 7,
  },
];

/**
 * Mapeo de cada tipo de caso a su modalidad funcional (enum `CaseModality`).
 * Útil para que el front/API preseleccione la modalidad al radicar.
 */
export const CASE_TYPE_MODALITY: Record<string, string> = {
  VIF: 'VIOLENCIA_INTRAFAMILIAR',
  MP: 'VIOLENCIA_INTRAFAMILIAR',
  PARD: 'PARD',
  CAV: 'CUSTODIA_ALIMENTOS_VISITAS',
  PNNA: 'MEDIDA_PROTECCION_NNA',
  CF: 'CONCILIACION_FAMILIAR',
  OJ: 'ORIENTACION_JURIDICA',
};
