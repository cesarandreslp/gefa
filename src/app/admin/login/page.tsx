/**
 * Página de redirección post-login
 * Valida la cookie y redirige a /admin/home
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { authService } from '@/services/AuthService';

export default async function AdminLoginRedirect() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token');

  // Si tiene token válido, redirigir a admin/home
  if (token) {
    try {
      const payload = await authService.verifyToken(token.value);
      if (payload.roleCode === 'SECRETARIA_GOBIERNO') {
        redirect('/admin/seguimiento');
      }
      if (['ADMIN', 'DIRECTOR', 'FUNCIONARIO', 'SUPERVISOR', 'VENTANILLA_UNICA', 'ASIGNACION_DE_CASOS'].includes(payload.roleCode)) {
        redirect('/admin');
      }
    } catch {
      // Token inválido, mostrar error
    }
  }

  // Si no tiene token, volver al home
  redirect('/');
}
