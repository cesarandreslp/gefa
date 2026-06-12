/**
 * /admin/plantillas — CRUD de plantillas del despacho (los 11 actos jurídicos).
 * Solo ADMIN/DIRECTOR. El cuerpo usa marcadores {{variable}} que se diligencian
 * al redactar el documento (Fase 2). Estilo inline (el proyecto no usa Tailwind).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileSignature, Plus, Trash2, Pencil, X } from 'lucide-react';
import AdminPageHeader from '../AdminPageHeader';
import RichTextEditor from '../documentos/RichTextEditor';

const KIND_LABELS: Record<string, string> = {
  DECLARACION: 'Declaración',
  ACTA_AUDIENCIA: 'Acta de audiencia',
  CITACION: 'Citación',
  OFICIO: 'Oficio',
  AUTO: 'Auto',
  RESOLUCION: 'Resolución',
  MEDIDA_PROTECCION: 'Medida de protección',
  CONSTANCIA_CONCILIACION: 'Constancia de conciliación',
  INFORME_JURIDICO: 'Informe jurídico',
  SEGUIMIENTO: 'Seguimiento',
  RECURSO: 'Recurso',
};
const KINDS = Object.keys(KIND_LABELS);
const SIGNER_ROLES: { value: string; label: string }[] = [
  { value: 'DIRECTOR', label: 'Comisario/a (Director)' },
  { value: 'JURIDICA', label: 'Jurídica' },
  { value: 'PSICOLOGIA', label: 'Psicología' },
  { value: 'TRABAJO_SOCIAL', label: 'Trabajo Social' },
];

interface Variable { key: string; label: string; type?: string; required?: boolean }
interface Template {
  id: string; kind: string; name: string; description: string | null;
  variables: Variable[] | null; signerRoles: string[] | null;
  profesiones?: string[] | null; requiereInformeFinal?: boolean;
  isActive: boolean; version: number; comisariaId: string | null; updatedAt: string;
}

const PROFESION_OPTS: { value: string; label: string }[] = [
  { value: 'JURIDICA', label: 'Jurídico' },
  { value: 'PSICOLOGIA', label: 'Psicología' },
  { value: 'TRABAJO_SOCIAL', label: 'Trabajo Social' },
];

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' };
const input: React.CSSProperties = { padding: '0.6rem 0.7rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.9rem', boxSizing: 'border-box', width: '100%' };
const label: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.35rem' };
const btnPrimary: React.CSSProperties = { padding: '0.6rem 1rem', background: 'var(--color-primary, #2563eb)', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' };
const btnGhost: React.CSSProperties = { padding: '0.5rem 0.8rem', background: '#fff', color: '#334155', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' };

const emptyForm = () => ({
  id: '' as string, kind: 'OFICIO', name: '', description: '', bodyHtml: '',
  variables: [] as Variable[], signerRoles: [] as string[], comisariaId: '',
  profesiones: [] as string[], requiereInformeFinal: false,
});

export default function PlantillasPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/family/templates?includeInactive=true');
      if (res.ok) setTemplates((await res.json()).data ?? []);
    } catch { /* noop */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(emptyForm()); setEditing(true); setMsg(null); };
  const openEdit = async (id: string) => {
    setMsg(null);
    const res = await fetch(`/api/v1/family/templates/${id}`);
    if (!res.ok) { setMsg({ type: 'err', text: 'No se pudo cargar la plantilla' }); return; }
    const t = (await res.json()).data;
    setForm({
      id: t.id, kind: t.kind, name: t.name, description: t.description ?? '',
      bodyHtml: t.bodyHtml ?? '', variables: t.variables ?? [], signerRoles: t.signerRoles ?? [],
      comisariaId: t.comisariaId ?? '',
      profesiones: t.profesiones ?? [], requiereInformeFinal: !!t.requiereInformeFinal,
    });
    setEditing(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.bodyHtml.trim()) {
      setMsg({ type: 'err', text: 'El nombre y el cuerpo son obligatorios' });
      return;
    }
    setSaving(true); setMsg(null);
    try {
      const payload = {
        kind: form.kind, name: form.name, description: form.description,
        bodyHtml: form.bodyHtml, variables: form.variables, signerRoles: form.signerRoles,
        comisariaId: form.comisariaId || null,
        profesiones: form.profesiones, requiereInformeFinal: form.requiereInformeFinal,
      };
      const res = form.id
        ? await fetch(`/api/v1/family/templates/${form.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/v1/family/templates', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { setMsg({ type: 'err', text: (await res.json()).error || 'Error al guardar' }); return; }
      setEditing(false);
      await load();
    } catch { setMsg({ type: 'err', text: 'Error de red' }); } finally { setSaving(false); }
  };

  const disable = async (id: string) => {
    if (!confirm('¿Desactivar esta plantilla? Los documentos ya emitidos no se afectan.')) return;
    const res = await fetch(`/api/v1/family/templates/${id}`, { method: 'DELETE' });
    if (res.ok) load();
  };

  // --- Editor de variables ---
  const addVar = () => setForm((f) => ({ ...f, variables: [...f.variables, { key: '', label: '', type: 'text', required: false }] }));
  const setVar = (i: number, patch: Partial<Variable>) =>
    setForm((f) => ({ ...f, variables: f.variables.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) }));
  const delVar = (i: number) => setForm((f) => ({ ...f, variables: f.variables.filter((_, idx) => idx !== i) }));
  const toggleSigner = (role: string) =>
    setForm((f) => ({ ...f, signerRoles: f.signerRoles.includes(role) ? f.signerRoles.filter((r) => r !== role) : [...f.signerRoles, role] }));
  const toggleProfesion = (p: string) =>
    setForm((f) => ({ ...f, profesiones: f.profesiones.includes(p) ? f.profesiones.filter((x) => x !== p) : [...f.profesiones, p] }));

  const seedDefaults = async () => {
    setMsg(null);
    try {
      const res = await fetch('/api/v1/family/templates/seed', { method: 'POST' });
      const d = await res.json();
      if (!res.ok) { setMsg({ type: 'err', text: d.error || 'No se pudo cargar' }); return; }
      setMsg({ type: 'ok', text: d.created > 0 ? `Se cargaron ${d.created} plantilla(s) predefinida(s).` : 'Ya estaban cargadas todas las plantillas predefinidas.' });
      await load();
    } catch { setMsg({ type: 'err', text: 'Error de red' }); }
  };

  return (
    <div>
      <AdminPageHeader
        title="Plantillas del despacho"
        subtitle="Los actos jurídicos plantillables. Usa {{variable}} en el cuerpo para los campos que se diligencian al redactar."
        icon={<FileSignature size={24} />}
        actions={!editing && (
          <>
            <button style={btnGhost} onClick={seedDefaults}>Cargar plantillas predefinidas</button>
            <button style={btnPrimary} onClick={openNew}><Plus size={16} /> Nueva plantilla</button>
          </>
        )}
      />

      {msg && (
        <div style={{ ...card, padding: '0.75rem 1rem', marginBottom: '1rem', borderColor: msg.type === 'ok' ? '#bbf7d0' : '#fecaca', background: msg.type === 'ok' ? '#f0fdf4' : '#fef2f2', color: msg.type === 'ok' ? '#15803d' : '#991b1b' }}>
          {msg.text}
        </div>
      )}

      {editing ? (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>{form.id ? 'Editar plantilla' : 'Nueva plantilla'}</h2>
            <button style={btnGhost} onClick={() => setEditing(false)}><X size={16} /> Cancelar</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={label}>Tipo de acto</label>
              <select style={input} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {KINDS.map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Nombre de la plantilla</label>
              <input style={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Oficio de citación a audiencia" />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={label}>Descripción (opcional)</label>
            <input style={input} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={label}>Cuerpo de la plantilla</label>
            <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>
              Escríbalo como en un editor de texto. Donde quiera un dato variable, escriba la clave entre llaves, por ejemplo <code>{'{{ciudad}}'}</code> o <code>{'{{fecha}}'}</code>; se reemplazará al diligenciar el documento.
            </p>
            <RichTextEditor value={form.bodyHtml} onChange={(html) => setForm((f) => ({ ...f, bodyHtml: html }))} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ ...label, marginBottom: 0 }}>Variables a diligenciar</label>
              <button style={btnGhost} onClick={addVar}><Plus size={14} /> Agregar variable</button>
            </div>
            {form.variables.length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Sin variables. Agrega las que uses como {'{{clave}}'} en el cuerpo.</p>}
            {form.variables.map((v, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 130px 90px 32px', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <input style={input} value={v.key} onChange={(e) => setVar(i, { key: e.target.value })} placeholder="clave (sin espacios)" />
                <input style={input} value={v.label} onChange={(e) => setVar(i, { label: e.target.value })} placeholder="Etiqueta visible" />
                <select style={input} value={v.type ?? 'text'} onChange={(e) => setVar(i, { type: e.target.value })}>
                  <option value="text">Texto</option>
                  <option value="multiline">Párrafo</option>
                  <option value="date">Fecha</option>
                  <option value="number">Número</option>
                </select>
                <label style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <input type="checkbox" checked={!!v.required} onChange={(e) => setVar(i, { required: e.target.checked })} /> Oblig.
                </label>
                <button style={{ ...btnGhost, padding: '0.4rem', borderColor: '#fecaca', color: '#b91c1c' }} onClick={() => delVar(i)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={label}>Quién firma este documento</label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {SIGNER_ROLES.map((r) => (
                <label key={r.value} style={{ fontSize: '0.85rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input type="checkbox" checked={form.signerRoles.includes(r.value)} onChange={() => toggleSigner(r.value)} /> {r.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={label}>Profesiones que pueden usar esta plantilla</label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {PROFESION_OPTS.map((p) => (
                <label key={p.value} style={{ fontSize: '0.85rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input type="checkbox" checked={form.profesiones.includes(p.value)} onChange={() => toggleProfesion(p.value)} /> {p.label}
                </label>
              ))}
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: '0.3rem 0 0' }}>Vacío = todas. El comisario y el ADMIN siempre ven todas.</p>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <input type="checkbox" checked={form.requiereInformeFinal} onChange={(e) => setForm({ ...form, requiereInformeFinal: e.target.checked })} />
              Requiere el informe final compilado (se prellena con <code>{'{{informe_final}}'}</code>)
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar plantilla'}</button>
            <button style={btnGhost} onClick={() => setEditing(false)}>Cancelar</button>
          </div>
        </div>
      ) : loading ? (
        <p style={{ color: '#64748b' }}>Cargando plantillas…</p>
      ) : templates.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: '#64748b' }}>
          Aún no hay plantillas. Crea la primera con “Nueva plantilla”.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {templates.map((t) => (
            <div key={t.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', opacity: t.isActive ? 1 : 0.55 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-primary, #2563eb)', background: 'color-mix(in srgb, var(--color-primary, #2563eb) 10%, white)', padding: '0.15rem 0.5rem', borderRadius: 6 }}>{KIND_LABELS[t.kind] ?? t.kind}</span>
                  <strong style={{ color: '#0f172a' }}>{t.name}</strong>
                  {!t.isActive && <span style={{ fontSize: '0.72rem', color: '#991b1b' }}>(inactiva)</span>}
                </div>
                {t.description && <p style={{ margin: '0.3rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>{t.description}</p>}
                <p style={{ margin: '0.3rem 0 0', color: '#94a3b8', fontSize: '0.78rem' }}>
                  v{t.version} · {(t.variables?.length ?? 0)} variable(s) · firma: {(t.signerRoles ?? []).length ? (t.signerRoles ?? []).join(', ') : '—'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                <button style={btnGhost} onClick={() => openEdit(t.id)}><Pencil size={14} /> Editar</button>
                {t.isActive && <button style={{ ...btnGhost, borderColor: '#fecaca', color: '#b91c1c' }} onClick={() => disable(t.id)}><Trash2 size={14} /></button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
