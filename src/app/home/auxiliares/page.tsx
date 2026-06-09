'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ArrowLeft, Plus, Mail, Lock, User, Hash, Check } from 'lucide-react';

interface Auxiliar {
  id: string;
  fullName: string;
  email: string;
  documentNumber: string;
  isActive: boolean;
  createdAt: string;
}

export default function AuxiliaresPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [auxiliares, setAuxiliares] = useState<Auxiliar[]>([]);
  
  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    documentNumber: '',
    email: '',
    password: ''
  });
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const checkAuthAndFetch = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.user?.role) {
          const roleCode = data.data.user.role.code;
          const allowedBases = ['FUNCIONARIO', 'DIRECTOR', 'DIRECTOR', 'ADMIN'];
          const hasAccess = allowedBases.some(base => roleCode === base || roleCode.startsWith(base + '_'));
          if (hasAccess) {
            await fetchAuxiliares();
            setLoading(false);
            return;
          }
        }
      }
      router.push('/home');
    } catch (error) {
      console.error('Error:', error);
      router.push('/home');
    }
  };

  const fetchAuxiliares = async () => {
    try {
      const res = await fetch('/api/v1/usuarios/auxiliares');
      const data = await res.json();
      if (data.success) {
        setAuxiliares(data.data);
      }
    } catch (error) {
      console.error('Error fetching auxiliares:', error);
    }
  };

  useEffect(() => {
    checkAuthAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/usuarios/auxiliares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        setFormError(data.error || 'Error al crear el auxiliar');
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage('El auxiliar fue creado exitosamente. Ya puede iniciar sesión.');
      setFormData({ fullName: '', documentNumber: '', email: '', password: '' });
      setIsFormOpen(false);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
      
      // Refresh list
      fetchAuxiliares();
      
    } catch {
      setFormError('Error de conexión al servidor');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '400px' }}>
        <p style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="spinner"></span> Cargando información...
        </p>
        <style jsx>{`
          .spinner {
            width: 20px;
            height: 20px;
            border: 2px solid #e5e7eb;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              color: '#6b7280',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#374151'}
            onMouseOut={(e) => e.currentTarget.style.color = '#6b7280'}
            title="Volver"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Users size={32} color="var(--color-primary)" /> Mis Auxiliares
            </h1>
            <p style={{ color: '#6b7280', marginTop: '0.25rem', marginBottom: 0 }}>
              Aquí puedes crear y administrar los asistentes que te apoyarán en tu gestión.
            </p>
          </div>
        </div>

        {!isFormOpen && (
          auxiliares.filter(a => a.isActive).length >= 2 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f3f4f6',
              color: '#4b5563',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              Se ha alcanzado el límite de 2 auxiliares.
            </div>
          ) : (
            <button
              onClick={() => setIsFormOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
            >
              <Plus size={20} /> Nuevo Auxiliar
            </button>
          )
        )}
      </div>

      {successMessage && (
        <div style={{
          backgroundColor: '#d1fae5',
          borderLeft: '4px solid #10b981',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#065f46'
        }}>
          <Check size={20} color="#10b981" />
          <span style={{ fontWeight: '500' }}>{successMessage}</span>
        </div>
      )}

      {isFormOpen && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          marginBottom: '2rem',
          borderTop: '4px solid #3b82f6'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
            Registrar Nuevo Auxiliar
          </h2>

          {formError && (
            <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              
              {/* Nombre Completo */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Nombre Completo
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: '0 0 0 0.75rem', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                    <User size={18} color="#9ca3af" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    style={{
                      width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '6px',
                      border: '1px solid #d1d5db', fontSize: '0.95rem'
                    }}
                    placeholder="Ej. María Sánchez"
                  />
                </div>
              </div>

              {/* Documento / Cédula */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Cédula de Ciudadanía
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: '0 0 0 0.75rem', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                    <Hash size={18} color="#9ca3af" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={formData.documentNumber}
                    onChange={(e) => setFormData({...formData, documentNumber: e.target.value.replace(/\D/g, '')})}
                    style={{
                      width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '6px',
                      border: '1px solid #d1d5db', fontSize: '0.95rem'
                    }}
                    placeholder="Sin puntos ni espacios"
                  />
                </div>
              </div>

              {/* Correo Electrónico */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Correo Electrónico (Usuario)
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: '0 0 0 0.75rem', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                    <Mail size={18} color="#9ca3af" />
                  </div>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    style={{
                      width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '6px',
                      border: '1px solid #d1d5db', fontSize: '0.95rem'
                    }}
                    placeholder="auxiliar@entidad.gov.co"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: '0 0 0 0.75rem', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                    <Lock size={18} color="#9ca3af" />
                  </div>
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    style={{
                      width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '6px',
                      border: '1px solid #d1d5db', fontSize: '0.95rem'
                    }}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setFormError('');
                  setFormData({ fullName: '', documentNumber: '', email: '', password: '' });
                }}
                disabled={isSubmitting}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: isSubmitting ? '#93c5fd' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Auxiliar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla de Auxiliares */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {auxiliares.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <Users size={48} color="#e5e7eb" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>No tienes auxiliares registrados</h3>
            <p style={{ color: '#6b7280' }}>Comienza añadiendo un asistente usando el botón azul de arriba.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="aux-table">
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th className="aux-th">
                    Nombre
                  </th>
                  <th className="aux-th">
                    Cédula
                  </th>
                  <th className="aux-th">
                    Correo de Acceso
                  </th>
                  <th className="aux-th">
                    Estado
                  </th>
                  <th className="aux-th">
                    Registro
                  </th>
                </tr>
              </thead>
              <tbody style={{ borderTop: '1px solid #e5e7eb' }}>
                {auxiliares.map((aux) => (
                  <tr key={aux.id} style={{ borderBottom: '1px solid #e5e7eb' }} className="hover-row">
                    <td className="aux-td td-name" data-label="Nombre">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', fontWeight: '600', fontSize: '0.875rem' }}>
                          {aux.fullName.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: '500', color: '#111827' }}>{aux.fullName}</span>
                      </div>
                    </td>
                    <td className="aux-td" data-label="Cédula">
                      {aux.documentNumber}
                    </td>
                    <td className="aux-td" data-label="Correo de Acceso">
                      {aux.email}
                    </td>
                    <td className="aux-td" data-label="Estado">
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', padding: '0.125rem 0.625rem',
                        borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '500',
                        backgroundColor: aux.isActive ? '#d1fae5' : '#fee2e2',
                        color: aux.isActive ? '#065f46' : '#991b1b',
                      }}>
                        {aux.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="aux-td" data-label="Registro">
                      {new Date(aux.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style jsx>{`
        .hover-row:hover {
          background-color: #f9fafb;
        }
        .aux-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .aux-th {
          padding: 1rem 1.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .aux-td {
          padding: 1rem 1.5rem;
          color: #4b5563;
          font-size: 0.875rem;
        }
        @media (max-width: 768px) {
          .aux-table, .aux-table tbody, .aux-table tr, .aux-td {
            display: block;
            width: 100%;
          }
          .aux-table thead {
            display: none;
          }
          .aux-table tr {
            margin-bottom: 1rem;
            border-bottom: 2px solid #e5e7eb;
            background-color: white;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          .aux-td {
            padding: 0.5rem 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            text-align: right;
            border-bottom: 1px solid #f3f4f6;
          }
          .aux-td:last-child {
            border-bottom: none;
          }
          .aux-td::before {
            content: attr(data-label);
            font-weight: 600;
            color: #6b7280;
            font-size: 0.75rem;
            text-transform: uppercase;
            text-align: left;
            margin-right: 1rem;
          }
          .aux-table .td-name {
            flex-direction: row;
            justify-content: flex-start;
            gap: 0.75rem;
            padding: 0 0 1rem 0;
            border-bottom: 1px solid #e5e7eb;
            margin-bottom: 0.5rem;
          }
          .aux-table .td-name::before {
            content: none;
          }
        }
      `}</style>
    </div>
  );
}
