/**
 * /admin/documentos/[id] — Editor del documento del despacho (Fase 2).
 * Carga el borrador, lo edita en TipTap con autoguardado (patrón Atencion) y
 * permite "Corregir con IA". La emisión (PDF/DOCX + firma) se añade en Fase 3.
 * Estilo inline (el proyecto no usa Tailwind).
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Sparkles, FileText, CheckCircle2 } from 'lucide-react';
import AdminPageHeader from '../../AdminPageHeader';
import RichTextEditor from '../RichTextEditor';

interface Draft {
  id: string; title: string; documentType: string; status: string;
  bodyHtml: string; data: Record<string, unknown> | null;
  case: { id: string; filingNumber: string } | null;
  template: { id: string; name: string; kind: string } | null;
}

const btnGhost: React.CSSProperties = { padding: '0.55rem 0.9rem', background: '#fff', color: '#334155', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 };
const btnPrimary: React.CSSProperties = { ...btnGhost, background: 'var(--color-primary, #2563eb)', color: '#fff', border: 'none' };

export default function DocumentEditorPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [title, setTitle] = useState('');
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [proofreading, setProofreading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const skipAutosave = useRef(true);
  const emitted = draft?.status === 'EMITIDO';

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/v1/family/drafts/${params.id}`);
      if (!res.ok) { setMsg({ type: 'err', text: 'No se pudo cargar el documento' }); setLoading(false); return; }
      const d = (await res.json()).data as Draft;
      setDraft(d);
      setTitle(d.title);
      setHtml(d.bodyHtml || '<p></p>');
      setLoading(false);
      // Permite el primer autosave recién tras la hidratación.
      setTimeout(() => { skipAutosave.current = false; }, 300);
    })();
  }, [params.id]);

  const save = useCallback(async (silent = false) => {
    if (emitted) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/family/drafts/${params.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, bodyHtml: html }),
      });
      if (res.ok) {
        setSavedAt(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        if (!silent) setMsg({ type: 'ok', text: 'Documento guardado' });
      }
    } catch { /* best-effort */ } finally { setSaving(false); }
  }, [params.id, title, html, emitted]);

  // Autoguardado debounced 2 s.
  useEffect(() => {
    if (skipAutosave.current || emitted) return;
    const t = setTimeout(() => save(true), 2000);
    return () => clearTimeout(t);
  }, [title, html, save, emitted]);

  const proofread = async () => {
    setProofreading(true); setMsg(null);
    try {
      const res = await fetch(`/api/v1/family/drafts/${params.id}/proofread`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ html }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ type: 'err', text: data.error || 'No se pudo corregir' }); return; }
      setHtml(data.corrected);
      setMsg({ type: 'ok', text: 'Texto corregido por IA. Revisa los cambios antes de guardar.' });
    } catch { setMsg({ type: 'err', text: 'Error de red al corregir' }); } finally { setProofreading(false); }
  };

  if (loading) return <p style={{ color: '#64748b' }}>Cargando documento…</p>;
  if (!draft) return <p style={{ color: '#b91c1c' }}>{msg?.text || 'Documento no encontrado'}</p>;

  return (
    <div>
      <AdminPageHeader
        title="Editor de documento"
        subtitle={draft.case ? `Expediente ${draft.case.filingNumber}${draft.template ? ' · ' + draft.template.name : ''}` : undefined}
        icon={<FileText size={24} />}
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button style={btnGhost} onClick={() => router.push(draft.case ? `/admin/family/${draft.case.id}` : '/admin/family')}><ArrowLeft size={16} /> Volver</button>
            {!emitted && <button style={btnGhost} onClick={proofread} disabled={proofreading}><Sparkles size={16} /> {proofreading ? 'Corrigiendo…' : 'Corregir con IA'}</button>}
            {!emitted && <button style={btnPrimary} onClick={() => save(false)} disabled={saving}><Save size={16} /> {saving ? 'Guardando…' : 'Guardar'}</button>}
          </div>
        }
      />

      {emitted && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: 10, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
          <CheckCircle2 size={18} /> Este documento ya fue emitido. Es de solo lectura.
        </div>
      )}
      {msg && (
        <div style={{ padding: '0.65rem 1rem', marginBottom: '1rem', borderRadius: 10, border: '1px solid', borderColor: msg.type === 'ok' ? '#bbf7d0' : '#fecaca', background: msg.type === 'ok' ? '#f0fdf4' : '#fef2f2', color: msg.type === 'ok' ? '#15803d' : '#991b1b', fontSize: '0.88rem' }}>
          {msg.text}
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={emitted}
          placeholder="Título del documento"
          style={{ width: '100%', padding: '0.7rem 0.9rem', fontSize: '1.05rem', fontWeight: 600, border: '1px solid #e2e8f0', borderRadius: 10, color: '#0f172a', boxSizing: 'border-box' }}
        />
      </div>

      <RichTextEditor value={html} onChange={setHtml} editable={!emitted} />

      <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '0.6rem' }}>
        {emitted ? 'Documento emitido.' : savedAt ? `Autoguardado a las ${savedAt}.` : 'Los cambios se guardan automáticamente.'}
      </p>
    </div>
  );
}
