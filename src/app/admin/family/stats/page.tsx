'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, BarChart3, Users, Baby } from 'lucide-react';
import {
  CASE_MODALITY_LABELS, VIOLENCE_TYPE_LABELS,
  MEASURE_STATUS_LABELS, PARTY_ROLE_LABELS,
} from '@/domain/catalogs/familyLabels';

interface Item { key: string; count: number; name?: string; color?: string | null }
interface Stats {
  totalCases: number;
  totalMinors: number;
  byModality: Item[];
  byState: Item[];
  byViolenceType: Item[];
  measuresByStatus: Item[];
  partiesByRole: Item[];
  workloadByUser: Item[];
}

const card: React.CSSProperties = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' };
const h2: React.CSSProperties = { fontSize: '1.05rem', marginTop: 0, marginBottom: '0.85rem' };

function BarList({ items, labelMap, color = '#2563eb' }: { items: Item[]; labelMap?: Record<string, string>; color?: string }) {
  if (!items || items.length === 0) return <p style={{ color: '#9ca3af', fontSize: '0.88rem', margin: 0 }}>Sin datos.</p>;
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      {items.map((i) => (
        <div key={i.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '180px', fontSize: '0.85rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {i.name ?? labelMap?.[i.key] ?? i.key}
          </div>
          <div style={{ flex: 1, background: '#f3f4f6', borderRadius: '6px', overflow: 'hidden', height: '22px', position: 'relative' }}>
            <div style={{ width: `${(i.count / max) * 100}%`, background: i.color ?? color, height: '100%', borderRadius: '6px', minWidth: '2px' }} />
          </div>
          <div style={{ width: '40px', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem' }}>{i.count}</div>
        </div>
      ))}
    </div>
  );
}

export default function FamilyStatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/v1/family/stats');
        if (res.ok) setStats(await res.json());
      } catch (e) {
        console.error('Error cargando estadísticas:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const exportCsv = () => {
    if (!stats) return;
    const rows: string[] = ['Categoria,Valor,Conteo'];
    const push = (cat: string, items: Item[], map?: Record<string, string>) =>
      items.forEach((i) => rows.push(`${cat},"${(i.name ?? map?.[i.key] ?? i.key).replace(/"/g, '""')}",${i.count}`));
    push('Modalidad', stats.byModality, CASE_MODALITY_LABELS);
    push('Estado', stats.byState);
    push('Tipo de violencia', stats.byViolenceType, VIOLENCE_TYPE_LABELS);
    push('Medidas por estado', stats.measuresByStatus, MEASURE_STATUS_LABELS);
    push('Partes por rol', stats.partiesByRole, PARTY_ROLE_LABELS);
    push('Carga por profesional', stats.workloadByUser);
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `estadisticas-familia-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      <button onClick={() => router.push('/admin/family')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Volver a casos
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontSize: '1.6rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart3 size={22} /> Estadísticas
        </h1>
        {stats && (
          <button onClick={exportCsv} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600 }}>
            <Download size={16} /> Exportar CSV
          </button>
        )}
      </div>

      {loading ? <p style={{ color: '#6b7280' }}>Cargando…</p> : !stats ? <p style={{ color: '#6b7280' }}>No se pudo cargar.</p> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ ...card, marginBottom: 0, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2563eb' }}>{stats.totalCases}</div>
              <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Casos de familia</div>
            </div>
            <div style={{ ...card, marginBottom: 0, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}><Baby size={24} /> {stats.totalMinors}</div>
              <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>NNA registrados</div>
            </div>
          </div>

          <div style={card}><h2 style={h2}>Casos por modalidad</h2><BarList items={stats.byModality} labelMap={CASE_MODALITY_LABELS} /></div>
          <div style={card}><h2 style={h2}>Casos por estado</h2><BarList items={stats.byState} /></div>
          <div style={card}><h2 style={h2}>Tipos de violencia (cruce)</h2><BarList items={stats.byViolenceType} labelMap={VIOLENCE_TYPE_LABELS} color="#dc2626" /></div>
          <div style={card}><h2 style={h2}>Medidas de protección por estado</h2><BarList items={stats.measuresByStatus} labelMap={MEASURE_STATUS_LABELS} color="#059669" /></div>
          <div style={card}><h2 style={h2}>Partes por rol</h2><BarList items={stats.partiesByRole} labelMap={PARTY_ROLE_LABELS} color="#1a5fb4" /></div>
          <div style={card}>
            <h2 style={{ ...h2, display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Users size={16} /> Carga por profesional</h2>
            <BarList items={stats.workloadByUser} color="#0891b2" />
          </div>
        </>
      )}
    </div>
  );
}
