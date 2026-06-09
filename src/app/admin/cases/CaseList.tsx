/**
 * Tabla de casos
 */

import Link from 'next/link';

interface CaseListProps {
  cases: Array<{
    id: string;
    filingNumber: string;
    filedAt: Date;
    citizen: {
      firstName: string;
      firstLastName: string;
    };
    state: {
      name: string;
      color: string;
    };
  }>;
}

export default function CaseList({ cases }: CaseListProps) {
  if (cases.length === 0) {
    return (
      <div style={{ 
        backgroundColor: 'white', 
        padding: '2rem', 
        borderRadius: '8px',
        textAlign: 'center',
        color: '#666'
      }}>
        No se encontraron expedientes
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: '8px', 
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
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
          Lista de expedientes
        </caption>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <th scope="col" style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Radicado</th>
            <th scope="col" style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Ciudadano</th>
            <th scope="col" style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Fecha</th>
            <th scope="col" style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Estado</th>
            <th scope="col" style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id} style={{ borderBottom: '1px solid #dee2e6' }}>
              <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{c.filingNumber}</td>
              <td style={{ padding: '1rem' }}>
                {c.citizen.firstName} {c.citizen.firstLastName}
              </td>
              <td style={{ padding: '1rem' }}>
                {new Date(c.filedAt).toLocaleDateString('es-CO')}
              </td>
              <td style={{ padding: '1rem' }}>
                <span style={{ 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '12px', 
                  backgroundColor: c.state.color || '#6c757d',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  border: '1px solid rgba(0,0,0,0.1)'
                }}>
                  {c.state.name}
                </span>
              </td>
              <td style={{ padding: '1rem' }}>
                <Link 
                  href={`/admin/cases/${c.id}`}
                  style={{ 
                    color: '#007bff', 
                    textDecoration: 'none',
                    fontWeight: 500
                  }}
                >
                  Ver detalle →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
