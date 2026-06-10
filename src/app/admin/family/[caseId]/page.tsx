'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, ShieldAlert, Lock } from 'lucide-react';
import {
  PARTY_ROLE_LABELS, CASE_MODALITY_LABELS, VIOLENCE_TYPE_LABELS,
  PROTECTION_MEASURE_TYPE_LABELS, MEASURE_STATUS_LABELS,
  HEARING_TYPE_LABELS, PARD_STAGE_LABELS,
  ASSESSMENT_TYPE_LABELS, RISK_LEVEL_LABELS,
} from '@/domain/catalogs/familyLabels';
import {
  AddMeasureForm, MeasureStatusControl,
  AddHearingForm, HearingOutcomeControl,
  AddPardForm, PardStageControl,
  AddAssessmentForm, TeamSection, AuditSection,
} from './ExpedienteActions';
import { CaseDocuments } from './CaseDocuments';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Expediente {
  id: string;
  filingNumber: string;
  subject: string;
  description: string;
  filedAt: string;
  dueDate: string;
  priority: number;
  caseModality: string | null;
  violenceTypes: string[];
  caseType: { code: string; name: string } | null;
  state: { code: string; name: string; color: string | null } | null;
  caseParties: any[];
  protectionMeasures: any[];
  restorationProcesses: any[];
  hearings: any[];
  stateHistory: any[];
  _count: { assessments: number };
}

interface AvailableTransition { code: string; name: string; requiresComment: boolean }

const card: React.CSSProperties = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' };
const h2: React.CSSProperties = { fontSize: '1.05rem', marginTop: 0, marginBottom: '0.85rem' };
const pill = (color: string): React.CSSProperties => ({ background: color + '22', color, borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.78rem', fontWeight: 600 });
const empty: React.CSSProperties = { color: '#9ca3af', fontSize: '0.88rem', margin: 0 };

export default function ExpedienteFamiliaPage() {
  const router = useRouter();
  const { caseId } = useParams<{ caseId: string }>();
  const [data, setData] = useState<Expediente | null>(null);
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<any[] | null>(null);
  const [assessmentsDenied, setAssessmentsDenied] = useState(false);
  const [transitions, setTransitions] = useState<AvailableTransition[]>([]);
  const [toState, setToState] = useState('');
  const [comment, setComment] = useState('');
  const [changing, setChanging] = useState(false);
  const [transError, setTransError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/family/cases/${caseId}`);
      if (res.ok) setData(await res.json());

      const tRes = await fetch(`/api/v1/family/cases/${caseId}/transition`);
      if (tRes.ok) setTransitions((await tRes.json()).available ?? []);

      const aRes = await fetch(`/api/v1/family/cases/${caseId}/assessments`);
      if (aRes.status === 403) setAssessmentsDenied(true);
      else if (aRes.ok) setAssessments((await aRes.json()).data ?? []);
    } catch (e) {
      console.error('Error cargando expediente:', e);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  const changeState = async () => {
    if (!toState) return;
    setTransError(null);
    setChanging(true);
    try {
      const res = await fetch(`/api/v1/family/cases/${caseId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStateCode: toState, comment: comment.trim() || undefined }),
      });
      const d = await res.json();
      if (!res.ok) { setTransError(d.error || 'No se pudo cambiar el estado.'); return; }
      setToState(''); setComment('');
      await load();
    } catch {
      setTransError('Error de conexión.');
    } finally {
      setChanging(false);
    }
  };

  if (loading) return <p style={{ color: '#6b7280' }}>Cargando expediente…</p>;
  if (!data) return <p style={{ color: '#6b7280' }}>No se encontró el expediente.</p>;

  const nnaParties = data.caseParties.filter((p) => p.person?.isMinor || p.role === 'NNA');

  return (
    <div style={{ maxWidth: '950px' }}>
      <button onClick={() => router.push('/admin/family')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Volver a casos
      </button>

      {/* Encabezado */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.2rem' }}>{data.filingNumber}</div>
            <h1 style={{ fontSize: '1.3rem', margin: '0.25rem 0' }}>{data.subject}</h1>
            <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>{data.caseType?.name} · {data.caseModality ? (CASE_MODALITY_LABELS[data.caseModality] ?? data.caseModality) : 'Sin modalidad'}</div>
          </div>
          <span style={pill(data.state?.color ?? '#6b7280')}>{data.state?.name ?? '—'}</span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1rem', fontSize: '0.85rem', color: '#374151' }}>
          <span>📅 Radicado: <b>{new Date(data.filedAt).toLocaleDateString('es-CO')}</b></span>
          <span>⏰ Vence: <b>{new Date(data.dueDate).toLocaleDateString('es-CO')}</b></span>
          <span>🔢 Prioridad: <b>{data.priority}</b></span>
        </div>
        {data.violenceTypes.length > 0 && (
          <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {data.violenceTypes.map((v) => (
              <span key={v} style={{ background: '#fef2f2', color: '#b91c1c', borderRadius: '6px', padding: '0.1rem 0.5rem', fontSize: '0.78rem', fontWeight: 600 }}>{VIOLENCE_TYPE_LABELS[v] ?? v}</span>
            ))}
          </div>
        )}
        <p style={{ marginTop: '1rem', whiteSpace: 'pre-wrap', color: '#374151', fontSize: '0.92rem' }}>{data.description}</p>
      </div>

      {/* Cambiar estado */}
      {transitions.length > 0 && (
        <div style={card}>
          <h2 style={h2}>Cambiar estado</h2>
          {transError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '0.75rem', fontSize: '0.88rem' }}>{transError}</div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ minWidth: '220px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Nuevo estado</label>
              <select value={toState} onChange={(e) => setToState(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem' }}>
                <option value="">Seleccionar…</option>
                {transitions.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
                Comentario {transitions.find((t) => t.code === toState)?.requiresComment ? '*' : '(opcional)'}
              </label>
              <input value={comment} onChange={(e) => setComment(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem' }} placeholder="Motivo del cambio" />
            </div>
            <button onClick={changeState} disabled={!toState || changing} style={{ background: 'var(--color-primary, #2563eb)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem 1.1rem', fontWeight: 600, cursor: !toState || changing ? 'default' : 'pointer', opacity: !toState || changing ? 0.6 : 1 }}>
              {changing ? 'Guardando…' : 'Aplicar'}
            </button>
          </div>
        </div>
      )}

      {/* Partes */}
      <div style={card}>
        <h2 style={h2}>Partes ({data.caseParties.length})</h2>
        {data.caseParties.length === 0 ? <p style={empty}>Sin partes registradas.</p> : (
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {data.caseParties.map((cp) => (
              <div key={cp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f3f4f6', borderRadius: '8px', padding: '0.6rem 0.85rem' }}>
                <div>
                  <b>{cp.person.firstName} {cp.person.firstLastName}</b>
                  <span style={{ color: '#6b7280', marginLeft: '0.5rem', fontSize: '0.85rem' }}>{cp.person.documentType} {cp.person.documentNumber}</span>
                  {cp.person.isMinor && <span style={{ marginLeft: '0.5rem', background: '#fef3c7', color: '#b45309', borderRadius: '6px', padding: '0.05rem 0.4rem', fontSize: '0.7rem', fontWeight: 700 }}>NNA</span>}
                </div>
                <span style={pill('#2563eb')}>{PARTY_ROLE_LABELS[cp.role] ?? cp.role}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Equipo asignado */}
      <TeamSection caseId={data.id} canEdit={true} />

      {/* Medidas de protección */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <h2 style={{ ...h2, margin: 0 }}>Medidas de protección ({data.protectionMeasures.length})</h2>
          <AddMeasureForm caseId={data.id} onDone={load} />
        </div>
        {data.protectionMeasures.length === 0 ? <p style={empty}>Sin medidas impuestas.</p> : (
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {data.protectionMeasures.map((m) => (
              <div key={m.id} style={{ border: '1px solid #f3f4f6', borderRadius: '8px', padding: '0.7rem 0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b>{PROTECTION_MEASURE_TYPE_LABELS[m.measureType] ?? m.measureType}</b>
                  <span style={pill(m.status === 'VIGENTE' ? '#059669' : m.status === 'INCUMPLIDA' ? '#dc2626' : '#6b7280')}>{MEASURE_STATUS_LABELS[m.status] ?? m.status}</span>
                </div>
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.88rem', color: '#374151' }}>{m.description}</p>
                <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.3rem' }}>{m.legalBasis} · {new Date(m.issuedAt).toLocaleDateString('es-CO')}{m.expiresAt ? ` · vence ${new Date(m.expiresAt).toLocaleDateString('es-CO')}` : ''}</div>
                <MeasureStatusControl measure={m} onDone={load} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PARD */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <h2 style={{ ...h2, margin: 0 }}>Restablecimiento de derechos / PARD ({data.restorationProcesses.length})</h2>
          <AddPardForm caseId={data.id} nnaParties={nnaParties} onDone={load} />
        </div>
        {data.restorationProcesses.length === 0 ? <p style={empty}>Sin procesos PARD.</p> : (
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {data.restorationProcesses.map((r) => (
              <div key={r.id} style={{ border: '1px solid #f3f4f6', borderRadius: '8px', padding: '0.7rem 0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b>NNA: {r.child?.firstName} {r.child?.firstLastName}</b>
                  <span style={pill('#1a5fb4')}>{PARD_STAGE_LABELS[r.stage] ?? r.stage}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.3rem' }}>{r.legalBasis} · abierto {new Date(r.openedAt).toLocaleDateString('es-CO')}</div>
                <PardStageControl process={r} onDone={load} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audiencias */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <h2 style={{ ...h2, margin: 0 }}>Audiencias ({data.hearings.length})</h2>
          <AddHearingForm caseId={data.id} onDone={load} />
        </div>
        {data.hearings.length === 0 ? <p style={empty}>Sin audiencias programadas.</p> : (
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {data.hearings.map((hg) => (
              <div key={hg.id} style={{ border: '1px solid #f3f4f6', borderRadius: '8px', padding: '0.6rem 0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <b>{HEARING_TYPE_LABELS[hg.hearingType] ?? hg.hearingType}</b>
                    <span style={{ color: '#6b7280', marginLeft: '0.5rem', fontSize: '0.85rem' }}>{new Date(hg.scheduledAt).toLocaleString('es-CO')}</span>
                  </div>
                  <span style={pill(hg.wasHeld ? '#059669' : '#f59e0b')}>{hg.wasHeld ? 'Celebrada' : 'Programada'}</span>
                </div>
                {hg.outcome && <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: '#374151' }}>{hg.outcome}</p>}
                <HearingOutcomeControl hearing={hg} onDone={load} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Valoraciones (confidencial) */}
      <div style={{ ...card, borderColor: '#fde68a', background: '#fffbeb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <h2 style={{ ...h2, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Lock size={16} /> Valoraciones — confidencial
          </h2>
          {!assessmentsDenied && <AddAssessmentForm caseId={data.id} parties={data.caseParties} onDone={load} />}
        </div>
        {assessmentsDenied ? (
          <p style={{ ...empty, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#92400e' }}>
            <ShieldAlert size={16} /> Su rol no tiene acceso a las valoraciones de este expediente.
          </p>
        ) : !assessments || assessments.length === 0 ? (
          <p style={empty}>Sin valoraciones registradas ({data._count.assessments}).</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {assessments.map((a) => (
              <div key={a.id} style={{ border: '1px solid #fde68a', borderRadius: '8px', padding: '0.7rem 0.85rem', background: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b>{ASSESSMENT_TYPE_LABELS[a.assessmentType] ?? a.assessmentType}</b>
                  <span style={pill(a.riskLevel === 'ALTO' || a.riskLevel === 'EXTREMO' ? '#dc2626' : a.riskLevel === 'MEDIO' ? '#f59e0b' : '#059669')}>Riesgo {RISK_LEVEL_LABELS[a.riskLevel] ?? a.riskLevel}</span>
                </div>
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.88rem', color: '#374151' }}>{a.findings}</p>
                <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.3rem' }}>{a.assessor?.fullName ?? 'Profesional'} · {new Date(a.conductedAt).toLocaleDateString('es-CO')}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial de estados */}
      <div style={card}>
        <h2 style={h2}>Historial de estados</h2>
        {!data.stateHistory || data.stateHistory.length === 0 ? <p style={empty}>Sin movimientos.</p> : (
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {data.stateHistory.map((h) => (
              <div key={h.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', borderLeft: `3px solid ${h.toState?.color ?? '#d1d5db'}`, paddingLeft: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem' }}>
                    {h.fromState ? <span style={{ color: '#9ca3af' }}>{h.fromState.name} → </span> : null}
                    <b>{h.toState?.name}</b>
                    {h.reason === 'REOPENED' && <span style={{ marginLeft: '0.4rem', background: '#fef3c7', color: '#92400e', borderRadius: '6px', padding: '0.05rem 0.4rem', fontSize: '0.7rem', fontWeight: 700 }}>REAPERTURA</span>}
                  </div>
                  {h.comment && <div style={{ fontSize: '0.85rem', color: '#374151', marginTop: '0.15rem' }}>{h.comment}</div>}
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.15rem' }}>
                    {h.changedByUser?.fullName ?? 'Sistema'} · {new Date(h.timestamp).toLocaleString('es-CO')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documentos del expediente */}
      <CaseDocuments caseId={data.id} />

      {/* Trazabilidad / auditoría (solo dirección y administración) */}
      <AuditSection caseId={data.id} />
    </div>
  );
}
