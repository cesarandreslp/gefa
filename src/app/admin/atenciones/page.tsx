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
  estado: 'LIBRE' | 'OCUPADO';
  desde: string | null;
  caso: { id: string; filingNumber: string } | null;
  atencionId: string | null;
}

const PROFESION_LABEL: Record<string, string> = { PSICOLOGIA: 'Psicología', TRABAJO_SOCIAL: 'Trabajo Social', JURIDICA: 'Jurídico' };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' };
const input: React.CSSProperties = { padding: '0.6rem 0.7rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.9rem', boxSizing: 'border-box' };

export default function TableroAtencionesPage() {
  const router = useRouter();
  const [profs, setProfs] = useState<Prof[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDispatch, setIsDispatch] = useState(false);

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

  const asignar = async (prof: Prof) => {
    if (!caso) return;
    setAsignando(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/family/cases/${caso.id}/atenciones`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profesionalUserId: prof.id }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg({ type: 'err', text: d.error || 'No se pudo asignar el turno.' }); return; }
      setMsg({ type: 'ok', text: `Caso ${caso.filingNumber} asignado a ${prof.fullName}.` });
      setCaso(null); setRadicado('');
      load();
    } catch { setMsg({ type: 'err', text: 'Error de conexión.' }); } finally { setAsignando(false); }
  };

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
            <div style={{ marginTop: '0.6rem', fontSize: '0.82rem', color: '#64748b' }}>Asignar a un profesional libre:</div>
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
                        {p.caso.filingNumber}{p.desde ? ` · desde ${new Date(p.desde).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}` : ''}
                      </span>
                    )}
                    <span style={{ borderRadius: 999, padding: '0.25rem 0.7rem', fontSize: '0.78rem', fontWeight: 700, background: ocupado ? '#fff7ed' : '#f0fdf4', color: ocupado ? '#c2410c' : '#15803d', border: `1px solid ${ocupado ? '#fed7aa' : '#bbf7d0'}` }}>
                      {ocupado ? 'OCUPADO' : 'LIBRE'}
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
    </div>
  );
}
