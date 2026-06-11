'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, Users as UsersIcon, Shield, Mail, X, Eye, EyeOff, Building2 } from 'lucide-react';
import AdminPageHeader from '../AdminPageHeader';

interface Role {
  id: string;
  code: string;
  name: string;
}

interface Comisaria {
  id: string;
  code: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  fullName: string;
  documentType: string;
  documentNumber: string;
  role?: Role;
  comisaria?: Comisaria | null;
  department?: string;
  position?: string;
  profesion?: string | null;
  isActive: boolean;
  createdAt: string;
}

const PROFESION_OPCIONES: { value: string; label: string }[] = [
  { value: '', label: 'Sin profesión' },
  { value: 'PSICOLOGIA', label: 'Psicología' },
  { value: 'TRABAJO_SOCIAL', label: 'Trabajo Social' },
  { value: 'JURIDICA', label: 'Jurídico' },
];

export default function UsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [comisarias, setComisarias] = useState<Comisaria[]>([]);
  const [limits, setLimits] = useState<{ maxUsers: number | null; activeUsers: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    documentType: 'CC',
    documentNumber: '',
    roleId: '',
    comisariaId: '',
    department: '',
    position: '',
    profesion: ''
  });

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    
    if (!isAuthenticated || isAuthenticated !== 'true') {
      router.push('/');
      return;
    }

    loadUsers();
    loadRoles();
    loadComisarias();
  }, [router]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
      const limRes = await fetch('/api/v1/tenant/limits');
      if (limRes.ok) {
        const lim = await limRes.json();
        setLimits({ maxUsers: lim.maxUsers ?? null, activeUsers: lim.activeUsers ?? 0 });
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const atUserCap = !!limits && limits.maxUsers != null && limits.activeUsers >= limits.maxUsers;

  const loadRoles = async () => {
    try {
      const response = await fetch('/api/v1/roles');
      if (response.ok) {
        const data = await response.json();
        setRoles(data.filter((role: Role & { isActive: boolean }) => role.isActive));
      }
    } catch (error) {
      console.error('Error cargando roles:', error);
    }
  };

  const loadComisarias = async () => {
    try {
      const response = await fetch('/api/v1/comisarias');
      if (response.ok) {
        const data = await response.json();
        const list: Array<Comisaria & { isActive: boolean }> = data.comisarias ?? [];
        setComisarias(list.filter((c) => c.isActive));
      }
    } catch (error) {
      console.error('Error cargando comisarías:', error);
    }
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        password: '',
        fullName: user.fullName || '',
        documentType: user.documentType,
        documentNumber: user.documentNumber,
        roleId: user.role?.id || '',
        comisariaId: user.comisaria?.id || '',
        department: user.department || '',
        position: user.position || '',
        profesion: user.profesion || ''
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        fullName: '',
        documentType: 'CC',
        documentNumber: '',
        roleId: '',
        comisariaId: '',
        department: '',
        position: '',
        profesion: ''
      });
    }
    setIsModalOpen(true);
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingUser 
        ? `/api/v1/users/${editingUser.id}` 
        : '/api/v1/users';
      
      const method = editingUser ? 'PUT' : 'POST';
      
      const dataToSend: Record<string, string> = {
        ...formData
      };

      // Si no hay rol seleccionado, enviar roleId vacío
      if (!formData.roleId) {
        dataToSend.roleId = '';
      }

      // Si es edición y no se ingresó password, no enviarlo
      if (editingUser && !formData.password) {
        delete dataToSend.password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      });

      if (response.ok) {
        setIsModalOpen(false);
        loadUsers();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al guardar usuario');
      }
    } catch (error) {
      console.error('Error guardando usuario:', error);
      alert('Error al guardar usuario');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/users/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadUsers();
      }
    } catch (error) {
      console.error('Error eliminando usuario:', error);
    }
  };

  const toggleUserStatus = async (userId: string) => {
    try {
      const response = await fetch(`/api/v1/users/${userId}/toggle-status`, {
        method: 'PATCH'
      });

      if (response.ok) {
        loadUsers();
      }
    } catch (error) {
      console.error('Error cambiando estado:', error);
    }
  };

  const documentTypes = [
    { value: 'CC', label: 'Cédula de Ciudadanía' },
    { value: 'CE', label: 'Cédula de Extranjería' },
    { value: 'TI', label: 'Tarjeta de Identidad' },
    { value: 'PEP', label: 'Permiso Especial de Permanencia' },
    { value: 'PPT', label: 'Permiso por Protección Temporal' }
  ];

  return (
    <div>
      <AdminPageHeader
        title="Equipo y Usuarios"
        subtitle="Directorio del personal de la entidad. También puedes crear y asignar el equipo por sede desde Comisarías."
        icon={<UsersIcon size={24} />}
        actions={
          <button
            onClick={() => handleOpenModal()}
            disabled={atUserCap}
            title={atUserCap ? 'Cupo de usuarios contratados alcanzado' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, backgroundColor: atUserCap ? '#9ca3af' : 'var(--color-primary, #2563eb)', color: 'white', border: 'none', borderRadius: '8px', cursor: atUserCap ? 'not-allowed' : 'pointer' }}
          >
            <Plus size={18} /> Crear Usuario
          </button>
        }
      />
      {limits && (
        <p style={{ margin: '-0.75rem 0 1.25rem', fontSize: '0.82rem', fontWeight: 600, color: atUserCap ? '#b91c1c' : 'var(--color-primary, #2563eb)' }}>
          {limits.maxUsers == null
            ? `${limits.activeUsers} usuario(s) activo(s) · sin límite contratado`
            : `${limits.activeUsers} de ${limits.maxUsers} usuarios contratados en uso${atUserCap ? ' · cupo alcanzado' : ''}`}
        </p>
      )}

      {/* Contenido */}
      <div>
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
                borderTop: '4px solid #10b981',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem'
              }} />
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Cargando usuarios...</p>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '4rem 2rem',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <UsersIcon size={64} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
              No hay usuarios registrados
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Crea tu primer usuario para comenzar
            </p>
            <button
              onClick={() => handleOpenModal()}
              disabled={atUserCap}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                backgroundColor: atUserCap ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: atUserCap ? 'not-allowed' : 'pointer'
              }}
            >
              Crear Primer Usuario
            </button>
          </div>
        ) : (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                    Usuario
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                    Documento
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                    Rol
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                    Cargo
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                    Estado
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem' }}>
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                          {user.fullName}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0, display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                          <Mail size={12} />
                          {user.email}
                        </p>
                        {user.comisaria && (
                          <p style={{ fontSize: '0.7rem', color: '#2563eb', margin: '0.25rem 0 0', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Building2 size={11} />
                            {user.comisaria.code} — {user.comisaria.name}
                          </p>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <p style={{ fontSize: '0.875rem', color: '#374151', fontFamily: 'monospace' }}>
                        {user.documentType} {user.documentNumber}
                      </p>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {user.role ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Shield size={14} color="#0e7490" />
                          <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                            {user.role.name}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>
                          Sin rol asignado
                        </span>
                      )}
                      {user.profesion && (
                        <div style={{ fontSize: '0.72rem', color: '#0e7490', marginTop: '0.2rem' }}>
                          {PROFESION_OPCIONES.find(p => p.value === user.profesion)?.label ?? user.profesion}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <p style={{ fontSize: '0.875rem', color: '#374151' }}>
                        {user.position || '-'}
                      </p>
                      {user.department && (
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                          {user.department}
                        </p>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <button
                        onClick={() => toggleUserStatus(user.id)}
                        style={{
                          padding: '0.25rem 0.75rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: user.isActive ? '#d1fae5' : '#fee2e2',
                          color: user.isActive ? '#065f46' : '#991b1b',
                          border: 'none',
                          borderRadius: '9999px',
                          cursor: 'pointer'
                        }}
                      >
                        {user.isActive ? 'ACTIVO' : 'INACTIVO'}
                      </button>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleOpenModal(user)}
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
                          onClick={() => handleDelete(user.id)}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Crear/Editar Usuario */}
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
              maxWidth: '800px',
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
                {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
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
              {/* Datos Personales */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
                  Datos Personales
                </h3>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Ej: María Fernanda Gómez Ríos"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px'
                    }}
                  />
                </div>
              </div>

              {/* Identificación */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
                  Identificación
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                      Tipo *
                    </label>
                    <select
                      required
                      value={formData.documentType}
                      onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '0.875rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px'
                      }}
                    >
                      {documentTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.value}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                      Número de Documento *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.documentNumber}
                      onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '0.875rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Credenciales */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
                  Credenciales de Acceso
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '0.875rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                      Contraseña {editingUser && '(dejar vacío para no cambiar)'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required={!editingUser}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          paddingRight: '2.5rem',
                          fontSize: '0.875rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        {showPassword ? <EyeOff size={16} color="#6b7280" /> : <Eye size={16} color="#6b7280" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuración Laboral */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
                  Configuración Laboral
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                      Rol (opcional)
                    </label>
                    <select
                      value={formData.roleId}
                      onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '0.875rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px'
                      }}
                    >
                      <option value="">Sin rol asignado</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                      Comisaría (sede)
                    </label>
                    <select
                      value={formData.comisariaId}
                      onChange={(e) => setFormData({ ...formData, comisariaId: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '0.875rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px'
                      }}
                    >
                      <option value="">Sin sede asignada</option>
                      {comisarias.map(c => (
                        <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                      Profesión (equipo interdisciplinario)
                    </label>
                    <select
                      value={formData.profesion}
                      onChange={(e) => setFormData({ ...formData, profesion: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '0.875rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px'
                      }}
                    >
                      {PROFESION_OPCIONES.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.3rem' }}>
                      Determina qué instrumentos de valoración puede aplicar.
                    </p>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                      Cargo
                    </label>
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      placeholder="Ej: Funcionario de atención"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '0.875rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px'
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                      Departamento/Área
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="Ej: Atención al Ciudadano"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '0.875rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px'
                      }}
                    />
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
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  {editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
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
