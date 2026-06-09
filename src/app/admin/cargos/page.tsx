'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Edit, Trash2, Shield, X } from 'lucide-react';

interface Role {
  id: string;
  code: string;
  name: string;
  description: string;
  level: number;
  permissions: string[];
  canApprove: boolean;
  canReassign: boolean;
  canSign: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function RolesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    level: 50,
    permissions: [] as string[],
    canApprove: false,
    canReassign: false,
    canSign: false
  });

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');

    if (!isAuthenticated || isAuthenticated !== 'true') {
      router.push('/');
      return;
    }

    loadRoles();
  }, [router]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/roles');
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Error cargando roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        code: role.code,
        name: role.name,
        description: role.description,
        level: role.level,
        permissions: role.permissions,
        canApprove: role.canApprove,
        canReassign: role.canReassign,
        canSign: role.canSign
      });
    } else {
      setEditingRole(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        level: 50,
        permissions: [],
        canApprove: false,
        canReassign: false,
        canSign: false
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingRole
        ? `/api/v1/roles/${editingRole.id}`
        : '/api/v1/roles';

      const method = editingRole ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setIsModalOpen(false);
        loadRoles();
      }
    } catch (error) {
      console.error('Error guardando rol:', error);
    }
  };

  const handleDelete = async (roleId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este rol?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/roles/${roleId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadRoles();
      }
    } catch (error) {
      console.error('Error eliminando rol:', error);
    }
  };

  const togglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const availablePermissions = [
    'cases:read:all',
    'cases:read:own',
    'cases:create',
    'cases:update',
    'cases:delete',
    'cases:assign',
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'reports:read',
    'reports:create',
    'settings:read',
    'settings:update'
  ];

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
            onClick={() => router.push('/admin/inbox')}
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                  Administra los roles y permisos del sistema
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
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Cargando roles...</p>
            </div>
          </div>
        ) : roles.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '4rem 2rem',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <Shield size={64} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
              No hay roles creados
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Crea tu primer rol para comenzar a gestionar permisos
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
              Crear Primer Rol
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {roles.map((role) => (
              <div
                key={role.id}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                        {role.name}
                      </h3>
                      {!role.isActive && (
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
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace', margin: 0 }}>
                      {role.code}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleOpenModal(role)}
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
                      onClick={() => handleDelete(role.id)}
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

                {/* Descripción */}
                <p style={{ fontSize: '0.875rem', color: '#374151', lineHeight: '1.5', marginBottom: '1rem' }}>
                  {role.description}
                </p>

                {/* Nivel */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>
                    Nivel Jerárquico
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      flex: 1,
                      height: '8px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '9999px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${role.level}%`,
                        height: '100%',
                        backgroundColor: role.level > 75 ? '#10b981' : role.level > 50 ? 'var(--color-primary)' : '#6b7280',
                        transition: 'width 0.3s'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#111827' }}>
                      {role.level}
                    </span>
                  </div>
                </div>

                {/* Capacidades */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem', display: 'block' }}>
                    Capacidades Especiales
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {role.canApprove && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: '#d1fae5',
                        color: '#065f46',
                        borderRadius: '9999px'
                      }}>
                        Aprobar
                      </span>
                    )}
                    {role.canReassign && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: '9999px'
                      }}>
                        Reasignar
                      </span>
                    )}
                    {role.canSign && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        borderRadius: '9999px'
                      }}>
                        Firmar
                      </span>
                    )}
                    {!role.canApprove && !role.canReassign && !role.canSign && (
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        Ninguna
                      </span>
                    )}
                  </div>
                </div>

                {/* Permisos */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem', display: 'block' }}>
                    Permisos ({role.permissions.length})
                  </label>
                  <div style={{
                    maxHeight: '80px',
                    overflow: 'auto',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                    padding: '0.5rem'
                  }}>
                    {role.permissions.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {role.permissions.map((permission, index) => (
                          <span key={index} style={{ fontSize: '0.75rem', color: '#374151', fontFamily: 'monospace' }}>
                            • {permission}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        Sin permisos asignados
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Crear/Editar Rol */}
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
                {editingRole ? 'Editar Cargo' : 'Crear Nuevo Cargo'}
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
              {/* Código */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Código del Rol *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Ej: SUPERVISOR"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontFamily: 'monospace'
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Identificador único en mayúsculas (sin espacios)
                </p>
              </div>

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
                    name: e.target.value,
                    description: e.target.value // Auto-completar descripción con el nombre
                  })}
                  placeholder="Ej: Supervisor de Casos"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px'
                  }}
                />
              </div>

              {/* Nivel Jerárquico */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Nivel Jerárquico: {formData.level}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                  style={{ width: '100%' }}
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Mayor nivel = más autoridad (0-100)
                </p>
              </div>

              {/* Capacidades Especiales */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
                  Capacidades Especiales
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.canApprove}
                      onChange={(e) => setFormData({ ...formData, canApprove: e.target.checked })}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                      Puede aprobar documentos y solicitudes
                    </span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.canReassign}
                      onChange={(e) => setFormData({ ...formData, canReassign: e.target.checked })}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                      Puede reasignar casos a otros usuarios
                    </span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.canSign}
                      onChange={(e) => setFormData({ ...formData, canSign: e.target.checked })}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                      Puede firmar documentos oficiales
                    </span>
                  </label>
                </div>
              </div>

              {/* Permisos */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
                  Permisos del Sistema
                </label>
                <div style={{
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  padding: '1rem',
                  maxHeight: '200px',
                  overflow: 'auto',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {availablePermissions.map((permission) => (
                      <label key={permission} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(permission)}
                          onChange={() => togglePermission(permission)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.875rem', color: '#374151', fontFamily: 'monospace' }}>
                          {permission}
                        </span>
                      </label>
                    ))}
                  </div>
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
                  {editingRole ? 'Actualizar Cargo' : 'Crear Cargo'}
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
