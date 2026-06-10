'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Upload, Plus, X, Download, Loader2, Lock } from 'lucide-react';
import { PARTY_ROLE_LABELS } from '@/domain/catalogs/familyLabels';

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

const EVIDENCE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDIENTE: { label: 'Pendiente de valorar', color: '#854d0e', bg: '#fef9c3' },
  ADMITIDA: { label: 'Admitida', color: '#047857', bg: '#ecfdf5' },
  RECHAZADA: { label: 'Rechazada', color: '#b91c1c', bg: '#fef2f2' },
};

const fmtSize = (b?: number) => (b ? (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`) : '');

export function CaseDocuments({ caseId, parties = [] }: { caseId: string; parties?: any[] }) {
  const cardStyle: React.CSSProperties = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' };
  const [docs, setDocs] = useState<any[] | null>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('');
  const [description, setDescription] = useState('');
  const [aportanteId, setAportanteId] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);
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

  const isEvidence = docType === 'EVIDENCE';

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
      if (isEvidence && aportanteId) fd.append('aportanteId', aportanteId);
      if (isConfidential) fd.append('isConfidential', 'true');
      const res = await fetch(`/api/v1/cases/${caseId}/documents`, { method: 'POST', body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || 'No se pudo subir el documento.');
      } else {
        setFile(null); setDocType(''); setDescription(''); setAportanteId(''); setIsConfidential(false); setOpen(false);
        await load();
      }
    } catch { setError('Error de conexión.'); } finally { setUploading(false); }
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <h2 style={{ fontSize: '1.05rem', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
          <FileText size={18} /> Documentos y pruebas {docs ? `(${docs.length})` : ''}
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
            {isEvidence && (
              <div style={{ display: 'grid', gap: '0.6rem', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.7rem', background: 'white' }}>
                <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                  Acervo probatorio. El valor probatorio lo determina el Comisario(a) al valorarla.
                </div>
                <div>
                  <label style={label}>Aportada por (parte)</label>
                  <select value={aportanteId} onChange={(e) => setAportanteId(e.target.value)} style={input}>
                    <option value="">— No especificar —</option>
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.person?.firstName} {p.person?.firstLastName} — {PARTY_ROLE_LABELS[p.role] ?? p.role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div>
              <label style={label}>Archivo * <span style={{ color: '#9ca3af', fontWeight: 400 }}>(máx. 25 MB)</span></label>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ ...input, padding: '0.35rem' }} />
            </div>
            <div>
              <label style={label}>Descripción (opcional)</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} style={input} placeholder="Breve descripción del documento" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.84rem', color: '#374151' }}>
              <input type="checkbox" checked={isConfidential} onChange={(e) => setIsConfidential(e.target.checked)} />
              Contenido confidencial (lesiones, NNA): acceso restringido
            </label>
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
          {docs.map((d) => {
            const st = d.documentType === 'EVIDENCE' && d.evidenceStatus ? EVIDENCE_STATUS[d.evidenceStatus] : null;
            const aportante = d.aportante?.person;
            return (
              <div key={d.id} style={{ border: '1px solid #f3f4f6', borderRadius: '8px', padding: '0.55rem 0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {d.isConfidential && <Lock size={13} style={{ color: '#b45309', flexShrink: 0 }} />}
                      {d.originalName || d.fileName || 'Documento'}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                      {TYPE_LABELS[d.documentType] || d.documentType || 'Documento'}
                      {d.uploadedAt ? ` · ${new Date(d.uploadedAt).toLocaleDateString('es-CO')}` : ''}
                      {d.fileSize ? ` · ${fmtSize(d.fileSize)}` : ''}
                      {aportante ? ` · aporta: ${aportante.firstName} ${aportante.firstLastName}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                    {st && (
                      <span style={{ background: st.bg, color: st.color, borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.74rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{st.label}</span>
                    )}
                    {d.fileUrl && (
                      <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" title="Abrir" style={{ color: '#1a5fb4', display: 'flex' }}>
                        <Download size={18} />
                      </a>
                    )}
                  </div>
                </div>
                {d.documentType === 'EVIDENCE' && (
                  <EvidenceValuationControl doc={d} onDone={load} />
                )}
              </div>
            );
          })}
        </div>
      )}
      <style>{`.aud-spin{animation:aud-spin 1s linear infinite}@keyframes aud-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// Valoración del acervo probatorio (admitir/rechazar). El backend la restringe al
// Comisario (DIRECTOR); a otros roles el botón devolverá un aviso al confirmar.
function EvidenceValuationControl({ doc, onDone }: { doc: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');

  const valorar = async (status: 'ADMITIDA' | 'RECHAZADA') => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/v1/family/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, evidenceValue: motivo.trim() || undefined }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error || 'No se pudo valorar.'); return; }
      setOpen(false); setMotivo('');
      onDone();
    } catch { setError('Error de conexión.'); } finally { setBusy(false); }
  };

  if (doc.evidenceValue) {
    return (
      <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.4rem', borderTop: '1px dashed #e5e7eb', paddingTop: '0.4rem' }}>
        Valorada por {doc.valoradaPor?.fullName ?? 'la autoridad'}: {doc.evidenceValue}
      </div>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.78rem', marginTop: '0.45rem', color: '#374151' }}>
        Valorar prueba
      </button>
    );
  }

  return (
    <div style={{ marginTop: '0.5rem', borderTop: '1px dashed #e5e7eb', paddingTop: '0.5rem' }}>
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', padding: '0.4rem 0.65rem', marginBottom: '0.5rem', fontSize: '0.8rem' }}>{error}</div>}
      <div style={{ fontSize: '0.76rem', color: '#6b7280', marginBottom: '0.4rem' }}>Solo el Comisario(a) fija el valor probatorio.</div>
      <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivación / valor probatorio (opcional)" style={{ width: '100%', padding: '0.45rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.85rem', minHeight: '48px', boxSizing: 'border-box', marginBottom: '0.45rem' }} />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => valorar('ADMITIDA')} disabled={busy} style={{ background: 'none', border: '1px solid #6ee7b7', color: '#047857', borderRadius: '8px', padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.8rem' }}>Admitir</button>
        <button onClick={() => valorar('RECHAZADA')} disabled={busy} style={{ background: 'none', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: '8px', padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.8rem' }}>Rechazar</button>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.8rem' }}>Cancelar</button>
      </div>
    </div>
  );
}

const label: React.CSSProperties = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.2rem' };
const input: React.CSSProperties = { width: '100%', padding: '0.45rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.88rem', boxSizing: 'border-box' };
const primaryBtn: React.CSSProperties = { background: 'var(--color-primary, #2563eb)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.45rem 1rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' };
