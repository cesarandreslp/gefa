/**
 * /admin/documentos/nuevo?caseId=... — Inicia un documento del despacho.
 * Elige una plantilla, diligencia sus variables y crea el borrador; luego
 * redirige al editor. Estilo inline (el proyecto no usa Tailwind).
 */
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileSignature, FilePlus } from 'lucide-react';
import AdminPageHeader from '../../AdminPageHeader';

interface Variable { key: string; label: string; type?: string; required?: boolean }
interface TemplateLite { id: string; kind: string; name: string; description: string | null; variables: Variable[] | null }

const KIND_LABELS: Record<string, string> = {
  DECLARACION: 'Declaración', ACTA_AUDIENCIA: 'Acta de audiencia', CITACION: 'Citación',
  OFICIO: 'Oficio', AUTO: 'Auto', RESOLUCION: 'Resolución', MEDIDA_PROTECCION: 'Medida de protección',
  CONSTANCIA_CONCILIACION: 'Constancia de conciliación', INFORME_JURIDICO: 'Informe jurídico',
  SEGUIMIENTO: 'Seguimiento', RECURSO: 'Recurso',
};
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' };
const input: React.CSSProperties = { width: '100%', padding: '0.6rem 0.7rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.9rem', boxSizing: 'border-box' };
const label: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.35rem' };
const btnPrimary: React.CSSProperties = { padding: '0.65rem 1.1rem', background: 'var(--color-primary, #2563eb)', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' };

function NuevoDocumento() {
  const router = useRouter();
  const search = useSearchParams();
  const caseId = search.get('caseId') || '';

  const [templates, setTemplates] = useState<TemplateLite[]>([]);
  const [selected, setSelected] = useState<TemplateLite | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/family/templates')
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setTemplates(d.data ?? []))
      .catch(() => {});
  }, []);

  const pick = (t: TemplateLite) => { setSelected(t); setValues({}); setError(null); };

  const create = async () => {
    if (!caseId) { setError('Falta el caso (caseId).'); return; }
    if (selected) {
      const missing = (selected.variables ?? []).filter((v) => v.required && !values[v.key]?.trim());
      if (missing.length) { setError(`Faltan campos obligatorios: ${missing.map((m) => m.label).join(', ')}`); return; }
    }
    setCreating(true); setError(null);
    try {
      const res = await fetch(`/api/v1/family/cases/${caseId}/documents/drafts`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(selected ? { templateId: selected.id, data: values } : { documentType: 'OFICIO', title: 'Documento en blanco' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'No se pudo crear el documento'); return; }
      router.push(`/admin/documentos/${data.id}`);
    } catch { setError('Error de red'); } finally { setCreating(false); }
  };

  return (
    <div>
      <AdminPageHeader
        title="Nuevo documento"
        subtitle="Elige una plantilla y diligencia sus campos. Luego podrás redactarlo en el editor."
        icon={<FileSignature size={24} />}
      />
      {!caseId && <div style={{ ...card, borderColor: '#fecaca', background: '#fef2f2', color: '#991b1b', marginBottom: '1rem' }}>Abre esta pantalla desde un expediente (falta el parámetro del caso).</div>}
      {error && <div style={{ ...card, borderColor: '#fecaca', background: '#fef2f2', color: '#991b1b', marginBottom: '1rem' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' }}>
        <div style={card}>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#0f172a' }}>Plantillas disponibles</h2>
          {templates.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>No hay plantillas activas. Créalas en Plantillas.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {templates.map((t) => (
                <button key={t.id} onClick={() => pick(t)} style={{ textAlign: 'left', padding: '0.7rem 0.85rem', borderRadius: 10, cursor: 'pointer', border: '1px solid ' + (selected?.id === t.id ? 'var(--color-primary, #2563eb)' : '#e2e8f0'), background: selected?.id === t.id ? 'color-mix(in srgb, var(--color-primary, #2563eb) 8%, white)' : '#fff' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-primary, #2563eb)' }}>{KIND_LABELS[t.kind] ?? t.kind}</span>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.92rem' }}>{t.name}</div>
                  {t.description && <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{t.description}</div>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={card}>
          {selected ? (
            <>
              <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#0f172a' }}>Campos de “{selected.name}”</h2>
              {(selected.variables ?? []).length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Esta plantilla no tiene variables. Puedes crear el documento y redactarlo.</p>}
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {(selected.variables ?? []).map((v) => (
                  <div key={v.key}>
                    <label style={label}>{v.label}{v.required && <span style={{ color: '#dc2626' }}> *</span>}</label>
                    {v.type === 'multiline' ? (
                      <textarea style={{ ...input, minHeight: 80 }} value={values[v.key] ?? ''} onChange={(e) => setValues({ ...values, [v.key]: e.target.value })} />
                    ) : (
                      <input type={v.type === 'date' ? 'date' : v.type === 'number' ? 'number' : 'text'} style={input} value={values[v.key] ?? ''} onChange={(e) => setValues({ ...values, [v.key]: e.target.value })} />
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '1.1rem' }}>
                <button style={btnPrimary} onClick={create} disabled={creating}><FilePlus size={16} /> {creating ? 'Creando…' : 'Crear y redactar'}</button>
              </div>
            </>
          ) : (
            <div style={{ color: '#64748b' }}>
              <p>Selecciona una plantilla para diligenciar sus campos.</p>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>O crea un documento en blanco:</p>
              <button style={{ ...btnPrimary, background: '#fff', color: '#334155', border: '1px solid #d1d5db' }} onClick={create} disabled={creating || !caseId}>
                <FilePlus size={16} /> Documento en blanco
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p style={{ color: '#64748b' }}>Cargando…</p>}>
      <NuevoDocumento />
    </Suspense>
  );
}
