/**
 * Bandeja Personal - /admin/inbox
 * 
 * FASE 3 MÓDULO 3
 * 
 * FUNCIONARIO: Solo expedientes asignados
 * SUPERVISOR/ADMIN: Todos los expedientes
 */

import { cookies } from 'next/headers';
import { authService } from '@/services/AuthService';
import { inboxService } from '@/services/InboxService';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import InboxFilters from './components/InboxFilters';
import InboxTable from './components/InboxTable';

interface SearchParams {
  stateCode?: string;
  filedFrom?: string;
  filedTo?: string;
  assignedTo?: string;
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Obtener usuario autenticado
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token');

  if (!token) {
    redirect('/admin/login');
  }

  let userId = '';
  let userRole = '';

  try {
    const payload = await authService.verifyToken(token.value);
    userId = payload.userId;
    userRole = payload.roleCode;
  } catch {
    redirect('/admin/login');
  }

  // Obtener casos de la bandeja
  const result = await inboxService.getPersonalInbox(userId, userRole, {
    stateCode: searchParams.stateCode,
    filedFrom: searchParams.filedFrom,
    filedTo: searchParams.filedTo,
    assignedTo: searchParams.assignedTo,
  });

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
          📥 Bandeja Personal
        </h1>
        <p style={{ color: '#666' }}>
          {userRole === 'FUNCIONARIO'
            ? 'Expedientes asignados a mí'
            : 'Todos los expedientes del sistema'}
        </p>
      </div>

      {/* Pestañas de navegación */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '1.5rem',
        borderBottom: '2px solid #e5e7eb'
      }}>
        <Link
          href="/admin/inbox"
          style={{
            padding: '0.75rem 1.5rem',
            textDecoration: 'none',
            color: '#007bff',
            fontWeight: 600,
            borderBottom: '2px solid #007bff',
            marginBottom: '-2px',
          }}
        >
          Personal
        </Link>
        <Link
          href="/admin/inbox/pending"
          style={{
            padding: '0.75rem 1.5rem',
            textDecoration: 'none',
            color: '#666',
            fontWeight: 500,
          }}
        >
          Pendientes
        </Link>
        <Link
          href="/admin/inbox/overdue"
          style={{
            padding: '0.75rem 1.5rem',
            textDecoration: 'none',
            color: '#666',
            fontWeight: 500,
          }}
        >
          Vencidos
        </Link>
      </div>

      {/* Filtros */}
      <InboxFilters userRole={userRole} />

      {/* Tabla de casos */}
      {result.success ? (
        <InboxTable cases={result.cases} />
      ) : (
        <div style={{ 
          padding: '2rem', 
          textAlign: 'center', 
          color: '#999',
          backgroundColor: 'white',
          borderRadius: '8px',
        }}>
          <p>{result.error || 'Error al cargar bandeja'}</p>
        </div>
      )}
    </div>
  );
}
