'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, X, UserPlus, Trash2, ShieldCheck, ShieldAlert, History, RefreshCw } from 'lucide-react';
import {
  PROTECTION_MEASURE_TYPE_LABELS, MEASURE_STATUS_LABELS,
  HEARING_TYPE_LABELS, ASSESSMENT_TYPE_LABELS, RISK_LEVEL_LABELS,
  PARD_STAGE_LABELS, TIPO_DECLARANTE_LABELS, PARTY_ROLE_LABELS,
} from '@/domain/catalogs/familyLabels';

/* eslint-disable @typescript-eslint/no-explicit-any */

const label: React.CSSProperties = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.2rem' };
const input: React.CSSProperties = { width: '100%', padding: '0.45rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.88rem' };
const formBox: React.CSSProperties = { border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '1rem', marginBottom: '0.85rem', background: '#f8fafc' };
const primaryBtn: React.CSSProperties = { background: 'var(--color-primary, #2563eb)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.45rem 1rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' };
const ghostBtn: React.CSSProperties = { background: 'none', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.45rem 0.9rem', cursor: 'pointer', fontSize: '0.85rem' };

function ErrorBox({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '0.6rem', fontSize: '0.82rem' }}>{msg}</div>;
}

function ToggleButton({ open, onClick, label: text }: { open: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.82rem' }}>
      {open ? <X size={14} /> : <Plus size={14} />} {open ? 'Cerrar' : text}
    </button>
  );
}

async function post(url: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); return { ok: false, error: d.error || 'Error al guardar' }; }
    return { ok: true };
  } catch { return { ok: false, error: 'Error de conexión' }; }
}

async function patch(url: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); return { ok: false, error: d.error || 'Error al guardar' }; }
    return { ok: true };
  } catch { return { ok: false, error: 'Error de conexión' }; }
}

// ── Emitir medida de protección ──────────────────────────────────────────────
export function AddMeasureForm({ caseId, onDone }: { caseId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [measureType, setMeasureType] = useState('PROHIBICION_APROXIMACION');
  const [description, setDescription] = useState('');
  const [legalBasis, setLegalBasis] = useState('Art. 17 Ley 294/1996');
  const [expiresAt, setExpiresAt] = useState('');

  const submit = async () => {
    setError(null);
    if (!description.trim()) { setError('La descripción es obligatoria.'); return; }
    setSaving(true);
    const r = await post(`/api/v1/family/cases/${caseId}/measures`, {
      measureType, description: description.trim(), legalBasis: legalBasis.trim(), expiresAt: expiresAt || undefined,
    });
    setSaving(false);
    if (!r.ok) { setError(r.error!); return; }
    setOpen(false); setDescription(''); setExpiresAt('');
    onDone();
  };

  if (!open) return <ToggleButton open={false} onClick={() => setOpen(true)} label="Emitir medida" />;
  return (
    <div style={formBox}>
      <ErrorBox msg={error} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
        <div>
          <label style={label}>Tipo de medida</label>
          <select value={measureType} onChange={(e) => setMeasureType(e.target.value)} style={input}>
            {Object.entries(PROTECTION_MEASURE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={label}>Vence (opcional)</label>
          <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} style={input} />
        </div>
      </div>
      <div style={{ marginTop: '0.6rem' }}>
        <label style={label}>Fundamento legal</label>
        <input value={legalBasis} onChange={(e) => setLegalBasis(e.target.value)} style={input} />
      </div>
      <div style={{ marginTop: '0.6rem' }}>
        <label style={label}>Descripción *</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...input, minHeight: '70px', resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.7rem' }}>
        <button onClick={submit} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Guardando…' : 'Emitir'}</button>
        <button onClick={() => setOpen(false)} style={ghostBtn}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Cambiar estado de una medida ─────────────────────────────────────────────
export function MeasureStatusControl({ measure, onDone }: { measure: any; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const apply = async (patchBody: Record<string, unknown>) => {
    setBusy(true);
    await patch(`/api/v1/family/measures/${measure.id}`, patchBody);
    setBusy(false);
    onDone();
  };
  if (measure.status !== 'VIGENTE') return null;
  return (
    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
      <button disabled={busy} onClick={() => apply({ status: 'INCUMPLIDA' })} style={{ ...ghostBtn, color: '#b45309', borderColor: '#fcd34d', fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}>Marcar incumplida</button>
      <button disabled={busy} onClick={() => apply({ status: 'CUMPLIDA' })} style={{ ...ghostBtn, color: '#047857', borderColor: '#6ee7b7', fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}>Marcar cumplida</button>
      <button disabled={busy} onClick={() => apply({ status: 'REVOCADA' })} style={{ ...ghostBtn, color: '#b91c1c', borderColor: '#fca5a5', fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}>Revocar</button>
    </div>
  );
}

// ── Programar audiencia ──────────────────────────────────────────────────────
export function AddHearingForm({ caseId, onDone }: { caseId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hearingType, setHearingType] = useState('CONCILIACION');
  const [scheduledAt, setScheduledAt] = useState('');
  const [location, setLocation] = useState('');

  const submit = async () => {
    setError(null);
    if (!scheduledAt) { setError('La fecha y hora son obligatorias.'); return; }
    setSaving(true);
    const r = await post(`/api/v1/family/cases/${caseId}/hearings`, { hearingType, scheduledAt, location: location.trim() || undefined });
    setSaving(false);
    if (!r.ok) { setError(r.error!); return; }
    setOpen(false); setScheduledAt(''); setLocation('');
    onDone();
  };

  if (!open) return <ToggleButton open={false} onClick={() => setOpen(true)} label="Programar audiencia" />;
  return (
    <div style={formBox}>
      <ErrorBox msg={error} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
        <div>
          <label style={label}>Tipo</label>
          <select value={hearingType} onChange={(e) => setHearingType(e.target.value)} style={input}>
            {Object.entries(HEARING_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={label}>Fecha y hora *</label>
          <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} style={input} />
        </div>
      </div>
      <div style={{ marginTop: '0.6rem' }}>
        <label style={label}>Lugar (opcional)</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} style={input} placeholder="Sala de audiencias, virtual, etc." />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.7rem' }}>
        <button onClick={submit} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Guardando…' : 'Programar'}</button>
        <button onClick={() => setOpen(false)} style={ghostBtn}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Registrar realización de audiencia ───────────────────────────────────────
export function HearingOutcomeControl({ hearing, onDone }: { hearing: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [minutes, setMinutes] = useState('');
  if (hearing.wasHeld) return null;
  const submit = async () => {
    setBusy(true);
    await patch(`/api/v1/family/hearings/${hearing.id}`, { wasHeld: true, outcome: outcome.trim() || undefined, minutes: minutes.trim() || undefined });
    setBusy(false); setOpen(false);
    onDone();
  };
  if (!open) return <button onClick={() => setOpen(true)} style={{ ...ghostBtn, fontSize: '0.78rem', padding: '0.25rem 0.6rem', marginTop: '0.4rem' }}>Registrar realización</button>;
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="Resultado / decisión" style={{ ...input, minHeight: '50px', marginBottom: '0.4rem' }} />
      <textarea value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Acta (opcional)" style={{ ...input, minHeight: '50px', marginBottom: '0.4rem' }} />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={submit} disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>Guardar</button>
        <button onClick={() => setOpen(false)} style={ghostBtn}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Abrir PARD ───────────────────────────────────────────────────────────────
export function AddPardForm({ caseId, nnaParties, onDone }: { caseId: string; nnaParties: any[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [childId, setChildId] = useState(nnaParties[0]?.person?.id ?? '');

  const submit = async () => {
    setError(null);
    if (!childId) { setError('Seleccione el NNA.'); return; }
    setSaving(true);
    const r = await post(`/api/v1/family/cases/${caseId}/restoration`, { childId });
    setSaving(false);
    if (!r.ok) { setError(r.error!); return; }
    setOpen(false);
    onDone();
  };

  if (!open) {
    if (nnaParties.length === 0) return null;
    return <ToggleButton open={false} onClick={() => setOpen(true)} label="Abrir PARD" />;
  }
  return (
    <div style={formBox}>
      <ErrorBox msg={error} />
      <label style={label}>NNA objeto del proceso *</label>
      <select value={childId} onChange={(e) => setChildId(e.target.value)} style={input}>
        <option value="">Seleccionar…</option>
        {nnaParties.map((p) => <option key={p.person.id} value={p.person.id}>{p.person.firstName} {p.person.firstLastName}</option>)}
      </select>
      <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.35rem' }}>Base legal: Arts. 99 y 100 Ley 1098/2006</div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.7rem' }}>
        <button onClick={submit} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Abriendo…' : 'Abrir PARD'}</button>
        <button onClick={() => setOpen(false)} style={ghostBtn}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Avanzar etapa PARD ───────────────────────────────────────────────────────
export function PardStageControl({ process, onDone }: { process: any; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const order = ['APERTURA', 'DEFINICION_MEDIDAS', 'SEGUIMIENTO', 'CIERRE'];
  const idx = order.indexOf(process.stage);
  const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
  if (!next) return null;
  const advance = async () => {
    setBusy(true);
    await patch(`/api/v1/family/restoration/${process.id}`, { stage: next });
    setBusy(false);
    onDone();
  };
  return (
    <button onClick={advance} disabled={busy} style={{ ...ghostBtn, fontSize: '0.78rem', padding: '0.25rem 0.6rem', marginTop: '0.4rem', color: '#1a5fb4', borderColor: '#cfe0f4' }}>
      Avanzar a: {PARD_STAGE_LABELS[next]}
    </button>
  );
}

// ── Registrar valoración (confidencial) ──────────────────────────────────────
export function AddAssessmentForm({ caseId, parties, onDone }: { caseId: string; parties: any[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assessmentType, setAssessmentType] = useState('PSICOLOGICA');
  const [riskLevel, setRiskLevel] = useState('BAJO');
  const [findings, setFindings] = useState('');
  const [assessedPersonId, setAssessedPersonId] = useState('');

  const submit = async () => {
    setError(null);
    if (!findings.trim()) { setError('Los hallazgos son obligatorios.'); return; }
    setSaving(true);
    const r = await post(`/api/v1/family/cases/${caseId}/assessments`, {
      assessmentType, riskLevel, findings: findings.trim(), assessedPersonId: assessedPersonId || undefined,
    });
    setSaving(false);
    if (!r.ok) { setError(r.error!); return; }
    setOpen(false); setFindings('');
    onDone();
  };

  if (!open) return <ToggleButton open={false} onClick={() => setOpen(true)} label="Registrar valoración" />;
  return (
    <div style={{ ...formBox, borderColor: '#fcd34d', background: 'white' }}>
      <ErrorBox msg={error} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
        <div>
          <label style={label}>Tipo</label>
          <select value={assessmentType} onChange={(e) => setAssessmentType(e.target.value)} style={input}>
            {Object.entries(ASSESSMENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={label}>Nivel de riesgo</label>
          <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)} style={input}>
            {Object.entries(RISK_LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={label}>Persona valorada</label>
          <select value={assessedPersonId} onChange={(e) => setAssessedPersonId(e.target.value)} style={input}>
            <option value="">— No especificar —</option>
            {parties.map((p) => <option key={p.person.id} value={p.person.id}>{p.person.firstName} {p.person.firstLastName}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginTop: '0.6rem' }}>
        <label style={label}>Hallazgos *</label>
        <textarea value={findings} onChange={(e) => setFindings(e.target.value)} style={{ ...input, minHeight: '80px', resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.7rem' }}>
        <button onClick={submit} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Guardando…' : 'Registrar'}</button>
        <button onClick={() => setOpen(false)} style={ghostBtn}>Cancelar</button>
      </div>
      <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '0.5rem' }}>🔒 Información confidencial — acceso restringido.</div>
    </div>
  );
}

// ── Aplicar instrumento de valoración (diligenciamiento + puntaje) ───────────
export function ApplyInstrumentForm({ caseId, parties, modalidad, onDone }: { caseId: string; parties: any[]; modalidad?: string | null; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [instruments, setInstruments] = useState<any[] | null>(null);
  const [selId, setSelId] = useState('');
  const [respuestas, setRespuestas] = useState<Record<string, any>>({});
  const [assessedPersonId, setAssessedPersonId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const loadInstruments = async () => {
    if (instruments) return;
    try {
      const url = modalidad ? `/api/v1/family/instrumentos?modalidad=${encodeURIComponent(modalidad)}` : '/api/v1/family/instrumentos';
      const res = await fetch(url);
      setInstruments(res.ok ? ((await res.json()).data ?? []) : []);
    } catch { setInstruments([]); }
  };

  const sel = instruments?.find((i) => i.id === selId);
  const setVal = (code: string, v: any) => setRespuestas((p) => ({ ...p, [code]: v }));

  const reset = () => { setSelId(''); setRespuestas({}); setAssessedPersonId(''); setResult(null); setError(null); };

  const submit = async () => {
    setError(null);
    if (!selId) { setError('Seleccione un instrumento.'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/family/cases/${caseId}/instrumentos/aplicar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instrumentoId: selId, respuestas, assessedPersonId: assessedPersonId || undefined }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'No se pudo aplicar el instrumento.'); return; }
      setResult(d);
      onDone();
    } catch { setError('Error de conexión.'); } finally { setSaving(false); }
  };

  if (!open) return <ToggleButton open={false} onClick={() => { setOpen(true); loadInstruments(); }} label="Aplicar instrumento" />;

  let lastSeccion = '';
  return (
    <div style={{ ...formBox, borderColor: '#fcd34d', background: 'white' }}>
      <ErrorBox msg={error} />
      {result ? (
        <div>
          <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>Instrumento aplicado ✓</div>
          <div style={{ fontSize: '0.88rem', color: '#374151' }}>
            Puntaje directo <b>{result.scoreDirecto}</b> · ponderado <b>{result.scorePonderado}</b>
            {result.nivelCalculado ? <> · nivel <b>{result.nivelCalculado}</b></> : <> · interpretación de continuo</>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.7rem' }}>
            <button onClick={() => { reset(); }} style={ghostBtn}>Aplicar otro</button>
            <button onClick={() => { reset(); setOpen(false); }} style={primaryBtn}>Cerrar</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: '0.75rem', color: '#92400e', marginBottom: '0.5rem' }}>🔒 Valoración confidencial — el puntaje y el nivel se calculan automáticamente.</div>
          <label style={label}>Instrumento</label>
          <select value={selId} onChange={(e) => { setSelId(e.target.value); setRespuestas({}); }} style={input}>
            <option value="">Seleccionar…</option>
            {(instruments ?? []).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>

          {sel && (
            <>
              {sel.description && <div style={{ fontSize: '0.78rem', color: '#6b7280', margin: '0.5rem 0' }}>{sel.description}</div>}
              <div style={{ marginTop: '0.5rem' }}>
                <label style={label}>Persona valorada (opcional)</label>
                <select value={assessedPersonId} onChange={(e) => setAssessedPersonId(e.target.value)} style={input}>
                  <option value="">— No especificar —</option>
                  {parties.map((p) => <option key={p.person.id} value={p.person.id}>{p.person.firstName} {p.person.firstLastName}</option>)}
                </select>
              </div>

              <div style={{ marginTop: '0.6rem', display: 'grid', gap: '0.55rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '0.3rem' }}>
                {(sel.campos ?? []).map((c: any) => {
                  const header = c.seccion !== lastSeccion ? (lastSeccion = c.seccion) : null;
                  return (
                    <div key={c.id}>
                      {header && <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#374151', margin: '0.5rem 0 0.2rem', borderTop: '1px solid #f3f4f6', paddingTop: '0.5rem' }}>{c.seccion}</div>}
                      <label style={{ ...label, fontWeight: 500 }}>{c.orden}. {c.label}{c.requerido && ' *'}{c.esCritico && <span style={{ color: '#b91c1c' }}> (crítico)</span>}</label>
                      {c.ayuda && <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginBottom: '0.2rem' }}>{c.ayuda}</div>}
                      {c.tipo === 'BOOLEANO' ? (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {[['true', 'Sí'], ['false', 'No']].map(([v, lbl]) => (
                            <button key={v} type="button" onClick={() => setVal(c.code, v === 'true')}
                              style={{ ...ghostBtn, padding: '0.25rem 0.85rem', fontSize: '0.82rem', background: (respuestas[c.code] === (v === 'true')) ? (v === 'true' ? '#fee2e2' : '#ecfdf5') : 'none', borderColor: (respuestas[c.code] === (v === 'true')) ? (v === 'true' ? '#fca5a5' : '#6ee7b7') : '#d1d5db' }}>
                              {lbl}
                            </button>
                          ))}
                        </div>
                      ) : (c.tipo === 'SELECCION' || c.tipo === 'ESCALA') ? (
                        <select value={respuestas[c.code] ?? ''} onChange={(e) => setVal(c.code, e.target.value)} style={input}>
                          <option value="">Seleccionar…</option>
                          {(Array.isArray(c.opciones) ? c.opciones : []).map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      ) : c.tipo === 'TEXTO_LARGO' ? (
                        <textarea value={respuestas[c.code] ?? ''} onChange={(e) => setVal(c.code, e.target.value)} style={{ ...input, minHeight: '54px' }} />
                      ) : (
                        <input type={c.tipo === 'NUMERO' ? 'number' : c.tipo === 'FECHA' ? 'date' : 'text'} value={respuestas[c.code] ?? ''} onChange={(e) => setVal(c.code, e.target.value)} style={input} />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
            <button onClick={submit} disabled={saving || !selId} style={{ ...primaryBtn, opacity: saving || !selId ? 0.6 : 1 }}>{saving ? 'Calculando…' : 'Aplicar y calcular'}</button>
            <button onClick={() => { reset(); setOpen(false); }} style={ghostBtn}>Cancelar</button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Informe preliminar por IA (borrador editable) ────────────────────────────
export function InstrumentReportControl({ assessment, onDone }: { assessment: any; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(assessment.informePreliminar ?? '');
  const tiene = !!assessment.informePreliminar;

  const generate = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/v1/family/assessments/${assessment.id}/informe`, { method: 'POST' });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'No se pudo generar el informe.'); return; }
      setText(d.informePreliminar ?? ''); onDone();
    } catch { setError('Error de conexión.'); } finally { setBusy(false); }
  };
  const save = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/v1/family/assessments/${assessment.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ informePreliminar: text }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'No se pudo guardar.'); return; }
      setEditing(false); onDone();
    } catch { setError('Error de conexión.'); } finally { setBusy(false); }
  };

  return (
    <div style={{ marginTop: '0.5rem', borderTop: '1px dashed #fde68a', paddingTop: '0.5rem' }}>
      <ErrorBox msg={error} />
      {!tiene && !editing ? (
        <button onClick={generate} disabled={busy} style={{ ...ghostBtn, fontSize: '0.78rem', padding: '0.25rem 0.65rem', color: '#7c3aed', borderColor: '#ddd6fe' }}>
          {busy ? 'Generando…' : '✨ Generar informe preliminar (IA)'}
        </button>
      ) : (
        <div>
          <div style={{ fontSize: '0.76rem', color: '#7c3aed', fontWeight: 600, marginBottom: '0.3rem' }}>
            Informe preliminar (IA — borrador, sin peso procesal; requiere revisión/aprobación de la autoridad)
          </div>
          {editing ? (
            <textarea value={text} onChange={(e) => setText(e.target.value)} style={{ width: '100%', minHeight: '160px', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.84rem', boxSizing: 'border-box' }} />
          ) : (
            <p style={{ fontSize: '0.85rem', color: '#374151', whiteSpace: 'pre-wrap', margin: 0 }}>{assessment.informePreliminar}</p>
          )}
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
            {editing ? (
              <>
                <button onClick={save} disabled={busy} style={{ ...primaryBtn, fontSize: '0.78rem', padding: '0.25rem 0.7rem' }}>{busy ? 'Guardando…' : 'Guardar'}</button>
                <button onClick={() => { setEditing(false); setText(assessment.informePreliminar ?? ''); }} style={{ ...ghostBtn, fontSize: '0.78rem', padding: '0.25rem 0.7rem' }}>Cancelar</button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} style={{ ...ghostBtn, fontSize: '0.78rem', padding: '0.25rem 0.7rem' }}>Editar</button>
                <button onClick={generate} disabled={busy} style={{ ...ghostBtn, fontSize: '0.78rem', padding: '0.25rem 0.7rem', color: '#7c3aed', borderColor: '#ddd6fe' }}>{busy ? 'Generando…' : 'Regenerar'}</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ConsolidatedReportSection({ caseId, assessments, preInforme, onDone }: { caseId: string; assessments: any[]; preInforme?: { texto?: string | null; generadoAt?: string | null } | null; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(preInforme?.texto ?? '');

  const conInstrumento = assessments.filter((a) => a.instrumento).length;
  const tiene = !!preInforme?.texto;

  useEffect(() => { setText(preInforme?.texto ?? ''); }, [preInforme?.texto]);

  const generate = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/v1/family/cases/${caseId}/pre-informe`, { method: 'POST' });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'No se pudo generar el pre-informe.'); return; }
      setText(d.preInformeConsolidado ?? ''); onDone();
    } catch { setError('Error de conexión.'); } finally { setBusy(false); }
  };
  const save = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/v1/family/cases/${caseId}/pre-informe`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ preInformeConsolidado: text }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'No se pudo guardar.'); return; }
      setEditing(false); onDone();
    } catch { setError('Error de conexión.'); } finally { setBusy(false); }
  };

  if (conInstrumento === 0) return null;

  return (
    <div style={{ marginTop: '0.85rem', border: '1px solid #ddd6fe', background: '#faf5ff', borderRadius: '10px', padding: '0.85rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.82rem', color: '#6d28d9', fontWeight: 700 }}>
          🧩 Pre-informe consolidado del caso (IA)
        </div>
        <div style={{ fontSize: '0.74rem', color: '#7c3aed' }}>
          {conInstrumento} instrumento{conInstrumento === 1 ? '' : 's'} diligenciado{conInstrumento === 1 ? '' : 's'}
          {preInforme?.generadoAt && <> · generado {new Date(preInforme.generadoAt).toLocaleDateString('es-CO')}</>}
        </div>
      </div>
      <div style={{ fontSize: '0.74rem', color: '#7c3aed', margin: '0.2rem 0 0.55rem' }}>
        Borrador integrado de los instrumentos; sin peso procesal — requiere revisión y aprobación de la autoridad.
      </div>
      <ErrorBox msg={error} />
      {!tiene && !editing ? (
        <button onClick={generate} disabled={busy} style={{ ...primaryBtn, background: '#7c3aed', fontSize: '0.82rem' }}>
          {busy ? 'Consolidando…' : '✨ Generar pre-informe consolidado'}
        </button>
      ) : (
        <div>
          {editing ? (
            <textarea value={text} onChange={(e) => setText(e.target.value)} style={{ width: '100%', minHeight: '220px', padding: '0.55rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
          ) : (
            <p style={{ fontSize: '0.86rem', color: '#374151', whiteSpace: 'pre-wrap', margin: 0 }}>{preInforme?.texto}</p>
          )}
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.55rem', flexWrap: 'wrap' }}>
            {editing ? (
              <>
                <button onClick={save} disabled={busy} style={{ ...primaryBtn, background: '#7c3aed', fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}>{busy ? 'Guardando…' : 'Guardar'}</button>
                <button onClick={() => { setEditing(false); setText(preInforme?.texto ?? ''); }} style={{ ...ghostBtn, fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}>Cancelar</button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} style={{ ...ghostBtn, fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}>Editar</button>
                <button onClick={generate} disabled={busy} style={{ ...ghostBtn, fontSize: '0.8rem', padding: '0.3rem 0.8rem', color: '#7c3aed', borderColor: '#ddd6fe' }}>{busy ? 'Consolidando…' : 'Regenerar'}</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Equipo asignado al caso ──────────────────────────────────────────────────
export function TeamSection({ caseId, canEdit }: { caseId: string; canEdit: boolean }) {
  const cardStyle: React.CSSProperties = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' };
  const [assignments, setAssignments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/family/cases/${caseId}/assignments`);
      if (res.ok) setAssignments((await res.json()).data ?? []);
    } catch { /* noop */ }
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  const loadUsers = async () => {
    if (users.length > 0) return;
    try {
      const res = await fetch('/api/v1/users');
      if (res.ok) {
        const all = await res.json();
        setUsers((all as any[]).filter((u) => u.isActive));
      }
    } catch { /* noop */ }
  };

  const assign = async () => {
    if (!userId) return;
    setError(null); setBusy(true);
    const r = await post(`/api/v1/family/cases/${caseId}/assignments`, { userId });
    setBusy(false);
    if (!r.ok) { setError(r.error!); return; }
    setUserId(''); setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    setBusy(true);
    try { await fetch(`/api/v1/family/cases/${caseId}/assignments/${id}`, { method: 'DELETE' }); } catch { /* noop */ }
    setBusy(false);
    load();
  };

  const assignedIds = new Set(assignments.map((a) => a.user?.id));

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Equipo asignado ({assignments.length})</h2>
        {canEdit && (
          <ToggleButton open={open} onClick={() => { setOpen(!open); loadUsers(); }} label="Asignar profesional" />
        )}
      </div>

      {open && canEdit && (
        <div style={formBox}>
          <ErrorBox msg={error} />
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <label style={label}>Profesional</label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)} style={input}>
                <option value="">Seleccionar…</option>
                {users.filter((u) => !assignedIds.has(u.id)).map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName}{u.role?.name ? ` — ${u.role.name}` : ''}</option>
                ))}
              </select>
            </div>
            <button onClick={assign} disabled={!userId || busy} style={{ ...primaryBtn, opacity: !userId || busy ? 0.6 : 1 }}>
              <UserPlus size={14} style={{ verticalAlign: '-2px', marginRight: '0.3rem' }} />Asignar
            </button>
          </div>
        </div>
      )}

      {assignments.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '0.88rem', margin: 0 }}>Sin profesionales asignados.</p> : (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {assignments.map((a) => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f3f4f6', borderRadius: '8px', padding: '0.55rem 0.8rem' }}>
              <div>
                <b>{a.user?.fullName}</b>
                {a.user?.role?.name && <span style={{ color: '#6b7280', marginLeft: '0.5rem', fontSize: '0.85rem' }}>{a.user.role.name}</span>}
              </div>
              {canEdit && (
                <button onClick={() => remove(a.id)} disabled={busy} title="Retirar" style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Declaraciones (peso procesal — solo el Comisario las toma) ───────────────
// Sección autocontenida: carga su propia lista y se auto-oculta si el rol no
// tiene acceso de lectura (ventanilla/Secretaría reciben 403). La toma/firma la
// valida el backend como exclusiva del DIRECTOR.
export function DeclaracionesSection({ caseId, parties, hearings }: { caseId: string; parties: any[]; hearings: any[] }) {
  const cardStyle: React.CSSProperties = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' };
  const [items, setItems] = useState<any[] | null>(null);
  const [denied, setDenied] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declaranteId, setDeclaranteId] = useState('');
  const [tipoDeclarante, setTipoDeclarante] = useState('VICTIMA');
  const [hearingId, setHearingId] = useState('');
  const [contenido, setContenido] = useState('');
  const [signNow, setSignNow] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/family/cases/${caseId}/declaraciones`);
      if (res.status === 401 || res.status === 403) { setDenied(true); return; }
      if (res.ok) setItems((await res.json()).data ?? []);
    } catch { /* noop */ }
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  if (denied) return null;

  const submit = async () => {
    setError(null);
    if (!declaranteId) { setError('Seleccione el declarante.'); return; }
    if (!contenido.trim()) { setError('El acta / contenido es obligatorio.'); return; }
    setSaving(true);
    const r = await post(`/api/v1/family/cases/${caseId}/declaraciones`, {
      declaranteId, tipoDeclarante, contenido: contenido.trim(),
      hearingId: hearingId || undefined, sign: signNow,
    });
    setSaving(false);
    if (!r.ok) { setError(r.error!); return; }
    setOpen(false); setContenido(''); setDeclaranteId(''); setSignNow(false); setHearingId('');
    load();
  };

  const sign = async (id: string) => {
    setBusyId(id);
    await patch(`/api/v1/family/declaraciones/${id}`, { sign: true });
    setBusyId(null);
    load();
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Declaraciones ({items?.length ?? 0})</h2>
        <ToggleButton open={open} onClick={() => setOpen(!open)} label="Tomar declaración" />
      </div>

      {open && (
        <div style={formBox}>
          <ErrorBox msg={error} />
          <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: '0.6rem' }}>
            Solo el Comisario(a) de Familia puede tomar y firmar declaraciones: es el acto con peso procesal.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            <div>
              <label style={label}>Declarante *</label>
              <select value={declaranteId} onChange={(e) => setDeclaranteId(e.target.value)} style={input}>
                <option value="">Seleccionar…</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.person?.firstName} {p.person?.firstLastName} — {PARTY_ROLE_LABELS[p.role] ?? p.role}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={label}>Calidad en que declara *</label>
              <select value={tipoDeclarante} onChange={(e) => setTipoDeclarante(e.target.value)} style={input}>
                {Object.entries(TIPO_DECLARANTE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          {hearings.length > 0 && (
            <div style={{ marginTop: '0.6rem' }}>
              <label style={label}>Rendida en audiencia (opcional)</label>
              <select value={hearingId} onChange={(e) => setHearingId(e.target.value)} style={input}>
                <option value="">— Fuera de audiencia —</option>
                {hearings.map((h) => (
                  <option key={h.id} value={h.id}>{HEARING_TYPE_LABELS[h.hearingType] ?? h.hearingType} · {new Date(h.scheduledAt).toLocaleDateString('es-CO')}</option>
                ))}
              </select>
            </div>
          )}
          <div style={{ marginTop: '0.6rem' }}>
            <label style={label}>Acta / contenido de lo declarado *</label>
            <textarea value={contenido} onChange={(e) => setContenido(e.target.value)} style={{ ...input, minHeight: '90px', resize: 'vertical' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.6rem', fontSize: '0.84rem', color: '#374151' }}>
            <input type="checkbox" checked={signNow} onChange={(e) => setSignNow(e.target.checked)} />
            Firmar al guardar (queda en firme, no editable)
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.7rem' }}>
            <button onClick={submit} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Guardando…' : 'Tomar declaración'}</button>
            <button onClick={() => setOpen(false)} style={ghostBtn}>Cancelar</button>
          </div>
        </div>
      )}

      {!items || items.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: '0.88rem', margin: 0 }}>Sin declaraciones registradas.</p>
      ) : (
        <div style={{ display: 'grid', gap: '0.6rem' }}>
          {items.map((d) => (
            <div key={d.id} style={{ border: '1px solid #f3f4f6', borderRadius: '8px', padding: '0.7rem 0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <b>{d.declarante?.person?.firstName} {d.declarante?.person?.firstLastName}</b>
                  <span style={{ color: '#6b7280', marginLeft: '0.5rem', fontSize: '0.82rem' }}>{TIPO_DECLARANTE_LABELS[d.tipoDeclarante] ?? d.tipoDeclarante}</span>
                </div>
                <span style={{ background: d.isSigned ? '#ecfdf5' : '#fef9c3', color: d.isSigned ? '#047857' : '#854d0e', borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.76rem', fontWeight: 600 }}>
                  {d.isSigned ? 'Firmada (en firme)' : 'Borrador'}
                </span>
              </div>
              <p style={{ margin: '0.45rem 0 0', fontSize: '0.88rem', color: '#374151', whiteSpace: 'pre-wrap' }}>{d.contenido}</p>
              <div style={{ fontSize: '0.76rem', color: '#9ca3af', marginTop: '0.35rem' }}>
                Tomada por {d.tomadaPor?.fullName ?? 'la autoridad'} · {new Date(d.takenAt).toLocaleString('es-CO')}
              </div>
              {!d.isSigned && (
                <button onClick={() => sign(d.id)} disabled={busyId === d.id} style={{ ...ghostBtn, fontSize: '0.78rem', padding: '0.25rem 0.6rem', marginTop: '0.45rem', color: '#047857', borderColor: '#6ee7b7' }}>
                  {busyId === d.id ? 'Firmando…' : 'Firmar'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const measureStatusLabel = (s: string) => MEASURE_STATUS_LABELS[s] ?? s;

const AUDIT_ACTION_LABELS: Record<string, string> = {
  FAMILY_PERSON_CREATED: 'Persona registrada',
  FAMILY_PERSON_UPDATED: 'Persona actualizada',
  FAMILY_CASE_CREATED: 'Caso radicado',
  FAMILY_CASE_STATE_CHANGED: 'Cambio de estado',
  FAMILY_PARTY_ADDED: 'Parte vinculada',
  FAMILY_PARTY_REMOVED: 'Parte retirada',
  FAMILY_MEASURE_ISSUED: 'Medida de protección emitida',
  FAMILY_MEASURE_UPDATED: 'Medida actualizada',
  FAMILY_PARD_OPENED: 'PARD aperturado',
  FAMILY_PARD_UPDATED: 'PARD actualizado',
  FAMILY_HEARING_SCHEDULED: 'Audiencia programada',
  FAMILY_HEARING_UPDATED: 'Audiencia actualizada',
  FAMILY_TEAM_ASSIGNED: 'Profesional asignado',
  FAMILY_TEAM_REMOVED: 'Profesional retirado',
  FAMILY_ASSESSMENT_CREATED: 'Valoración registrada',
  FAMILY_ASSESSMENT_UPDATED: 'Valoración actualizada',
  FAMILY_ASSESSMENT_ACCESSED: 'Acceso a valoración (confidencial)',
  FAMILY_DECLARATION_TAKEN: 'Declaración tomada',
  FAMILY_DECLARATION_UPDATED: 'Declaración corregida',
  FAMILY_DECLARATION_SIGNED: 'Declaración firmada (en firme)',
  FAMILY_EVIDENCE_VALUED: 'Prueba valorada (admitida/rechazada)',
  FAMILY_INSTRUMENT_APPLIED: 'Instrumento de valoración aplicado',
  FAMILY_INSTRUMENT_REPORT_GENERATED: 'Informe preliminar generado (IA)',
  FAMILY_CASE_REPORT_CONSOLIDATED: 'Pre-informe consolidado generado (IA)',
  FAMILY_CASE_REPORT_UPDATED: 'Pre-informe consolidado corregido',
};

// Visor de trazabilidad del expediente (Fase 8). Se auto-oculta si el rol del
// usuario no tiene acceso al ActionLog (endpoint responde 401/403): solo
// dirección/administración. Es información de control interno.
export function AuditSection({ caseId }: { caseId: string }) {
  const cardStyle: React.CSSProperties = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' };
  const [entries, setEntries] = useState<any[] | null>(null);
  const [summary, setSummary] = useState<{ total: number; tampered: number; chainIntact: boolean } | null>(null);
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/family/cases/${caseId}/audit`);
      if (res.status === 401 || res.status === 403) { setDenied(true); return; }
      if (res.ok) {
        const json = await res.json();
        setEntries(json.data ?? []);
        setSummary(json.summary ?? null);
      }
    } catch { /* noop */ } finally { setLoading(false); }
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  if (denied) return null;

  const fmt = (iso: string) => new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <h2 style={{ fontSize: '1.05rem', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
          <History size={18} /> Trazabilidad del expediente {summary && `(${summary.total})`}
        </h2>
        <button onClick={load} disabled={loading} title="Actualizar" style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.35rem 0.6rem', cursor: 'pointer', color: '#6b7280' }}>
          <RefreshCw size={14} className={loading ? 'spin' : undefined} />
        </button>
      </div>

      {summary && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 600, padding: '0.35rem 0.7rem', borderRadius: '999px', marginBottom: '0.85rem', background: summary.chainIntact ? '#ecfdf5' : '#fef2f2', color: summary.chainIntact ? '#047857' : '#b91c1c', border: `1px solid ${summary.chainIntact ? '#a7f3d0' : '#fecaca'}` }}>
          {summary.chainIntact ? <ShieldCheck size={15} /> : <ShieldAlert size={15} />}
          {summary.chainIntact ? 'Cadena de integridad verificada' : `${summary.tampered} registro(s) alterado(s)`}
        </div>
      )}

      {loading && entries === null ? (
        <p style={{ color: '#9ca3af', fontSize: '0.88rem', margin: 0 }}>Cargando…</p>
      ) : entries && entries.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: '0.88rem', margin: 0 }}>Sin registros de auditoría para este expediente.</p>
      ) : (
        <div style={{ display: 'grid', gap: '0.4rem' }}>
          {entries?.map((e) => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', border: '1px solid #f3f4f6', borderLeft: `3px solid ${e.integrityValid ? '#10b981' : '#dc2626'}`, borderRadius: '8px', padding: '0.55rem 0.8rem' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>
                  {AUDIT_ACTION_LABELS[e.action] ?? e.action}
                  {!e.integrityValid && <span style={{ color: '#dc2626', marginLeft: '0.4rem', fontSize: '0.78rem' }}>⚠ alterado</span>}
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                  {e.userEmail} · {e.userRole}
                </div>
              </div>
              <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div style={{ fontSize: '0.8rem', color: '#374151' }}>{fmt(e.timestamp)}</div>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>IP {e.ipAddress}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`.spin { animation: aud-spin 1s linear infinite; } @keyframes aud-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
