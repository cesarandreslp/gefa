/**
 * InboxTable - FASE 3 MÓDULO 3
 * 
 * Tabla de expedientes con indicadores SLA
 */

import Link from 'next/link';

interface CaseInboxItem {
  id: string;
  filingNumber: string;
  subject: string;
  citizenName: string;
  stateCode: string;
  stateName: string;
  stateColor: string;
  assignedTo: string | null;
  dueDate: Date;
  isOverdue: boolean;
  filedAt: Date;
  slaStatus: 'green' | 'yellow' | 'red';
}

const SLA_INDICATORS = {
  green: { emoji: '🟢', text: 'En tiempo', color: '#10b981' },
  yellow: { emoji: '🟡', text: 'Próximo a vencer', color: '#f59e0b' },
  red: { emoji: '🔴', text: 'Vencido', color: '#ef4444' },
};

export default function InboxTable({ cases }: { cases: CaseInboxItem[] }) {
  if (cases.length === 0) {
    return (
      <div style={{
        backgroundColor: 'white',
        padding: '3rem',
        borderRadius: '8px',
        textAlign: 'center',
        color: '#999',
      }}>
        <p style={{ fontSize: '1.125rem' }}>No hay expedientes en esta bandeja</p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      overflow: 'hidden',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <caption style={{ 
          position: 'absolute', 
          width: '1px', 
          height: '1px', 
          padding: 0, 
          margin: '-1px', 
          overflow: 'hidden', 
          clip: 'rect(0,0,0,0)', 
          whiteSpace: 'nowrap', 
          border: 0 
        }}>
          Bandeja de expedientes asignados
        </caption>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e5e7eb' }}>
            <th scope="col" style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>
              SLA
            </th>
            <th scope="col" style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>
              Radicado
            </th>
            <th scope="col" style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>
              Asunto
            </th>
            <th scope="col" style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>
              Ciudadano
            </th>
            <th scope="col" style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>
              Estado
            </th>
            <th scope="col" style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>
              Asignado a
            </th>
            <th scope="col" style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>
              Fecha límite
            </th>
          </tr>
        </thead>
        <tbody>
          {cases.map((caseItem) => {
            const indicator = SLA_INDICATORS[caseItem.slaStatus];
            return (
              <tr
                key={caseItem.id}
                style={{
                  borderBottom: '1px solid #e5e7eb',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {/* SLA Indicator */}
                <td style={{ padding: '1rem' }}>
                  <span
                    title={indicator.text}
                    aria-label={`Estado SLA: ${indicator.text}`}
                    style={{
                      fontSize: '1.5rem',
                      cursor: 'help',
                    }}
                  >
                    {indicator.emoji}
                  </span>
                </td>

                {/* Radicado */}
                <td style={{ padding: '1rem' }}>
                  <Link
                    href={`/admin/cases/${caseItem.id}`}
                    style={{
                      color: '#007bff',
                      textDecoration: 'none',
                      fontWeight: 500,
                      fontSize: '0.875rem',
                    }}
                  >
                    {caseItem.filingNumber}
                  </Link>
                </td>

                {/* Asunto */}
                <td style={{ padding: '1rem', fontSize: '0.875rem', maxWidth: '250px' }}>
                  <div style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {caseItem.subject}
                  </div>
                </td>

                {/* Ciudadano */}
                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                  {caseItem.citizenName}
                </td>

                {/* Estado */}
                <td style={{ padding: '1rem' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      backgroundColor: caseItem.stateColor + '20',
                      color: caseItem.stateColor,
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      border: `1px solid ${caseItem.stateColor}40`
                    }}
                  >
                    {caseItem.stateName}
                  </span>
                </td>

                {/* Asignado a */}
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#666' }}>
                  {caseItem.assignedTo || (
                    <span style={{ fontStyle: 'italic' }}>Sin asignar</span>
                  )}
                </td>

                {/* Fecha límite */}
                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                  <div style={{ color: indicator.color, fontWeight: 500 }}>
                    {new Date(caseItem.dueDate).toLocaleDateString('es-CO')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                    {caseItem.isOverdue ? 'VENCIDO' : indicator.text}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Resumen */}
      <div style={{
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderTop: '1px solid #e5e7eb',
        fontSize: '0.875rem',
        color: '#666',
      }}>
        Total: {cases.length} expediente{cases.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
