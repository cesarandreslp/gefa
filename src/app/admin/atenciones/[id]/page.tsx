/**
 * /admin/atenciones/[id] — Pantalla del profesional para atender un turno (RF‑13/14).
 * Diligencia el instrumento (prellenado desde el expediente), AUTOGUARDA el
 * borrador cada pocos segundos (resiste corte de red/luz) y "Guardar y terminar"
 * promueve a Assessment y libera al profesional. Estilo inline.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ClipboardCheck, Save, CheckCircle2, ArrowLeft } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' };
const label: React.CSSProperties = { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 4 };
const input: React.CSSProperties = { width: '100%', padding: '0.5rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.88rem', boxSizing: 'border-box' };

export default function AtenderTurnoPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [turno, setTurno] = useState<any>(null);
  const [caseData, setCaseData] = useState<any>(null);
  const [instruments, setInstruments] = useState<any[]>([]);
  const [selId, setSelId] = useState('');
  const [respuestas, setRespuestas] = useState<Record<string, any>>({});
  const [assessedPersonId, setAssessedPersonId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [done, setDone] = useState(false);

  const skipAutosave = useRef(true); // evita guardar durante la hidratación inicial

  // Carga inicial: turno + caso + instrumentos
  useEffect(() => {
    (async () => {
      try {
        const tRes = await fetch(`/api/v1/family/atenciones/${id}`);
        if (!tRes.ok) { setError((await tRes.json()).error || 'No se pudo cargar el turno.'); setLoading(false); return; }
        const t = (await tRes.json()).data;
        setTurno(t);
        setSelId(t.instrumentoId || '');
        setAssessedPersonId(t.assessedPersonId || '');
        if (t.borrador && typeof t.borrador === 'object') setRespuestas(t.borrador);

        const cRes = await fetch(`/api/v1/family/cases/${t.caseId}`);
        const c = cRes.ok ? await cRes.json() : null;
        setCaseData(c);
        const modalidad = c?.caseModality;
        const iRes = await fetch(`/api/v1/family/instrumentos${modalidad ? `?modalidad=${encodeURIComponent(modalidad)}` : ''}`);
        setInstruments(iRes.ok ? (await iRes.json()).data ?? [] : []);
      } catch {
        setError('Error de conexión al cargar el turno.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const sel = instruments.find((i) => i.id === selId);
  const enCurso = turno?.estado === 'EN_CURSO' && !done;

  const onSelectInstrument = async (newId: string) => {
    skipAutosave.current = true;
    setSelId(newId);
    setRespuestas({});
    if (!newId || !turno) return;
    try {
      const res = await fetch(`/api/v1/family/cases/${turno.caseId}/instrumentos/prefill?instrumentoId=${encodeURIComponent(newId)}`);
      if (res.ok) setRespuestas((await res.json()).respuestasIniciales ?? {});
    } catch { /* prellenado best-effort */ }
  };

  const setVal = (code: string, v: any) => { skipAutosave.current = false; setRespuestas((p) => ({ ...p, [code]: v })); };

  // Autoguardado debounced (RF‑13): 2 s tras el último cambio.
  const save = useCallback(async () => {
    if (!enCurso) return;
    try {
      const res = await fetch(`/api/v1/family/atenciones/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrador: respuestas, instrumentoId: selId || null, assessedPersonId: assessedPersonId || null }),
      });
      if (res.ok) setSavedAt((await res.json()).lastAutosaveAt);
    } catch { /* reintenta en el próximo cambio */ }
  }, [id, respuestas, selId, assessedPersonId, enCurso]);

  useEffect(() => {
    if (skipAutosave.current) { skipAutosave.current = false; return; }
    if (!enCurso) return;
    const t = setTimeout(save, 2000);
    return () => clearTimeout(t);
  }, [respuestas, selId, assessedPersonId, enCurso, save]);

  const finalizar = async () => {
    if (!selId) { setError('Seleccione el instrumento antes de terminar.'); return; }
    setFinalizing(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/family/atenciones/${id}/finalizar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instrumentoId: selId, respuestas, assessedPersonId: assessedPersonId || undefined }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'No se pudo finalizar el turno.'); return; }
      setDone(true);
    } catch { setError('Error de conexión.'); } finally { setFinalizing(false); }
  };

  if (loading) return <p style={{ color: '#94a3b8' }}>Cargando turno…</p>;

  return (
    <div style={{ maxWidth: 820 }}>
      <button onClick={() => router.push('/admin/atenciones')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Volver al tablero
      </button>

      {done ? (
        <div style={{ ...card, textAlign: 'center' }}>
          <CheckCircle2 size={40} color="#16a34a" style={{ margin: '0 auto' }} />
          <h2 style={{ margin: '0.6rem 0 0.3rem', color: '#0f172a' }}>Turno finalizado</h2>
          <p style={{ color: '#64748b', margin: 0 }}>La valoración quedó registrada y usted ha vuelto a estado LIBRE.</p>
          <button onClick={() => router.push('/admin/atenciones')} style={{ marginTop: '1rem', background: 'var(--color-primary, #2563eb)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem 1.2rem', fontWeight: 600, cursor: 'pointer' }}>Ir al tablero</button>
        </div>
      ) : (
        <>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ClipboardCheck size={22} color="var(--color-primary, #2563eb)" />
              <div>
                <h1 style={{ fontSize: '1.2rem', margin: 0 }}>Atención del turno</h1>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  {caseData ? <>Caso <b style={{ fontFamily: 'monospace' }}>{caseData.filingNumber}</b> · {caseData.subject}</> : 'Caso del turno'}
                </div>
              </div>
            </div>
            {!enCurso && <div style={{ marginTop: '0.8rem', background: '#f1f5f9', borderRadius: 8, padding: '0.6rem 0.85rem', fontSize: '0.85rem', color: '#475569' }}>Este turno ya está finalizado (solo lectura).</div>}
          </div>

          {error && <div style={{ ...card, background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', fontSize: '0.88rem' }}>{error}</div>}

          <div style={card}>
            <label style={label}>Instrumento</label>
            <select value={selId} onChange={(e) => onSelectInstrument(e.target.value)} disabled={!enCurso} style={input}>
              <option value="">Seleccionar…</option>
              {instruments.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>

            {caseData?.caseParties?.length > 0 && (
              <div style={{ marginTop: '0.7rem' }}>
                <label style={label}>Persona valorada (opcional)</label>
                <select value={assessedPersonId} onChange={(e) => { skipAutosave.current = false; setAssessedPersonId(e.target.value); }} disabled={!enCurso} style={input}>
                  <option value="">— No especificar —</option>
                  {caseData.caseParties.map((p: any) => <option key={p.person.id} value={p.person.id}>{p.person.firstName} {p.person.firstLastName}</option>)}
                </select>
              </div>
            )}

            {sel && (() => {
              let lastSeccion = '';
              return (
                <div style={{ marginTop: '0.8rem', display: 'grid', gap: '0.55rem', maxHeight: 460, overflowY: 'auto', paddingRight: '0.3rem' }}>
                  {(sel.campos ?? []).map((c: any) => {
                    const header = c.seccion !== lastSeccion ? (lastSeccion = c.seccion) : null;
                    return (
                      <div key={c.id}>
                        {header && <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#374151', margin: '0.5rem 0 0.2rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>{c.seccion}</div>}
                        <label style={{ ...label, fontWeight: 500 }}>{c.orden}. {c.label}{c.requerido && ' *'}{c.esCritico && <span style={{ color: '#b91c1c' }}> (crítico)</span>}</label>
                        {c.ayuda && <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginBottom: '0.2rem' }}>{c.ayuda}</div>}
                        {c.tipo === 'BOOLEANO' ? (
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            {[['true', 'Sí'], ['false', 'No']].map(([v, lbl]) => (
                              <button key={v} type="button" disabled={!enCurso} onClick={() => setVal(c.code, v === 'true')}
                                style={{ padding: '0.25rem 0.85rem', fontSize: '0.82rem', borderRadius: 8, cursor: 'pointer', border: '1px solid', background: (respuestas[c.code] === (v === 'true')) ? (v === 'true' ? '#fee2e2' : '#ecfdf5') : '#fff', borderColor: (respuestas[c.code] === (v === 'true')) ? (v === 'true' ? '#fca5a5' : '#6ee7b7') : '#d1d5db' }}>
                                {lbl}
                              </button>
                            ))}
                          </div>
                        ) : (c.tipo === 'SELECCION' || c.tipo === 'ESCALA') ? (
                          <select value={respuestas[c.code] ?? ''} disabled={!enCurso} onChange={(e) => setVal(c.code, e.target.value)} style={input}>
                            <option value="">Seleccionar…</option>
                            {(Array.isArray(c.opciones) ? c.opciones : []).map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        ) : c.tipo === 'TEXTO_LARGO' ? (
                          <textarea value={respuestas[c.code] ?? ''} disabled={!enCurso} onChange={(e) => setVal(c.code, e.target.value)} style={{ ...input, minHeight: 54, resize: 'vertical' }} />
                        ) : (
                          <input type={c.tipo === 'NUMERO' ? 'number' : c.tipo === 'FECHA' ? 'date' : 'text'} value={respuestas[c.code] ?? ''} disabled={!enCurso} onChange={(e) => setVal(c.code, e.target.value)} style={input} />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {enCurso && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={finalizar} disabled={finalizing || !selId} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: finalizing || !selId ? '#9ca3af' : '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem 1.3rem', fontWeight: 600, cursor: finalizing || !selId ? 'default' : 'pointer' }}>
                <CheckCircle2 size={17} /> {finalizing ? 'Guardando…' : 'Guardar y terminar'}
              </button>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#94a3b8' }}>
                <Save size={14} /> {savedAt ? `Autoguardado ${new Date(savedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'El borrador se autoguarda solo'}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
