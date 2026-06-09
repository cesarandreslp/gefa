'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Upload, Plus, X, Download, Loader2 } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Tipos de documento del expediente (comisaría). Los `value` son el enum DocumentType del schema.
const DOCUMENT_TYPES = [
  { value: 'DENUNCIA', label: 'Denuncia o solicitud inicial' },
  { value: 'ACTA', label: 'Acta de audiencia o conciliación' },
  { value: 'AUTO', label: 'Auto o resolución (medida, PARD)' },
  { value: 'VALORACION', label: 'Valoración del equipo interdisciplinario' },
  { value: 'OFICIO', label: 'Oficio' },
  { value: 'CITACION', label: 'Citación o notificación' },
  { value: 'EVIDENCE', label: 'Evidencia o soporte' },
  { value: 'OTHER', label: 'Otro' },
];
const TYPE_LABELS: Record<string, string> = Object.fromEntries(DOCUMENT_TYPES.map((d) => [d.value, d.label]));

const fmtSize = (b?: number) => (b ? (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`) : '');

export function CaseDocuments({ caseId }: { caseId: string }) {
  const cardStyle: React.CSSProperties = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' };
  const [docs, setDocs] = useState<any[] | null>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/documents`);
      if (res.ok) setDocs((await res.json()).documents ?? []);
      else setDocs([]);
    } catch { setDocs([]); }
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  const upload = async () => {
    setError(null);
    if (!file) { setError('Seleccione un archivo.'); return; }
    if (!docType) { setError('Seleccione el tipo de documento.'); return; }
    if (file.size > 25 * 1024 * 1024) { setError('El archivo no puede superar 25 MB.'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('documentType', docType);
      if (description.trim()) fd.append('description', description.trim());
      const res = await fetch(`/api/v1/cases/${caseId}/documents`, { method: 'POST', body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || 'No se pudo subir el documento.');
      } else {
        setFile(null); setDocType(''); setDescription(''); setOpen(false);
        await load();
      }
    } catch { setError('Error de conexión.'); } finally { setUploading(false); }
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <h2 style={{ fontSize: '1.05rem', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
          <FileText size={18} /> Documentos {docs ? `(${docs.length})` : ''}
        </h2>
        <button onClick={() => setOpen(!open)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.82rem' }}>
          {open ? <X size={14} /> : <Plus size={14} />} {open ? 'Cerrar' : 'Subir documento'}
        </button>
      </div>

      {open && (
        <div style={{ border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '1rem', marginBottom: '0.85rem', background: '#f8fafc' }}>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '0.6rem', fontSize: '0.82rem' }}>{error}</div>}
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            <div>
              <label style={label}>Tipo de documento *</label>
              <select value={docType} onChange={(e) => setDocType(e.target.value)} style={input}>
                <option value="">Seleccionar…</option>
                {DOCUMENT_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Archivo * <span style={{ color: '#9ca3af', fontWeight: 400 }}>(máx. 25 MB)</span></label>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ ...input, padding: '0.35rem' }} />
            </div>
            <div>
              <label style={label}>Descripción (opcional)</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} style={input} placeholder="Breve descripción del documento" />
            </div>
            <button onClick={upload} disabled={uploading} style={{ ...primaryBtn, opacity: uploading ? 0.6 : 1, justifySelf: 'start' }}>
              {uploading ? <><Loader2 size={14} className="aud-spin" style={{ verticalAlign: '-2px', marginRight: '0.3rem' }} />Subiendo…</> : <><Upload size={14} style={{ verticalAlign: '-2px', marginRight: '0.3rem' }} />Subir</>}
            </button>
          </div>
        </div>
      )}

      {docs === null ? (
        <p style={{ color: '#9ca3af', fontSize: '0.88rem', margin: 0 }}>Cargando…</p>
      ) : docs.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: '0.88rem', margin: 0 }}>Sin documentos en el expediente.</p>
      ) : (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {docs.map((d) => (
            <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', border: '1px solid #f3f4f6', borderRadius: '8px', padding: '0.55rem 0.8rem' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.originalName || d.fileName || 'Documento'}
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                  {TYPE_LABELS[d.documentType] || d.documentType || 'Documento'}
                  {d.uploadedAt ? ` · ${new Date(d.uploadedAt).toLocaleDateString('es-CO')}` : ''}
                  {d.fileSize ? ` · ${fmtSize(d.fileSize)}` : ''}
                </div>
              </div>
              {d.fileUrl && (
                <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" title="Abrir" style={{ color: '#7c3aed', display: 'flex', flexShrink: 0 }}>
                  <Download size={18} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
      <style>{`.aud-spin{animation:aud-spin 1s linear infinite}@keyframes aud-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const label: React.CSSProperties = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.2rem' };
const input: React.CSSProperties = { width: '100%', padding: '0.45rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.88rem', boxSizing: 'border-box' };
const primaryBtn: React.CSSProperties = { background: 'var(--color-primary, #2563eb)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.45rem 1rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' };
