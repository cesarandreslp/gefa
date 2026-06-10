'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Edit, Power, PowerOff, Building, Check, Key, Eye, EyeOff } from 'lucide-react';

export default function SuperAdminDashboard() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Modal State
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ name: '', sigla: '', domain: '', institutionTypeId: '', maxComisarias: '', maxUsers: '', logoUrl: '', faviconUrl: '', groqApiKey: '', smtpUser: '', smtpPass: '', smtpFromName: '', databaseUrl: '', databaseUrlDirect: '' });
  const [showDbUrl, setShowDbUrl] = useState(false);
  const [showDbUrlDirect, setShowDbUrlDirect] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [institutionTypes, setInstitutionTypes] = useState<any[]>([]);
  // Edit Modal State
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState({ id: '', name: '', sigla: '', domain: '', primaryColor: '#2563eb', secondaryColor: '#4f46e5', logoUrl: '', faviconUrl: '', groqApiKey: '', smtpUser: '', smtpPass: '', smtpFromName: '' });
  const [showEditGroqKey, setShowEditGroqKey] = useState(false);
  const [showEditSmtpPass, setShowEditSmtpPass] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploadingEditLogo, setUploadingEditLogo] = useState(false);
  const [uploadingEditFavicon, setUploadingEditFavicon] = useState(false);

  const handleEdit = (t: any) => {
    setEditData({
      id: t.id,
      name: t.name || '',
      sigla: t.sigla || '',
      domain: t.domain || '',
      primaryColor: t.primaryColor || '#2563eb',
      secondaryColor: t.secondaryColor || '#4f46e5',
      logoUrl: t.logoUrl || '',
      faviconUrl: t.faviconUrl || '',
      groqApiKey: t.settings?.groqApiKey || '',
      smtpUser: t.settings?.smtpUser || '',
      smtpPass: t.settings?.smtpPass || '',
      smtpFromName: t.settings?.smtpFromName || '',
    });
    setShowEdit(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditing(true);
    try {
      const res = await fetch(`/api/v1/super-admin/tenants/${editData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editData.name,
          sigla: editData.sigla,
          domain: editData.domain,
          primaryColor: editData.primaryColor,
          secondaryColor: editData.secondaryColor,
          logoUrl: editData.logoUrl,
          faviconUrl: editData.faviconUrl,
          groqApiKey: editData.groqApiKey,
          smtpUser: editData.smtpUser,
          smtpPass: editData.smtpPass,
          smtpFromName: editData.smtpFromName,
        }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setShowEdit(false);
        fetchTenants();
      } else {
        alert("Error al actualizar: " + (data.error || JSON.stringify(data)));
      }
    } catch {
      alert('Error de conexión al actualizar');
    } finally {
      setEditing(false);
    }
  };

  const handleEditLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingEditLogo(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'logos');
      const response = await fetch('/api/v1/upload', { method: 'POST', body: form });
      const newBlob = await response.json();
      if (newBlob.success) {
        setEditData({ ...editData, logoUrl: newBlob.data.url });
      } else {
        alert("Error subiendo el logo: " + newBlob.error);
      }
    } catch {
      alert("Error de red al subir logo");
    } finally {
      setUploadingEditLogo(false);
    }
  };

  const [successData, setSuccessData] = useState<any>(null);

  useEffect(() => {
    fetchTenants();
    fetchInstitutionTypes();
  }, []);

  const fetchInstitutionTypes = async () => {
    try {
      const res = await fetch('/api/v1/super-admin/institution-types', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setInstitutionTypes(data.data);
    } catch (e) { console.error(e); }
  };

  const fetchTenants = async () => {
    try {
      const res = await fetch('/api/v1/super-admin/tenants', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setTenants(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/v1/super-admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setSuccessData(data.data.credentials);
        fetchTenants();
      } else {
        alert("Error de API:\n" + JSON.stringify(data, null, 2));
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/v1/super-admin/tenants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        fetchTenants();
      } else {
        alert("Fallo al cambiar estado: \n" + JSON.stringify(data.error || data));
      }
    } catch (e) {
      alert("Fallo de red al intentar cambiar el estado.");
      console.error(e);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingLogo(true);
    
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'logos');

      const response = await fetch('/api/v1/upload', {
        method: 'POST',
        body: form
      });
      
      const newBlob = await response.json();
      if (newBlob.success) {
        setFormData({ ...formData, logoUrl: newBlob.data.url });
      } else {
        alert("Error subiendo el logo: " + newBlob.error);
      }
    } catch {
      alert("Error de red al subir logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.size > 1024 * 1024) {
      alert('El favicon no puede superar 1 MB. Comprime la imagen antes de subirla.');
      e.target.value = '';
      return;
    }
    setUploadingFavicon(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'favicons');
      const response = await fetch('/api/v1/upload', { method: 'POST', body: form });
      const newBlob = await response.json();
      if (newBlob.success) {
        setFormData({ ...formData, faviconUrl: newBlob.data.url });
      } else {
        alert("Error subiendo el favicon: " + newBlob.error);
      }
    } catch {
      alert("Error de red al subir favicon");
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleEditFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.size > 1024 * 1024) {
      alert('El favicon no puede superar 1 MB. Comprime la imagen antes de subirla.');
      e.target.value = '';
      return;
    }
    setUploadingEditFavicon(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'favicons');
      const response = await fetch('/api/v1/upload', { method: 'POST', body: form });
      const newBlob = await response.json();
      if (newBlob.success) {
        setEditData({ ...editData, faviconUrl: newBlob.data.url });
      } else {
        alert("Error subiendo el favicon: " + newBlob.error);
      }
    } catch {
      alert("Error de red al subir favicon");
    } finally {
      setUploadingEditFavicon(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0 0 8px 0', color: '#111827' }}>Ecosistema de Tenants</h2>
          <p style={{ margin: 0, color: '#6b7280' }}>Gestión centralizada de instancias y entidades adscritas.</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#2563eb', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
        >
          <Plus size={20} />
          Nueva Entidad
        </button>
      </div>

      {loading ? (
        <p>Cargando nodos del ecosistema...</p>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '16px 24px', color: '#374151', fontWeight: '600', fontSize: '0.9rem' }}>ENTIDAD</th>
                <th style={{ padding: '16px 24px', color: '#374151', fontWeight: '600', fontSize: '0.9rem' }}>DOMINIO</th>
                <th style={{ padding: '16px 24px', color: '#374151', fontWeight: '600', fontSize: '0.9rem' }}>ESTADO</th>
                <th style={{ padding: '16px 24px', color: '#374151', fontWeight: '600', fontSize: '0.9rem' }}>USUARIOS / CASOS</th>
                <th style={{ padding: '16px 24px', color: '#374151', fontWeight: '600', fontSize: '0.9rem', textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: t.primaryColor || '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {t.logoUrl ? <img src={t.logoUrl} style={{ maxWidth: '30px', maxHeight: '30px' }} alt="" /> : <Building size={20} color="white" />}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 'bold', color: '#111827' }}>{t.name}</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>Sigla: {t.sigla}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', color: '#4b5563', fontWeight: '500' }}>{t.domain}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: '600', backgroundColor: t.isActive ? '#dcfce7' : '#fee2e2', color: t.isActive ? '#166534' : '#991b1b' }}>
                      {t.isActive ? <Check size={14} /> : <PowerOff size={14} />}
                      {t.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', color: '#6b7280' }}>
                    U: <b>{t._count.users}</b> &nbsp;&nbsp; C: <b>{t._count.cases}</b>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button 
                      onClick={() => toggleStatus(t.id, t.isActive)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '6px', color: t.isActive ? '#ef4444' : '#10b981' }}
                      title={t.isActive ? "Desactivar" : "Activar"}
                    >
                      <Power size={20} />
                    </button>
                    <button 
                      onClick={() => handleEdit(t)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '6px', color: '#6b7280' }}
                      title="Editar Entidad"
                    >
                      <Edit size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Creación */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)', padding: '24px' }}>
          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
            
            {successData ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ margin: '0 auto 24px', width: '64px', height: '64px', backgroundColor: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Key size={32} color="#16a34a" />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 16px', color: '#111827' }}>¡Instancia Creada Exitosamente!</h3>
                <p style={{ color: '#4b5563', marginBottom: '24px' }}>La base de datos y roles han sido provisionados. Entregue las siguientes credenciales al administrador de la nueva entidad. <b>El sistema le forzará a cambiarla en su primer login.</b></p>
                
                <div style={{ backgroundColor: '#f3f4f6', padding: '24px', borderRadius: '12px', textAlign: 'left', marginBottom: '32px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#6b7280' }}>Email Administrador</p>
                  <p style={{ margin: '0 0 16px 0', fontWeight: 'bold', fontSize: '1.1rem', color: '#111827' }}>{successData.email}</p>
                  
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#6b7280' }}>Contraseña Temporal</p>
                  <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2rem', color: '#2563eb', fontFamily: 'monospace' }}>{successData.temporaryPassword}</p>
                </div>
                
                <button 
                  onClick={() => { setShowCreate(false); setSuccessData(null); setFormData({ name: '', sigla: '', domain: '', institutionTypeId: '', maxComisarias: '', maxUsers: '', logoUrl: '', faviconUrl: '', groqApiKey: '', smtpUser: '', smtpPass: '', smtpFromName: '', databaseUrl: '', databaseUrlDirect: '' }); }}
                  style={{ width: '100%', padding: '14px', backgroundColor: '#111827', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Entendido, cerrar panel
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 24px', color: '#111827' }}>Aprovisionar Nueva Entidad</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Nombre Institucional</label>
                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' }} placeholder="Ej: Alcaldía de Yumbo" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Sigla Única</label>
                    <input required value={formData.sigla} onChange={e => setFormData({...formData, sigla: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' }} placeholder="Ej: YUMBO" />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Dominio Asignado (Solo el host)</label>
                  <input required value={formData.domain} 
                         onChange={e => {
                           let val = e.target.value;
                           val = val.replace(/https?:\/\//, ''); // Quitar HTTP
                           val = val.replace(/\/$/, ''); // Quitar Slash final
                           val = val.replace(/^www\./, ''); // Quitar www
                           setFormData({...formData, domain: val.toLowerCase()})
                         }} 
                         style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' }} 
                         placeholder="Ej. mientidad.gov.co o entidad.localhost:3000" />
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#6b7280' }}>Puedes escribir la URL exactamente como quieras que se acceda.</p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Comisarías contratadas <span style={{ color: '#9ca3af', fontWeight: '400' }}>(cupo — vacío = sin límite)</span></label>
                  <input type="number" min={0} value={formData.maxComisarias}
                         onChange={e => setFormData({...formData, maxComisarias: e.target.value})}
                         style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' }}
                         placeholder="Ej: 3" />
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#6b7280' }}>Máximo de comisarías (sedes) que la Alcaldía podrá tener activas. El administrador del tenant no podrá exceder este número.</p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Usuarios contratados <span style={{ color: '#9ca3af', fontWeight: '400' }}>(cupo de seats — vacío = sin límite)</span></label>
                  <input type="number" min={0} value={formData.maxUsers}
                         onChange={e => setFormData({...formData, maxUsers: e.target.value})}
                         style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' }}
                         placeholder="Ej: 25" />
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#6b7280' }}>Máximo de usuarios activos que la Alcaldía podrá tener (no cuenta el usuario interno de IA). El administrador del tenant no podrá exceder este número.</p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Tipo de Institución *</label>
                  <select 
                    required 
                    value={formData.institutionTypeId} 
                    onChange={e => setFormData({...formData, institutionTypeId: e.target.value})}
                    style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: 'white', fontSize: '0.95rem' }}
                  >
                    <option value="">-- Seleccionar tipo --</option>
                    {institutionTypes.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  {formData.institutionTypeId && (() => {
                    const selected = institutionTypes.find(t => t.id === formData.institutionTypeId);
                    return selected ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: selected.primaryColor }} />
                        <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: selected.secondaryColor }} />
                        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Colores asignados automáticamente</span>
                      </div>
                    ) : null;
                  })()}
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Logo de la Entidad *</label>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="Logo" style={{ width: '45px', height: '45px', borderRadius: '8px', objectFit: 'contain', backgroundColor: '#e5e7eb', padding: '4px' }} />
                    ) : (
                      <div style={{ width: '45px', height: '45px', borderRadius: '8px', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Building size={20} color="#9ca3af" />
                      </div>
                    )}
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }} />
                      <div style={{ width: '100%', padding: '12px', backgroundColor: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '8px', color: '#4b5563', textAlign: 'center', fontWeight: '500' }}>
                        {uploadingLogo ? 'Subiendo...' : (formData.logoUrl ? 'Logo cargado. Clic para cambiar' : 'Examinar o arrastrar imagen...')}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Favicon <span style={{ color: '#9ca3af', fontWeight: '400' }}>(opcional — ícono que aparece en la pestaña del navegador)</span></label>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    {formData.faviconUrl ? (
                      <img src={formData.faviconUrl} alt="Favicon" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'contain', backgroundColor: '#e5e7eb', padding: '3px' }} />
                    ) : (
                      <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#9ca3af', fontWeight: '600' }}>ICO</div>
                    )}
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input type="file" accept="image/png,image/x-icon,image/svg+xml,image/jpeg" onChange={handleFaviconUpload} disabled={uploadingFavicon} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }} />
                      <div style={{ width: '100%', padding: '12px', backgroundColor: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '8px', color: '#4b5563', textAlign: 'center', fontWeight: '500' }}>
                        {uploadingFavicon ? 'Subiendo...' : (formData.faviconUrl ? 'Favicon cargado. Clic para cambiar' : 'Subir favicon (PNG recomendado, 32×32 px, máx. 1 MB)')}
                      </div>
                    </div>
                    {formData.faviconUrl && (
                      <button type="button" onClick={() => setFormData({ ...formData, faviconUrl: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Quitar</button>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Correo institucional (Gmail SMTP)</label>
                  <input
                    type="email"
                    value={formData.smtpUser}
                    onChange={e => setFormData({...formData, smtpUser: e.target.value})}
                    style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
                    placeholder="notificaciones@entidad.gov.co"
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Contraseña de aplicación Gmail</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showSmtpPass ? 'text' : 'password'}
                      value={formData.smtpPass}
                      onChange={e => setFormData({...formData, smtpPass: e.target.value})}
                      style={{ width: '100%', padding: '12px', paddingRight: '44px', border: '1px solid #d1d5db', borderRadius: '8px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                      placeholder="xxxx xxxx xxxx xxxx"
                    />
                    <button type="button" onClick={() => setShowSmtpPass(!showSmtpPass)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, display: 'flex' }}>
                      {showSmtpPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
                    Genera una en{' '}
                    <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>myaccount.google.com/apppasswords</a>
                  </p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Nombre del remitente</label>
                  <input
                    type="text"
                    value={formData.smtpFromName}
                    onChange={e => setFormData({...formData, smtpFromName: e.target.value})}
                    style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
                    placeholder="Ej: Nombre oficial de la entidad"
                  />
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#6b7280' }}>Así aparece la entidad en la bandeja del ciudadano.</p>
                </div>

                <div style={{ marginBottom: '16px', padding: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#1e40af' }}>
                    🗄️ <strong>Base de datos automática:</strong> si dejas vacíos los dos campos de abajo, al crear la entidad se aprovisiona automáticamente un proyecto Neon propio (<code>gefa-&lt;sigla&gt;</code>), se le aplica el esquema y se siembra el catálogo. Solo completa las URLs si quieres usar una BD creada a mano.
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>URL Base de Datos Neon <span style={{ color: '#9ca3af', fontWeight: '400' }}>(opcional — vacío = se crea sola)</span></label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showDbUrl ? 'text' : 'password'}
                      value={formData.databaseUrl}
                      onChange={e => setFormData({...formData, databaseUrl: e.target.value})}
                      style={{ width: '100%', padding: '12px', paddingRight: '44px', border: '1px solid #d1d5db', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.8rem', boxSizing: 'border-box' }}
                      placeholder="postgresql://user:pass@host/db?sslmode=require"
                    />
                    <button type="button" onClick={() => setShowDbUrl(!showDbUrl)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, display: 'flex' }}>
                      {showDbUrl ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#6b7280' }}>Si la proporcionas, se usa esa BD (creada a mano) en vez de crear una nueva en Neon.</p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>URL Directa BD Neon <span style={{ color: '#9ca3af', fontWeight: '400' }}>(opcional — sin pooler, para migraciones)</span></label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showDbUrlDirect ? 'text' : 'password'}
                      value={formData.databaseUrlDirect}
                      onChange={e => setFormData({...formData, databaseUrlDirect: e.target.value})}
                      style={{ width: '100%', padding: '12px', paddingRight: '44px', border: '1px solid #d1d5db', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.8rem', boxSizing: 'border-box' }}
                      placeholder="postgresql://user:pass@host/db?sslmode=require"
                    />
                    <button type="button" onClick={() => setShowDbUrlDirect(!showDbUrlDirect)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, display: 'flex' }}>
                      {showDbUrlDirect ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>
                    GROQ API Key *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      required
                      type={showGroqKey ? 'text' : 'password'}
                      value={formData.groqApiKey}
                      onChange={e => setFormData({...formData, groqApiKey: e.target.value})}
                      style={{ width: '100%', padding: '12px', paddingRight: '44px', border: '1px solid #d1d5db', borderRadius: '8px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                      placeholder=""
                    />
                    <button
                      type="button"
                      onClick={() => setShowGroqKey(!showGroqKey)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, display: 'flex' }}
                    >
                      {showGroqKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
                    Obtén una en{' '}
                    <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>console.groq.com/keys</a>
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowCreate(false)} style={{ padding: '12px 24px', backgroundColor: 'transparent', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
                  <button type="submit" disabled={creating || !formData.logoUrl || !formData.institutionTypeId || !formData.groqApiKey} style={{ padding: '12px 24px', backgroundColor: (creating || !formData.logoUrl || !formData.institutionTypeId || !formData.groqApiKey) ? '#9ca3af' : '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: (creating || !formData.logoUrl || !formData.institutionTypeId || !formData.groqApiKey) ? 'not-allowed' : 'pointer' }}>
                    {creating ? 'Procesando Nodos...' : 'Crear Entidad'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Modal Edición */}
      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)', padding: '24px' }}>
          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
            <form onSubmit={handleEditSubmit}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 24px', color: '#111827' }}>Editar Entidad</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Nombre Institucional</label>
                  <input required value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Sigla Única</label>
                  <input required value={editData.sigla} onChange={e => setEditData({...editData, sigla: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Dominio Asignado</label>
                <input required value={editData.domain} 
                       onChange={e => {
                         let val = e.target.value;
                         val = val.replace(/https?:\/\//, '');
                         val = val.replace(/\/$/, '');
                         val = val.replace(/^www\./, '');
                         setEditData({...editData, domain: val.toLowerCase()})
                       }} 
                       style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }} 
                       placeholder="Ej. mientidad.gov.co o entidad.localhost:3000" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Color Primario</label>
                  <input required type="color" value={editData.primaryColor} onChange={e => setEditData({...editData, primaryColor: e.target.value})} style={{ width: '100%', height: '45px', padding: '4px', border: '1px solid #d1d5db', borderRadius: '8px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Color Secundario</label>
                  <input required type="color" value={editData.secondaryColor} onChange={e => setEditData({...editData, secondaryColor: e.target.value})} style={{ width: '100%', height: '45px', padding: '4px', border: '1px solid #d1d5db', borderRadius: '8px' }} />
                </div>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Logo de la Entidad</label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  {editData.logoUrl ? (
                    <img src={editData.logoUrl} alt="Logo" style={{ width: '45px', height: '45px', borderRadius: '8px', objectFit: 'contain', backgroundColor: editData.primaryColor || '#e5e7eb', padding: '4px' }} />
                  ) : (
                    <div style={{ width: '45px', height: '45px', borderRadius: '8px', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <Building size={20} color="#9ca3af" />
                    </div>
                  )}
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input type="file" accept="image/*" onChange={handleEditLogoUpload} disabled={uploadingEditLogo} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }} />
                    <div style={{ width: '100%', padding: '12px', backgroundColor: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '8px', color: '#4b5563', textAlign: 'center', fontWeight: '500' }}>
                      {uploadingEditLogo ? 'Subiendo...' : (editData.logoUrl ? 'Cambiar logo' : 'Subir logo...')}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Favicon <span style={{ color: '#9ca3af', fontWeight: '400' }}>(opcional — ícono en pestaña del navegador)</span></label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  {editData.faviconUrl ? (
                    <img src={editData.faviconUrl} alt="Favicon" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'contain', backgroundColor: '#e5e7eb', padding: '3px' }} />
                  ) : (
                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#9ca3af', fontWeight: '600' }}>ICO</div>
                  )}
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input type="file" accept="image/png,image/x-icon,image/svg+xml,image/jpeg" onChange={handleEditFaviconUpload} disabled={uploadingEditFavicon} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }} />
                    <div style={{ width: '100%', padding: '12px', backgroundColor: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '8px', color: '#4b5563', textAlign: 'center', fontWeight: '500' }}>
                      {uploadingEditFavicon ? 'Subiendo...' : (editData.faviconUrl ? 'Favicon cargado. Clic para cambiar' : 'Subir favicon (PNG recomendado, 32×32 px, máx. 1 MB)')}
                    </div>
                  </div>
                  {editData.faviconUrl && (
                    <button type="button" onClick={() => setEditData({ ...editData, faviconUrl: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Quitar</button>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Correo institucional (Gmail SMTP)</label>
                <input type="email" value={editData.smtpUser} onChange={e => setEditData({...editData, smtpUser: e.target.value})}
                  style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
                  placeholder="notificaciones@entidad.gov.co" />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Contraseña de aplicación Gmail</label>
                <div style={{ position: 'relative' }}>
                  <input type={showEditSmtpPass ? 'text' : 'password'} value={editData.smtpPass}
                    onChange={e => setEditData({...editData, smtpPass: e.target.value})}
                    style={{ width: '100%', padding: '12px', paddingRight: '44px', border: '1px solid #d1d5db', borderRadius: '8px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                    placeholder="xxxx xxxx xxxx xxxx" />
                  <button type="button" onClick={() => setShowEditSmtpPass(!showEditSmtpPass)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, display: 'flex' }}>
                    {showEditSmtpPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
                  Genera una en{' '}
                  <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>myaccount.google.com/apppasswords</a>
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Nombre del remitente</label>
                <input type="text" value={editData.smtpFromName} onChange={e => setEditData({...editData, smtpFromName: e.target.value})}
                  style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
                  placeholder="Ej: Nombre oficial de la entidad" />
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#6b7280' }}>Así aparece la entidad en la bandeja del ciudadano.</p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>GROQ API Key</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showEditGroqKey ? 'text' : 'password'}
                    value={editData.groqApiKey}
                    onChange={e => setEditData({...editData, groqApiKey: e.target.value})}
                    style={{ width: '100%', padding: '12px', paddingRight: '44px', border: '1px solid #d1d5db', borderRadius: '8px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                    placeholder={editData.groqApiKey ? 'Clic para cambiar la key actual' : 'Sin key configurada — ingresa una'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditGroqKey(!showEditGroqKey)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, display: 'flex' }}
                  >
                    {showEditGroqKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
                  Obtén una en{' '}
                  <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>console.groq.com/keys</a>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowEdit(false)} style={{ padding: '12px 24px', backgroundColor: 'transparent', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={editing} style={{ padding: '12px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: editing ? 'not-allowed' : 'pointer' }}>
                  {editing ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
