/**
 * /admin/entidad — Configuración de la Entidad
 * Datos públicos, branding, SMTP, IA y servicios de la página principal. Estilo
 * inline (el proyecto no usa Tailwind). Acceso: ADMIN.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Save, Check } from 'lucide-react';
import { AVAILABLE_ICONS, ICON_LABELS } from '@/lib/landingDefaults';
import type { LandingConfig } from '@/lib/landingDefaults';
import AdminPageHeader from '../AdminPageHeader';

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.5rem' };
const input: React.CSSProperties = { width: '100%', padding: '0.6rem 0.7rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.88rem', boxSizing: 'border-box' };
const label: React.CSSProperties = { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 5 };
const help: React.CSSProperties = { margin: '0.35rem 0 0', fontSize: '0.78rem', color: '#94a3b8' };
const sectionTitle: React.CSSProperties = { fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '0 0 1.1rem', paddingBottom: '0.7rem', borderBottom: '1px solid #f1f5f9' };
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 };

export default function TenantEntidadPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    address: '',
    phone: '',
    institutionalEmail: '',
    anticorruptionPhone: '',
    judicialNoticesEmail: '',
    logoUrl: '',
    primaryColor: '#1D4ED8',
    groqApiKey: '',
    aiProvider: '',
    aiApiKey: '',
    aiModel: '',
    smtpUser: '',
    smtpPass: '',
    smtpFromName: '',
  });
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  const [landingConfig, setLandingConfig] = useState<LandingConfig | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch('/api/v1/tenant-settings');
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al cargar los datos');

      const d = json.data;
      setFormData({
        address: d?.address || '',
        phone: d?.phone || '',
        institutionalEmail: d?.institutionalEmail || '',
        anticorruptionPhone: d?.anticorruptionPhone || '',
        judicialNoticesEmail: d?.judicialNoticesEmail || '',
        logoUrl: d?.logoUrl || '',
        primaryColor: d?.primaryColor || '#1D4ED8',
        groqApiKey: d?.groqApiKey || '',
        aiProvider: d?.aiProvider || '',
        aiApiKey: d?.aiApiKey || '',
        aiModel: d?.aiModel || '',
        smtpUser: d?.smtpUser || '',
        smtpPass: d?.smtpPass || '',
        smtpFromName: d?.smtpFromName || '',
      });

      try {
        const lcRes = await fetch('/api/v1/mi-entidad');
        if (lcRes.ok) {
          const lcJson = await lcRes.json();
          if (lcJson.data?.landingConfig) {
            setLandingConfig(lcJson.data.landingConfig);
          }
        }
      } catch { /* silenciar error de landing */ }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/v1/tenant-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (!res.ok) {
        if (json.details) {
          const errors = Object.values(json.details)
            .map((e: any) => e?._errors?.[0])
            .filter(Boolean);
          throw new Error(errors.join(', ') || json.error);
        }
        throw new Error(json.error || 'Error al guardar');
      }

      setSuccess('Configuración institucional guardada exitosamente');

      if (landingConfig) {
        const lcRes = await fetch('/api/v1/mi-entidad', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ landingConfig }),
        });
        if (!lcRes.ok) {
          console.warn('Error al guardar servicios de landing');
        }
      }

      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p style={{ color: '#94a3b8', padding: '2rem 0', textAlign: 'center' }}>Cargando configuración de la entidad…</p>;
  }

  return (
    <div>
      <AdminPageHeader
        title="Configuración de la Entidad"
        subtitle="Esta información se muestra públicamente a la ciudadanía en el pie de página y los comprobantes oficiales."
        icon={<Building2 size={24} />}
        actions={
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: saving ? '#9ca3af' : 'var(--color-primary, #2563eb)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.65rem 1.25rem', fontWeight: 600, fontSize: '0.9rem', cursor: saving ? 'wait' : 'pointer' }}
          >
            <Save size={16} /> {saving ? 'Guardando…' : 'Guardar Configuración'}
          </button>
        }
      />

      {error && (
        <div style={{ marginBottom: '1.5rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.88rem' }}>{error}</div>
      )}
      {success && (
        <div style={{ marginBottom: '1.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.88rem', fontWeight: 500 }}>{success}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Contacto */}
        <div style={card}>
          <h2 style={sectionTitle}>Información de Contacto</h2>
          <div style={grid2}>
            <div>
              <label style={label}>Dirección Principal / Sede Electrónica</label>
              <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Ej: Calle 1 # 2-3, Barrio Centro" style={input} />
            </div>
            <div>
              <label style={label}>Teléfono / Conmutador</label>
              <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Ej: (+57) 2 0000000" style={input} />
            </div>
            <div>
              <label style={label}>Correo Electrónico Institucional</label>
              <input type="email" value={formData.institutionalEmail} onChange={(e) => setFormData({ ...formData, institutionalEmail: e.target.value })} placeholder="Ej: contactenos@municipio.gov.co" style={input} />
            </div>
            <div>
              <label style={label}>Notificaciones Judiciales</label>
              <input type="email" value={formData.judicialNoticesEmail} onChange={(e) => setFormData({ ...formData, judicialNoticesEmail: e.target.value })} placeholder="Ej: notificaciones@municipio.gov.co" style={input} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={label}>Línea Anticorrupción</label>
              <input type="text" value={formData.anticorruptionPhone} onChange={(e) => setFormData({ ...formData, anticorruptionPhone: e.target.value })} placeholder="Ej: (+57) 018000919748" style={input} />
              <p style={help}>Este número se mostrará resaltado en el portal para denuncias de corrupción.</p>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div style={card}>
          <h2 style={sectionTitle}>Identidad Visual (Branding)</h2>
          <div style={grid2}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={label}>Enlace del Escudo / Logo (URL)</label>
              <input type="url" value={formData.logoUrl} onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })} placeholder="https://…" style={input} />
            </div>
            <div>
              <label style={label}>Color Primario</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="color" value={formData.primaryColor || '#000000'} onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })} style={{ width: 48, height: 40, border: 0, borderRadius: 6, cursor: 'pointer', padding: 0 }} />
                <input type="text" value={formData.primaryColor} onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })} placeholder="#1D4ED8" style={{ ...input, fontFamily: 'monospace' }} />
              </div>
            </div>
          </div>
        </div>

        {/* SMTP */}
        <div style={card}>
          <h2 style={sectionTitle}>Correo Institucional (SMTP)</h2>
          <div style={grid2}>
            <div>
              <label style={label}>Cuenta de correo (Gmail)</label>
              <input type="email" value={formData.smtpUser} onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })} placeholder="notificaciones@entidad.gov.co" style={input} />
            </div>
            <div>
              <label style={label}>Contraseña de aplicación</label>
              <div style={{ position: 'relative' }}>
                <input type={showSmtpPass ? 'text' : 'password'} value={formData.smtpPass} onChange={(e) => setFormData({ ...formData, smtpPass: e.target.value })} placeholder="xxxx xxxx xxxx xxxx" style={{ ...input, paddingRight: 40, fontFamily: 'monospace' }} />
                <button type="button" onClick={() => setShowSmtpPass(!showSmtpPass)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showSmtpPass ? '🙈' : '👁️'}
                </button>
              </div>
              <p style={help}>Genera una en Google → Cuenta → Seguridad → Contraseñas de aplicación.</p>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={label}>Nombre del remitente</label>
              <input type="text" value={formData.smtpFromName} onChange={(e) => setFormData({ ...formData, smtpFromName: e.target.value })} placeholder="Ej: Nombre oficial de la entidad" style={input} />
              <p style={help}>Así aparecerá la entidad en el correo de la ciudadanía.</p>
            </div>
          </div>
        </div>

        {/* IA */}
        <div style={card}>
          <h2 style={sectionTitle}>Inteligencia Artificial</h2>
          <div style={{ marginBottom: 16 }}>
            <label style={label}>GROQ API Key</label>
            <input type="password" value={formData.groqApiKey} onChange={(e) => setFormData({ ...formData, groqApiKey: e.target.value })} placeholder="gsk_…" style={{ ...input, fontFamily: 'monospace' }} />
            <p style={help}>API key exclusiva para esta entidad. Si se deja vacía, se usará la key global del sistema como respaldo.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <div>
              <label style={label}>Proveedor de IA (informes)</label>
              <select value={formData.aiProvider} onChange={(e) => setFormData({ ...formData, aiProvider: e.target.value })} style={input}>
                <option value="">GROQ (por defecto)</option>
                <option value="GROQ">GROQ</option>
                <option value="ANTHROPIC">Anthropic (Claude)</option>
                <option value="OPENAI">OpenAI</option>
                <option value="GEMINI">Google (Gemini)</option>
              </select>
            </div>
            <div>
              <label style={label}>API key del proveedor</label>
              <input type="password" value={formData.aiApiKey} onChange={(e) => setFormData({ ...formData, aiApiKey: e.target.value })} placeholder="sk-… / gsk_…" style={{ ...input, fontFamily: 'monospace' }} />
            </div>
            <div>
              <label style={label}>Modelo (opcional)</label>
              <input type="text" value={formData.aiModel} onChange={(e) => setFormData({ ...formData, aiModel: e.target.value })} placeholder="ej. claude-sonnet-4-6" style={{ ...input, fontFamily: 'monospace' }} />
            </div>
          </div>
          <p style={help}>Usado para generar los informes preliminares de los instrumentos de valoración. Los datos sensibles se anonimizan antes de enviarse. Si se deja vacío, se usa GROQ con la key de arriba.</p>
        </div>

        {/* Servicios de la página principal */}
        {landingConfig && (
          <div style={card}>
            <h2 style={sectionTitle}>Servicios de la Página Principal</h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.25rem' }}>
              Estos servicios se muestran a la ciudadanía en la página de inicio. Puede editar el título, descripción y enlace de cada uno.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={label}>Subtítulo del Banner Principal</label>
              <input type="text" value={landingConfig.heroSubtitle} onChange={(e) => setLandingConfig({ ...landingConfig, heroSubtitle: e.target.value })} style={input} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={label}>Texto del Llamado a la Acción</label>
              <input type="text" value={landingConfig.ctaText} onChange={(e) => setLandingConfig({ ...landingConfig, ctaText: e.target.value })} style={input} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {landingConfig.services.map((service, index) => (
                <div key={service.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem', background: service.enabled ? '#fff' : '#f8fafc', opacity: service.enabled ? 1 : 0.6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#475569' }}>#{index + 1}</span>
                      <select
                        value={service.icon}
                        onChange={(e) => {
                          const updated = [...landingConfig.services];
                          updated[index] = { ...updated[index], icon: e.target.value };
                          setLandingConfig({ ...landingConfig, services: updated });
                        }}
                        style={{ ...input, width: 'auto', padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                      >
                        {AVAILABLE_ICONS.map((icon) => (
                          <option key={icon} value={icon}>{ICON_LABELS[icon] ?? icon}</option>
                        ))}
                      </select>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={service.enabled}
                        onChange={(e) => {
                          const updated = [...landingConfig.services];
                          updated[index] = { ...updated[index], enabled: e.target.checked };
                          setLandingConfig({ ...landingConfig, services: updated });
                        }}
                        style={{ width: 16, height: 16 }}
                      />
                      <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Visible</span>
                    </label>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    <div>
                      <label style={{ ...label, fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>Título</label>
                      <input
                        type="text"
                        value={service.title}
                        onChange={(e) => {
                          const updated = [...landingConfig.services];
                          updated[index] = { ...updated[index], title: e.target.value };
                          setLandingConfig({ ...landingConfig, services: updated });
                        }}
                        style={{ ...input, padding: '0.45rem 0.6rem', fontSize: '0.84rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ ...label, fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>Texto del Botón</label>
                      <input
                        type="text"
                        value={service.linkText}
                        onChange={(e) => {
                          const updated = [...landingConfig.services];
                          updated[index] = { ...updated[index], linkText: e.target.value };
                          setLandingConfig({ ...landingConfig, services: updated });
                        }}
                        style={{ ...input, padding: '0.45rem 0.6rem', fontSize: '0.84rem' }}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ ...label, fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>Descripción</label>
                      <textarea
                        value={service.description}
                        onChange={(e) => {
                          const updated = [...landingConfig.services];
                          updated[index] = { ...updated[index], description: e.target.value };
                          setLandingConfig({ ...landingConfig, services: updated });
                        }}
                        rows={2}
                        style={{ ...input, padding: '0.45rem 0.6rem', fontSize: '0.84rem', resize: 'vertical' }}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ ...label, fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>URL del Enlace</label>
                      <input
                        type="text"
                        value={service.linkUrl}
                        onChange={(e) => {
                          const updated = [...landingConfig.services];
                          updated[index] = { ...updated[index], linkUrl: e.target.value };
                          setLandingConfig({ ...landingConfig, services: updated });
                        }}
                        style={{ ...input, padding: '0.45rem 0.6rem', fontSize: '0.84rem', fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Guardar (pie) */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: saving ? '#9ca3af' : 'var(--color-primary, #2563eb)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem 1.5rem', fontWeight: 600, fontSize: '0.9rem', cursor: saving ? 'wait' : 'pointer' }}
          >
            {saving ? <Save size={17} /> : <Check size={17} />} {saving ? 'Guardando…' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}
