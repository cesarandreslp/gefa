'use client';

import { useState, useEffect } from 'react';
import { Settings, Plus, Edit2, X, Check, ShieldCheck, Eye, EyeOff, ToggleLeft, ToggleRight, ImageIcon } from 'lucide-react';

interface SuperAdmin {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
}

interface FormState {
  email: string;
  fullName: string;
  password: string;
  confirmPassword: string;
}

const EMPTY_FORM: FormState = { email: '', fullName: '', password: '', confirmPassword: '' };

export default function ConfiguracionesPage() {
  const [admins, setAdmins]         = useState<SuperAdmin[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm]             = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Branding app principal
  const [mainLogoUrl, setMainLogoUrl]       = useState('');
  const [mainFaviconUrl, setMainFaviconUrl] = useState('');
  const [uploadingMainLogo, setUploadingMainLogo]       = useState(false);
  const [uploadingMainFavicon, setUploadingMainFavicon] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingSuccess, setBrandingSuccess] = useState('');

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/v1/super-admin/admins');
      const json = await res.json();
      if (json.success) setAdmins(json.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranding = async () => {
    try {
      const res = await fetch('/api/v1/super-admin/system-config');
      const json = await res.json();
      if (json.success) {
        setMainLogoUrl(json.data.main_logo_url || '');
        setMainFaviconUrl(json.data.main_favicon_url || '');
      }
    } catch {}
  };

  useEffect(() => { fetchAdmins(); fetchBranding(); }, []);

  const handleMainLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) {
      alert('El logo no puede superar 2 MB.');
      e.target.value = '';
      return;
    }
    setUploadingMainLogo(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'branding');
      const res = await fetch('/api/v1/upload', { method: 'POST', body: form });
      const json = await res.json();
      if (json.success) setMainLogoUrl(json.data.url);
      else alert('Error subiendo logo: ' + json.error);
    } catch { alert('Error de red al subir logo'); }
    finally { setUploadingMainLogo(false); }
  };

  const handleMainFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.size > 1024 * 1024) {
      alert('El favicon no puede superar 1 MB.');
      e.target.value = '';
      return;
    }
    setUploadingMainFavicon(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'branding');
      const res = await fetch('/api/v1/upload', { method: 'POST', body: form });
      const json = await res.json();
      if (json.success) setMainFaviconUrl(json.data.url);
      else alert('Error subiendo favicon: ' + json.error);
    } catch { alert('Error de red al subir favicon'); }
    finally { setUploadingMainFavicon(false); }
  };

  const handleSaveBranding = async () => {
    setSavingBranding(true);
    try {
      const res = await fetch('/api/v1/super-admin/system-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ main_logo_url: mainLogoUrl, main_favicon_url: mainFaviconUrl }),
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        setBrandingSuccess('Branding guardado correctamente.');
        setTimeout(() => setBrandingSuccess(''), 3000);
      } else {
        alert('Error guardando: ' + json.error);
      }
    } catch { alert('Error de red al guardar'); }
    finally { setSavingBranding(false); }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  };

  const openEdit = (admin: SuperAdmin) => {
    setEditingId(admin.id);
    setForm({ email: admin.email, fullName: admin.fullName, password: '', confirmPassword: '' });
    setError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
  };

  const handleSave = async () => {
    setError('');
    if (!form.email.trim() || !form.fullName.trim()) {
      setError('Correo y nombre completo son obligatorios.');
      return;
    }
    if (!editingId && !form.password) {
      setError('La contraseña es obligatoria para un nuevo super admin.');
      return;
    }
    if (form.password && form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        email: form.email.trim(),
        fullName: form.fullName.trim(),
      };
      if (form.password) body.password = form.password;

      const url    = editingId ? `/api/v1/super-admin/admins/${editingId}` : '/api/v1/super-admin/admins';
      const method = editingId ? 'PATCH' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message || 'Error al guardar');
        return;
      }

      setSuccess(editingId ? 'Super admin actualizado.' : 'Super admin creado correctamente.');
      setTimeout(() => setSuccess(''), 3000);
      closeForm();
      fetchAdmins();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (admin: SuperAdmin) => {
    const res  = await fetch(`/api/v1/super-admin/admins/${admin.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !admin.isActive }),
    });
    const json = await res.json();
    if (json.success) fetchAdmins();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.55rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '0.3rem',
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Settings size={24} color="#2563eb" />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#111827' }}>Configuraciones Globales</h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>Gestión de cuentas Super Administrador</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', background: '#2563eb', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
        >
          <Plus size={16} /> Nuevo Super Admin
        </button>
      </div>

      {/* Feedback */}
      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#065f46', fontSize: '0.875rem' }}>
          <Check size={16} /> {success}
        </div>
      )}

      {/* Formulario modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={20} color="#2563eb" />
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
                  {editingId ? 'Editar Super Admin' : 'Nuevo Super Admin'}
                </h2>
              </div>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Nombre completo *</label>
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Correo electrónico *</label>
                <input
                  type="email"
                  placeholder="admin@sistema.gov.co"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>{editingId ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    style={{ ...inputStyle, paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '2px' }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {form.password && (
                <div>
                  <label style={labelStyle}>Confirmar contraseña *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repetir contraseña"
                      value={form.confirmPassword}
                      onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                      style={{ ...inputStyle, paddingRight: '2.5rem', borderColor: form.confirmPassword && form.password !== form.confirmPassword ? '#ef4444' : '#d1d5db' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '2px' }}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '0.6rem 0.75rem', color: '#991b1b', fontSize: '0.8rem' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button onClick={closeForm} style={{ padding: '0.55rem 1.1rem', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: '0.875rem', color: '#374151' }}>
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ padding: '0.55rem 1.25rem', borderRadius: '6px', border: 'none', background: saving ? '#93c5fd' : '#2563eb', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.875rem', color: 'white', fontWeight: 600 }}
                >
                  {saving ? 'Guardando…' : editingId ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Branding de la App Principal */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: '2rem' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ImageIcon size={18} color="#2563eb" />
          <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>Branding — Aplicación Principal (ossprobe.store)</span>
        </div>
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Logo */}
          <div>
            <label style={labelStyle}>Logo principal</label>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {mainLogoUrl ? (
                <img src={mainLogoUrl} alt="Logo" style={{ height: '48px', maxWidth: '120px', objectFit: 'contain', borderRadius: '6px', backgroundColor: '#f3f4f6', padding: '4px' }} />
              ) : (
                <div style={{ width: '80px', height: '48px', borderRadius: '6px', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600 }}>LOGO</div>
              )}
              <div style={{ flex: 1, position: 'relative' }}>
                <input type="file" accept="image/*" onChange={handleMainLogoUpload} disabled={uploadingMainLogo} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }} />
                <div style={{ width: '100%', padding: '10px', backgroundColor: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '8px', color: '#4b5563', textAlign: 'center', fontWeight: 500, fontSize: '0.875rem' }}>
                  {uploadingMainLogo ? 'Subiendo...' : (mainLogoUrl ? 'Logo cargado. Clic para cambiar' : 'Subir logo (PNG/SVG recomendado, máx. 2 MB)')}
                </div>
              </div>
              {mainLogoUrl && (
                <button type="button" onClick={() => setMainLogoUrl('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Quitar</button>
              )}
            </div>
          </div>

          {/* Favicon */}
          <div>
            <label style={labelStyle}>Favicon</label>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {mainFaviconUrl ? (
                <img src={mainFaviconUrl} alt="Favicon" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'contain', backgroundColor: '#e5e7eb', padding: '3px' }} />
              ) : (
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#9ca3af', fontWeight: 600 }}>ICO</div>
              )}
              <div style={{ flex: 1, position: 'relative' }}>
                <input type="file" accept="image/png,image/x-icon,image/svg+xml,image/jpeg" onChange={handleMainFaviconUpload} disabled={uploadingMainFavicon} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }} />
                <div style={{ width: '100%', padding: '10px', backgroundColor: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '8px', color: '#4b5563', textAlign: 'center', fontWeight: 500, fontSize: '0.875rem' }}>
                  {uploadingMainFavicon ? 'Subiendo...' : (mainFaviconUrl ? 'Favicon cargado. Clic para cambiar' : 'Subir favicon (PNG recomendado, 32×32 px, máx. 1 MB)')}
                </div>
              </div>
              {mainFaviconUrl && (
                <button type="button" onClick={() => setMainFaviconUrl('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Quitar</button>
              )}
            </div>
          </div>

          {brandingSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '8px', padding: '0.6rem 1rem', color: '#065f46', fontSize: '0.875rem' }}>
              <Check size={15} /> {brandingSuccess}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSaveBranding}
              disabled={savingBranding}
              style={{ padding: '0.55rem 1.4rem', borderRadius: '6px', border: 'none', background: savingBranding ? '#93c5fd' : '#2563eb', cursor: savingBranding ? 'not-allowed' : 'pointer', fontSize: '0.875rem', color: 'white', fontWeight: 600 }}
            >
              {savingBranding ? 'Guardando…' : 'Guardar branding'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de super admins */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={18} color="#2563eb" />
          <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>Super Administradores ({admins.length})</span>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>Cargando...</div>
        ) : admins.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>No hay super admins registrados.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Nombre', 'Correo', 'Último acceso', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {admins.map(admin => (
                <tr key={admin.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: '#111827' }}>{admin.fullName}</td>
                  <td style={{ padding: '12px 16px', color: '#374151' }}>{admin.email}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '0.8rem' }}>
                    {admin.lastLoginAt
                      ? new Date(admin.lastLoginAt).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: admin.isActive ? '#d1fae5' : '#fee2e2', color: admin.isActive ? '#065f46' : '#991b1b' }}>
                      {admin.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        onClick={() => openEdit(admin)}
                        title="Editar"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', color: '#374151', fontSize: '0.8rem' }}
                      >
                        <Edit2 size={13} /> Editar
                      </button>
                      <button
                        onClick={() => toggleActive(admin)}
                        title={admin.isActive ? 'Desactivar' : 'Activar'}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: '1px solid', borderColor: admin.isActive ? '#fca5a5' : '#6ee7b7', background: 'white', cursor: 'pointer', color: admin.isActive ? '#dc2626' : '#059669', fontSize: '0.8rem' }}
                      >
                        {admin.isActive ? <ToggleLeft size={13} /> : <ToggleRight size={13} />}
                        {admin.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
