'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, UserPlus } from 'lucide-react';
import { FAMILY_CASE_TYPES } from '@/domain/catalogs/familyCaseTypes';
import {
  PARTY_ROLE_LABELS, PARTY_ROLES,
  VIOLENCE_TYPE_LABELS, VIOLENCE_TYPES,
} from '@/domain/catalogs/familyLabels';

interface PartyForm {
  role: string;
  documentType: string;
  documentNumber: string;
  firstName: string;
  secondName: string;
  firstLastName: string;
  secondLastName: string;
  birthDate: string;
  phone: string;
  legalRepresentativeName: string;
}

const emptyParty = (role: string): PartyForm => ({
  role,
  documentType: 'CC',
  documentNumber: '',
  firstName: '',
  secondName: '',
  firstLastName: '',
  secondLastName: '',
  birthDate: '',
  phone: '',
  legalRepresentativeName: '',
});

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem' };
const cardStyle: React.CSSProperties = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' };

export default function NuevoFamilyCasePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [caseTypeCode, setCaseTypeCode] = useState(FAMILY_CASE_TYPES[0].code);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [channel, setChannel] = useState('PRESENCIAL');
  const [violence, setViolence] = useState<string[]>([]);
  const [parties, setParties] = useState<PartyForm[]>([emptyParty('VICTIMA')]);
  const [comisarias, setComisarias] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [comisariaId, setComisariaId] = useState('');

  useEffect(() => {
    fetch('/api/v1/comisarias')
      .then((r) => (r.ok ? r.json() : { comisarias: [] }))
      .then((d) => setComisarias((d.comisarias ?? []).filter((c: { isActive: boolean }) => c.isActive)))
      .catch(() => setComisarias([]));
  }, []);

  const toggleViolence = (v: string) =>
    setViolence((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const updateParty = (i: number, field: keyof PartyForm, value: string) =>
    setParties((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));

  const addParty = () => setParties((prev) => [...prev, emptyParty('AGRESOR')]);
  const removeParty = (i: number) => setParties((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subject.trim() || !description.trim()) {
      setError('El asunto y la descripción son obligatorios.');
      return;
    }
    for (const p of parties) {
      if (!p.documentNumber.trim() || !p.firstName.trim() || !p.firstLastName.trim()) {
        setError('Cada parte requiere documento, nombre y primer apellido.');
        return;
      }
      if (p.role === 'NNA' && !p.legalRepresentativeName.trim()) {
        setError('Un NNA requiere el nombre de su representante legal.');
        return;
      }
    }

    setSaving(true);
    try {
      const body = {
        caseTypeCode,
        subject: subject.trim(),
        description: description.trim(),
        channel,
        comisariaId: comisariaId || undefined,
        violenceTypes: violence,
        parties: parties.map((p) => ({
          role: p.role,
          legalRepresentativeName: p.legalRepresentativeName.trim() || undefined,
          person: {
            documentType: p.documentType,
            documentNumber: p.documentNumber.trim(),
            firstName: p.firstName.trim(),
            secondName: p.secondName.trim() || undefined,
            firstLastName: p.firstLastName.trim(),
            secondLastName: p.secondLastName.trim() || undefined,
            birthDate: p.birthDate || undefined,
            phone: p.phone.trim() || undefined,
          },
        })),
      };

      const res = await fetch('/api/v1/family/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo radicar el caso.');
        return;
      }
      router.push(`/admin/family/${data.caseId}`);
    } catch {
      setError('Error de conexión. Intente nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      <button onClick={() => router.push('/admin/family')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Volver a casos
      </button>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '1.25rem' }}>Radicar caso de familia</h1>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem' }}>{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Datos del caso */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.05rem', marginTop: 0 }}>Datos del caso</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Tipo de caso *</label>
              <select value={caseTypeCode} onChange={(e) => setCaseTypeCode(e.target.value)} style={inputStyle}>
                {FAMILY_CASE_TYPES.map((ct) => (
                  <option key={ct.code} value={ct.code}>{ct.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Canal</label>
              <select value={channel} onChange={(e) => setChannel(e.target.value)} style={inputStyle}>
                <option value="PRESENCIAL">Presencial</option>
                <option value="WEB">Web</option>
                <option value="PHONE">Teléfono</option>
                <option value="EMAIL">Correo</option>
                <option value="VERBAL">Verbal</option>
              </select>
            </div>
          </div>
          {comisarias.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <label style={labelStyle}>Comisaría (sede) que atiende el caso</label>
              <select value={comisariaId} onChange={(e) => setComisariaId(e.target.value)} style={inputStyle}>
                <option value="">Sin asignar</option>
                {comisarias.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div style={{ marginTop: '1rem' }}>
            <label style={labelStyle}>Asunto *</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} style={inputStyle} placeholder="Resumen breve del caso" />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <label style={labelStyle}>Descripción de los hechos *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, minHeight: '110px', resize: 'vertical' }} />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <label style={labelStyle}>Tipos de violencia (si aplica)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {VIOLENCE_TYPES.map((v) => (
                <label key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', border: '1px solid', borderColor: violence.includes(v) ? 'var(--color-primary, #2563eb)' : '#d1d5db', background: violence.includes(v) ? '#dbeafe' : 'white', borderRadius: '999px', padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={violence.includes(v)} onChange={() => toggleViolence(v)} style={{ display: 'none' }} />
                  {VIOLENCE_TYPE_LABELS[v]}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Partes */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Partes del caso</h2>
            <button type="button" onClick={addParty} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem' }}>
              <UserPlus size={15} /> Agregar parte
            </button>
          </div>

          {parties.map((p, i) => (
            <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1rem', marginTop: '0.75rem', background: '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ flex: 1, maxWidth: '260px' }}>
                  <label style={labelStyle}>Rol *</label>
                  <select value={p.role} onChange={(e) => updateParty(i, 'role', e.target.value)} style={inputStyle}>
                    {PARTY_ROLES.map((r) => (
                      <option key={r} value={r}>{PARTY_ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
                {parties.length > 1 && (
                  <button type="button" onClick={() => removeParty(i)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', marginLeft: '1rem' }} title="Quitar parte">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Tipo doc.</label>
                  <select value={p.documentType} onChange={(e) => updateParty(i, 'documentType', e.target.value)} style={inputStyle}>
                    {['CC', 'CE', 'TI', 'RC', 'PA', 'PEP', 'PPT'].map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Número de documento *</label>
                  <input value={p.documentNumber} onChange={(e) => updateParty(i, 'documentNumber', e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div><label style={labelStyle}>Primer nombre *</label><input value={p.firstName} onChange={(e) => updateParty(i, 'firstName', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Segundo nombre</label><input value={p.secondName} onChange={(e) => updateParty(i, 'secondName', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Primer apellido *</label><input value={p.firstLastName} onChange={(e) => updateParty(i, 'firstLastName', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Segundo apellido</label><input value={p.secondLastName} onChange={(e) => updateParty(i, 'secondLastName', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Fecha de nacimiento</label><input type="date" value={p.birthDate} onChange={(e) => updateParty(i, 'birthDate', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Teléfono</label><input value={p.phone} onChange={(e) => updateParty(i, 'phone', e.target.value)} style={inputStyle} /></div>
              </div>
              {p.role === 'NNA' && (
                <div style={{ marginTop: '0.75rem' }}>
                  <label style={labelStyle}>Representante legal * (obligatorio para NNA)</label>
                  <input value={p.legalRepresentativeName} onChange={(e) => updateParty(i, 'legalRepresentativeName', e.target.value)} style={inputStyle} placeholder="Nombre del representante legal" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="submit" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-primary, #2563eb)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.65rem 1.3rem', fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            <Plus size={18} /> {saving ? 'Radicando…' : 'Radicar caso'}
          </button>
          <button type="button" onClick={() => router.push('/admin/family')} style={{ background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.65rem 1.3rem', cursor: 'pointer' }}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
