'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Edit, Building2, X, Phone, MapPin, Truck, Power } from 'lucide-react';

interface Comisaria {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  isMobile: boolean;
  isActive: boolean;
  _count?: { users: number; cases: number };
}

const EMPTY = { code: '', name: '', address: '', phone: '', isMobile: false };

export default function ComisariasPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [comisarias, setComisarias] = useState<Comisaria[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Comisaria | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const isAuth = localStorage.getItem('isAuthenticated');
    if (!isAuth || isAuth !== 'true') {
      router.push('/');
      return;
    }
    load();
  }, [router]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/comisarias');
      if (res.ok) setComisarias(await res.json());
    } catch (e) {
      console.error('Error cargando comisarías:', e);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (c?: Comisaria) => {
    if (c) {
      setEditing(c);
      setForm({ code: c.code, name: c.name, address: c.address || '', phone: c.phone || '', isMobile: c.isMobile });
    } else {
      setEditing(null);
      setForm(EMPTY);
    }
    setIsModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing ? `/api/v1/comisarias/${editing.id}` : '/api/v1/comisarias';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setIsModalOpen(false);
        load();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar la comisaría');
      }
    } catch (e) {
      console.error('Error guardando comisaría:', e);
      alert('Error al guardar la comisaría');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: Comisaria) => {
    try {
      if (c.isActive) {
        if (!confirm(`¿Desactivar la comisaría ${c.code}? Dejará de estar disponible para asignar personal y casos.`)) return;
        const res = await fetch(`/api/v1/comisarias/${c.id}`, { method: 'DELETE' });
        if (!res.ok) { const e = await res.json(); alert(e.error || 'No se pudo desactivar'); return; }
      } else {
        const res = await fetch(`/api/v1/comisarias/${c.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: true }),
        });
        if (!res.ok) { const e = await res.json(); alert(e.error || 'No se pudo reactivar'); return; }
      }
      load();
    } catch (e) {
      console.error('Error cambiando estado:', e);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.75rem', fontSize: '0.875rem', border: '1px solid #d1d5db', borderRadius: '8px',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem',
  };

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '1.5rem 2rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <button
            onClick={() => router.push('/admin')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white', border: '1px solid #d1d5db', color: '#374151', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', marginBottom: '1rem', padding: '0.625rem 1rem', borderRadius: '8px' }}
          >
            <ArrowLeft size={16} /> Volver al Panel
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ backgroundColor: '#dbeafe', borderRadius: '12px', padding: '0.75rem', display: 'flex' }}>
                <Building2 size={32} color="#2563eb" />
              </div>
              <div>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', margin: 0 }}>Comisarías de Familia</h1>
                <p style={{ color: '#6b7280', marginTop: '0.25rem', fontSize: '0.875rem' }}>
                  Sedes de la Alcaldía. Crea y administra las comisarías a las que pertenecen el personal y los casos.
                </p>
              </div>
            </div>
            <button
              onClick={() => openModal()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              <Plus size={18} /> Crear Comisaría
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            <div style={{ width: 48, height: 48, border: '4px solid #e5e7eb', borderTop: '4px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : comisarias.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <Building2 size={64} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>Aún no hay comisarías</h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Crea la primera sede de la Alcaldía para asignarle personal y casos.</p>
            <button onClick={() => openModal()} style={{ padding: '0.75rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              Crear Primera Comisaría
            </button>
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Comisaría', 'Contacto', 'Personal', 'Casos', 'Estado', 'Acciones'].map((h, i) => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: i >= 2 && i <= 4 ? 'center' : i === 5 ? 'right' : 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comisarias.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #e5e7eb', opacity: c.isActive ? 1 : 0.55 }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', backgroundColor: '#dbeafe', padding: '0.15rem 0.5rem', borderRadius: '6px', fontFamily: 'monospace' }}>{c.code}</span>
                        {c.isMobile && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#92400e', backgroundColor: '#fef3c7', padding: '0.15rem 0.45rem', borderRadius: '6px' }}>
                            <Truck size={11} /> Móvil
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', margin: '0.4rem 0 0' }}>{c.name}</p>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {c.address && <p style={{ fontSize: '0.8rem', color: '#374151', margin: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={12} /> {c.address}</p>}
                      {c.phone && <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.25rem 0 0', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={12} /> {c.phone}</p>}
                      {!c.address && !c.phone && <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>Sin datos</span>}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', color: '#374151' }}>{c._count?.users ?? 0}</td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', color: '#374151' }}>{c._count?.cases ?? 0}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, backgroundColor: c.isActive ? '#d1fae5' : '#fee2e2', color: c.isActive ? '#065f46' : '#991b1b', borderRadius: '9999px' }}>
                        {c.isActive ? 'ACTIVA' : 'INACTIVA'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => openModal(c)} title="Editar" style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex' }}>
                          <Edit size={16} color="#6b7280" />
                        </button>
                        <button onClick={() => toggleActive(c)} title={c.isActive ? 'Desactivar' : 'Reactivar'} style={{ padding: '0.5rem', backgroundColor: c.isActive ? '#fee2e2' : '#d1fae5', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex' }}>
                          <Power size={16} color={c.isActive ? '#ef4444' : '#059669'} />
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

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', maxWidth: '560px', width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>{editing ? 'Editar Comisaría' : 'Crear Comisaría'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}>
                <X size={20} color="#6b7280" />
              </button>
            </div>

            <form onSubmit={submit} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Código *</label>
                  <input type="text" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CF1" style={{ ...inputStyle, textTransform: 'uppercase' }} />
                </div>
                <div>
                  <label style={labelStyle}>Nombre *</label>
                  <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Comisaría de Familia Primera" style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Dirección</label>
                <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Calle 1 # 2-3" style={inputStyle} />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Teléfono</label>
                <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(602) 000 0000" style={inputStyle} />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '1.5rem' }}>
                <input type="checkbox" checked={form.isMobile} onChange={(e) => setForm({ ...form, isMobile: e.target.checked })} />
                <span style={{ fontSize: '0.875rem', color: '#374151' }}>Es una unidad móvil</span>
              </label>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '0.75rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={saving} style={{ padding: '0.75rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Guardando…' : editing ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
