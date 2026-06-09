/**
 * ============================================================================
 * TIPOS DE DOMINIO - VENTANILLA ÚNICA
 * ============================================================================
 * Define los tipos y enumeraciones fundamentales del dominio de negocio
 * siguiendo la normativa colombiana aplicable.
 * 
 * Fecha: Enero 8, 2026
 * ============================================================================
 */

// ============================================================================
// TIPOS DE CASO
// ============================================================================

/**
 * Códigos de tipos de caso según normativa colombiana
 */
export enum CaseTypeCode {
  // Derecho de Petición (Ley 1755/2015)
  DERECHO_PETICION = 'DP',
  DERECHO_PETICION_INFO = 'DP_INFO',
  DERECHO_PETICION_CONSULTA = 'DP_CONSULTA',
  
  // Tutela (seguimiento, no fallo)
  TUTELA = 'TUT',
  TUTELA_SALUD = 'TUT_SALUD',
  
  // Quejas Disciplinarias
  QUEJA_DISCIPLINARIA = 'QD',
  
  // Víctimas
  ATENCION_VICTIMAS = 'VIC',
  
  // PQRS
  PQRS_PETICION = 'PQRS_P',
  PQRS_QUEJA = 'PQRS_Q',
  PQRS_RECLAMO = 'PQRS_R',
  PQRS_SUGERENCIA = 'PQRS_S',
  
  // Otros
  CONSULTA = 'CONS',
  ACOMPANAMIENTO = 'ACOMP',
}

// ============================================================================
// ESTADOS DE CASO
// ============================================================================

/**
 * Estados por los que puede pasar un caso
 * Definidos según flujos de proceso documentados
 */
export enum CaseStateCode {
  // Estados generales
  RADICADO = 'RADICADO',
  CLASIFICADO = 'CLASIFICADO',
  ASIGNADO = 'ASIGNADO',
  EN_GESTION = 'EN_GESTION',
  REQUIERE_INFO = 'REQUIERE_INFO',
  EN_REVISION = 'EN_REVISION',
  EN_FIRMA = 'EN_FIRMA',
  NOTIFICADO = 'NOTIFICADO',
  CERRADO = 'CERRADO',
  
  // Estados específicos
  REMITIDO = 'REMITIDO',
  EN_SEGUIMIENTO = 'EN_SEGUIMIENTO',
  EVALUACION_PRELIMINAR = 'EVALUACION_PRELIMINAR',
  TRASLADO = 'TRASLADO',
  EN_INVESTIGACION = 'EN_INVESTIGACION',
  CONCEPTUADO = 'CONCEPTUADO',
  REMITIDO_PGN = 'REMITIDO_PGN',
  VERIFICACION_REGISTRO = 'VERIFICACION_REGISTRO',
  ACOMPANAMIENTO = 'ACOMPANAMIENTO',
  REMISION = 'REMISION',
  VERIFICACION = 'VERIFICACION',
  RESPONDIDO = 'RESPONDIDO',
  ARCHIVADO = 'ARCHIVADO',
}

// ============================================================================
// PRIORIDADES
// ============================================================================

/**
 * Niveles de prioridad para casos
 * Basados en criterios constitucionales y legales
 */
export enum PriorityLevel {
  CRITICA = 100,    // Tutelas de salud, vida, NNA
  ALTA = 80,        // Adultos mayores, discapacidad, víctimas
  URGENTE = 60,     // Término vencido o próximo
  NORMAL = 40,      // Casos estándar
  INFORMATIVA = 20, // Sugerencias, consultas
}

/**
 * Razones de priorización constitucional
 */
export enum PriorityReason {
  NINO_NINA_ADOLESCENTE = 'NNA',
  ADULTO_MAYOR = 'ADULTO_MAYOR',
  PERSONA_DISCAPACIDAD = 'DISCAPACIDAD',
  VICTIMA_CONFLICTO = 'VICTIMA',
  DERECHO_SALUD = 'SALUD',
  DERECHO_VIDA = 'VIDA',
  TERMINO_VENCIDO = 'VENCIDO',
  TERMINO_PROXIMO = 'PROXIMO_VENCER',
}

// ============================================================================
// CANALES
// ============================================================================

/**
 * Canales de entrada de casos al sistema
 */
export enum Channel {
  WEB = 'WEB',
  PRESENCIAL = 'PRESENCIAL',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  VERBAL = 'VERBAL',
}

// ============================================================================
// ROLES
// ============================================================================

/**
 * Roles estándar del sistema multi-tenant.
 */
export enum RoleCode {
  ADMIN = 'ADMIN',
  DIRECTOR = 'DIRECTOR',
  ASIGNACION_DE_CASOS = 'ASIGNACION_DE_CASOS',
  FUNCIONARIO = 'FUNCIONARIO',
  VENTANILLA_UNICA = 'VENTANILLA_UNICA',
  AUXILIAR_ATENCION_USUARIO = 'AUXILIAR_ATENCION_USUARIO',
  CIUDADANO = 'CIUDADANO',
}

/**
 * Niveles jerárquicos de roles
 */
export const ROLE_LEVELS: Record<RoleCode, number> = {
  [RoleCode.ADMIN]: 100,
  [RoleCode.DIRECTOR]: 100,
  [RoleCode.ASIGNACION_DE_CASOS]: 90,
  [RoleCode.FUNCIONARIO]: 85,
  [RoleCode.VENTANILLA_UNICA]: 80,
  [RoleCode.AUXILIAR_ATENCION_USUARIO]: 75,
  [RoleCode.CIUDADANO]: 10,
};

// ============================================================================
// PERMISOS
// ============================================================================

/**
 * Permisos granulares del sistema
 */
export enum Permission {
  // Casos - Lectura
  CASES_READ_OWN = 'cases:read:own',
  CASES_READ_ASSIGNED = 'cases:read:assigned',
  CASES_READ_ALL = 'cases:read:all',
  
  // Casos - Escritura
  CASES_CREATE = 'cases:create',
  CASES_UPDATE = 'cases:update',
  CASES_DELETE = 'cases:delete',
  
  // Casos - Asignación
  CASES_ASSIGN = 'cases:assign',
  CASES_REASSIGN = 'cases:reassign',
  
  // Casos - Estados
  CASES_STATE_CHANGE = 'cases:state:change',
  CASES_CLOSE = 'cases:close',
  CASES_REOPEN = 'cases:reopen',
  
  // Casos - Revisión
  CASES_APPROVE = 'cases:approve',
  CASES_REJECT = 'cases:reject',
  
  // Casos - Especiales
  CASES_TERMS_SUSPEND = 'cases:terms:suspend',
  CASES_DUE_DATE_OVERRIDE = 'cases:dueDate:override',
  
  // Usuarios
  USERS_READ = 'users:read',
  USERS_CREATE = 'users:create',
  USERS_UPDATE = 'users:update',
  USERS_DELETE = 'users:delete',
  USERS_ROLE_CHANGE = 'users:role:change',
  USERS_PASSWORD_RESET = 'users:password:reset',
  USERS_ACTIVATE = 'users:activate',
  USERS_DEACTIVATE = 'users:deactivate',
  
  // Documentos
  DOCUMENTS_READ = 'documents:read',
  DOCUMENTS_UPLOAD = 'documents:upload',
  DOCUMENTS_DELETE = 'documents:delete',
  DOCUMENTS_SIGN = 'documents:sign',
  DOCUMENTS_DOWNLOAD = 'documents:download',
  
  // Reportes
  REPORTS_VIEW_BASIC = 'reports:view:basic',
  REPORTS_VIEW_DETAILED = 'reports:view:detailed',
  REPORTS_VIEW_AUDIT = 'reports:view:audit',
  REPORTS_EXPORT = 'reports:export',
  
  // Configuración
  CONFIG_READ = 'config:read',
  CONFIG_UPDATE = 'config:update',
  
  // Auditoría
  AUDIT_READ = 'audit:read',
  AUDIT_EXPORT = 'audit:export',
}

/**
 * Permisos por rol (configuración por defecto)
 */
export const ROLE_PERMISSIONS: Record<RoleCode, Permission[]> = {
  [RoleCode.ADMIN]: [
    ...Object.values(Permission),
  ],

  [RoleCode.DIRECTOR]: [
    Permission.CASES_READ_ALL,
    Permission.CASES_CREATE,
    Permission.CASES_UPDATE,
    Permission.CASES_ASSIGN,
    Permission.CASES_REASSIGN,
    Permission.CASES_STATE_CHANGE,
    Permission.CASES_CLOSE,
    Permission.CASES_APPROVE,
    Permission.CASES_REJECT,
    Permission.DOCUMENTS_READ,
    Permission.DOCUMENTS_UPLOAD,
    Permission.DOCUMENTS_SIGN,
    Permission.DOCUMENTS_DOWNLOAD,
    Permission.USERS_READ,
    Permission.USERS_CREATE,
    Permission.USERS_UPDATE,
    Permission.REPORTS_VIEW_DETAILED,
    Permission.REPORTS_EXPORT,
    Permission.AUDIT_READ,
  ],

  [RoleCode.ASIGNACION_DE_CASOS]: [
    Permission.CASES_READ_ALL,
    Permission.CASES_ASSIGN,
    Permission.USERS_READ,
  ],

  [RoleCode.FUNCIONARIO]: [
    Permission.CASES_READ_ASSIGNED,
    Permission.CASES_CREATE,
    Permission.CASES_UPDATE,
    Permission.CASES_STATE_CHANGE,
    Permission.CASES_CLOSE,
    Permission.CASES_APPROVE,
    Permission.DOCUMENTS_READ,
    Permission.DOCUMENTS_UPLOAD,
    Permission.DOCUMENTS_SIGN,
    Permission.DOCUMENTS_DOWNLOAD,
    Permission.REPORTS_VIEW_BASIC,
  ],

  [RoleCode.VENTANILLA_UNICA]: [
    Permission.CASES_READ_ALL,
    Permission.CASES_CREATE,
    Permission.CASES_UPDATE,
    Permission.CASES_REASSIGN,
    Permission.CASES_STATE_CHANGE,
    Permission.DOCUMENTS_READ,
    Permission.DOCUMENTS_UPLOAD,
    Permission.DOCUMENTS_DOWNLOAD,
    Permission.USERS_READ,
  ],

  [RoleCode.AUXILIAR_ATENCION_USUARIO]: [
    Permission.CASES_READ_ALL,
    Permission.DOCUMENTS_READ,
    Permission.DOCUMENTS_DOWNLOAD,
  ],

  [RoleCode.CIUDADANO]: [
    Permission.CASES_READ_OWN,
    Permission.CASES_CREATE,
    Permission.DOCUMENTS_READ,
    Permission.DOCUMENTS_UPLOAD,
  ],
};

// ============================================================================
// TIPOS DE DOCUMENTO
// ============================================================================

/**
 * Tipos de identificación válidos en Colombia
 */
export enum DocumentType {
  CC = 'CC',   // Cédula de Ciudadanía
  CE = 'CE',   // Cédula de Extranjería
  TI = 'TI',   // Tarjeta de Identidad
  RC = 'RC',   // Registro Civil
  PA = 'PA',   // Pasaporte
  PEP = 'PEP', // Permiso Especial de Permanencia
  PPT = 'PPT', // Permiso por Protección Temporal
}

// ============================================================================
// ACCIONES DE AUDITORÍA
// ============================================================================

/**
 * Acciones auditables en el sistema
 */
export enum AuditAction {
  // Autenticación
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  
  // CRUD
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  
  // Casos
  CASE_CREATE = 'CASE_CREATE',
  CASE_UPDATE = 'CASE_UPDATE',
  CASE_STATE_CHANGE = 'CASE_STATE_CHANGE',
  CASE_ASSIGN = 'CASE_ASSIGN',
  CASE_REASSIGN = 'CASE_REASSIGN',
  CASE_CLOSE = 'CASE_CLOSE',
  CASE_REOPEN = 'CASE_REOPEN',
  CASE_TERMS_SUSPEND = 'CASE_TERMS_SUSPEND',
  CASE_TERMS_RESUME = 'CASE_TERMS_RESUME',
  
  // Documentos
  DOCUMENT_UPLOAD = 'DOCUMENT_UPLOAD',
  DOCUMENT_DOWNLOAD = 'DOCUMENT_DOWNLOAD',
  DOCUMENT_DELETE = 'DOCUMENT_DELETE',
  DOCUMENT_SIGN = 'DOCUMENT_SIGN',
  
  // Usuarios
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  USER_ROLE_CHANGE = 'USER_ROLE_CHANGE',
  USER_ACTIVATE = 'USER_ACTIVATE',
  USER_DEACTIVATE = 'USER_DEACTIVATE',
  
  // Reportes
  REPORT_GENERATE = 'REPORT_GENERATE',
  REPORT_EXPORT = 'REPORT_EXPORT',
  
  // Configuración
  CONFIG_UPDATE = 'CONFIG_UPDATE',
  
  // Seguridad
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
}

// ============================================================================
// TÉRMINOS LEGALES
// ============================================================================

/**
 * Términos legales por tipo de caso (días hábiles)
 * Según Ley 1755/2015 y normativa aplicable
 */
export const LEGAL_TERMS: Record<string, number> = {
  // Derecho de Petición
  [CaseTypeCode.DERECHO_PETICION]: 15,
  [CaseTypeCode.DERECHO_PETICION_INFO]: 10,
  [CaseTypeCode.DERECHO_PETICION_CONSULTA]: 30,
  
  // Tutela (seguimiento)
  [CaseTypeCode.TUTELA]: 10,
  [CaseTypeCode.TUTELA_SALUD]: 10,
  
  // Quejas
  [CaseTypeCode.QUEJA_DISCIPLINARIA]: 30,
  
  // Víctimas
  [CaseTypeCode.ATENCION_VICTIMAS]: 1, // Atención inmediata
  
  // PQRS
  [CaseTypeCode.PQRS_PETICION]: 15,
  [CaseTypeCode.PQRS_QUEJA]: 15,
  [CaseTypeCode.PQRS_RECLAMO]: 15,
  [CaseTypeCode.PQRS_SUGERENCIA]: 15,
  
  // Otros
  [CaseTypeCode.CONSULTA]: 15,
  [CaseTypeCode.ACOMPANAMIENTO]: 5,
};

// ============================================================================
// REFERENCIAS LEGALES
// ============================================================================

/**
 * Referencias normativas por tipo de caso
 */
export const LEGAL_REFERENCES: Record<string, string> = {
  [CaseTypeCode.DERECHO_PETICION]: 'Ley 1755 de 2015, Art. 14',
  [CaseTypeCode.DERECHO_PETICION_INFO]: 'Ley 1755 de 2015, Art. 14',
  [CaseTypeCode.DERECHO_PETICION_CONSULTA]: 'Ley 1755 de 2015, Art. 14',
  [CaseTypeCode.TUTELA]: 'Decreto 2591 de 1991, Art. 29',
  [CaseTypeCode.TUTELA_SALUD]: 'Decreto 2591 de 1991, Art. 29',
  [CaseTypeCode.QUEJA_DISCIPLINARIA]: 'Ley 1952 de 2019',
  [CaseTypeCode.ATENCION_VICTIMAS]: 'Ley 1448 de 2011',
  [CaseTypeCode.PQRS_PETICION]: 'Ley 1437 de 2011, Art. 14',
  [CaseTypeCode.PQRS_QUEJA]: 'Ley 1437 de 2011',
  [CaseTypeCode.PQRS_RECLAMO]: 'Ley 1437 de 2011',
  [CaseTypeCode.PQRS_SUGERENCIA]: 'Ley 1437 de 2011',
};

// ============================================================================
// SEMÁFORO DE TÉRMINOS
// ============================================================================

/**
 * Colores para semáforo de términos
 */
export enum TermStatus {
  GREEN = 'GREEN',   // > 30% del término restante
  YELLOW = 'YELLOW', // 10-30% del término restante
  RED = 'RED',       // < 10% del término restante
  BLACK = 'BLACK',   // Vencido
}

/**
 * Calcula el estado del semáforo según días restantes
 */
export function getTermStatus(daysRemaining: number, totalDays: number): TermStatus {
  if (daysRemaining < 0) {
    return TermStatus.BLACK;
  }
  
  const percentage = (daysRemaining / totalDays) * 100;
  
  if (percentage < 10) {
    return TermStatus.RED;
  } else if (percentage < 30) {
    return TermStatus.YELLOW;
  } else {
    return TermStatus.GREEN;
  }
}

// ============================================================================
// TIPOS COMUNES
// ============================================================================

/**
 * Respuesta estándar de API
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

/**
 * Respuesta paginada
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Filtros comunes
 */
export interface BaseFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

/**
 * Rango de fechas
 */
export interface DateRange {
  from: Date;
  to: Date;
}
