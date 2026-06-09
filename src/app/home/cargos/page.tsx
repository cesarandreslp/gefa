'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Edit, Trash2, Shield, X } from 'lucide-react';

interface Position {
  id: string;
  name: string;
  roleCode: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function RolesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    roleCode: 'FUNCIONARIO',
    description: ''
  });

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');

    if (!isAuthenticated || isAuthenticated !== 'true') {
      router.push('/');
      return;
    }

    loadPositions();
  }, [router]);

  const loadPositions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/positions');
      if (response.ok) {
        const data = await response.json();
        setPositions(data);
      }
    } catch (error) {
      console.error('Error cargando cargos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (position?: Position) => {
    if (position) {
      setEditingPosition(position);
      setFormData({
        name: position.name,
        roleCode: position.roleCode,
        description: position.description || ''
      });
    } else {
      setEditingPosition(null);
      setFormData({
        name: '',
        roleCode: 'FUNCIONARIO',
        description: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dataToSend = {
      name: formData.name,
      roleCode: formData.roleCode,
      description: formData.description.trim() || null
    };

    try {
      const url = editingPosition
        ? `/api/v1/positions/${editingPosition.id}`
        : '/api/v1/positions';

      const method = editingPosition ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      });

      const data = await response.json();

      if (response.ok) {
        setIsModalOpen(false);
        loadPositions();
      } else {
        alert(data.error || 'Error al guardar el cargo');
      }
    } catch (error) {
      console.error('Error guardando cargo:', error);
      alert('Error al guardar el cargo');
    }
  };

  const handleDelete = async (positionId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este cargo?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/positions/${positionId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        alert('Cargo eliminado correctamente');
        loadPositions();
      } else {
        alert(data.error || 'Error al eliminar el cargo');
      }
    } catch (error) {
      console.error('Error eliminando cargo:', error);
      alert('Error al eliminar el cargo');
    }
  };

  const getRoleName = (code: string) => {
    switch (code) {
      case 'ADMIN': return 'Administrador';
      case 'DIRECTOR': return 'Director Encargado';
      case 'FUNCIONARIO': return 'Funcionario';
      case 'VENTANILLA_UNICA': return 'Ventanilla Única';
      case 'AUXILIAR_ATENCION_USUARIO': return 'Auxiliar Atención al Usuario';
      default: return code;
    }
  };

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1.5rem 2rem'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <button
            onClick={() => router.push('/home')}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.borderColor = '#9ca3af';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              color: '#374151',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              marginBottom: '1rem',
              padding: '0.625rem 1rem',
              borderRadius: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <ArrowLeft size={16} />
            Volver al Dashboard
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                backgroundColor: '#dbeafe',
                borderRadius: '12px',
                padding: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Shield size={32} color="var(--color-primary)" />
              </div>
              <div>
                <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                  Gestión de Cargos
                </h1>
                <p style={{ color: '#6b7280', marginTop: '0.25rem', fontSize: '0.875rem' }}>
                  Crea y administra los cargos para los usuarios
                </p>
              </div>
            </div>

            <button
              onClick={() => handleOpenModal()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <Plus size={18} />
              Crear Cargo
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {loading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem'
              }} />
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Cargando cargos...</p>
            </div>
          </div>
        ) : positions.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '4rem 2rem',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <Shield size={64} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
              No hay cargos creados
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Crea el primer cargo para asignarlo a los usuarios
            </p>
            <button
              onClick={() => handleOpenModal()}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Crear Primer Cargo
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {positions.map((position) => (
              <div
                key={position.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: '2px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                {/* Header del Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                        {position.name}
                      </h3>
                      {!position.isActive && (
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.625rem',
                          fontWeight: '600',
                          backgroundColor: '#fecaca',
                          color: '#991b1b',
                          borderRadius: '9999px'
                        }}>
                          INACTIVO
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleOpenModal(position)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#f3f4f6',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Edit size={16} color="#6b7280" />
                    </button>
                    <button
                      onClick={() => handleDelete(position.id)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#fee2e2',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </button>
                  </div>
                </div>

                {/* Rol Asignado */}
                <div style={{ marginBottom: position.description ? '0.75rem' : '1rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>
                    Rol del Sistema Asociado
                  </label>
                  <p style={{ fontSize: '0.875rem', color: '#374151', margin: 0 }}>
                    <span style={{
                      display: 'inline-block',
                      backgroundColor: '#e0e7ff',
                      color: '#4338ca',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {getRoleName(position.roleCode)}
                    </span>
                  </p>
                </div>

                {/* Descripción del cargo */}
                {position.description && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>
                      Descripción
                    </label>
                    <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0, fontStyle: 'italic', lineHeight: '1.4' }}>
                      {position.description}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Crear/Editar Cargo */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
                {editingPosition ? 'Editar Cargo' : 'Crear Nuevo Cargo'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={20} color="#6b7280" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              {/* Nombre */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Nombre del Cargo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({
                    ...formData,
                    name: e.target.value
                  })}
                  placeholder="Ej: Dependencia de Derechos Humanos"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px'
                  }}
                />
              </div>

              {/* Descripción del cargo (opcional) */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                  Descripción del cargo <span style={{ fontWeight: '400', color: '#9ca3af' }}>(opcional)</span>
                </label>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Describe las funciones o temas que maneja este cargo. Ayuda al sistema a mejorar la asignación automática de casos.
                </p>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ej: Atiende quejas relacionadas con el espacio público, licencias de construcción y uso del suelo."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Tipo de Rol */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
                  Rol del Sistema Asociado *
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: formData.roleCode === 'ADMIN' ? '#eff6ff' : 'white' }}>
                    <input
                      type="radio"
                      name="roleType"
                      value="ADMIN"
                      checked={formData.roleCode === 'ADMIN'}
                      onChange={() => setFormData({ ...formData, roleCode: 'ADMIN' })}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#111827' }}>Administrador del Sistema</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Acceso total y configuración del área técnica</div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: formData.roleCode === 'DIRECTOR' ? '#eff6ff' : 'white' }}>
                    <input
                      type="radio"
                      name="roleType"
                      value="DIRECTOR"
                      checked={formData.roleCode === 'DIRECTOR'}
                      onChange={() => setFormData({ ...formData, roleCode: 'DIRECTOR' })}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#111827' }}>Director Encargado</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Responsable de la gestión</div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: formData.roleCode === 'FUNCIONARIO' ? '#eff6ff' : 'white' }}>
                    <input
                      type="radio"
                      name="roleType"
                      value="FUNCIONARIO"
                      checked={formData.roleCode === 'FUNCIONARIO'}
                      onChange={() => setFormData({ ...formData, roleCode: 'FUNCIONARIO' })}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#111827' }}>Funcionario</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Delegados y profesionales que gestionan casos</div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: formData.roleCode === 'VENTANILLA_UNICA' ? '#eff6ff' : 'white' }}>
                    <input
                      type="radio"
                      name="roleType"
                      value="VENTANILLA_UNICA"
                      checked={formData.roleCode === 'VENTANILLA_UNICA'}
                      onChange={() => setFormData({ ...formData, roleCode: 'VENTANILLA_UNICA' })}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#111827' }}>Ventanilla Única</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Personal de recepción y reasignación de casos</div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: formData.roleCode === 'AUXILIAR_ATENCION_USUARIO' ? '#eff6ff' : 'white' }}>
                    <input
                      type="radio"
                      name="roleType"
                      value="AUXILIAR_ATENCION_USUARIO"
                      checked={formData.roleCode === 'AUXILIAR_ATENCION_USUARIO'}
                      onChange={() => setFormData({ ...formData, roleCode: 'AUXILIAR_ATENCION_USUARIO' })}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#111827' }}>Auxiliar de Atención al Usuario</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Personal de atención directa al ciudadano</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  {editingPosition ? 'Actualizar Cargo' : 'Crear Cargo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
