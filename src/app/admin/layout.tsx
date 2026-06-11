/**
 * Layout del panel /admin
 * Protegido con autenticación. El chrome (sidebar + contenido) lo provee AdminShell;
 * el header público institucional NO se muestra aquí (ver ClientLayout).
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { authService } from '@/services/AuthService';
import { prisma } from '@/lib/prisma';
import AdminShell from './AdminShell';

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
  let tenantId = '';

  try {
    const payload = await authService.verifyToken(token.value);
    userRole = payload.roleCode;
    tenantId = payload.tenantId;

    if (userRole === 'CIUDADANO') {
      redirect('/');
    }
  } catch {
    redirect('/');
  }

  const tenant = tenantId
    ? await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, logoUrl: true } })
    : null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      <AdminShell
        userRole={userRole}
        tenantName={tenant?.name || 'Panel administrativo'}
        logoUrl={tenant?.logoUrl}
      >
        {children}
      </AdminShell>
    </div>
  );
}
