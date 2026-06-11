/**
 * /admin/atenciones — Tablero de disponibilidad del equipo (RF‑09/10/15).
 * La recepción ve LIBRE/OCUPADO en vivo (polling) y asigna el siguiente usuario,
 * buscando su caso por radicado, al primer profesional libre del orden lógico.
 * Estilo inline (el proyecto no usa Tailwind).
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Search, RefreshCw, UserCheck } from 'lucide-react';
import AdminPageHeader from '../AdminPageHeader';

interface Prof {
  id: string;
  fullName: string;
  profesion: string | null;
  comisaria: { id: string; code: string; name: string } | null;
  estado: 'LIBRE' | 'OCUPADO' | 'NO_DISPONIBLE' | 'FUERA_HORARIO';
  desde: string | null;
  caso: { id: string; filingNumber: string } | null;
  atencionId: string | null;
  numeroTurno?: number | null;
  noDisponibleMotivo?: string | null;
  noDisponibleHasta?: string | null;
}

const PROFESION_LABEL: Record<string, string> = { PSICOLOGIA: 'Psicología', TRABAJO_SOCIAL: 'Trabajo Social', JURIDICA: 'Jurídico' };
const ESTADO_CFG: Record<string, { label: string; bg: string; fg: string; bd: string }> = {
  LIBRE: { label: 'LIBRE', bg: '#f0fdf4', fg: '#15803d', bd: '#bbf7d0' },
  OCUPADO: { label: 'OCUPADO', bg: '#fff7ed', fg: '#c2410c', bd: '#fed7aa' },
  NO_DISPONIBLE: { label: 'NO DISPONIBLE', bg: '#fef2f2', fg: '#991b1b', bd: '#fecaca' },
  FUERA_HORARIO: { label: 'FUERA DE HORARIO', bg: '#f1f5f9', fg: '#475569', bd: '#e2e8f0' },
};
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' };
const input: React.CSSProperties = { padding: '0.6rem 0.7rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.9rem', boxSizing: 'border-box' };

export default function TableroAtencionesPage() {
  const router = useRouter();
  const [profs, setProfs] = useState<Prof[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDispatch, setIsDispatch] = useState(false);
  const [roleCode, setRoleCode] = useState('');

  // Asignación
  const [radicado, setRadicado] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [caso, setCaso] = useState<{ id: string; filingNumber: string; subject: string } | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [asignando, setAsignando] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/family/atenciones/tablero');
      if (res.ok) setProfs((await res.json()).data ?? []);
    } catch { /* polling best-effort */ } finally { setLoading(false); }
  }, []);

  // Polling cada 5 s (RF‑11): sin websockets.
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    load();
    const t = setInterval(() => loadRef.current(), 5000);
    return () => clearInterval(t);
  }, [load]);

  // Solo recepción/dirección asignan turnos.
  useEffect(() => {
    fetch('/api/v1/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const code = d?.data?.user?.role?.code ?? '';
        setRoleCode(code);
        setIsDispatch(['ADMIN', 'DIRECTOR', 'VENTANILLA_UNICA', 'AUXILIAR_ATENCION_USUARIO'].includes(code));
      })
      .catch(() => {});
  }, []);

  const buscarCaso = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setCaso(null);
    const q = radicado.trim();
    if (!q) return;
    setBuscando(true);
    try {
      const res = await fetch(`/api/v1/family/cases?search=${encodeURIComponent(q)}&limit=5`);
      const data = res.ok ? (await res.json()).data ?? [] : [];
      const match = data.find((c: { filingNumber: string }) => c.filingNumber.toLowerCase() === q.toLowerCase()) ?? data[0];
      if (!match) { setMsg({ type: 'err', text: 'No se encontró un caso con ese radicado.' }); return; }
      setCaso({ id: match.id, filingNumber: match.filingNumber, subject: match.subject });
    } catch { setMsg({ type: 'err', text: 'Error al buscar el caso.' }); } finally { setBuscando(false); }
  };

  const PROFESION_LBL = (p?: string | null) => PROFESION_LABEL[p ?? ''] ?? p ?? '';

  // Asignación: con `body` { auto:true } el sistema elige por el ciclo rotativo;
  // con { profesionalUserId } se asigna manualmente al profesional elegido.
  const asignarCore = async (body: Record<string, unknown>, etiqueta?: string) => {
    if (!caso) return;
    setAsignando(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/family/cases/${caso.id}/atenciones`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) { setMsg({ type: 'err', text: d.error || 'No se pudo asignar el turno.' }); return; }
      const turno = d.numeroTurno ? `Turno ${String(d.numeroTurno).padStart(2, '0')} · ` : '';
      const quien = etiqueta ?? `${d.profesional?.fullName ?? ''} (${PROFESION_LBL(d.profesion)})`;
      setMsg({ type: 'ok', text: `${turno}${caso.filingNumber} asignado automáticamente a ${quien}.` });
      setCaso(null); setRadicado('');
      load();
    } catch { setMsg({ type: 'err', text: 'Error de conexión.' }); } finally { setAsignando(false); }
  };

  const asignarAuto = () => asignarCore({ auto: true });
  const asignar = (prof: Prof) => asignarCore({ profesionalUserId: prof.id }, `${prof.fullName} (${PROFESION_LBL(prof.profesion)})`);

  const libres = profs.filter((p) => p.estado === 'LIBRE');

  return (
    <div>
      <AdminPageHeader
        title="Atención — Tablero del equipo"
        subtitle="Disponibilidad en vivo del equipo interdisciplinario. Asigne el siguiente usuario al primer profesional libre."
        icon={<Users size={24} />}
        actions={<button onClick={load} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, padding: '0.55rem 0.9rem', fontSize: '0.85rem', fontWeight: 600, color: '#374151', cursor: 'pointer' }}><RefreshCw size={15} /> Actualizar</button>}
      />

      {/* Asignar turno (solo recepción/dirección) */}
      {isDispatch && (
      <div style={{ ...card, marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1rem', margin: '0 0 0.8rem', color: '#1e293b' }}>Asignar turno</h2>
        <form onSubmit={buscarCaso} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={radicado} onChange={(e) => setRadicado(e.target.value)} placeholder="Número de radicado del caso" style={{ ...input, flex: '1 1 240px' }} />
          <button type="submit" disabled={buscando} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--color-primary, #2563eb)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem 1.1rem', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
            <Search size={16} /> {buscando ? 'Buscando…' : 'Buscar caso'}
          </button>
        </form>

        {msg && (
          <div style={{ marginTop: '0.8rem', borderRadius: 8, padding: '0.6rem 0.85rem', fontSize: '0.85rem', background: msg.type === 'ok' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.type === 'ok' ? '#bbf7d0' : '#fecaca'}`, color: msg.type === 'ok' ? '#166534' : '#991b1b' }}>{msg.text}</div>
        )}

        {caso && (
          <div style={{ marginTop: '0.9rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.85rem 1rem' }}>
            <div style={{ fontSize: '0.88rem', color: '#0f172a' }}><b style={{ fontFamily: 'monospace' }}>{caso.filingNumber}</b> · {caso.subject}</div>

            <div style={{ marginTop: '0.7rem' }}>
              <button onClick={asignarAuto} disabled={asignando}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--color-primary, #2563eb)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 1.1rem', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                <UserCheck size={16} /> {asignando ? 'Asignando…' : 'Asignar automáticamente'}
              </button>
              <span style={{ marginLeft: 10, fontSize: '0.78rem', color: '#64748b' }}>Sigue el ciclo rotativo (psicología → trabajo social → jurídico) y le da un número de turno.</span>
            </div>

            <div style={{ marginTop: '0.8rem', fontSize: '0.82rem', color: '#64748b' }}>O elija manualmente un profesional libre:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: '0.5rem' }}>
              {libres.length === 0 ? (
                <span style={{ fontSize: '0.85rem', color: '#b45309' }}>No hay profesionales libres en este momento.</span>
              ) : libres.map((p) => (
                <button key={p.id} onClick={() => asignar(p)} disabled={asignando}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #16a34a', color: '#15803d', borderRadius: 8, padding: '0.45rem 0.8rem', fontWeight: 600, fontSize: '0.84rem', cursor: 'pointer' }}>
                  <UserCheck size={15} /> {p.fullName} · {PROFESION_LABEL[p.profesion ?? ''] ?? p.profesion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Tablero */}
      <div style={card}>
        <h2 style={{ fontSize: '1rem', margin: '0 0 0.8rem', color: '#1e293b' }}>Disponibilidad del equipo</h2>
        {loading ? (
          <p style={{ color: '#94a3b8' }}>Cargando…</p>
        ) : profs.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No hay profesionales con profesión asignada. Defínala en Equipo → editar usuario.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {profs.map((p) => {
              const ocupado = p.estado === 'OCUPADO';
              const cfg = ESTADO_CFG[p.estado] ?? ESTADO_CFG.LIBRE;
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, border: '1px solid #f1f5f9', borderRadius: 10, padding: '0.7rem 0.9rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.fullName}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {PROFESION_LABEL[p.profesion ?? ''] ?? p.profesion}{p.comisaria ? ` · ${p.comisaria.code}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {ocupado && p.caso && (
                      <span style={{ fontSize: '0.78rem', color: '#9a3412' }}>
                        {p.numeroTurno ? <b>Turno {String(p.numeroTurno).padStart(2, '0')} · </b> : ''}{p.caso.filingNumber}{p.desde ? ` · desde ${new Date(p.desde).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}` : ''}
                      </span>
                    )}
                    {p.estado === 'NO_DISPONIBLE' && p.noDisponibleMotivo && (
                      <span title={p.noDisponibleMotivo} style={{ fontSize: '0.78rem', color: '#991b1b', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.noDisponibleMotivo}</span>
                    )}
                    <span style={{ borderRadius: 999, padding: '0.25rem 0.7rem', fontSize: '0.78rem', fontWeight: 700, background: cfg.bg, color: cfg.fg, border: `1px solid ${cfg.bd}` }}>
                      {cfg.label}
                    </span>
                    {ocupado && p.atencionId && (
                      <button onClick={() => router.push(`/admin/atenciones/${p.atencionId}`)} style={{ background: 'none', border: 'none', color: 'var(--color-primary, #2563eb)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>Abrir turno →</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(roleCode === 'FUNCIONARIO' || ['ADMIN', 'DIRECTOR'].includes(roleCode)) && (
        <IndisponibilidadPanel roleCode={roleCode} />
      )}
    </div>
  );
}

// ── Indisponibilidad (RF‑18/19): solicitar (profesional) / autorizar (comisario) ──
interface IndisRow { id: string; motivo: string; desde: string; hasta: string; estado: string; profesionalNombre?: string }

function IndisponibilidadPanel({ roleCode }: { roleCode: string }) {
  const esComisario = ['ADMIN', 'DIRECTOR'].includes(roleCode);
  const [list, setList] = useState<IndisRow[]>([]);
  const [motivo, setMotivo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/family/indisponibilidades${esComisario ? '?estado=PENDIENTE' : ''}`);
      if (res.ok) setList((await res.json()).data ?? []);
    } catch { /* noop */ }
  }, [esComisario]);
  useEffect(() => { load(); }, [load]);

  const solicitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/v1/family/indisponibilidades', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo, desde, hasta }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg({ type: 'err', text: d.error || 'No se pudo enviar.' }); return; }
      setMsg({ type: 'ok', text: 'Solicitud enviada. Queda pendiente de autorización del comisario.' });
      setMotivo(''); setDesde(''); setHasta(''); load();
    } catch { setMsg({ type: 'err', text: 'Error de conexión.' }); } finally { setBusy(false); }
  };

  const resolver = async (id: string, autorizar: boolean) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/family/indisponibilidades/${id}/resolver`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autorizar }),
      });
      if (res.ok) load();
    } catch { /* noop */ } finally { setBusy(false); }
  };

  const fmt = (s: string) => new Date(s).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  const ESTADO_LBL: Record<string, { t: string; c: string }> = {
    PENDIENTE: { t: 'Pendiente', c: '#b45309' }, AUTORIZADA: { t: 'Autorizada', c: '#15803d' }, RECHAZADA: { t: 'Rechazada', c: '#991b1b' },
  };

  return (
    <div style={{ ...card, marginTop: '1.25rem' }}>
      <h2 style={{ fontSize: '1rem', margin: '0 0 0.8rem', color: '#1e293b' }}>
        {esComisario ? 'Solicitudes de indisponibilidad (pendientes)' : 'Indisponibilidad'}
      </h2>

      {!esComisario && (
        <form onSubmit={solicitar} style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 0.6rem' }}>
            Dentro de la jornada la disponibilidad es automática. Para ausentarse (audiencia, permiso…) solicite autorización del comisario.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <div><label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Desde</label><input type="datetime-local" value={desde} onChange={(e) => setDesde(e.target.value)} required style={{ ...input, width: '100%' }} /></div>
            <div><label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Hasta</label><input type="datetime-local" value={hasta} onChange={(e) => setHasta(e.target.value)} required style={{ ...input, width: '100%' }} /></div>
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Motivo</label>
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} required placeholder="Ej: audiencia programada, permiso médico…" style={{ ...input, width: '100%' }} />
          </div>
          <button type="submit" disabled={busy} style={{ marginTop: 10, background: 'var(--color-primary, #2563eb)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 1.1rem', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Enviar solicitud</button>
          {msg && <div style={{ marginTop: 10, fontSize: '0.84rem', color: msg.type === 'ok' ? '#166534' : '#991b1b' }}>{msg.text}</div>}
        </form>
      )}

      {list.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>{esComisario ? 'No hay solicitudes pendientes.' : 'No tiene solicitudes registradas.'}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((i) => (
            <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, border: '1px solid #f1f5f9', borderRadius: 8, padding: '0.6rem 0.85rem' }}>
              <div style={{ fontSize: '0.84rem', color: '#374151' }}>
                {esComisario && <b>{i.profesionalNombre} · </b>}{i.motivo}
                <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{fmt(i.desde)} → {fmt(i.hasta)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {esComisario && i.estado === 'PENDIENTE' ? (
                  <>
                    <button onClick={() => resolver(i.id, true)} disabled={busy} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 7, padding: '0.35rem 0.75rem', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Autorizar</button>
                    <button onClick={() => resolver(i.id, false)} disabled={busy} style={{ background: '#fff', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 7, padding: '0.35rem 0.75rem', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Rechazar</button>
                  </>
                ) : (
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: (ESTADO_LBL[i.estado] ?? ESTADO_LBL.PENDIENTE).c }}>{(ESTADO_LBL[i.estado] ?? ESTADO_LBL.PENDIENTE).t}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
