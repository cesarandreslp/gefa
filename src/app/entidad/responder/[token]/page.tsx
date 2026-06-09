'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface CaseDocument {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  isInternal?: boolean;
}

interface TimelineEntry {
  id: string;
  message: string;
  date: string;
  authorType: 'FUNCIONARIO' | 'ENTIDAD';
  authorLabel: string;
}

interface CaseInfo {
  filingNumber: string;
  subject: string;
  filedAt: string;
  caseType: string;
  message: string;
  requestedAt: string;
  state: string;
  currentState: string;
  casoCerrado: boolean;
  timeline: TimelineEntry[];
  tenant: { name: string; email: string; phone: string };
  documents: CaseDocument[];
}

type PageState =
  | 'auth'
  | 'authenticating'
  | 'loading'
  | 'valid'
  | 'closed'
  | 'invalid'
  | 'submitted'
  | 'error';

const SESSION_KEY = (token: string) => `ext_session_${token}`;

const s = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: '2rem 1rem',
  } as React.CSSProperties,
  card: {
    maxWidth: '680px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  } as React.CSSProperties,
  header: (bg: string): React.CSSProperties => ({
    backgroundColor: bg,
    color: '#ffffff',
    padding: '1.5rem 2rem',
  }),
  body: { padding: '2rem' } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '0.375rem',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: '1rem',
  } as React.CSSProperties,
  btn: (disabled: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '0.875rem',
    backgroundColor: disabled ? '#93c5fd' : '#1e40af',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
  }),
  error: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    padding: '0.75rem 1rem',
    color: '#dc2626',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  } as React.CSSProperties,
  notice: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '6px',
    padding: '0.75rem 1rem',
    color: '#166534',
    fontSize: '0.875rem',
    marginBottom: '1.25rem',
  } as React.CSSProperties,
};

export default function PortalEntidadPage() {
  const params = useParams();
  const token = params?.token as string;

  const [pageState, setPageState] = useState<PageState>('auth');
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Auth form
  const [email, setEmail] = useState('');
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [firstAccess, setFirstAccess] = useState(false);

  // Response form
  const [respuesta, setRespuesta] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Al montar: si hay sesión guardada, intentar cargar el caso directamente
  useEffect(() => {
    if (!token) return;
    const stored = sessionStorage.getItem(SESSION_KEY(token));
    if (stored) {
      loadCase(stored);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadCase(sessionToken: string) {
    setPageState('loading');
    try {
      const res = await fetch(`/api/v1/entidad/${token}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const data = await res.json();
      if (res.status === 401) {
        sessionStorage.removeItem(SESSION_KEY(token));
        setPageState('auth');
      } else if (!res.ok) {
        setErrorMsg(data.error || 'Enlace no válido.');
        setPageState('invalid');
      } else {
        setCaseInfo(data);
        if (data.casoCerrado) {
          setPageState('closed');
        } else {
          setPageState('valid');
        }
      }
    } catch {
      setPageState('error');
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setPageState('authenticating');

    try {
      const res = await fetch(`/api/v1/entidad/${token}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, cedula, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Credenciales incorrectas.');
        setPageState('auth');
        return;
      }

      sessionStorage.setItem(SESSION_KEY(token), data.sessionToken);
      if (data.isFirstAccess) setFirstAccess(true);
      await loadCase(data.sessionToken);
    } catch (err) {
      console.error('Error en handleAuth:', err);
      setErrorMsg('Error de conexión. Intente nuevamente.');
      setPageState('auth');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!respuesta.trim()) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const sessionToken = sessionStorage.getItem(SESSION_KEY(token)) || '';
      const formData = new FormData();
      formData.append('respuesta', respuesta.trim());
      if (file) formData.append('file', file);

      const res = await fetch(`/api/v1/entidad/${token}/responder`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
        body: formData,
      });
      const data = await res.json();

      if (res.status === 401) {
        sessionStorage.removeItem(SESSION_KEY(token));
        setErrorMsg('Su sesión expiró. Por favor vuelva a ingresar.');
        setPageState('auth');
      } else if (res.status === 410 && data.casoCerrado) {
        setPageState('closed');
      } else if (!res.ok) {
        setErrorMsg(data.error || 'Error al enviar la respuesta.');
        setSubmitting(false);
      } else {
        setRespuesta('');
        setFile(null);
        setSubmitting(false);
        // Recargar para mostrar la respuesta nueva en el historial
        const sessionToken = sessionStorage.getItem(SESSION_KEY(token)) || '';
        await loadCase(sessionToken);
        setPageState('submitted');
      }
    } catch {
      setErrorMsg('Error de conexión. Por favor intente nuevamente.');
      setSubmitting(false);
    }
  }

  // ── Pantallas de estado ──────────────────────────────────────────────────

  if (pageState === 'loading') {
    return (
      <div style={s.container}>
        <div style={{ ...s.card, padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#6b7280' }}>Cargando información del trámite...</p>
        </div>
      </div>
    );
  }

  if (pageState === 'closed') {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <div style={s.header('#6b7280')}>
            <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Caso cerrado</h1>
          </div>
          <div style={s.body}>
            <p style={{ color: '#374151' }}>
              El caso <strong>{caseInfo?.filingNumber}</strong> ha sido cerrado por el funcionario responsable.
              No es posible enviar más respuestas.
            </p>
            {caseInfo?.timeline && caseInfo.timeline.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <p style={{ fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Historial de conversación:</p>
                {caseInfo.timeline.map((entry) => {
                  const isEntity = entry.authorType === 'ENTIDAD';
                  return (
                    <div key={entry.id} style={{
                      backgroundColor: isEntity ? '#fffbeb' : '#eff6ff',
                      borderLeft: `3px solid ${isEntity ? '#d97706' : '#1e40af'}`,
                      padding: '0.75rem',
                      marginBottom: '0.5rem',
                      borderRadius: '0 6px 6px 0',
                      fontSize: '0.875rem',
                    }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '1px 8px',
                        borderRadius: '10px',
                        fontSize: '0.688rem',
                        fontWeight: 700,
                        backgroundColor: isEntity ? '#d97706' : '#1e40af',
                        color: 'white',
                        marginBottom: '6px',
                      }}>
                        {isEntity ? '🏢 Su respuesta' : '🏛️ Funcionario'}
                      </span>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{entry.message}</p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
                        {new Date(entry.date).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (pageState === 'invalid' || pageState === 'error') {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <div style={s.header('#991b1b')}>
            <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Enlace no válido</h1>
          </div>
          <div style={s.body}>
            <p style={{ color: '#374151' }}>{errorMsg || 'El enlace de acceso no es válido o ha expirado.'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (pageState === 'submitted') {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <div style={s.header('#166534')}>
            <h1 style={{ margin: 0, fontSize: '1.25rem' }}>✓ Respuesta enviada exitosamente</h1>
          </div>
          <div style={s.body}>
            <p style={{ color: '#374151', marginBottom: '1rem' }}>
              Su respuesta ha sido registrada en el sistema. El funcionario responsable del caso{' '}
              <strong>{caseInfo?.filingNumber}</strong> ha sido notificado.
            </p>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Si necesita enviar información adicional, puede hacerlo desde este mismo enlace.
            </p>
            <button
              onClick={() => setPageState('valid')}
              style={{ ...s.btn(false), backgroundColor: '#1e40af' }}
            >
              Enviar otra respuesta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Pantalla de autenticación ────────────────────────────────────────────

  if (pageState === 'auth' || pageState === 'authenticating') {
    const busy = pageState === 'authenticating';
    return (
      <div style={s.container}>
        <div style={s.card}>
          <div style={s.header('#1e40af')}>
            <p style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', opacity: 0.8 }}>
              Portal de Entidades — Acceso Seguro
            </p>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
              Identificación requerida
            </h1>
          </div>
          <div style={s.body}>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Para proteger la información de este trámite, ingrese sus datos de acceso.{' '}
              <strong>Si es la primera vez que accede a este enlace,</strong> los datos que ingrese
              quedarán registrados y serán requeridos en cada visita posterior.
            </p>

            <form onSubmit={handleAuth} autoComplete="off">
              <label style={s.label}>
                Correo electrónico <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={busy}
                placeholder="correo@entidad.gov.co"
                autoComplete="off"
                style={s.input}
              />

              <label style={s.label}>
                Número de cédula <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                required
                disabled={busy}
                placeholder="Ej: 12345678"
                autoComplete="off"
                style={s.input}
              />

              <label style={s.label}>
                Contraseña <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={busy}
                placeholder="Contraseña de acceso"
                autoComplete="new-password"
                style={s.input}
              />

              {errorMsg && <div style={s.error}>{errorMsg}</div>}

              <button type="submit" disabled={busy} style={s.btn(busy)}>
                {busy ? 'Verificando...' : 'Continuar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Portal principal del caso ────────────────────────────────────────────

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.header('#1e40af')}>
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', opacity: 0.8 }}>
            {caseInfo?.tenant?.name}
          </p>
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
            Solicitud de información — Portal de Entidades
          </h1>
        </div>

        <div style={s.body}>
          {firstAccess && (
            <div style={s.notice}>
              <strong>Acceso creado correctamente.</strong> Sus datos de acceso han sido registrados.
              Guárdelos — los necesitará para volver a consultar este trámite.
            </div>
          )}

          {/* Datos del radicado */}
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: '#6b7280' }}>Radicado:</span>{' '}
                <strong style={{ color: '#1e40af' }}>{caseInfo?.filingNumber}</strong>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Tipo:</span>{' '}
                <span>{caseInfo?.caseType}</span>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: '#6b7280' }}>Asunto:</span>{' '}
                <span>{caseInfo?.subject}</span>
              </div>
            </div>
          </div>

          {/* Documentos adjuntos */}
          {caseInfo?.documents && caseInfo.documents.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                📎 Documentos adjuntos:
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {caseInfo.documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.625rem 0.875rem',
                      backgroundColor: doc.isInternal ? '#fefce8' : '#f0f9ff',
                      border: `1px solid ${doc.isInternal ? '#fde68a' : '#bae6fd'}`,
                      borderRadius: '6px',
                      textDecoration: 'none',
                      color: doc.isInternal ? '#92400e' : '#0369a1',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>
                      {doc.mimeType.startsWith('image/') ? '🖼️' : doc.mimeType === 'application/pdf' ? '📄' : doc.mimeType.startsWith('audio/') ? '🎵' : doc.mimeType.startsWith('video/') ? '🎬' : '📎'}
                    </span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', flexShrink: 0, color: doc.isInternal ? '#a16207' : '#64748b' }}>
                      {doc.isInternal ? '🔒 Interno · ' : ''}{(doc.size / 1024).toFixed(0)} KB
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Timeline de conversación */}
          {caseInfo?.timeline && caseInfo.timeline.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>
                💬 Historial de conversación
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {caseInfo.timeline.map((entry) => {
                  const isEntity = entry.authorType === 'ENTIDAD';
                  return (
                    <div key={entry.id} style={{
                      backgroundColor: isEntity ? '#fffbeb' : '#eff6ff',
                      borderLeft: `4px solid ${isEntity ? '#d97706' : '#1e40af'}`,
                      padding: '0.875rem 1rem',
                      borderRadius: '0 8px 8px 0',
                      fontSize: '0.875rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '6px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontSize: '0.688rem',
                          fontWeight: 700,
                          backgroundColor: isEntity ? '#d97706' : '#1e40af',
                          color: 'white',
                        }}>
                          {isEntity ? '🏢 Su respuesta' : '🏛️ Funcionario'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          {new Date(entry.date).toLocaleDateString('es-CO', {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#374151', lineHeight: 1.6 }}>
                        {entry.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Formulario de respuesta */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ ...s.label, marginBottom: '0.5rem' }}>
                Su respuesta <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
                rows={6}
                required
                placeholder="Escriba aquí la información o respuesta solicitada..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ ...s.label, marginBottom: '0.5rem' }}>
                Adjuntar documento (opcional)
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp3,.mp4"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{ fontSize: '0.875rem', color: '#374151' }}
              />
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                PDF, Word, imagen, MP3 o MP4 — máx. 25MB
              </p>
            </div>

            {errorMsg && <div style={s.error}>{errorMsg}</div>}

            <button
              type="submit"
              disabled={submitting || !respuesta.trim()}
              style={s.btn(submitting || !respuesta.trim())}
            >
              {submitting ? 'Enviando...' : 'Enviar respuesta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
