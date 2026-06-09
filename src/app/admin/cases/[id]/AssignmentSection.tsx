/**
 * AssignmentSection - FASE 3 MÓDULO 2
 * 
 * Sección de asignación de expedientes
 * - Muestra funcionario asignado actual
 * - Permite asignar/reasignar (solo REVISOR_MUNICIPAL y VENTANILLA_UNICA)
 * - Muestra historial de asignaciones
 */

'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  currentCaseLoad: number;
  maxCaseLoad: number;
}

interface AssignmentHistoryItem {
  id: string;
  previousAssignee: string | null;
  newAssignee: string;
  assignedBy: string;
  reason: string;
  createdAt: string;
}

interface CurrentAssignee {
  id: string;
  email: string;
  firstName: string;
  firstLastName: string;
  role: string;
  assignedAt: string;
}

export default function AssignmentSection({ 
  caseId, 
  userRole 
}: { 
  caseId: string; 
  userRole: string;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentAssignee, setCurrentAssignee] = useState<CurrentAssignee | null>(null);
  const [history, setHistory] = useState<AssignmentHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const canAssign = userRole === 'DIRECTOR' || userRole === 'VENTANILLA_UNICA' || userRole === 'ASIGNACION_DE_CASOS';

  const loadAvailableUsers = async () => {
    try {
      const res = await fetch('/api/v1/users/available-assignees');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data.users);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const loadAssignmentHistory = async () => {
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/assignment-history`);
      const data = await res.json();
      if (data.success) {
        setCurrentAssignee(data.data.currentAssignee);
        setHistory(data.data.history);
      }
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    if (canAssign) {
      loadAvailableUsers();
    }
    loadAssignmentHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, canAssign]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/v1/cases/${caseId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newAssigneeId: selectedUser,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(data.data.message);
        setSelectedUser('');
        setReason('');
        // Recargar datos
        await loadAssignmentHistory();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error.message);
      }
    } catch (err) {
      setError('Error al asignar expediente');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      backgroundColor: 'white', 
      padding: '1.5rem', 
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginTop: '1.5rem'
    }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>
        Asignación del Expediente
      </h3>

      {/* Asignado actual */}
      <div style={{ 
        padding: '1rem', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '4px',
        marginBottom: '1rem'
      }}>
        <strong>Asignado actualmente:</strong>
        {currentAssignee ? (
          <div style={{ marginTop: '0.5rem' }}>
            <div>{currentAssignee.firstName} {currentAssignee.firstLastName}</div>
            <div style={{ fontSize: '0.875rem', color: '#666' }}>
              {currentAssignee.email} - {currentAssignee.role}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#666' }}>
              Asignado: {new Date(currentAssignee.assignedAt).toLocaleString('es-CO')}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '0.5rem', color: '#666' }}>
            Sin asignar
          </div>
        )}
      </div>

      {/* Formulario de asignación (solo para ADMIN/SUPERVISOR) */}
      {canAssign && (
        <form onSubmit={handleAssign}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="assignee-select" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Asignar a:
            </label>
            <select
              id="assignee-select"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            >
              <option value="">Seleccione un funcionario</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName} - {user.role} ({user.currentCaseLoad}/{user.maxCaseLoad} casos)
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="assignment-reason" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Motivo {currentAssignee ? '(obligatorio para reasignación)' : '(opcional)'}:
            </label>
            <textarea
              id="assignment-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required={!!currentAssignee}
              disabled={loading}
              rows={3}
              maxLength={500}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                resize: 'vertical',
              }}
              placeholder="Describa el motivo de la asignación..."
              aria-describedby="reason-counter"
            />
            <div id="reason-counter" style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }} aria-live="polite">
              {reason.length}/500 caracteres
            </div>
          </div>

          {error && (
            <div 
              role="alert"
              aria-live="assertive"
              style={{ 
                padding: '0.75rem', 
                backgroundColor: '#fee', 
                color: '#c00',
                borderRadius: '4px',
                marginBottom: '1rem',
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
                backgroundColor: '#d4edda', 
                color: '#155724',
                borderRadius: '4px',
                marginBottom: '1rem',
                border: '1px solid #c3e6cb'
              }}
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selectedUser}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: loading || !selectedUser ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || !selectedUser ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: 500,
            }}
          >
            {loading ? 'Asignando...' : currentAssignee ? 'Reasignar' : 'Asignar'}
          </button>
        </form>
      )}

      {/* Botón para mostrar historial */}
      {history.length > 0 && (
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #eee' }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'transparent',
              color: '#007bff',
              border: '1px solid #007bff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
            aria-expanded={showHistory}
            aria-controls="assignment-history"
          >
            {showHistory ? 'Ocultar' : 'Ver'} historial de asignaciones ({history.length})
          </button>

          {showHistory && (
            <div id="assignment-history" style={{ marginTop: '1rem' }}>
              <table style={{ width: '100%', fontSize: '0.875rem' }}>
                <caption className="sr-only">Historial de asignaciones del expediente</caption>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th scope="col" style={{ padding: '0.5rem', textAlign: 'left' }}>Fecha</th>
                    <th scope="col" style={{ padding: '0.5rem', textAlign: 'left' }}>Anterior</th>
                    <th scope="col" style={{ padding: '0.5rem', textAlign: 'left' }}>Nuevo</th>
                    <th scope="col" style={{ padding: '0.5rem', textAlign: 'left' }}>Asignado por</th>
                    <th scope="col" style={{ padding: '0.5rem', textAlign: 'left' }}>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.5rem' }}>
                        {new Date(item.createdAt).toLocaleString('es-CO')}
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        {item.previousAssignee || '-'}
                      </td>
                      <td style={{ padding: '0.5rem' }}>{item.newAssignee}</td>
                      <td style={{ padding: '0.5rem' }}>{item.assignedBy}</td>
                      <td style={{ padding: '0.5rem', fontSize: '0.75rem', color: '#666' }}>
                        {item.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
