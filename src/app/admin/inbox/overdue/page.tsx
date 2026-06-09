/**
 * Bandeja Vencidos - /admin/inbox/overdue
 * 
 * FASE 3 MÓDULO 3
 * 
 * Expedientes con fecha límite superada
 */

import { cookies } from 'next/headers';
import { authService } from '@/services/AuthService';
import { inboxService } from '@/services/InboxService';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import InboxFilters from '../components/InboxFilters';
import InboxTable from '../components/InboxTable';

interface SearchParams {
  stateCode?: string;
  filedFrom?: string;
  filedTo?: string;
  assignedTo?: string;
}

export default async function OverdueInboxPage({
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

  // Obtener casos vencidos
  const result = await inboxService.getOverdueInbox(userId, userRole, {
    stateCode: searchParams.stateCode,
    filedFrom: searchParams.filedFrom,
    filedTo: searchParams.filedTo,
    assignedTo: searchParams.assignedTo,
  });

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
          🔴 Bandeja de Vencidos
        </h1>
        <p style={{ color: '#666' }}>
          Expedientes que superaron su fecha límite
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
            color: '#666',
            fontWeight: 500,
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
            color: '#ef4444',
            fontWeight: 600,
            borderBottom: '2px solid #ef4444',
            marginBottom: '-2px',
          }}
        >
          Vencidos
        </Link>
      </div>

      {/* Filtros */}
      <InboxFilters userRole={userRole} />

      {/* Tabla de casos */}
      {result.success ? (
        <>
          {result.cases.length > 0 && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              color: '#991b1b',
              fontSize: '0.875rem',
            }}>
              ⚠️ Hay {result.cases.length} expediente{result.cases.length !== 1 ? 's' : ''} vencido{result.cases.length !== 1 ? 's' : ''}. Se recomienda priorizar su atención.
            </div>
          )}
          <InboxTable cases={result.cases} />
        </>
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
