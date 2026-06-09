/**
 * ============================================================================
 * CONSTANTES DEL SISTEMA
 * ============================================================================
 * Valores constantes utilizados en todo el sistema.
 * Centraliza configuración para facilitar mantenimiento.
 * 
 * Fecha: Enero 8, 2026
 * ============================================================================
 */

// ============================================================================
// INFORMACIÓN INSTITUCIONAL
// ============================================================================

export const INSTITUTION = {
  NAME: process.env.INSTITUTION_NAME || 'GEFA — Gestión Familiar',
  NIT: process.env.INSTITUTION_NIT || '',
  ADDRESS: process.env.INSTITUTION_ADDRESS || '',
  CITY: process.env.INSTITUTION_CITY || '',
  DEPARTMENT: process.env.INSTITUTION_DEPARTMENT || '',
  PHONE: process.env.INSTITUTION_PHONE || '',
  EMAIL: process.env.INSTITUTION_EMAIL || 'sistema@ventanillaunica.gov.co',
  WEBSITE: process.env.INSTITUTION_WEBSITE || '',
} as const;

// ============================================================================
// CONFIGURACIÓN DE API
// ============================================================================

export const API_CONFIG = {
  VERSION: process.env.API_VERSION || 'v1',
  BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
  TIMEOUT: 30000, // 30 segundos
} as const;

// ============================================================================
// SEGURIDAD
// ============================================================================

export const SECURITY = {
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'CHANGE_IN_PRODUCTION',
  JWT_EXPIRATION: process.env.JWT_EXPIRATION || '24h',
  REFRESH_TOKEN_EXPIRATION: process.env.REFRESH_TOKEN_EXPIRATION || '7d',
  
  // Contraseñas
  BCRYPT_ROUNDS: 12,
  MIN_PASSWORD_LENGTH: 12,
  PASSWORD_CHANGE_DAYS: 90,
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 min
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  
  // Login
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
  ACCOUNT_LOCK_TIME_MINUTES: parseInt(process.env.ACCOUNT_LOCK_TIME_MINUTES || '60'),
} as const;

// ============================================================================
// ARCHIVOS
// ============================================================================

export const FILES = {
  MAX_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '25'),
  MAX_SIZE_BYTES: parseInt(process.env.MAX_FILE_SIZE_MB || '25') * 1024 * 1024,
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'local',
  STORAGE_PATH: process.env.STORAGE_PATH || './uploads',
  
  // Tipos MIME permitidos
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'audio/mpeg',
    'audio/mp3',
    'video/mp4',
  ],
  
  // Extensiones permitidas
  ALLOWED_EXTENSIONS: [
    '.pdf',
    '.jpg',
    '.jpeg',
    '.png',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.mp3',
    '.mp4',
  ],
} as const;

// ============================================================================
// NOTIFICACIONES
// ============================================================================

export const NOTIFICATIONS = {
  // Email
  EMAIL_FROM: process.env.EMAIL_FROM || INSTITUTION.EMAIL,
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || INSTITUTION.NAME,
  
  // Reintentos
  MAX_ATTEMPTS: 3,
  RETRY_DELAY_MS: 5000, // 5 segundos
} as const;

// ============================================================================
// TÉRMINOS LEGALES
// ============================================================================

export const LEGAL_TERMS_CONFIG = {
  // Días laborables
  FIRST_BUSINESS_DAY: parseInt(process.env.FIRST_BUSINESS_DAY || '1'), // Lunes
  LAST_BUSINESS_DAY: parseInt(process.env.LAST_BUSINESS_DAY || '5'),   // Viernes
  
  // Alertas de vencimiento
  ALERT_DAYS_BEFORE: [1, 3, 5], // Alertar con 1, 3 y 5 días de anticipación
  
  // Umbrales de semáforo (porcentaje del término)
  GREEN_THRESHOLD: 30,  // > 30% restante
  YELLOW_THRESHOLD: 10, // 10-30% restante
  RED_THRESHOLD: 0,     // < 10% restante (y no vencido)
} as const;

// ============================================================================
// PRIORIZACIÓN
// ============================================================================

export const PRIORITY_WEIGHTS = {
  // Base según criterio
  BASE_PRIORITY: {
    CRITICA: 100,
    ALTA: 80,
    URGENTE: 60,
    NORMAL: 40,
    INFORMATIVA: 20,
  },
  
  // Factores adicionales
  OVERDUE_FACTOR: 2,           // Multiplica días de vencimiento
  REINCIDENCE_BONUS: 10,       // Bonus por reincidencia (>3 casos)
} as const;

// ============================================================================
// PAGINACIÓN
// ============================================================================

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

// ============================================================================
// FORMATOS
// ============================================================================

export const FORMATS = {
  // Fechas
  DATE_FORMAT: 'yyyy-MM-dd',
  DATETIME_FORMAT: 'yyyy-MM-dd HH:mm:ss',
  TIME_FORMAT: 'HH:mm:ss',
  
  // Números de radicación (ahora dinámico por tenant)
  FILING_NUMBER_PREFIX: 'VU', // Fallback genérico, se reemplaza por tenant.sigla
  FILING_NUMBER_FORMAT: '{SIGLA}-{YEAR}-{NUMBER}', // Ej: ENTIDAD-2026-00001
  FILING_NUMBER_PADDING: 5, // 5 dígitos
} as const;

// ============================================================================
// LÍMITES DE CARGA
// ============================================================================

export const WORKLOAD = {
  // Máximo de casos activos por funcionario
  MAX_ACTIVE_CASES: 50,
  
  // Peso de casos por estado (para cálculo de carga)
  CASE_WEIGHTS: {
    RADICADO: 0.5,
    ASIGNADO: 1.0,
    EN_GESTION: 1.5,
    EN_REVISION: 1.0,
    EN_FIRMA: 0.5,
    REQUIERE_INFO: 0.3,
    CERRADO: 0,
  },
  
  // Factor adicional por proximidad a vencimiento
  NEAR_DUE_FACTOR: 1.5, // Casos con <3 días pesan más
} as const;

// ============================================================================
// LOGGING
// ============================================================================

export const LOGGING = {
  LEVEL: process.env.LOG_LEVEL || 'info',
  TO_FILE: process.env.LOG_TO_FILE === 'true',
  FILE_PATH: process.env.LOG_FILE_PATH || './logs',
} as const;

// ============================================================================
// MENSAJES DE ERROR
// ============================================================================

export const ERROR_MESSAGES = {
  // Autenticación
  INVALID_CREDENTIALS: 'Credenciales inválidas',
  ACCOUNT_LOCKED: 'Cuenta bloqueada temporalmente por múltiples intentos fallidos',
  ACCOUNT_INACTIVE: 'Cuenta inactiva. Contacte al administrador',
  SESSION_EXPIRED: 'Sesión expirada. Por favor inicie sesión nuevamente',
  UNAUTHORIZED: 'No autenticado',
  FORBIDDEN: 'No tiene permisos para realizar esta acción',
  
  // Validación
  REQUIRED_FIELD: 'Campo requerido',
  INVALID_FORMAT: 'Formato inválido',
  INVALID_EMAIL: 'Email inválido',
  INVALID_PHONE: 'Teléfono inválido',
  INVALID_DOCUMENT: 'Número de documento inválido',
  
  // Casos
  CASE_NOT_FOUND: 'Caso no encontrado',
  INVALID_STATE_TRANSITION: 'Transición de estado no permitida',
  CASE_ALREADY_CLOSED: 'El caso ya está cerrado',
  CASE_NOT_ASSIGNED: 'El caso no está asignado',
  
  // Usuarios
  USER_NOT_FOUND: 'Usuario no encontrado',
  USER_ALREADY_EXISTS: 'El usuario ya existe',
  EMAIL_ALREADY_EXISTS: 'El email ya está registrado',
  DOCUMENT_ALREADY_EXISTS: 'El documento ya está registrado',
  
  // Documentos
  DOCUMENT_NOT_FOUND: 'Documento no encontrado',
  FILE_TOO_LARGE: 'Archivo demasiado grande',
  INVALID_FILE_TYPE: 'Tipo de archivo no permitido',
  
  // Genérico
  INTERNAL_ERROR: 'Error interno del servidor',
  NOT_FOUND: 'Recurso no encontrado',
  BAD_REQUEST: 'Solicitud inválida',
} as const;

// ============================================================================
// MENSAJES DE ÉXITO
// ============================================================================

export const SUCCESS_MESSAGES = {
  CASE_CREATED: 'Caso radicado exitosamente',
  CASE_UPDATED: 'Caso actualizado exitosamente',
  CASE_ASSIGNED: 'Caso asignado exitosamente',
  CASE_CLOSED: 'Caso cerrado exitosamente',
  
  USER_CREATED: 'Usuario creado exitosamente',
  USER_UPDATED: 'Usuario actualizado exitosamente',
  USER_DELETED: 'Usuario eliminado exitosamente',
  
  DOCUMENT_UPLOADED: 'Documento cargado exitosamente',
  DOCUMENT_DELETED: 'Documento eliminado exitosamente',
  
  PASSWORD_CHANGED: 'Contraseña cambiada exitosamente',
  PASSWORD_RESET: 'Contraseña restablecida exitosamente',
  
  NOTIFICATION_SENT: 'Notificación enviada exitosamente',
} as const;

// ============================================================================
// CÓDIGOS DE ERROR HTTP
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============================================================================
// TIMEOUTS
// ============================================================================

export const TIMEOUTS = {
  API_REQUEST: 30000,      // 30 segundos
  DATABASE_QUERY: 10000,   // 10 segundos
  FILE_UPLOAD: 60000,      // 60 segundos
  EMAIL_SEND: 15000,       // 15 segundos
} as const;

// ============================================================================
// CACHE (Preparado para fase futura)
// ============================================================================

export const CACHE_TTL = {
  CASE_TYPES: 86400,      // 24 horas
  CASE_STATES: 86400,     // 24 horas
  ROLES: 86400,           // 24 horas
  PERMISSIONS: 3600,      // 1 hora
  USER_SESSION: 1800,     // 30 minutos
  METRICS: 300,           // 5 minutos
  HOLIDAYS: 86400,        // 24 horas
} as const;
