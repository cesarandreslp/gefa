'use client';

/**
 * Formulario para cambiar el estado de un caso
 * Usa PUT /api/v1/cases/[id]/status
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ChangeStateFormProps {
  caseId: string;
  currentStateCode: string;
  allStates: Array<{ id: string; code: string; name: string; requiresComment: boolean }>;
}

export default function ChangeStateForm({ caseId, currentStateCode, allStates }: ChangeStateFormProps) {
  const router = useRouter();
  const [newStateCode, setNewStateCode] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedState = allStates.find((s) => s.code === newStateCode);
  const requiresComment = selectedState?.requiresComment || false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!newStateCode) {
      setError('Debe seleccionar un estado');
      setLoading(false);
      return;
    }

    if (requiresComment && !comment.trim()) {
      setError('Este cambio de estado requiere un comentario');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/v1/cases/${caseId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newStateCode,
          comment: comment.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al cambiar estado');
        setLoading(false);
        return;
      }

      setSuccess('Estado cambiado exitosamente');
      setNewStateCode('');
      setComment('');
      setLoading(false);
      
      // Recargar la página para ver los cambios
      setTimeout(() => {
        router.refresh();
        setSuccess('');
      }, 1500);
    } catch {
      setError('Error de conexión');
      setLoading(false);
    }
  }

  return (
    <div style={{ 
      backgroundColor: 'white', 
      padding: '1.5rem', 
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.125rem' }}>
        Cambiar Estado
      </h3>

      <form onSubmit={handleSubmit}>
        {error && (
          <div 
            role="alert"
            aria-live="assertive"
            style={{ 
              padding: '0.75rem', 
              marginBottom: '1rem', 
              backgroundColor: '#fee', 
              color: '#c00',
              borderRadius: '4px',
              fontSize: '0.875rem',
              border: '1px solid #fcc'
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div 
            role="status"
            aria-live="polite"
            style={{ 
              padding: '0.75rem', 
              marginBottom: '1rem', 
              backgroundColor: '#d4edda', 
              color: '#155724',
              borderRadius: '4px',
              fontSize: '0.875rem',
              border: '1px solid #c3e6cb'
            }}
          >
            {success}
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label 
            htmlFor="new-state-select"
            style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}
          >
            Nuevo estado
          </label>
          <select
            id="new-state-select"
            value={newStateCode}
            onChange={(e) => setNewStateCode(e.target.value)}
            disabled={loading}
            required
            aria-required="true"
            style={{ 
              width: '100%', 
              padding: '0.5rem', 
              border: '1px solid #ddd', 
              borderRadius: '4px'
            }}
          >
            <option value="">Seleccione...</option>
            {allStates.filter((s) => s.code !== currentStateCode).map((state) => (
              <option key={state.id} value={state.code}>
                {state.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label 
            htmlFor="comment-textarea"
            style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}
          >
            Comentario {requiresComment && <span style={{ color: '#c00' }}>*</span>}
          </label>
          <textarea
            id="comment-textarea"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={loading}
            rows={3}
            required={requiresComment}
            aria-required={requiresComment ? 'true' : 'false'}
            style={{ 
              width: '100%', 
              padding: '0.5rem', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
            placeholder="Agregue un comentario sobre este cambio..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ 
            width: '100%', 
            padding: '0.75rem', 
            backgroundColor: loading ? '#ccc' : '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 500
          }}
        >
          {loading ? 'Cambiando...' : 'Cambiar estado'}
        </button>
      </form>
    </div>
  );
}
