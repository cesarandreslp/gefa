/**
 * Layout del panel /admin
 * Protegido con autenticación
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { authService } from '@/services/AuthService';
import AdminNav from './AdminNav';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token');

  if (!token) {
    redirect('/');
  }

  let userRole = '';

  try {
    const payload = await authService.verifyToken(token.value);
    userRole = payload.roleCode;

    if (userRole === 'CIUDADANO') {
      redirect('/');
    }
  } catch {
    redirect('/');
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <AdminNav userRole={userRole} />
      <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}
