/**
 * Esquemas Zod para validación de autenticación
 * FASE 2: Radicación Digital Formal
 */

import { z } from 'zod';

/**
 * Schema para login
 */
export const loginSchema = z.object({
  email: z
    .string({
      required_error: 'El email es requerido',
    })
    .email('Email inválido')
    .toLowerCase()
    .trim(),
  password: z
    .string({
      required_error: 'La contraseña es requerida',
    })
    .min(1, 'La contraseña es requerida'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Schema para registro de funcionarios
 * Solo ADMIN puede crear usuarios
 */
export const registerSchema = z.object({
  email: z
    .string({
      required_error: 'El email es requerido',
    })
    .email('Email inválido')
    .toLowerCase()
    .trim(),
  password: z
    .string({
      required_error: 'La contraseña es requerida',
    })
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
    ),
  fullName: z
    .string({
      required_error: 'El nombre completo es requerido',
    })
    .min(2, 'El nombre completo debe tener al menos 2 caracteres')
    .max(200, 'El nombre completo no puede exceder 200 caracteres')
    .trim(),
  documentType: z.enum(['CC', 'CE', 'PA', 'TI'], {
    errorMap: () => ({ message: 'Tipo de documento inválido' }),
  }),
  documentNumber: z
    .string({
      required_error: 'El número de documento es requerido',
    })
    .min(5, 'Número de documento inválido')
    .max(20, 'Número de documento inválido')
    .trim(),
  roleCode: z.enum(['ADMIN', 'FUNCIONARIO'], {
    errorMap: () => ({ message: 'Rol inválido' }),
  }),
  department: z
    .string()
    .min(3)
    .max(100)
    .trim()
    .optional(),
  position: z
    .string()
    .min(3)
    .max(100)
    .trim()
    .optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Schema para cambio de contraseña
 */
export const changePasswordSchema = z.object({
  currentPassword: z
    .string({
      required_error: 'La contraseña actual es requerida',
    })
    .min(1, 'La contraseña actual es requerida'),
  newPassword: z
    .string({
      required_error: 'La nueva contraseña es requerida',
    })
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
    ),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
