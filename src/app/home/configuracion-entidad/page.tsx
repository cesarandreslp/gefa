'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building, Save, Upload, Globe } from 'lucide-react';

// Componente externo para evitar pérdida de foco en re-renders
function ToggleField({ label, fieldKey, value, onChange, placeholder, type = 'text' }: {
  label: string; fieldKey: string; value: any; onChange: (key: string, val: any) => void; placeholder: string; type?: string;
}) {
  return (
    <div style={{ padding: '0.875rem', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: value !== null ? 'white' : '#f9fafb' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: value !== null ? '8px' : '0' }}>
        <input
          type="checkbox"
          checked={value !== null}
          onChange={e => onChange(fieldKey, e.target.checked ? '' : null)}
          style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary, #2563eb)', cursor: 'pointer' }}
        />
        <span style={{ fontWeight: '500', fontSize: '0.875rem', color: value !== null ? '#374151' : '#9ca3af' }}>{label}</span>
      </label>
      {value !== null && (
        <input
          required
          type={type}
          value={value || ''}
          onChange={e => onChange(fieldKey, e.target.value)}
          placeholder={placeholder}
          style={{ width: '100%', padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box', fontSize: '0.9rem' }}
        />
      )}
    </div>
  );
}

// Opciones de hora para los selectores
const HOUR_OPTIONS = [
  '5:00 AM','5:30 AM','6:00 AM','6:30 AM','7:00 AM','7:30 AM',
  '8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM',
  '11:00 AM','11:30 AM','12:00 PM','12:30 PM','1:00 PM','1:30 PM',
  '2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM',
  '5:00 PM','5:30 PM','6:00 PM','6:30 PM','7:00 PM','7:30 PM',
  '8:00 PM','8:30 PM','9:00 PM','9:30 PM','10:00 PM'
];

interface ScheduleBlock {
  enabled: boolean;
  open: string;
  close: string;
}

interface ScheduleData {
  weekdays: ScheduleBlock;
  saturday: ScheduleBlock;
  sunday: ScheduleBlock;
}

function parseSchedule(raw: string): ScheduleData {
  try {
    const p = JSON.parse(raw);
    if (p?.weekdays) return p;
  } catch {}
  return {
    weekdays: { enabled: true, open: '8:00 AM', close: '5:00 PM' },
    saturday: { enabled: false, open: '8:00 AM', close: '12:00 PM' },
    sunday: { enabled: false, open: '8:00 AM', close: '12:00 PM' },
  };
}

function buildHumanReadable(s: ScheduleData): string {
  const parts: string[] = [];
  if (s.weekdays.enabled) parts.push(`Lunes a Viernes: ${s.weekdays.open} - ${s.weekdays.close}`);
  if (s.saturday.enabled) parts.push(`Sábado: ${s.saturday.open} - ${s.saturday.close}`);
  if (s.sunday.enabled) parts.push(`Domingo: ${s.sunday.open} - ${s.sunday.close}`);
  return parts.join('. ') || 'Sin horario definido';
}

function SchedulePicker({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [schedule, setSchedule] = React.useState<ScheduleData>(() => parseSchedule(value || ''));

  const update = (block: keyof ScheduleData, field: keyof ScheduleBlock, val: any) => {
    const updated = { ...schedule, [block]: { ...schedule[block], [field]: val } };
    setSchedule(updated);
    onChange(JSON.stringify(updated));
  };

  const selectStyle = {
    padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '6px',
    fontSize: '0.85rem', cursor: 'pointer', backgroundColor: 'white', minWidth: '100px'
  };

  const blocks: { key: keyof ScheduleData; label: string }[] = [
    { key: 'weekdays', label: 'Lunes a Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' },
  ];

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', backgroundColor: '#fafafa' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {blocks.map(b => {
          const s = schedule[b.key];
          return (
            <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', backgroundColor: s.enabled ? 'white' : 'transparent', border: s.enabled ? '1px solid #e5e7eb' : '1px solid transparent' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', minWidth: '140px' }}>
                <input
                  type="checkbox"
                  checked={s.enabled}
                  onChange={e => update(b.key, 'enabled', e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary, #2563eb)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: s.enabled ? '600' : '400', color: s.enabled ? '#111827' : '#9ca3af' }}>{b.label}</span>
              </label>
              {s.enabled ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Abre:</span>
                  <select value={s.open} onChange={e => update(b.key, 'open', e.target.value)} style={selectStyle}>
                    {HOUR_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Cierra:</span>
                  <select value={s.close} onChange={e => update(b.key, 'close', e.target.value)} style={selectStyle}>
                    {HOUR_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ) : (
                <span style={{ fontSize: '0.85rem', color: '#d1d5db', fontStyle: 'italic' }}>Cerrado</span>
              )}
            </div>
          );
        })}
      </div>
      {/* Vista previa */}
      <div style={{ marginTop: '0.75rem', padding: '8px 12px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #bae6fd' }}>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#0369a1' }}>
          <strong>En el footer:</strong> 🕐 {buildHumanReadable(schedule)}
        </p>
      </div>
    </div>
  );
}

export default function ConfiguracionEntidadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tenantInfo, setTenantInfo] = useState<any>(null);

  const [form, setForm] = useState<any>({
    logoUrl: '',
    primaryColor: '#2563eb',
    secondaryColor: '#4f46e5',
    // Obligatorios
    address: '',
    businessHours: '',
    phone: '',
    institutionalEmail: '',
    // Desactivables (null = off)
    mobilePhone: null,
    tollFreePhone: null,
    anticorruptionPhone: null,
    fax: null,
    judicialNoticesEmail: null,
    // Redes sociales (null = off)
    facebook: null,
    twitter: null,
    youtube: null,
    instagram: null,
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/v1/mi-entidad', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setTenantInfo(data.data);
        setForm({
          logoUrl: data.data.logoUrl || '',
          primaryColor: data.data.primaryColor || '#2563eb',
          secondaryColor: data.data.secondaryColor || '#4f46e5',
          address: data.data.address || '',
          businessHours: data.data.businessHours || '',
          phone: data.data.phone || '',
          institutionalEmail: data.data.institutionalEmail || '',
          mobilePhone: data.data.mobilePhone,
          tollFreePhone: data.data.tollFreePhone,
          anticorruptionPhone: data.data.anticorruptionPhone,
          fax: data.data.fax,
          judicialNoticesEmail: data.data.judicialNoticesEmail,
          facebook: data.data.facebook,
          twitter: data.data.twitter,
          youtube: data.data.youtube,
          instagram: data.data.instagram,
        });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(false);

    // Validar campos desactivables: si está activado (no null) debe tener valor
    const toggleFields = [
      { key: 'mobilePhone', label: 'Teléfono Móvil' },
      { key: 'tollFreePhone', label: 'Línea de Atención Gratuita' },
      { key: 'anticorruptionPhone', label: 'Línea Anticorrupción' },
      { key: 'fax', label: 'Fax' },
      { key: 'judicialNoticesEmail', label: 'Correo Notificaciones Judiciales' },
      { key: 'facebook', label: 'Facebook' },
      { key: 'twitter', label: 'X (Twitter)' },
      { key: 'youtube', label: 'Youtube' },
      { key: 'instagram', label: 'Instagram' },
    ];
    for (const field of toggleFields) {
      if (form[field.key] !== null && !form[field.key]?.trim()) {
        setError(`El campo "${field.label}" está activado pero vacío. Escribe un valor o desmárcalo.`);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch('/api/v1/mi-entidad', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
        // Forzar re-render del layout server-side para actualizar el footer
        router.refresh();
      } else {
        setError(data.error || 'Error al guardar');
      }
    } catch { setError('Error de conexión'); }
    finally { setSaving(false); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('file', e.target.files[0]);
      fd.append('folder', 'logos');
      const res = await fetch('/api/v1/upload', { method: 'POST', body: fd });
      const result = await res.json();
      if (result.success) setForm({ ...form, logoUrl: result.data.url });
      else setError('Error subiendo logo: ' + result.error);
    } catch { setError('Error de red al subir logo'); }
    finally { setUploadingLogo(false); }
  };

  // Callback estable para ToggleField
  const handleFieldChange = (key: string, val: any) => {
    setForm((prev: any) => ({ ...prev, [key]: val }));
  };

  const inputStyle = { width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' as const, fontSize: '0.9rem' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '0.875rem', color: '#374151' };
  const sectionStyle = { backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <p style={{ color: '#6b7280' }}>Cargando configuración...</p>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '1.25rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', maxWidth: '900px', margin: '0 auto' }}>
          <button onClick={() => router.push('/home')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex' }}>
            <ArrowLeft size={24} color="#374151" />
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>Configuración de la Entidad</h1>
            <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: '0.85rem' }}>
              {tenantInfo?.name} — {tenantInfo?.institutionType?.name || 'Sin tipo'}
            </p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
        {/* Datos no editables */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: '600', color: '#374151', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building size={18} color="#6b7280" /> Datos de Registro
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '1rem' }}>Solo modificables por el Super Administrador.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div><p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 2px' }}>Nombre</p><p style={{ fontWeight: '600', color: '#111827', margin: 0, fontSize: '0.95rem' }}>{tenantInfo?.name}</p></div>
            <div><p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 2px' }}>Sigla</p><p style={{ fontWeight: '600', color: '#111827', margin: 0, fontSize: '0.95rem' }}>{tenantInfo?.sigla}</p></div>
            <div><p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 2px' }}>Dominio</p><p style={{ fontWeight: '600', color: '#111827', margin: 0, fontSize: '0.95rem' }}>{tenantInfo?.domain || '—'}</p></div>
          </div>
        </div>

        <form onSubmit={handleSave}>
          {/* Branding */}
          <div style={sectionStyle}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '600', color: '#374151', margin: '0 0 1.5rem' }}>🎨 Branding y Apariencia</h2>
            {/* Logo */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Logo de la Entidad</label>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="Logo" style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'contain', backgroundColor: form.primaryColor || '#e5e7eb', padding: '5px' }} />
                ) : (
                  <div style={{ width: '56px', height: '56px', borderRadius: '10px', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building size={24} color="#9ca3af" />
                  </div>
                )}
                <div style={{ flex: 1, position: 'relative' }}>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }} />
                  <div style={{ padding: '10px', backgroundColor: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '8px', color: '#4b5563', textAlign: 'center', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem' }}>
                    <Upload size={16} /> {uploadingLogo ? 'Subiendo...' : (form.logoUrl ? 'Cambiar logo' : 'Subir logo')}
                  </div>
                </div>
              </div>
            </div>
            {/* Colores */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Color Primario</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="color" value={form.primaryColor} onChange={e => setForm({ ...form, primaryColor: e.target.value })} style={{ width: '44px', height: '36px', padding: '2px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }} />
                  <input type="text" value={form.primaryColor} onChange={e => setForm({ ...form, primaryColor: e.target.value })} style={{ ...inputStyle, fontFamily: 'monospace' }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Color Secundario</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="color" value={form.secondaryColor} onChange={e => setForm({ ...form, secondaryColor: e.target.value })} style={{ width: '44px', height: '36px', padding: '2px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }} />
                  <input type="text" value={form.secondaryColor} onChange={e => setForm({ ...form, secondaryColor: e.target.value })} style={{ ...inputStyle, fontFamily: 'monospace' }} />
                </div>
              </div>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: '6px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: '50px', height: '24px', borderRadius: '4px', backgroundColor: form.primaryColor }} />
              <div style={{ width: '50px', height: '24px', borderRadius: '4px', backgroundColor: form.secondaryColor }} />
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Vista previa</span>
            </div>
          </div>

          {/* Contacto Obligatorio */}
          <div style={sectionStyle}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '600', color: '#374151', margin: '0 0 1.5rem' }}>📞 Información de Contacto</h2>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Dirección *</label>
              <input required value={form.address} onChange={e => { const v = e.target.value; setForm((p: any) => ({ ...p, address: v })); }} placeholder="Cra 5 #10-20, Centro" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Horario de Atención *</label>
              <SchedulePicker
                value={form.businessHours}
                onChange={(val) => setForm((p: any) => ({ ...p, businessHours: val }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={labelStyle}>Teléfono Conmutador *</label>
                <input required value={form.phone} onChange={e => { const v = e.target.value; setForm((p: any) => ({ ...p, phone: v })); }} placeholder="(+57) (2) 0000000" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Correo Institucional *</label>
                <input required type="email" value={form.institutionalEmail} onChange={e => { const v = e.target.value; setForm((p: any) => ({ ...p, institutionalEmail: v })); }} placeholder="contacto@entidad.gov.co" style={inputStyle} />
              </div>
            </div>

            {/* Campos Desactivables */}
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.75rem', fontWeight: '500' }}>
              Campos opcionales — desmarcar para ocultar del footer
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <ToggleField label="Teléfono Móvil" fieldKey="mobilePhone" value={form.mobilePhone} onChange={handleFieldChange} placeholder="(+57) 300 000 0000" />
              <ToggleField label="Línea de Atención Gratuita" fieldKey="tollFreePhone" value={form.tollFreePhone} onChange={handleFieldChange} placeholder="018000 000 000" />
              <ToggleField label="Línea Anticorrupción" fieldKey="anticorruptionPhone" value={form.anticorruptionPhone} onChange={handleFieldChange} placeholder="(+57) 018000919748" />
              <ToggleField label="Fax" fieldKey="fax" value={form.fax} onChange={handleFieldChange} placeholder="(+57) (2) 0000001" />
              <ToggleField label="Correo Notificaciones Judiciales" fieldKey="judicialNoticesEmail" value={form.judicialNoticesEmail} onChange={handleFieldChange} placeholder="notificaciones@entidad.gov.co" type="email" />
            </div>
          </div>

          {/* Redes Sociales */}
          <div style={sectionStyle}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '600', color: '#374151', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={18} /> Redes Sociales
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '1rem' }}>
              Desmarcar para ocultar del footer. Incluir la URL completa.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <ToggleField label="Facebook" fieldKey="facebook" value={form.facebook} onChange={handleFieldChange} placeholder="https://facebook.com/tu-entidad" type="url" />
              <ToggleField label="X (Twitter)" fieldKey="twitter" value={form.twitter} onChange={handleFieldChange} placeholder="https://x.com/tu-entidad" type="url" />
              <ToggleField label="Youtube" fieldKey="youtube" value={form.youtube} onChange={handleFieldChange} placeholder="https://youtube.com/@tu-entidad" type="url" />
              <ToggleField label="Instagram" fieldKey="instagram" value={form.instagram} onChange={handleFieldChange} placeholder="https://instagram.com/tu-entidad" type="url" />
            </div>
          </div>

          {/* Mensajes y Botones */}
          {error && <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px', marginBottom: '1rem', color: '#991b1b', fontWeight: '500' }}>{error}</div>}
          {success && <div style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '12px', marginBottom: '1rem', color: '#166534', fontWeight: '500' }}>✅ Configuración guardada exitosamente. Recarga la página para ver los cambios en el footer.</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingBottom: '3rem' }}>
            <button type="button" onClick={() => router.push('/home')} style={{ padding: '12px 24px', backgroundColor: 'transparent', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
              Volver al Dashboard
            </button>
            <button type="submit" disabled={saving} style={{ padding: '12px 24px', backgroundColor: saving ? '#9ca3af' : 'var(--color-primary, #2563eb)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
