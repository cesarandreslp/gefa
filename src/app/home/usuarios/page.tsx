'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Edit, Trash2, Users as UsersIcon, Shield, Mail, X, Eye, EyeOff, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Role {
  id: string;
  code: string;
  name: string;
}

interface Position {
  id: string;
  name: string;
  roleCode: string;
}

interface User {
  id: string;
  email: string;
  fullName: string;
  documentType: string;
  documentNumber: string;
  role?: Role;
  department?: string;
  position?: string;
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [activeTab, setActiveTab] = useState<'activos' | 'inactivos'>('activos');
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
    department: '',
    position: ''
  });

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');

    if (!isAuthenticated || isAuthenticated !== 'true') {
      router.push('/');
      return;
    }

    loadUsers();
    loadRoles();
    loadPositions();
  }, [router]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const loadPositions = async () => {
    try {
      const response = await fetch('/api/v1/positions');
      if (response.ok) {
        const data = await response.json();
        setPositions(data);
      }
    } catch (error) {
      console.error('Error cargando cargos:', error);
    }
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        password: '',
        fullName: user.fullName,
        documentType: user.documentType,
        documentNumber: user.documentNumber,
        roleId: user.role?.id || '',
        department: user.department || '',
        position: user.position || ''
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
        department: '',
        position: ''
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
        email: formData.email,
        fullName: formData.fullName,
        documentType: formData.documentType,
        documentNumber: formData.documentNumber,
        roleId: formData.roleId || '',
        department: formData.department,
        position: formData.position
      };

      // Si hay contraseña, agregarla
      if (formData.password) {
        dataToSend.password = formData.password;
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

      const data = await response.json();

      if (response.ok) {
        alert(data.message || 'Usuario eliminado correctamente');
        loadUsers();
      } else {
        alert(data.error || 'Error al eliminar el usuario');
      }
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      alert('Error al eliminar el usuario');
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

  const handleExportExcel = () => {
    const rows = users.map(u => ({
      'NOMBRE COMPLETO': u.fullName,
      'CORREO ELECTRÓNICO': u.email,
      'TIPO DOC': u.documentType,
      'NÚMERO DE DOCUMENTO': u.documentNumber,
      'ROL': u.role?.name ?? 'Sin rol',
      'CARGO': u.position || 'Sin cargo',
      'ESTADO': u.isActive ? 'Activo' : 'Inactivo',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 30 }, { wch: 35 }, { wch: 10 },
      { wch: 22 }, { wch: 22 }, { wch: 35 }, { wch: 10 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    XLSX.writeFile(wb, `usuarios_${date}.xlsm`, { bookType: 'xlsm' });
  };

  const documentTypes = [
    { value: 'CC', label: 'Cédula de Ciudadanía' },
    { value: 'CE', label: 'Cédula de Extranjería' },
    { value: 'TI', label: 'Tarjeta de Identidad' },
    { value: 'PEP', label: 'Permiso Especial de Permanencia' },
    { value: 'PPT', label: 'Permiso por Protección Temporal' }
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
                backgroundColor: '#d1fae5',
                borderRadius: '12px',
                padding: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <UsersIcon size={32} color="#10b981" />
              </div>
              <div>
                <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                  Gestión de Usuarios
                </h1>
                <p style={{ color: '#6b7280', marginTop: '0.25rem', fontSize: '0.875rem' }}>
                  Administra los usuarios del sistema
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleExportExcel}
                disabled={users.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  backgroundColor: users.length === 0 ? '#d1d5db' : '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: users.length === 0 ? 'not-allowed' : 'pointer',
                }}
                title="Descargar listado de usuarios en Excel"
              >
                <Download size={18} />
                Descargar Excel
              </button>
              <button
                onClick={() => handleOpenModal()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
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
                <Plus size={18} />
                Crear Usuario
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>

        {/* Pestañas */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '2px solid #e5e7eb' }}>
          {(['activos', 'inactivos'] as const).map((tab) => {
            const count = users.filter(u => tab === 'activos' ? u.isActive : !u.isActive).length;
            const isSelected = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  border: 'none',
                  borderBottom: isSelected ? '2px solid #10b981' : '2px solid transparent',
                  marginBottom: '-2px',
                  backgroundColor: 'transparent',
                  color: isSelected ? '#10b981' : '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'color 0.15s',
                }}
              >
                {tab === 'activos' ? 'Usuarios Activos' : 'Usuarios Inactivos'}
                <span style={{
                  backgroundColor: isSelected ? '#d1fae5' : '#f3f4f6',
                  color: isSelected ? '#065f46' : '#6b7280',
                  borderRadius: '9999px',
                  padding: '0.125rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tabla */}
        {(() => {
          const filtered = users.filter(u => activeTab === 'activos' ? u.isActive : !u.isActive);
          if (loading) return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', border: '4px solid #e5e7eb', borderTop: '4px solid #10b981', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Cargando usuarios...</p>
              </div>
            </div>
          );

          if (filtered.length === 0) return (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <UsersIcon size={64} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                {activeTab === 'activos' ? 'No hay usuarios activos' : 'No hay usuarios inactivos'}
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                {activeTab === 'activos' ? 'Crea tu primer usuario para comenzar' : 'Los usuarios eliminados aparecerán aquí'}
              </p>
              {activeTab === 'activos' && (
                <button onClick={() => handleOpenModal()} style={{ padding: '0.75rem 1.5rem', fontSize: '0.875rem', fontWeight: '600', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                  Crear Primer Usuario
                </button>
              )}
            </div>
          );

          return (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Usuario</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Documento</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Rol</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Cargo</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #e5e7eb', opacity: activeTab === 'inactivos' ? 0.7 : 1 }}>
                      <td style={{ padding: '1rem' }}>
                        <div>
                          <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', margin: 0 }}>{user.fullName}</p>
                          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0, display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                            <Mail size={12} />{user.email}
                          </p>
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
                            <Shield size={14} color="#8b5cf6" />
                            <span style={{ fontSize: '0.875rem', color: '#374151' }}>{user.role.name}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>Sin rol asignado</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <p style={{ fontSize: '0.875rem', color: '#374151' }}>{user.position || '-'}</p>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          {activeTab === 'activos' ? (
                            <>
                              <button
                                onClick={() => handleOpenModal(user)}
                                title="Editar"
                                style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              >
                                <Edit size={16} color="#6b7280" />
                              </button>
                              <button
                                onClick={() => handleDelete(user.id)}
                                title="Desactivar usuario"
                                style={{ padding: '0.5rem', backgroundColor: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              >
                                <Trash2 size={16} color="#ef4444" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => toggleUserStatus(user.id)}
                              title="Reactivar usuario"
                              style={{ padding: '0.375rem 0.875rem', fontSize: '0.75rem', fontWeight: '600', backgroundColor: '#d1fae5', color: '#065f46', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              Reactivar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
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
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Ingrese el nombre completo"
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      autoComplete="off"
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
                        autoComplete="new-password"
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

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    Cargo *
                  </label>
                  <select
                    required
                    value={formData.position}
                    onChange={(e) => {
                      const newPos = e.target.value;
                      const posObj = positions.find(p => p.name === newPos);
                      // Auto-assign roleId based on selected position's roleCode.
                      // Normaliza legacy codes (DIRECTOR_ENCARGADO, PERSONERO_MUNICIPAL, REVISOR → DIRECTOR).
                      if (posObj) {
                        const legacyMap: Record<string, string> = {
                          DIRECTOR_ENCARGADO: 'DIRECTOR',
                          PERSONERO_MUNICIPAL: 'DIRECTOR',
                          REVISOR: 'DIRECTOR',
                          FUNCIONARIO_REGULAR: 'FUNCIONARIO',
                        };
                        const normalizedCode = legacyMap[posObj.roleCode] ?? posObj.roleCode;
                        const roleObj = roles.find(r => r.code === normalizedCode);
                        setFormData({
                          ...formData,
                          position: newPos,
                          roleId: roleObj ? roleObj.id : formData.roleId
                        });
                      } else {
                        setFormData({ ...formData, position: newPos });
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px'
                    }}
                  >
                    <option value="">Seleccione un cargo...</option>
                    {positions.map(position => (
                      <option key={position.id} value={position.name}>
                        {position.name}
                      </option>
                    ))}
                  </select>
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
