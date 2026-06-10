'use client';

import { useEffect, useState } from 'react';
import { Building2, Users, ShieldCheck, Loader2, BarChart3 } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

const MODALITY_LABELS: Record<string, string> = {
  VIOLENCIA_INTRAFAMILIAR: 'Violencia intrafamiliar',
  CONFLICTO_FAMILIAR: 'Conflicto familiar',
  CUSTODIA_ALIMENTOS_VISITAS: 'Custodia, alimentos y visitas',
  MEDIDA_PROTECCION_NNA: 'Protección de NNA',
  PARD: 'Restablecimiento (PARD)',
  CONCILIACION_FAMILIAR: 'Conciliación familiar',
  ORIENTACION_JURIDICA: 'Orientación jurídica',
  'Sin clasificar': 'Sin clasificar',
};
const MEASURE_LABELS: Record<string, string> = {
  VIGENTE: 'Vigentes', CUMPLIDA: 'Cumplidas', INCUMPLIDA: 'Incumplidas', VENCIDA: 'Vencidas', REVOCADA: 'Revocadas',
};

interface KV { key: string; count: number }
interface ComStats {
  id: string; code: string; name: string; isMobile: boolean; isActive: boolean;
  totalCasos: number; byState: KV[]; byModality: KV[];
  demandanteSexo: KV[]; demandadoSexo: KV[]; medidas: KV[];
}

const sum = (a: KV[]) => a.reduce((s, x) => s + x.count, 0);
const find = (a: KV[], k: string) => a.find((x) => x.key === k)?.count ?? 0;

function KVList({ rows, labels }: { rows: KV[]; labels?: Record<string, string> }) {
  if (!rows.length) return <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: 0 }}>—</p>;
  return (
    <div style={{ display: 'grid', gap: '0.25rem' }}>
      {rows.map((r) => (
        <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
          <span style={{ color: '#475569' }}>{labels?.[r.key] ?? r.key}</span>
          <b style={{ color: '#1e293b' }}>{r.count}</b>
        </div>
      ))}
    </div>
  );
}

export default function SeguimientoPage() {
  const [data, setData] = useState<{ municipio: ComStats; porComisaria: ComStats[]; sinAsignar: ComStats | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/v1/family/seguimiento');
        if (r.ok) setData(await r.json());
      } catch { /* noop */ } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <p style={{ color: '#64748b', display: 'flex', gap: 8, alignItems: 'center' }}><Loader2 className="spin" size={18} /> Cargando seguimiento…</p>;
  if (!data) return <p style={{ color: '#64748b' }}>No se pudo cargar el seguimiento.</p>;

  const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.1rem 1.25rem' };
  const subt: React.CSSProperties = { fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b', fontWeight: 700, margin: '0.6rem 0 0.3rem' };

  return (
    <main style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ margin: 0, fontSize: '1.6rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
        <BarChart3 size={26} color="var(--color-primary, #003d7a)" /> Seguimiento de comisarías
      </h1>
      <p style={{ margin: '0.2rem 0 1.25rem', color: '#64748b' }}>
        Comportamiento estadístico de cada comisaría del municipio. Datos agregados — sin acceso a expedientes.
      </p>

      {/* Resumen del municipio */}
      <div style={{ ...card, marginBottom: '1.25rem', background: '#f8fafc' }}>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center' }}>
          <div><div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#003d7a' }}>{data.municipio.totalCasos}</div><div style={{ fontSize: '0.8rem', color: '#64748b' }}>Casos del municipio</div></div>
          <div><div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1a5fb4' }}>{data.porComisaria.length}</div><div style={{ fontSize: '0.8rem', color: '#64748b' }}>Comisarías</div></div>
          <div><div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669' }}>{find(data.municipio.medidas, 'VIGENTE')}</div><div style={{ fontSize: '0.8rem', color: '#64748b' }}>Medidas vigentes</div></div>
        </div>
      </div>

      {/* Una tarjeta por comisaría */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {data.porComisaria.map((c) => (
          <div key={c.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={17} color="#1a5fb4" /> {c.name}
                </h2>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{c.code}{c.isMobile ? ' · móvil' : ''}{!c.isActive ? ' · inactiva' : ''}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#003d7a', lineHeight: 1 }}>{c.totalCasos}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>casos</div>
              </div>
            </div>

            <p style={subt}>Por estado</p>
            <KVList rows={c.byState} />
            <p style={subt}>Por tipo de situación</p>
            <KVList rows={c.byModality} labels={MODALITY_LABELS} />

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 130 }}>
                <p style={{ ...subt, display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} /> Sexo demandante</p>
                <KVList rows={c.demandanteSexo} />
              </div>
              <div style={{ flex: 1, minWidth: 130 }}>
                <p style={{ ...subt, display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} /> Sexo demandado</p>
                <KVList rows={c.demandadoSexo} />
              </div>
            </div>

            <p style={{ ...subt, display: 'flex', alignItems: 'center', gap: 4 }}><ShieldCheck size={12} /> Medidas / cumplimiento</p>
            <KVList rows={c.medidas} labels={MEASURE_LABELS} />
          </div>
        ))}
      </div>

      {data.sinAsignar && (
        <p style={{ marginTop: 16, color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '0.6rem 0.85rem', fontSize: '0.85rem' }}>
          {data.sinAsignar.totalCasos} caso(s) aún sin comisaría asignada.
        </p>
      )}
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );
}
