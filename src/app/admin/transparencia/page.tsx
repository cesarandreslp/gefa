'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TRANSPARENCY_CATALOG, getTransparencyConfig } from '@/lib/transparencyDefaults';
import type { TransparencyCategory, TransparencyItem, TransparencyConfig } from '@/lib/transparencyDefaults';

export default function EditorTransparenciaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('informacion-entidad');
  const [categories, setCategories] = useState<TransparencyCategory[]>([]);

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

      const config: TransparencyConfig = json.data?.transparencyConfig ?? getTransparencyConfig(null);
      const saved = config.categories;

      // Merge: catálogo maestro + datos guardados
      const merged = TRANSPARENCY_CATALOG.map(catalogCat => {
        const savedCat = saved.find(c => c.id === catalogCat.id);
        if (!savedCat) return { ...catalogCat };
        const mergedItems = catalogCat.items.map(catalogItem => {
          const savedItem = savedCat.items?.find(i => i.id === catalogItem.id);
          return savedItem ? { ...catalogItem, ...savedItem } : { ...catalogItem };
        });
        return {
          ...catalogCat,
          title: savedCat.title ?? catalogCat.title,
          enabled: savedCat.enabled ?? false,
          items: mergedItems,
        };
      });

      setCategories(merged);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setCategories(prev => prev.map(c => {
      if (c.id !== categoryId) return c;
      const newEnabled = !c.enabled;
      return {
        ...c,
        enabled: newEnabled,
        items: c.items.map(i => ({ ...i, enabled: newEnabled })),
      };
    }));
  };

  const handleCategoryFieldChange = (categoryId: string, field: keyof TransparencyCategory, value: string) => {
    setCategories(prev => prev.map(c =>
      c.id === categoryId ? { ...c, [field]: value } : c
    ));
  };

  const handleItemToggle = (categoryId: string, itemId: string) => {
    setCategories(prev => prev.map(c => {
      if (c.id !== categoryId) return c;
      const updatedItems = c.items.map(i => i.id === itemId ? { ...i, enabled: !i.enabled } : i);
      const anyEnabled = updatedItems.some(i => i.enabled);
      return { ...c, enabled: anyEnabled ? true : c.enabled, items: updatedItems };
    }));
  };

  const handleItemFieldChange = (categoryId: string, itemId: string, field: keyof TransparencyItem, value: string) => {
    setCategories(prev => prev.map(c =>
      c.id === categoryId
        ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, [field]: value } : i) }
        : c
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const transparencyConfig: TransparencyConfig = { categories };
      const res = await fetch('/api/v1/mi-entidad', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transparencyConfig }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Error al guardar');
      }
      setSuccess('Índice de Transparencia actualizado exitosamente. Los cambios ya son visibles para los ciudadanos.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const activeCat = categories.find(c => c.id === activeCategory);
  const enabledCatCount = categories.filter(c => c.enabled).length;
  const enabledItemsTotal = categories.reduce((acc, c) => acc + c.items.filter(i => i.enabled).length, 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px', border: '3px solid #e5e7eb',
            borderTop: '3px solid #2563eb', borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto 1rem',
          }} />
          <p style={{ color: '#6b7280' }}>Cargando editor de transparencia...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', paddingBottom: '6rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🔍</span>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>
            Editor de Índice de Transparencia
          </h1>
        </div>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
          Configure las categorías e ítems del Índice de Transparencia y Acceso a la Información Pública
          según la Ley 1712 de 2014. Active solo los ítems que su entidad tiene disponibles y llene las URLs correspondientes.
        </p>
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
          <span style={{
            background: '#dbeafe', color: '#1d4ed8', borderRadius: '9999px',
            padding: '0.25rem 0.75rem', fontSize: '0.8rem', fontWeight: 600,
          }}>
            {enabledCatCount} / {categories.length} categorías activas
          </span>
          <span style={{
            background: '#d1fae5', color: '#065f46', borderRadius: '9999px',
            padding: '0.25rem 0.75rem', fontSize: '0.8rem', fontWeight: 600,
          }}>
            {enabledItemsTotal} ítems publicados
          </span>
        </div>
      </div>

      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
          padding: '0.75rem 1rem', color: '#dc2626', marginBottom: '1rem', fontSize: '0.9rem',
        }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem' }}>
        {/* Panel izquierdo: lista de categorías */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                textAlign: 'left', width: '100%',
                background: activeCategory === cat.id ? '#eff6ff' : 'white',
                outline: activeCategory === cat.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{cat.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.8rem', fontWeight: 600, color: '#111827',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {cat.num}. {cat.title}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.1rem' }}>
                  {cat.items.filter(i => i.enabled).length} / {cat.items.length} ítems
                </div>
              </div>
              <span style={{
                width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                background: cat.enabled ? '#22c55e' : '#d1d5db',
              }} />
            </button>
          ))}
        </div>

        {/* Panel derecho: editor de la categoría activa */}
        {activeCat && (
          <div style={{
            background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem',
          }}>
            {/* Cabecera de la categoría */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              marginBottom: '1.5rem', gap: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                <span style={{ fontSize: '1.75rem' }}>{activeCat.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                    Categoría {activeCat.num} — Título editable
                  </div>
                  <input
                    type="text"
                    value={activeCat.title}
                    onChange={e => handleCategoryFieldChange(activeCat.id, 'title', e.target.value)}
                    style={{
                      width: '100%', fontSize: '1rem', fontWeight: 700, color: '#111827',
                      border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.375rem 0.5rem',
                    }}
                  />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flexShrink: 0 }}>
                <div
                  onClick={() => handleCategoryToggle(activeCat.id)}
                  style={{
                    width: '48px', height: '26px', borderRadius: '13px', cursor: 'pointer',
                    background: activeCat.enabled ? '#22c55e' : '#d1d5db', position: 'relative',
                    transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: '3px',
                    left: activeCat.enabled ? '25px' : '3px',
                    width: '20px', height: '20px', borderRadius: '50%', background: 'white',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
                <span style={{ fontSize: '0.85rem', color: activeCat.enabled ? '#15803d' : '#6b7280', fontWeight: 600 }}>
                  {activeCat.enabled ? 'Visible' : 'Oculta'}
                </span>
              </label>
            </div>

            {/* Lista de ítems */}
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>
              Ítems disponibles ({activeCat.items.filter(i => i.enabled).length} activos)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {activeCat.items.map(item => (
                <div
                  key={item.id}
                  style={{
                    border: `1px solid ${item.enabled ? '#bbf7d0' : '#e5e7eb'}`,
                    borderRadius: '8px', padding: '1rem',
                    background: item.enabled ? '#f0fdf4' : '#f9fafb',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: item.enabled ? '0.75rem' : 0 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{item.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.1rem' }}>{item.description}</div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', marginLeft: '1rem', flexShrink: 0 }}>
                      <div
                        onClick={() => handleItemToggle(activeCat.id, item.id)}
                        style={{
                          width: '40px', height: '22px', borderRadius: '11px', cursor: 'pointer',
                          background: item.enabled ? '#22c55e' : '#d1d5db', position: 'relative',
                          transition: 'background 0.2s',
                        }}
                      >
                        <div style={{
                          position: 'absolute', top: '3px',
                          left: item.enabled ? '21px' : '3px',
                          width: '16px', height: '16px', borderRadius: '50%', background: 'white',
                          transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                        }} />
                      </div>
                      <span style={{ fontSize: '0.78rem', color: item.enabled ? '#15803d' : '#9ca3af', fontWeight: 500 }}>
                        {item.enabled ? 'Activo' : 'Inactivo'}
                      </span>
                    </label>
                  </div>

                  {item.enabled && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.2rem' }}>
                          Título (editable)
                        </label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={e => handleItemFieldChange(activeCat.id, item.id, 'title', e.target.value)}
                          style={{
                            width: '100%', padding: '0.375rem 0.5rem', borderRadius: '6px',
                            border: '1px solid #d1d5db', fontSize: '0.8rem',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.2rem' }}>
                          URL del documento o enlace
                        </label>
                        <input
                          type="text"
                          value={item.linkUrl}
                          onChange={e => handleItemFieldChange(activeCat.id, item.id, 'linkUrl', e.target.value)}
                          placeholder="https:// o /ruta-interna"
                          style={{
                            width: '100%', padding: '0.375rem 0.5rem', borderRadius: '6px',
                            border: '1px solid #d1d5db', fontSize: '0.8rem',
                          }}
                        />
                      </div>
                      {item.content !== undefined && (
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={{ display: 'block', fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.2rem' }}>
                            Texto de {item.title}
                          </label>
                          <textarea
                            value={item.content}
                            onChange={e => handleItemFieldChange(activeCat.id, item.id, 'content', e.target.value)}
                            rows={5}
                            placeholder={`Escriba aquí la ${item.title.toLowerCase()} de su institución...`}
                            style={{
                              width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px',
                              border: '1px solid #d1d5db', fontSize: '0.85rem',
                              resize: 'vertical', lineHeight: '1.5',
                              textAlign: 'justify', overflowWrap: 'break-word', wordBreak: 'break-word',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                      )}
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.2rem' }}>
                          Descripción (editable)
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={e => handleItemFieldChange(activeCat.id, item.id, 'description', e.target.value)}
                          style={{
                            width: '100%', padding: '0.375rem 0.5rem', borderRadius: '6px',
                            border: '1px solid #d1d5db', fontSize: '0.8rem',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Botón guardar fijo */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderTop: '1px solid #e5e7eb',
        padding: '1rem 2rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', zIndex: 50, boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
      }}>
        <div>
          {success && (
            <span style={{ color: '#16a34a', fontSize: '0.875rem', fontWeight: 500 }}>
              ✅ {success}
            </span>
          )}
          {error && (
            <span style={{ color: '#dc2626', fontSize: '0.875rem' }}>⚠️ {error}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
            {enabledCatCount} categorías · {enabledItemsTotal} ítems activos
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '0.625rem 1.5rem', borderRadius: '8px', border: 'none',
              background: saving ? '#93c5fd' : '#2563eb', color: 'white',
              fontWeight: 600, fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
