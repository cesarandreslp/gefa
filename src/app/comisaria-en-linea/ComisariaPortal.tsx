'use client';

import { useState, useEffect } from 'react';
import {
  ShieldCheck, FileText, Search, Send, CheckCircle, AlertCircle,
  Clock, Loader2, Copy, ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

// Tipos de caso que la ciudadanía puede radicar directamente. Los códigos
// coinciden con el seed de la comisaría (FAMILY_CASE_TYPES). Casos de oficio
// (PARD) los abre la autoridad, no se ofrecen aquí.
const CASE_TYPES = [
  { code: 'VIF', name: 'Violencia Intrafamiliar' },
  { code: 'MP', name: 'Medida de Protección' },
  { code: 'CAV', name: 'Custodia, Alimentos y Visitas' },
  { code: 'CF', name: 'Conciliación Familiar' },
  { code: 'PNNA', name: 'Protección a un Niño, Niña o Adolescente' },
];

const DOC_TYPES = [
  { code: 'CC', name: 'Cédula de ciudadanía' },
  { code: 'CE', name: 'Cédula de extranjería' },
  { code: 'PA', name: 'Pasaporte' },
  { code: 'TI', name: 'Tarjeta de identidad' },
  { code: 'PEP', name: 'Permiso especial de permanencia' },
];

interface IntakeForm {
  documentType: string;
  documentNumber: string;
  firstName: string;
  secondName: string;
  firstLastName: string;
  secondLastName: string;
  phone: string;
  email: string;
  caseTypeCode: string;
  subject: string;
  description: string;
  esVictima: boolean;
}

const EMPTY_FORM: IntakeForm = {
  documentType: 'CC', documentNumber: '', firstName: '', secondName: '',
  firstLastName: '', secondLastName: '', phone: '', email: '',
  caseTypeCode: '', subject: '', description: '', esVictima: false,
};

interface StatusResult {
  filingNumber: string;
  subject: string;
  caseType: string;
  state: string;
  stateColor: string;
  isFinal: boolean;
  filedAt: string;
  dueDate: string;
  timeline: Array<{ date: string; state: string; color: string }>;
}

type Tab = 'radicar' | 'consultar';

export default function ComisariaPortal({ initialTab = 'radicar' }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);

  // --- Radicación ---
  const [form, setForm] = useState<IntakeForm>(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ filingNumber: string; documentNumber: string } | null>(null);

  // --- Consulta ---
  const [qFiling, setQFiling] = useState('');
  const [qDoc, setQDoc] = useState('');
  const [searching, setSearching] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [result, setResult] = useState<StatusResult | null>(null);

  // Pre-llenar la consulta si llega ?radicado= (ej. clic desde el comprobante)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rad = params.get('radicado');
    if (rad) {
      setQFiling(rad);
      setTab('consultar');
    } else if (params.get('tab') === 'consultar') {
      setTab('consultar');
    }
  }, []);

  const update = (k: keyof IntakeForm, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submitIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntakeError(null);

    if (!form.documentNumber || !form.firstName || !form.firstLastName ||
        !form.caseTypeCode || !form.subject || form.description.trim().length < 20) {
      setIntakeError('Complete los campos obligatorios. La descripción debe tener al menos 20 caracteres.');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/v1/family/public/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setReceipt({ filingNumber: data.filingNumber, documentNumber: data.documentNumber });
        setForm(EMPTY_FORM);
      } else {
        setIntakeError(data.error || 'No se pudo radicar la solicitud.');
      }
    } catch {
      setIntakeError('Error de conexión. Intente nuevamente.');
    } finally {
      setSending(false);
    }
  };

  const submitQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusError(null);
    setResult(null);
    if (qFiling.trim().length < 5 || qDoc.trim().length < 4) {
      setStatusError('Ingrese el número de radicado y el documento del denunciante.');
      return;
    }
    setSearching(true);
    try {
      const url = `/api/v1/family/public/status?filingNumber=${encodeURIComponent(qFiling.trim())}&documentNumber=${encodeURIComponent(qDoc.trim())}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setResult(data.data);
      } else {
        setStatusError(data.error?.message || 'No se encontró una solicitud con esos datos.');
      }
    } catch {
      setStatusError('Error de conexión. Intente nuevamente.');
    } finally {
      setSearching(false);
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '24px 16px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b', textDecoration: 'none', fontSize: 14, marginBottom: 16 }}>
          <ArrowLeft size={16} /> Volver al inicio
        </Link>

        <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ background: '#1a5fb4', borderRadius: 12, padding: 10, color: '#fff', display: 'flex' }}>
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, color: '#1e293b' }}>Comisaría en línea</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
              Radique su solicitud o consulte el estado de su trámite.
            </p>
          </div>
        </header>

        <div style={{ background: '#e8eef7', border: '1px solid #cfe0f4', borderRadius: 10, padding: '12px 14px', margin: '16px 0', fontSize: 13, color: '#003d7a', display: 'flex', gap: 8 }}>
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>¿Está en peligro inmediato?</strong> Llame a la línea <strong>123</strong> o a la línea nacional <strong>155</strong>.
            Este canal es para trámites; no reemplaza la atención de emergencia.
          </span>
        </div>

        {/* Pestañas */}
        <div style={{ display: 'flex', gap: 4, background: '#fff', padding: 4, borderRadius: 10, marginBottom: 16, border: '1px solid #e2e8f0' }}>
          {([['radicar', 'Radicar solicitud', FileText], ['consultar', 'Consultar estado', Search]] as const).map(
            ([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '10px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 600,
                  background: tab === key ? '#1a5fb4' : 'transparent',
                  color: tab === key ? '#fff' : '#64748b',
                }}
              >
                <Icon size={16} /> {label}
              </button>
            )
          )}
        </div>

        {tab === 'radicar' && (
          receipt ? (
            <ReceiptCard receipt={receipt} onConsult={() => { setQFiling(receipt.filingNumber); setQDoc(receipt.documentNumber); setTab('consultar'); }} onNew={() => setReceipt(null)} />
          ) : (
            <form onSubmit={submitIntake} style={cardStyle}>
              <SectionTitle>Datos del denunciante</SectionTitle>
              <div style={rowStyle}>
                <Field label="Tipo de documento *">
                  <select value={form.documentType} onChange={(e) => update('documentType', e.target.value)} style={inputStyle}>
                    {DOC_TYPES.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
                  </select>
                </Field>
                <Field label="Número de documento *">
                  <input value={form.documentNumber} onChange={(e) => update('documentNumber', e.target.value)} style={inputStyle} inputMode="numeric" />
                </Field>
              </div>
              <div style={rowStyle}>
                <Field label="Primer nombre *"><input value={form.firstName} onChange={(e) => update('firstName', e.target.value)} style={inputStyle} /></Field>
                <Field label="Segundo nombre"><input value={form.secondName} onChange={(e) => update('secondName', e.target.value)} style={inputStyle} /></Field>
              </div>
              <div style={rowStyle}>
                <Field label="Primer apellido *"><input value={form.firstLastName} onChange={(e) => update('firstLastName', e.target.value)} style={inputStyle} /></Field>
                <Field label="Segundo apellido"><input value={form.secondLastName} onChange={(e) => update('secondLastName', e.target.value)} style={inputStyle} /></Field>
              </div>
              <div style={rowStyle}>
                <Field label="Teléfono de contacto"><input value={form.phone} onChange={(e) => update('phone', e.target.value)} style={inputStyle} inputMode="tel" /></Field>
                <Field label="Correo electrónico"><input value={form.email} onChange={(e) => update('email', e.target.value)} style={inputStyle} type="email" /></Field>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#334155', margin: '4px 0 8px' }}>
                <input type="checkbox" checked={form.esVictima} onChange={(e) => update('esVictima', e.target.checked)} />
                Soy la persona directamente afectada (víctima)
              </label>

              <SectionTitle>Detalle de la solicitud</SectionTitle>
              <Field label="Tipo de caso *">
                <select value={form.caseTypeCode} onChange={(e) => update('caseTypeCode', e.target.value)} style={inputStyle}>
                  <option value="">Seleccione…</option>
                  {CASE_TYPES.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
                </select>
              </Field>
              <Field label="Asunto *">
                <input value={form.subject} onChange={(e) => update('subject', e.target.value)} style={inputStyle} maxLength={150} placeholder="Resumen breve de la situación" />
              </Field>
              <Field label="Descripción de los hechos *">
                <textarea value={form.description} onChange={(e) => update('description', e.target.value)} style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }} placeholder="Describa lo ocurrido con el mayor detalle posible (mínimo 20 caracteres)." />
              </Field>

              <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 12px' }}>
                Al enviar autoriza el tratamiento de sus datos personales conforme a la Ley 1581 de 2012, con la
                finalidad exclusiva de gestionar su solicitud ante la comisaría de familia.
              </p>

              {intakeError && <ErrorBanner>{intakeError}</ErrorBanner>}

              <button type="submit" disabled={sending} style={primaryBtn(sending)}>
                {sending ? <><Loader2 size={18} className="spin" /> Radicando…</> : <><Send size={18} /> Radicar solicitud</>}
              </button>
            </form>
          )
        )}

        {tab === 'consultar' && (
          <>
            <form onSubmit={submitQuery} style={cardStyle}>
              <SectionTitle>Consultar estado del trámite</SectionTitle>
              <div style={rowStyle}>
                <Field label="Número de radicado *">
                  <input value={qFiling} onChange={(e) => setQFiling(e.target.value)} style={inputStyle} placeholder="Ej. VIF-2026-00001" />
                </Field>
                <Field label="Documento del denunciante *">
                  <input value={qDoc} onChange={(e) => setQDoc(e.target.value)} style={inputStyle} inputMode="numeric" />
                </Field>
              </div>
              {statusError && <ErrorBanner>{statusError}</ErrorBanner>}
              <button type="submit" disabled={searching} style={primaryBtn(searching)}>
                {searching ? <><Loader2 size={18} className="spin" /> Consultando…</> : <><Search size={18} /> Consultar</>}
              </button>
            </form>

            {result && <StatusCard result={result} fmtDate={fmtDate} />}
          </>
        )}
      </div>

      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ReceiptCard({ receipt, onConsult, onNew }: { receipt: { filingNumber: string; documentNumber: string }; onConsult: () => void; onNew: () => void }) {
  return (
    <div style={{ ...cardStyle, textAlign: 'center' }}>
      <CheckCircle size={48} color="#16a34a" style={{ margin: '0 auto 12px' }} />
      <h2 style={{ margin: '0 0 6px', color: '#1e293b' }}>Solicitud radicada</h2>
      <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 16px' }}>
        Conserve su número de radicado. Lo necesitará junto con su documento para consultar el estado.
      </p>
      <div style={{ background: '#f1f5f9', borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Número de radicado</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 24, fontWeight: 700, color: '#1a5fb4' }}>
          {receipt.filingNumber}
          <button onClick={() => navigator.clipboard?.writeText(receipt.filingNumber)} title="Copiar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a5fb4', display: 'flex' }}>
            <Copy size={18} />
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onConsult} style={{ ...primaryBtn(false), flex: 1 }}><Search size={18} /> Consultar estado</button>
        <button onClick={onNew} style={{ ...secondaryBtn, flex: 1 }}>Radicar otra</button>
      </div>
    </div>
  );
}

function StatusCard({ result, fmtDate }: { result: StatusResult; fmtDate: (s: string) => string }) {
  return (
    <div style={{ ...cardStyle, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Radicado</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>{result.filingNumber}</div>
          <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>{result.caseType}</div>
        </div>
        <span style={{ background: result.stateColor, color: '#fff', padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {result.isFinal ? <CheckCircle size={15} /> : <Clock size={15} />} {result.state}
        </span>
      </div>

      <div style={{ fontSize: 14, color: '#334155', marginBottom: 4 }}><strong>Asunto:</strong> {result.subject}</div>
      <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#64748b', marginBottom: 16 }}>
        <span>Radicado el {fmtDate(result.filedAt)}</span>
        <span>Vence el {fmtDate(result.dueDate)}</span>
      </div>

      <SectionTitle>Seguimiento</SectionTitle>
      <div style={{ position: 'relative', paddingLeft: 8 }}>
        {result.timeline.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: i === result.timeline.length - 1 ? 0 : 16, position: 'relative' }}>
            <div style={{ width: 12, height: 12, borderRadius: 999, background: t.color, marginTop: 4, flexShrink: 0, boxShadow: `0 0 0 3px ${t.color}22` }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{t.state}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{fmtDate(t.date)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Subcomponentes y estilos ---
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 14, color: '#1a5fb4', textTransform: 'uppercase', letterSpacing: 0.5, margin: '4px 0 12px', fontWeight: 700 }}>{children}</h3>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', flex: 1, marginBottom: 12 }}>
      <span style={{ display: 'block', fontSize: 13, color: '#334155', marginBottom: 4, fontWeight: 500 }}>{label}</span>
      {children}
    </label>
  );
}
function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
      <AlertCircle size={16} style={{ flexShrink: 0 }} /> {children}
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const rowStyle: React.CSSProperties = { display: 'flex', gap: 12, flexWrap: 'wrap' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box', color: '#1e293b', background: '#fff' };
const secondaryBtn: React.CSSProperties = { padding: '11px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
function primaryBtn(disabled: boolean): React.CSSProperties {
  return { width: '100%', padding: '12px 16px', borderRadius: 8, border: 'none', background: disabled ? '#9db8dd' : '#1a5fb4', color: '#fff', fontSize: 15, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
}
