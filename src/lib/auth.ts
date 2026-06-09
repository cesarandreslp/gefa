/**
 * Middleware de autenticación y autorización
 * 
 * FASE 2: Protección de rutas y endpoints
 * 
 * Funciones:
 * - Extrae y valida JWT de cookies o headers
 * - Verifica que el usuario existe y está activo
 * - Verifica roles necesarios
 * - Adjunta información del usuario al request
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authService } from '@/services/AuthService';
import { prisma } from '@/lib/prisma';
import { getTenantFromRequest } from '@/lib/tenantResolver';
import { getTenantPrisma, getPrismaForTenant } from '@/lib/tenantDb';

/**
 * Normaliza un código de rol quitando el sufijo de tenant y mapeando nombres legacy.
 * Ej: DIRECTOR_ENCARGADO_PMGUC -> DIRECTOR  (legacy → estándar)
 *     PERSONERO_MUNICIPAL      -> DIRECTOR  (legacy → estándar)
 *     DIRECTOR                 -> DIRECTOR
 *     ADMIN                    -> ADMIN
 */
export function getBaseRoleCode(code: string): string {
  // Mapa de códigos legacy al código estándar equivalente
  const LEGACY_TO_STANDARD: Record<string, string> = {
    DIRECTOR_ENCARGADO: 'DIRECTOR',
    PERSONERO_MUNICIPAL: 'DIRECTOR',
    REVISOR: 'DIRECTOR',
    FUNCIONARIO_REGULAR: 'FUNCIONARIO',
  };

  const standardCodes = [
    'AUXILIAR_ATENCION_USUARIO', 'AUXILIAR', 'ASIGNACION_DE_CASOS', 'DIRECTOR',
    'VENTANILLA_UNICA', 'FUNCIONARIO', 'ADMIN', 'SUPER_ADMIN',
  ];

  // Primero intentar coincidencia exacta con códigos estándar
  if (standardCodes.includes(code)) return code;

  // Luego intentar coincidencia exacta con legacy
  if (LEGACY_TO_STANDARD[code]) return LEGACY_TO_STANDARD[code];

  // Finalmente probar quitando sufijo de tenant (_SIGLA)
  for (const legacy of Object.keys(LEGACY_TO_STANDARD)) {
    if (code.startsWith(legacy + '_')) return LEGACY_TO_STANDARD[legacy];
  }
  for (const standard of standardCodes) {
    if (code.startsWith(standard + '_')) return standard;
  }

  return code;
}

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string;
    email: string;
    roleCode: string;
    roleName: string;
    tenantId: string;
  };
}

/**
 * Extrae el token JWT del request
 * Busca en cookies (auth-token) o en header Authorization
 */
export function extractToken(request: NextRequest): string | null {
  // 1. Buscar en cookies
  const cookieToken = request.cookies.get('auth-token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  // 2. Buscar en header Authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Middleware de autenticación
 * Valida que el usuario esté autenticado
 */
export async function requireAuth(request: NextRequest): Promise<{
  authenticated: boolean;
  user?: {
    userId: string;
    email: string;
    roleCode: string;
    roleName: string;
    tenantId: string;
  };
  error?: string;
}> {
  const token = extractToken(request);

  if (!token) {
    return {
      authenticated: false,
      error: 'No token provided',
    };
  }

  try {
    // Validar token
    const payload = await authService.verifyToken(token);

    // Resolver BD del tenant para verificar el usuario
    let tenantDb: PrismaClient = prisma;
    if (payload.tenantId) {
      try {
        tenantDb = await getPrismaForTenant(payload.tenantId, prisma);
      } catch {
        // Si no hay BD configurada para el tenant, usar la principal (SUPER_ADMIN)
      }
    }

    // Verificar que el usuario existe y está activo
    const user = await authService.findById(payload.userId, payload.tenantId, tenantDb);

    if (!user || !user.isActive) {
      return {
        authenticated: false,
        error: 'User inactive or not found',
      };
    }

    return {
      authenticated: true,
      user: {
        userId: payload.userId,
        email: payload.email,
        roleCode: payload.roleCode,
        roleName: payload.roleName,
        tenantId: payload.tenantId,
      },
    };
  } catch {
    return {
      authenticated: false,
      error: 'Invalid or expired token',
    };
  }
}

/**
 * Middleware de autorización por rol
 * Verifica que el usuario tenga uno de los roles permitidos
 */
export function requireRole(
  userRoleCode: string,
  allowedRoles: string[]
): boolean {
  return allowedRoles.includes(userRoleCode);
}

/**
 * Mapa de niveles jerárquicos a roles base del sistema.
 * Cuando un usuario tiene un rol personalizado, su nivel determina
 * a qué rol base equivale para efectos de permisos.
 *
 * Nivel 100 = ADMIN / DIRECTOR
 * Nivel 90  = ASIGNACION_DE_CASOS
 * Nivel 85  = FUNCIONARIO
 * Nivel 80  = VENTANILLA_UNICA
 * Nivel 75  = AUXILIAR_ATENCION_USUARIO
 */
const LEVEL_TO_BASE_ROLES: Record<number, string[]> = {
  1000: ['SUPER_ADMIN'],
  100: ['ADMIN', 'DIRECTOR'],
  90: ['ASIGNACION_DE_CASOS'],
  85: ['FUNCIONARIO'],
  80: ['VENTANILLA_UNICA'],
  75: ['AUXILIAR_ATENCION_USUARIO'],
  30: ['AUXILIAR'],
};

/**
 * Helper para proteger endpoints de API
 * Uso: const auth = await protectAPIRoute(request, ['ADMIN', 'FUNCIONARIO']);
 * 
 * Soporta roles personalizados: si el código exacto del rol no está en la lista,
 * se consulta el nivel jerárquico del rol en la base de datos y se verifica
 * si el nivel corresponde a un rol base permitido.
 */
export async function protectAPIRoute(
  request: NextRequest,
  allowedRoles?: string[],
  options: { substituteAuxiliar?: boolean } = { substituteAuxiliar: true }
): Promise<{
  authorized: boolean;
  user?: {
    userId: string;
    email: string;
    roleCode: string;
    roleName: string;
    tenantId: string;
    isAuxiliar?: boolean;
    realUserId?: string;
  };
  /** Cliente Prisma conectado a la BD del tenant del usuario. Usar en lugar del prisma global. */
  db: PrismaClient;
  response?: NextResponse;
}> {
  const authResult = await requireAuth(request);

  if (!authResult.authenticated) {
    return {
      authorized: false,
      db: prisma,
      response: NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Autenticación requerida' } },
        { status: 401 }
      ),
    };
  }

  // Resolver la BD del tenant. SUPER_ADMIN usa la BD principal.
  let tenantDb: PrismaClient = prisma;
  if (authResult.user!.roleCode !== 'SUPER_ADMIN') {
    const currentTenant = await getTenantFromRequest(request);

    // Validación CRÍTICA: impedir fuga de datos entre tenants
    if (!currentTenant || authResult.user!.tenantId !== currentTenant.id) {
      return {
        authorized: false,
        db: prisma,
        response: NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED_DOMAIN', message: 'Su usuario no pertenece a la entidad de este dominio.' } },
          { status: 403 }
        ),
      };
    }

    // Obtener cliente Prisma de la BD propia del tenant
    // (databaseUrl fue agregado al schema — cast necesario hasta que el TS server refresque)
    const dbUrl = (currentTenant as unknown as { databaseUrl?: string }).databaseUrl;
    if (dbUrl) {
      tenantDb = getTenantPrisma(dbUrl);
    }
  }

  // Si se especificaron roles, verificar
  if (allowedRoles && allowedRoles.length > 0) {
    let hasRole = requireRole(authResult.user!.roleCode, allowedRoles);

    // Si el código exacto no coincide, verificar por nivel jerárquico del rol
    if (!hasRole) {
      try {
        const userRole = await tenantDb.role.findFirst({
          where: { code: authResult.user!.roleCode, tenantId: authResult.user!.tenantId },
          select: { level: true, code: true },
        });

        if (userRole) {
          const baseRolesForLevel = LEVEL_TO_BASE_ROLES[userRole.level];
          if (baseRolesForLevel) {
            hasRole = baseRolesForLevel.some(baseRole => allowedRoles.includes(baseRole));
          }
          console.log(
            '🔐 AUTH CHECK (by level) - User roleCode:', authResult.user!.roleCode,
            '| Level:', userRole.level,
            '| Base roles:', baseRolesForLevel,
            '| Allowed:', allowedRoles,
            '| Result:', hasRole ? 'GRANTED' : 'DENIED'
          );
        }
      } catch (error) {
        console.error('Error checking role level:', error);
      }
    }

    if (!hasRole) {
      return {
        authorized: false,
        db: tenantDb,
        response: NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'No tiene permisos para esta acción' } },
          { status: 403 }
        ),
      };
    }
  }

  // Si el usuario es AUXILIAR y la opción está activa, operar como el supervisor
  const effectiveUser: {
    userId: string; email: string; roleCode: string; roleName: string; tenantId: string;
    isAuxiliar?: boolean; realUserId?: string;
  } = { ...authResult.user! };
  if ((options.substituteAuxiliar ?? true) && authResult.user!.roleCode === 'AUXILIAR') {
    try {
      const auxiliar = await tenantDb.user.findFirst({
        where: { id: authResult.user!.userId },
        select: {
          supervisorId: true,
          supervisor: { select: { id: true, role: { select: { code: true, name: true } } } },
        },
      });
      if (auxiliar?.supervisorId && auxiliar.supervisor) {
        effectiveUser.realUserId  = authResult.user!.userId;
        effectiveUser.isAuxiliar  = true;
        effectiveUser.userId      = auxiliar.supervisorId;
        effectiveUser.roleCode    = auxiliar.supervisor.role?.code ?? 'FUNCIONARIO';
        effectiveUser.roleName    = auxiliar.supervisor.role?.name ?? 'Funcionario';
      }
    } catch (err) {
      console.error('Error resolviendo supervisor de auxiliar:', err);
    }
  }

  return {
    authorized: true,
    user: effectiveUser,
    db: tenantDb,
  };
}

/**
 * Helper para crear respuesta con cookie de autenticación
 */
export function setAuthCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    // Sin maxAge ni expires → cookie de sesión: se elimina al cerrar el navegador
    path: '/',
  });

  return response;
}

/**
 * Helper para eliminar cookie de autenticación
 */
export function clearAuthCookie(response: NextResponse): NextResponse {
  response.cookies.delete('auth-token');
  return response;
}
