/**
 * InboxFilters - FASE 3 MÓDULO 3
 * 
 * Filtros comunes para todas las bandejas
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function InboxFilters({ userRole }: { userRole: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [stateCode, setStateCode] = useState(searchParams.get('stateCode') || '');
  const [filedFrom, setFiledFrom] = useState(searchParams.get('filedFrom') || '');
  const [filedTo, setFiledTo] = useState(searchParams.get('filedTo') || '');
  const [assignedTo, setAssignedTo] = useState(searchParams.get('assignedTo') || '');

  const canFilterByAssignee = userRole === 'SUPERVISOR' || userRole === 'ADMIN' || userRole === 'DIRECTOR';

  const handleApply = () => {
    const params = new URLSearchParams();
    if (stateCode) params.set('stateCode', stateCode);
    if (filedFrom) params.set('filedFrom', filedFrom);
    if (filedTo) params.set('filedTo', filedTo);
    if (assignedTo && canFilterByAssignee) params.set('assignedTo', assignedTo);

    router.push(`?${params.toString()}`);
  };

  const handleClear = () => {
    setStateCode('');
    setFiledFrom('');
    setFiledTo('');
    setAssignedTo('');
    router.push(window.location.pathname);
  };

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '1.5rem',
    }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: canFilterByAssignee ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        {/* Estado */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
            Estado
          </label>
          <select
            value={stateCode}
            onChange={(e) => setStateCode(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          >
            <option value="">Todos</option>
            <option value="RADICADO">Radicado</option>
            <option value="EN_ESTUDIO">En Estudio</option>
            <option value="REQUIERE_INFORMACION">Requiere Información</option>
            <option value="RESUELTO">Resuelto</option>
            <option value="CERRADO">Cerrado</option>
          </select>
        </div>

        {/* Fecha desde */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
            Radicado desde
          </label>
          <input
            type="date"
            value={filedFrom}
            onChange={(e) => setFiledFrom(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          />
        </div>

        {/* Fecha hasta */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
            Radicado hasta
          </label>
          <input
            type="date"
            value={filedTo}
            onChange={(e) => setFiledTo(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          />
        </div>

        {/* Asignado a (solo SUPERVISOR/ADMIN) */}
        {canFilterByAssignee && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Asignado a
            </label>
            <input
              type="text"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="ID de usuario"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.875rem',
              }}
            />
          </div>
        )}
      </div>

      {/* Botones */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={handleApply}
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          Aplicar filtros
        </button>
        <button
          onClick={handleClear}
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: 'white',
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}
