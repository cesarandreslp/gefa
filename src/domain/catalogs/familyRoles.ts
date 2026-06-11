/**
 * ============================================================================
 * CATÁLOGO CANÓNICO DE ROLES — COMISARÍA DE FAMILIA (GEFA)
 * ============================================================================
 * Fuente ÚNICA de verdad de los roles base de un tenant. La usan:
 *   - prisma/seed.ts                                (seed demo multitenant)
 *   - src/app/api/v1/super-admin/tenants/route.ts   (provisioning Fase 2)
 *
 * Evita la deriva entre el seed y el provisioning (un tenant nuevo debe heredar
 * EXACTAMENTE los mismos roles que tienen los tenants existentes). Cada objeto
 * contiene solo campos del modelo Prisma `Role` aptos para spread en `role.create`.
 * ============================================================================
 */

export interface FamilyRoleSeed {
  code: string;
  name: string;
  level: number;
  permissions: string[];
  canApprove: boolean;
  canReassign: boolean;
  canSign: boolean;
  description: string;
}

export const FAMILY_ROLES: FamilyRoleSeed[] = [
  {
    code: 'ADMIN', name: 'Administrador', level: 100, permissions: ['*:*:*'],
    canApprove: true, canReassign: true, canSign: true,
    description: 'Administrador del municipio (Alcaldía): gestiona usuarios y configuración. No es autoridad procesal ni equipo clínico.',
  },
  {
    code: 'DIRECTOR', name: 'Comisario/a de Familia', level: 100, permissions: ['*:*:*'],
    canApprove: true, canReassign: true, canSign: true,
    description: 'Autoridad de la comisaría de familia. Toma declaraciones, valora pruebas y aprueba/firma los informes; sus actos tienen peso procesal.',
  },
  {
    code: 'SECRETARIA_GOBIERNO', name: 'Secretaría de Gobierno', level: 95, permissions: ['stats:read:*'],
    canApprove: false, canReassign: false, canSign: false,
    description: 'Supervisión municipal: tablero de control con estadísticas agregadas de todas las comisarías. No accede a expedientes ni a datos confidenciales.',
  },
  {
    code: 'ASIGNACION_DE_CASOS', name: 'Asignación de Casos (IA)', level: 90, permissions: ['cases:assign:*', 'cases:read:*'],
    canApprove: false, canReassign: true, canSign: false,
    description: 'Agente de IA para la asignación inteligente de casos entre funcionarios.',
  },
  {
    code: 'FUNCIONARIO', name: 'Funcionario (equipo interdisciplinario)', level: 85, permissions: ['cases:read:*', 'cases:update:assigned'],
    canApprove: true, canReassign: false, canSign: true,
    description: 'Equipo interdisciplinario de la comisaría (psicología / trabajo social): atiende casos, aplica instrumentos y elabora valoraciones.',
  },
  {
    code: 'VENTANILLA_UNICA', name: 'Ventanilla Única', level: 80, permissions: ['cases:*:*', 'users:read:*'],
    canApprove: false, canReassign: true, canSign: false,
    description: 'Recibe y radica las solicitudes ciudadanas en la comisaría.',
  },
  {
    code: 'AUXILIAR_ATENCION_USUARIO', name: 'Auxiliar de Atención al Usuario', level: 75, permissions: ['cases:read:*', 'citizens:read:*'],
    canApprove: false, canReassign: false, canSign: false,
    description: 'Apoyo en la atención directa al usuario en la comisaría.',
  },
];
