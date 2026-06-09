'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MASTER_SERVICE_CATALOG, SERVICE_CATEGORIES, AVAILABLE_ICONS, ICON_LABELS } from '@/lib/landingDefaults';
import type { LandingService, LandingConfig } from '@/lib/landingDefaults';

export default function EditorLandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Comunes');

  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [services, setServices] = useState<LandingService[]>([]);

  // Cargar configuración actual
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/v1/mi-entidad');
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al cargar');

      const config = json.data?.landingConfig;

      setHeroSubtitle(config?.heroSubtitle || '');
      setCtaText(config?.ctaText || '');

      // Merge: catálogo maestro + servicios guardados del tenant
      const savedServices: LandingService[] = config?.services || [];
      const mergedServices = MASTER_SERVICE_CATALOG.map(catalogItem => {
        const saved = savedServices.find(s => s.id === catalogItem.id);
        if (saved) {
          // Mantener los datos editados del admin, pero asegurar que tenga category
          return { ...catalogItem, ...saved, category: catalogItem.category };
        }
        return { ...catalogItem }; // del catálogo, desactivado
      });

      setServices(mergedServices);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: string) => {
    setServices(prev => prev.map(s =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const handleFieldChange = (id: string, field: keyof LandingService, value: string) => {
    setServices(prev => prev.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const landingConfig: LandingConfig = {
        heroSubtitle,
        ctaText,
        services: services.map(({ category: _category, ...rest }) => rest as LandingService),
      };

      const res = await fetch('/api/v1/mi-entidad', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landingConfig })
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Error al guardar');
      }

      setSuccess('Landing Page actualizada exitosamente. Los cambios ya son visibles para los ciudadanos.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = services.filter(s => s.enabled).length;
  const categoryServices = services.filter(s => s.category === activeCategory);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px', border: '3px solid #e5e7eb',
            borderTop: '3px solid #2563eb', borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto 1rem'
          }} />
          <p style={{ color: '#6b7280' }}>Cargando editor de landing...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => router.back()}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1rem', backgroundColor: 'transparent', border: '1px solid #d1d5db',
            borderRadius: '8px', cursor: 'pointer', color: '#374151', marginBottom: '1rem'
          }}
        >
          ← Volver
        </button>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
          Editor de Landing Page
        </h1>
        <p style={{ color: '#6b7280' }}>
          Configure los servicios que se mostrarán a los ciudadanos en la página de inicio.
          <strong> {enabledCount} servicio{enabledCount !== 1 ? 's' : ''} activo{enabledCount !== 1 ? 's' : ''}.</strong>
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{
          marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#fef2f2',
          border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b'
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{
          marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontWeight: '500'
        }}>
          ✓ {success}
        </div>
      )}

      {/* Textos del Hero */}
      <div style={{
        backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
          Textos del Banner Principal
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
              Subtítulo del Banner
            </label>
            <input
              type="text"
              value={heroSubtitle}
              onChange={e => setHeroSubtitle(e.target.value)}
              placeholder="Ej: Al servicio de la ciudadanía con transparencia y compromiso"
              style={{
                width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #d1d5db',
                borderRadius: '8px', fontSize: '0.9375rem', outline: 'none'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
              Texto del Llamado a la Acción (sección "¿Necesitas ayuda?")
            </label>
            <input
              type="text"
              value={ctaText}
              onChange={e => setCtaText(e.target.value)}
              placeholder="Ej: Estamos aquí para atenderle. No dude en contactarnos."
              style={{
                width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #d1d5db',
                borderRadius: '8px', fontSize: '0.9375rem', outline: 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div style={{
        backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
          Catálogo de Servicios
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
          Active los servicios que desea mostrar en la página de inicio. Puede editar el título, descripción y enlace de cada uno.
        </p>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: '0.5rem', marginBottom: '1.5rem',
          borderBottom: '2px solid #e5e7eb', paddingBottom: '0', flexWrap: 'wrap'
        }}>
          {SERVICE_CATEGORIES.map(cat => {
            const catCount = services.filter(s => s.category === cat && s.enabled).length;
            const totalCat = services.filter(s => s.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '0.625rem 1rem',
                  backgroundColor: activeCategory === cat ? 'white' : 'transparent',
                  border: activeCategory === cat ? '2px solid #2563eb' : '2px solid transparent',
                  borderBottom: activeCategory === cat ? '2px solid white' : '2px solid transparent',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  fontWeight: activeCategory === cat ? '600' : '400',
                  color: activeCategory === cat ? '#2563eb' : '#6b7280',
                  fontSize: '0.875rem',
                  marginBottom: '-2px',
                  position: 'relative'
                }}
              >
                {cat}
                {catCount > 0 && (
                  <span style={{
                    marginLeft: '0.5rem', backgroundColor: '#dbeafe', color: '#1d4ed8',
                    padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600'
                  }}>
                    {catCount}/{totalCat}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Service Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {categoryServices.map(service => (
            <div
              key={service.id}
              style={{
                border: service.enabled ? '2px solid #bfdbfe' : '1px solid #e5e7eb',
                backgroundColor: service.enabled ? '#f8faff' : '#fafafa',
                borderRadius: '10px',
                padding: '1.25rem',
                transition: 'all 0.2s'
              }}
            >
              {/* Toggle Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: service.enabled ? '1rem' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Toggle Switch */}
                  <button
                    onClick={() => handleToggle(service.id)}
                    style={{
                      width: '44px', height: '24px',
                      backgroundColor: service.enabled ? '#2563eb' : '#d1d5db',
                      borderRadius: '12px', border: 'none', cursor: 'pointer',
                      position: 'relative', transition: 'background-color 0.2s',
                      flexShrink: 0
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: '2px',
                      left: service.enabled ? '22px' : '2px',
                      width: '20px', height: '20px', backgroundColor: 'white',
                      borderRadius: '50%', transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                  </button>
                  <span style={{
                    fontSize: '1rem', fontWeight: '600',
                    color: service.enabled ? '#111827' : '#9ca3af'
                  }}>
                    {service.title}
                  </span>
                </div>
                <span style={{
                  fontSize: '0.75rem', color: '#9ca3af',
                  backgroundColor: '#f3f4f6', padding: '0.25rem 0.625rem',
                  borderRadius: '9999px'
                }}>
                  {service.category}
                </span>
              </div>

              {/* Editable Fields - solo visibles si está activo */}
              {service.enabled && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Título</label>
                    <input
                      type="text"
                      value={service.title}
                      onChange={e => handleFieldChange(service.id, 'title', e.target.value)}
                      style={{
                        width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db',
                        borderRadius: '6px', fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Ícono</label>
                    <select
                      value={service.icon}
                      onChange={e => handleFieldChange(service.id, 'icon', e.target.value)}
                      style={{
                        width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db',
                        borderRadius: '6px', fontSize: '0.875rem'
                      }}
                    >
                      {AVAILABLE_ICONS.map(icon => (
                        <option key={icon} value={icon}>{ICON_LABELS[icon] ?? icon}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Descripción</label>
                    <textarea
                      value={service.description}
                      onChange={e => handleFieldChange(service.id, 'description', e.target.value)}
                      rows={2}
                      style={{
                        width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db',
                        borderRadius: '6px', fontSize: '0.875rem', resize: 'vertical'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>URL del Enlace</label>
                    <input
                      type="text"
                      value={service.linkUrl}
                      onChange={e => handleFieldChange(service.id, 'linkUrl', e.target.value)}
                      style={{
                        width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db',
                        borderRadius: '6px', fontSize: '0.875rem', fontFamily: 'monospace'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Texto del Botón</label>
                    <input
                      type="text"
                      value={service.linkText}
                      onChange={e => handleFieldChange(service.id, 'linkText', e.target.value)}
                      style={{
                        width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db',
                        borderRadius: '6px', fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Save Button - Fixed bottom */}
      <div style={{
        position: 'sticky', bottom: '1rem',
        backgroundColor: 'white', borderRadius: '12px', padding: '1rem 1.5rem',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          {enabledCount} servicio{enabledCount !== 1 ? 's' : ''} activo{enabledCount !== 1 ? 's' : ''} en la landing page
        </span>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.5rem', backgroundColor: saving ? '#93c5fd' : '#2563eb',
            color: 'white', border: 'none', borderRadius: '8px', cursor: saving ? 'default' : 'pointer',
            fontWeight: '600', fontSize: '0.9375rem', transition: 'background-color 0.2s'
          }}
        >
          {saving ? 'Guardando...' : '✓ Guardar Landing Page'}
        </button>
      </div>
    </div>
  );
}
