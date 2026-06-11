'use client';

import { useState } from 'react';
import { Shield, Mail, UserPlus, X, Eye, EyeOff, Users as UsersIcon } from 'lucide-react';

interface Role { id: string; code: string; name: string }
interface Comisaria { id: string; code: string; name: string }
interface Member {
  id: string; email: string; fullName: string; documentType: string; documentNumber: string;
  role?: Role; comisaria?: Comisaria | null; isActive: boolean;
}

const DOC_TYPES = ['CC', 'CE', 'TI', 'PEP', 'PPT'];
const input: React.CSSProperties = { width: '100%', padding: '0.55rem 0.65rem', fontSize: '0.85rem', border: '1px solid #d1d5db', borderRadius: '8px' };
const label: React.CSSProperties = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' };

const EMPTY = { email: '', password: '', fullName: '', documentType: 'CC', documentNumber: '', roleId: '' };

export default function ComisariaTeamPanel({
  comisaria, members, roles, comisarias, onChanged,
}: {
  comisaria: Comisaria;
  members: Member[];
  roles: Role[];
  comisarias: Comisaria[];
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const createMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, comisariaId: comisaria.id }),
      });
      if (res.ok) {
        setForm(EMPTY); setAdding(false); onChanged();
      } else {
        const err = await res.json(); alert(err.error || 'No se pudo crear el miembro');
      }
    } catch { alert('Error al crear el miembro'); } finally { setSaving(false); }
  };

  const reassign = async (userId: string, comisariaId: string) => {
    try {
      const res = await fetch(`/api/v1/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comisariaId }),
      });
      if (res.ok) onChanged();
      else { const e = await res.json(); alert(e.error || 'No se pudo reasignar'); }
    } catch { alert('Error al reasignar'); }
  };

  return (
    <div style={{ background: '#f8fafc', borderTop: '1px solid #e5e7eb', padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <UsersIcon size={15} /> Equipo de {comisaria.code} ({members.length})
        </h4>
        {!adding && (
          <button onClick={() => setAdding(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'var(--color-primary, #2563eb)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
            <UserPlus size={15} /> Agregar miembro
          </button>
        )}
      </div>

      {members.length === 0 && !adding && (
        <p style={{ color: '#9ca3af', fontSize: '0.84rem', margin: 0 }}>Sin personal asignado a esta sede.</p>
      )}

      {members.length > 0 && (
        <div style={{ display: 'grid', gap: '0.5rem', marginBottom: adding ? '1rem' : 0 }}>
          {members.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.55rem 0.75rem', flexWrap: 'wrap' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                {m.fullName.split(' ').filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{m.fullName}{!m.isActive && <span style={{ color: '#9ca3af', fontWeight: 400 }}> · inactivo</span>}</div>
                <div style={{ fontSize: '0.74rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Mail size={11} /> {m.email}</div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.76rem', color: '#0e7490', background: '#ecfeff', borderRadius: '6px', padding: '0.15rem 0.5rem' }}>
                <Shield size={12} /> {m.role?.name ?? 'Sin rol'}
              </span>
              <select
                value={comisaria.id}
                onChange={(e) => reassign(m.id, e.target.value)}
                title="Reasignar de sede"
                style={{ fontSize: '0.78rem', padding: '0.3rem 0.4rem', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', color: '#374151' }}
              >
                {comisarias.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
                <option value="">Sin sede</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <form onSubmit={createMember} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <strong style={{ fontSize: '0.85rem', color: '#111827' }}>Nuevo miembro de {comisaria.name}</strong>
            <button type="button" onClick={() => { setAdding(false); setForm(EMPTY); }} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '0.3rem', cursor: 'pointer', display: 'flex' }}><X size={16} color="#6b7280" /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            <div>
              <label style={label}>Nombre completo *</label>
              <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} style={input} placeholder="Nombre y apellidos" />
            </div>
            <div>
              <label style={label}>Email *</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={input} placeholder="correo@entidad.gov.co" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '0.5rem' }}>
              <div>
                <label style={label}>Tipo *</label>
                <select required value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })} style={input}>
                  {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Documento *</label>
                <input required value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} style={input} />
              </div>
            </div>
            <div>
              <label style={label}>Rol</label>
              <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} style={input}>
                <option value="">Sin rol</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Contraseña *</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ ...input, paddingRight: '2.2rem' }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {showPw ? <EyeOff size={15} color="#6b7280" /> : <Eye size={15} color="#6b7280" />}
                </button>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.85rem' }}>
            <button type="button" onClick={() => { setAdding(false); setForm(EMPTY); }} style={{ padding: '0.55rem 1.1rem', fontSize: '0.84rem', fontWeight: 600, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ padding: '0.55rem 1.1rem', fontSize: '0.84rem', fontWeight: 600, background: 'var(--color-primary, #2563eb)', color: 'white', border: 'none', borderRadius: '8px', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Creando…' : 'Crear y asignar'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
