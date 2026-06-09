'use client';

/**
 * Filtros para el listado de casos
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

interface CaseFiltersProps {
  states: Array<{ id: string; code: string; name: string }>;
}

export default function CaseFilters({ states }: CaseFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [stateFilter, setStateFilter] = useState(searchParams.get('state') || '');
  const [fromDate, setFromDate] = useState(searchParams.get('from') || '');
  const [toDate, setToDate] = useState(searchParams.get('to') || '');

  function handleFilter() {
    const params = new URLSearchParams();
    
    if (stateFilter) params.set('state', stateFilter);
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);

    router.push(`/admin/cases?${params.toString()}`);
  }

  function handleClear() {
    setStateFilter('');
    setFromDate('');
    setToDate('');
    router.push('/admin/cases');
  }

  return (
    <div style={{ 
      backgroundColor: 'white', 
      padding: '1.5rem', 
      borderRadius: '8px', 
      marginBottom: '1.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Filtros</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
            Estado
          </label>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.5rem', 
              border: '1px solid #ddd', 
              borderRadius: '4px'
            }}
          >
            <option value="">Todos</option>
            {states.map((state) => (
              <option key={state.id} value={state.code}>
                {state.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
            Desde
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.5rem', 
              border: '1px solid #ddd', 
              borderRadius: '4px'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
            Hasta
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.5rem', 
              border: '1px solid #ddd', 
              borderRadius: '4px'
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={handleFilter}
          style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Aplicar filtros
        </button>
        <button
          onClick={handleClear}
          style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}
