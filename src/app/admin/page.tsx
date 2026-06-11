'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Folder, Baby, ShieldCheck, AlertTriangle, Plus, Calendar, Clock,
  Loader2, ArrowRight,
} from 'lucide-react';

interface StateRow { stateId: string; code: string; name: string; color: string; count: number }
interface KV { key: string; count: number }
interface Stats {
  totalCases: number;
  totalMinors: number;
  byState: StateRow[];
  byModality: KV[];
  measuresByStatus: KV[];
  byProfessional: KV[];
}
interface Vencimientos {
  counts: { measuresOverdue: number; measuresUpcoming: number; pardOverdue: number };
}

const MODALITY_LABELS: Record<string, string> = {
  VIOLENCIA_INTRAFAMILIAR: 'Violencia intrafamiliar',
  CONFLICTO_FAMILIAR: 'Conflicto familiar',
  CUSTODIA_ALIMENTOS_VISITAS: 'Custodia, alimentos y visitas',
  MEDIDA_PROTECCION_NNA: 'Protección de NNA',
  PARD: 'Restablecimiento de derechos (PARD)',
  CONCILIACION_FAMILIAR: 'Conciliación familiar',
  ORIENTACION_JURIDICA: 'Orientación jurídica',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [venc, setVenc] = useState<Vencimientos | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>('');

  // El ADMIN no radica casos: el Tablero omite esa acción para ese rol.
  const isAdmin = role === 'ADMIN';

  useEffect(() => {
    (async () => {
      try {
        const [s, v, me] = await Promise.all([
          fetch('/api/v1/family/stats').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/v1/family/vencimientos').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/v1/auth/me', { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)),
        ]);
        setStats(s);
        setVenc(v);
        setRole(me?.data?.user?.role?.code ?? '');
      } catch { /* noop */ } finally { setLoading(false); }
    })();
  }, []);

  const vigentes = stats?.measuresByStatus.find((m) => m.key === 'VIGENTE')?.count ?? 0;
  const alertas = venc ? venc.counts.measuresOverdue + venc.counts.measuresUpcoming + venc.counts.pardOverdue : 0;
  const maxState = Math.max(1, ...(stats?.byState.map((s) => s.count) ?? [1]));

  const KPIS = [
    { label: 'Casos de familia', value: stats?.totalCases ?? 0, icon: Folder, color: '#1a5fb4' },
    { label: 'NNA involucrados', value: stats?.totalMinors ?? 0, icon: Baby, color: '#b45309' },
    { label: 'Medidas vigentes', value: vigentes, icon: ShieldCheck, color: '#059669' },
    { label: 'Alertas de vencimiento', value: alertas, icon: AlertTriangle, color: alertas > 0 ? '#dc2626' : '#6b7280' },
  ];

  return (
    <main id="main-content" style={{ padding: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', color: '#1e293b' }}>Tablero de la comisaría</h1>
          <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.95rem' }}>Resumen de la operación de casos de familia.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!isAdmin && <Link href="/admin/family/nuevo" style={btnPrimary}><Plus size={16} /> Radicar caso</Link>}
          <Link href="/admin/family/agenda" style={btnGhost}><Calendar size={16} /> Agenda</Link>
          <Link href="/admin/family/vencimientos" style={btnGhost}><Clock size={16} /> Vencimientos</Link>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8', display: 'flex', gap: 8, alignItems: 'center' }}><Loader2 size={18} className="spin" /> Cargando…</p>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: '1.5rem' }}>
            {KPIS.map((k) => (
              <div key={k.label} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ background: `${k.color}1a`, color: k.color, borderRadius: 10, padding: 9, display: 'flex' }}><k.icon size={22} /></span>
                  <div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{k.value}</div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{k.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {/* Casos por estado */}
            <div style={card}>
              <h2 style={h2}>Casos por estado</h2>
              {!stats?.byState.length ? <p style={empty}>Sin casos.</p> : (
                <div style={{ display: 'grid', gap: '0.6rem' }}>
                  {stats.byState.map((s) => (
                    <div key={s.stateId}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 2 }}>
                        <span style={{ color: '#334155' }}>{s.name}</span>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{s.count}</span>
                      </div>
                      <div style={{ height: 8, background: '#f1f5f9', borderRadius: 999 }}>
                        <div style={{ height: 8, width: `${(s.count / maxState) * 100}%`, background: s.color || '#1a5fb4', borderRadius: 999 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Por tipo de situación */}
            <div style={card}>
              <h2 style={h2}>Por tipo de situación</h2>
              {!stats?.byModality.length ? <p style={empty}>Sin datos.</p> : (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {stats.byModality.map((m) => (
                    <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem' }}>
                      <span style={{ color: '#334155' }}>{MODALITY_LABELS[m.key] ?? m.key ?? 'Sin clasificar'}</span>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{m.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Alertas */}
          {venc && alertas > 0 && (
            <div style={{ ...card, marginTop: 16, borderColor: '#fecaca', background: '#fef2f2' }}>
              <h2 style={{ ...h2, color: '#b91c1c' }}><AlertTriangle size={18} style={{ verticalAlign: '-3px', marginRight: 6 }} />Requiere atención</h2>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: '0.9rem', color: '#7f1d1d' }}>
                <span><strong>{venc.counts.measuresOverdue}</strong> medida(s) vencida(s)</span>
                <span><strong>{venc.counts.measuresUpcoming}</strong> medida(s) por vencer</span>
                <span><strong>{venc.counts.pardOverdue}</strong> PARD con término atrasado</span>
              </div>
              <Link href="/admin/family/vencimientos" style={{ ...btnGhost, marginTop: 12, display: 'inline-flex' }}>Ver vencimientos <ArrowRight size={15} /></Link>
            </div>
          )}
        </>
      )}
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.1rem 1.25rem' };
const h2: React.CSSProperties = { fontSize: '1rem', margin: '0 0 0.85rem', color: '#1e293b' };
const empty: React.CSSProperties = { color: '#94a3b8', fontSize: '0.88rem', margin: 0 };
const btnPrimary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1a5fb4', color: '#fff', textDecoration: 'none', padding: '0.5rem 0.9rem', borderRadius: 8, fontSize: '0.88rem', fontWeight: 600 };
const btnGhost: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: '#334155', textDecoration: 'none', padding: '0.5rem 0.9rem', borderRadius: 8, fontSize: '0.88rem', fontWeight: 600, border: '1px solid #cbd5e1' };
