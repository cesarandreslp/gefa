/**
 * AuthService - Servicio de autenticación para funcionarios
 * 
 * FASE 2: Autenticación y autorización
 * 
 * Responsabilidades:
 * - Registro de usuarios (funcionarios)
 * - Login con validación de credenciales
 * - Hash de contraseñas con bcrypt
 * - Generación de tokens JWT
 * - Validación de tokens
 * 
 * Roles soportados:
 * - ADMIN: Acceso total
 * - FUNCIONARIO: Acceso a gestión de casos
 */

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { generateToken, verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { User, Role } from '@prisma/client';

type UserWithRole = User & { role: Role };

const SALT_ROUNDS = 10;

export interface RegisterUserInput {
  tenantId?: string | null;
  email: string;
  password: string;
  fullName: string;
  documentType: string;
  documentNumber: string;
  roleCode: string; // Se buscará el rol por código
  department?: string;
  position?: string;
}

import { JWTPayload } from '@/lib/jwt';

export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    fullName: string;
    tenantId: string | null;
    role: {
      code: string;
      name: string;
      level: number;
    };
  };
  token?: string;
  error?: string;
}

export class AuthService {
  /**
   * Registra un nuevo usuario (funcionario)
   * Solo puede ser ejecutado por un ADMIN
   */
  async register(input: RegisterUserInput): Promise<{
    success: boolean;
    user?: {
      id: string;
      email: string;
      fullName: string;
      isActive: boolean;
      role: {
        code: string;
        name: string;
      };
      createdAt: Date;
    };
    error?: string;
  }> {
    try {
      // 1. Verificar si el email ya existe DENTRO del mismo tenant
      const existingUser = await prisma.user.findFirst({
        where: { email: input.email, tenantId: input.tenantId || undefined },
      });

      if (existingUser) {
        return {
          success: false,
          error: 'Email already exists',
        };
      }

      // 2. Verificar si el documento ya existe DENTRO del mismo tenant
      const existingDoc = await prisma.user.findFirst({
        where: { documentNumber: input.documentNumber, tenantId: input.tenantId || undefined },
      });

      if (existingDoc) {
        return {
          success: false,
          error: 'Document number already exists',
        };
      }

      // 2.5 Validación estricta del TenantId. SOLO SUPER_ADMIN puede no tener tenant
      if (!input.tenantId && input.roleCode !== 'SUPER_ADMIN') {
        return {
          success: false,
          error: 'Un tenantId es estrictamente requerido para crear este rol',
        };
      }

      // 3. Buscar rol por código (scoped al tenant, o global si es SUPER_ADMIN)
      const role = await prisma.role.findFirst({
        where: { code: input.roleCode, tenantId: input.tenantId ?? null },
      });

      if (!role) {
        return {
          success: false,
          error: 'Invalid role code',
        };
      }

      // 4. Hash de la contraseña
      const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

      // 5. Crear usuario
      const user = await prisma.user.create({
        data: {
          tenantId: input.tenantId || undefined,
          email: input.email,
          passwordHash,
          fullName: input.fullName,
          documentType: input.documentType,
          documentNumber: input.documentNumber,
          roleId: role.id,
          department: input.department,
          position: input.position,
          isActive: true,
        },
        include: {
          role: true,
        },
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          isActive: user.isActive,
          role: {
            code: user.role?.code || 'UNKNOWN',
            name: user.role?.name || 'Sin rol',
          },
          createdAt: user.createdAt,
        },
      };
    } catch (error) {
      console.error('Error en register:', error);
      return {
        success: false,
        error: 'Internal error during registration',
      };
    }
  }

  /**
   * Autentica un usuario con email y contraseña
   * Retorna un JWT si las credenciales son válidas
   */
  async login(email: string, password: string, tenantId?: string, db?: PrismaClient): Promise<AuthResponse> {
    const tenantDb = db ?? prisma;
    try {
      // 1. Buscar usuario por email en la BD del tenant
      let user = await tenantDb.user.findFirst({
        where: {
          email,
          ...(tenantId ? { tenantId } : {}),
        },
        include: {
          role: true,
        },
      });

      // 1.1 Validar que el usuario pertenece al tenant solicitado
      if (user && tenantId && user.tenantId !== tenantId) {
        return {
          success: false,
          error: 'User does not belong to this entity',
        };
      }

      // 1.2 Si no encontró usuario, buscar SUPER_ADMIN en la BD principal
      if (!user && tenantId) {
        user = await prisma.user.findFirst({
          where: {
            email,
            tenantId: null,
            role: { code: 'SUPER_ADMIN' },
          },
          include: {
            role: true,
          },
        });
      }

      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      // 2. Verificar que el usuario está activo
      if (!user.isActive) {
        return {
          success: false,
          error: 'User is inactive',
        };
      }

      // 3. Comparar contraseña
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      // 4. Actualizar último login
      await tenantDb.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // 5. Generar JWT
      const token = await this.generateToken(user as UserWithRole);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          tenantId: user.tenantId,
          role: {
            code: user.role?.code || 'UNKNOWN',
            name: user.role?.name || 'Sin rol',
            level: user.role?.level || 0,
          },
        },
        token,
      };
    } catch (error) {
      console.error('Error en login:', error);
      return {
        success: false,
        error: 'Internal error during login',
      };
    }
  }

  /**
   * Genera un token JWT para un usuario
   */
  async generateToken(user: UserWithRole): Promise<string> {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      roleCode: user.role?.code || 'UNKNOWN',
      roleName: user.role?.name || 'Sin rol',
      tenantId: user.tenantId || '', // JWT espera string, '' significa root domain para JWT types
    };

    return await generateToken(payload);
  }

  /**
   * Verifica un token JWT
   */
  async verifyToken(token: string): Promise<JWTPayload> {
    return await verifyToken(token);
  }

  /**
   * Busca un usuario por ID
   */
  async findById(userId: string, tenantId: string, db?: PrismaClient) {
    const tenantDb = db ?? prisma;
    const searchTenantId = tenantId === '' ? null : tenantId;
    return tenantDb.user.findFirst({
      where: { id: userId, tenantId: searchTenantId as any },
      include: {
        role: true,
      },
    });
  }

  /**
   * Busca un usuario por email
   */
  async findByEmail(email: string, tenantId: string) {
    const searchTenantId = tenantId === '' ? null : tenantId;
    return prisma.user.findFirst({
      where: { email, tenantId: searchTenantId as any },
      include: {
        role: true,
      },
    });
  }

  /**
   * Desactiva un usuario
   */
  async deactivateUser(userId: string, tenantId: string) {
    return prisma.user.updateMany({
      where: { id: userId, tenantId },
      data: { isActive: false },
    });
  }

  /**
   * Activa un usuario
   */
  async activateUser(userId: string, tenantId: string) {
    return prisma.user.updateMany({
      where: { id: userId, tenantId },
      data: { isActive: true },
    });
  }

  /**
   * Cambia la contraseña de un usuario
   */
  async changePassword(userId: string, tenantId: string, currentPassword: string, newPassword: string) {
    // 1. Obtener usuario
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // 2. Verificar contraseña actual
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error('Contraseña actual incorrecta');
    }

    // 3. Hash de nueva contraseña
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // 4. Actualizar contraseña
    await prisma.user.updateMany({
      where: { id: userId, tenantId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        mustChangePassword: false,
      },
    });

    return { success: true };
  }

  /**
   * Lista todos los usuarios (para ADMIN)
   */
  async listUsers(tenantId: string, filters?: { isActive?: boolean; roleCode?: string }) {
    const where: { tenantId: string; isActive?: boolean; role?: { code: string } } = { tenantId };

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.roleCode) {
      where.role = { code: filters.roleCode };
    }

    return prisma.user.findMany({
      where,
      include: {
        role: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

// Singleton
export const authService = new AuthService();
