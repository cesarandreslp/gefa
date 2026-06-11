/**
 * /admin/metrics — Indicadores de Gestión Institucional (MiPG)
 * Estilo inline (el proyecto no usa Tailwind). Acceso: ADMIN, SUPERVISOR.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import AdminPageHeader from '../AdminPageHeader';

interface InstitutionalMetrics {
  period: { from: string; to: string };
  sla: { totalCasesWithSLA: number; casesOnTime: number; casesWarning: number; casesOverdue: number; compliancePercentage: number };
  time: { averageResolutionDays: number; averageResolutionDaysByType: { caseTypeId: string; caseTypeName: string; averageDays: number }[] };
  distribution: { totalCases: number; activeOverdue: number; byType: { caseTypeId: string; caseTypeName: string; count: number }[]; byState: { stateId: string; stateName: string; count: number }[] };
  users: { activeByUser: { userId: string; userName: string; count: number }[]; closedByUser: { userId: string; userName: string; count: number }[] };
  quality: { totalReopened: number; reopenedPercentage: number; casesWithCompleteTraceability: number; traceabilityPercentage: number };
  trends: { month: string; filed: number; closed: number; overdue: number }[];
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' };
const sectionTitle: React.CSSProperties = { fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: '1.75rem 0 0.85rem' };
const input: React.CSSProperties = { padding: '0.6rem 0.7rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.88rem' };

function Stat({ label, value, color = '#0f172a', sub }: { label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <div style={{ ...card, padding: '1rem 1.1rem' }}>
      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: '1.7rem', fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function ListCard({ title, rows, valueColor = 'var(--color-primary, #2563eb)' }: { title: string; rows: { key: string; label: string; count: number }[]; valueColor?: string }) {
  return (
    <div style={card}>
      <h3 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#334155', margin: '0 0 0.75rem' }}>{title}</h3>
      {rows.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>No hay datos</p> : (
        <div style={{ display: 'grid', gap: '0.4rem' }}>
          {rows.map(r => (
            <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.86rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.35rem' }}>
              <span style={{ color: '#475569' }}>{r.label}</span>
              <span style={{ fontWeight: 700, color: valueColor }}>{r.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 };
const grid4: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 };

export default function MetricsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<InstitutionalMetrics | null>(null);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('from', new Date(fromDate).toISOString());
      if (toDate) params.append('to', new Date(toDate).toISOString());
      const res = await fetch(`/api/v1/metrics?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) { router.push('/login'); return; }
        throw new Error(`Error ${res.status}`);
      }
      const data = await res.json();
      setMetrics(data.data);
    } catch (err) {
      console.error('Error al cargar métricas:', err);
      setError('Error al cargar métricas. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = (e: React.FormEvent) => { e.preventDefault(); loadMetrics(); };
  const handleClearFilters = () => { setFromDate(''); setToDate(''); setTimeout(() => loadMetrics(), 100); };

  return (
    <div>
      <AdminPageHeader
        title="Indicadores de Gestión Institucional"
        subtitle="Panel de métricas MiPG (Modelo Integrado de Planeación y Gestión). Cálculos en el servidor para auditabilidad."
        icon={<BarChart3 size={24} />}
      />

      {/* Filtros */}
      <div style={{ ...card, marginBottom: '1.25rem' }}>
        <form onSubmit={handleFilter} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div><label style={{ display: 'block', fontSize: '0.8rem', color: '#374151', marginBottom: 5, fontWeight: 600 }}>Desde</label><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={input} /></div>
          <div><label style={{ display: 'block', fontSize: '0.8rem', color: '#374151', marginBottom: 5, fontWeight: 600 }}>Hasta</label><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={input} /></div>
          <button type="submit" disabled={loading} style={{ background: 'var(--color-primary, #2563eb)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem 1.1rem', fontWeight: 600, fontSize: '0.88rem', cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Cargando…' : 'Filtrar'}</button>
          <button type="button" onClick={handleClearFilters} disabled={loading} style={{ background: '#f1f5f9', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, padding: '0.6rem 1rem', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>Limpiar</button>
        </form>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1.25rem' }}>{error}</div>}

      {loading ? (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>Cargando métricas…</p>
      ) : metrics && (
        <div>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '0.7rem 1rem', fontSize: '0.85rem', color: '#1e40af' }}>
            <strong>Período analizado:</strong> {new Date(metrics.period.from).toLocaleDateString('es-CO')} – {new Date(metrics.period.to).toLocaleDateString('es-CO')}
          </div>

          <h2 style={sectionTitle}>1. Cumplimiento de términos (SLA)</h2>
          <div style={grid4}>
            <Stat label="Total expedientes" value={metrics.sla.totalCasesWithSLA} />
            <Stat label="A tiempo" value={metrics.sla.casesOnTime} color="#059669" />
            <Stat label="Advertencia" value={metrics.sla.casesWarning} color="#b45309" />
            <Stat label="Vencidos" value={metrics.sla.casesOverdue} color="#dc2626" />
          </div>
          <div style={{ ...card, marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div><div style={{ fontSize: '0.82rem', color: '#64748b' }}>% Cumplimiento (a tiempo + advertencia)</div><div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-primary, #2563eb)' }}>{metrics.sla.compliancePercentage.toFixed(2)}%</div></div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: 360 }}><strong>Interpretación:</strong> expedientes dentro del término legal o cerca de vencerse. Meta institucional: ≥ 90%.</div>
          </div>

          <h2 style={sectionTitle}>2. Tiempo promedio de atención</h2>
          <div style={card}>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Promedio general (casos cerrados)</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>{metrics.time.averageResolutionDays.toFixed(2)} días</div>
            {metrics.time.averageResolutionDaysByType.length > 0 && (
              <div style={{ marginTop: 14, display: 'grid', gap: '0.4rem' }}>
                {metrics.time.averageResolutionDaysByType.map(item => (
                  <div key={item.caseTypeId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.86rem' }}>
                    <span style={{ color: '#475569' }}>{item.caseTypeName}</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-primary, #2563eb)' }}>{item.averageDays.toFixed(2)} días</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <h2 style={sectionTitle}>3. Distribución de expedientes</h2>
          <div style={grid2}>
            <Stat label="Total en período" value={metrics.distribution.totalCases} />
            <Stat label="Activos vencidos (críticos)" value={metrics.distribution.activeOverdue} color="#dc2626" sub="Requieren atención inmediata" />
          </div>
          <div style={{ ...grid2, marginTop: 16 }}>
            <ListCard title="Por tipo de trámite" rows={metrics.distribution.byType.map(i => ({ key: i.caseTypeId, label: i.caseTypeName, count: i.count }))} valueColor="#0f172a" />
            <ListCard title="Por estado actual" rows={metrics.distribution.byState.map(i => ({ key: i.stateId, label: i.stateName, count: i.count }))} valueColor="#0f172a" />
          </div>

          <h2 style={sectionTitle}>4. Productividad por funcionario</h2>
          <div style={grid2}>
            <ListCard title="Casos activos asignados" rows={metrics.users.activeByUser.map(i => ({ key: i.userId, label: i.userName, count: i.count }))} />
            <ListCard title="Casos cerrados por funcionario" rows={metrics.users.closedByUser.map(i => ({ key: i.userId, label: i.userName, count: i.count }))} valueColor="#059669" />
          </div>

          <h2 style={sectionTitle}>5. Indicadores de calidad</h2>
          <div style={grid2}>
            <Stat label="Casos reabiertos" value={metrics.quality.totalReopened} color="#ea580c" sub={`${metrics.quality.reopenedPercentage.toFixed(2)}% del total · Meta < 5%`} />
            <Stat label="Trazabilidad completa" value={metrics.quality.casesWithCompleteTraceability} color="#059669" sub={`${metrics.quality.traceabilityPercentage.toFixed(2)}% del total · Meta 100%`} />
          </div>

          {metrics.trends.length > 0 && (
            <>
              <h2 style={sectionTitle}>6. Tendencia mensual</h2>
              <div style={{ ...card, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem' }}>Mes</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem' }}>Radicados</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem' }}>Cerrados</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem' }}>Vencidos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.trends.map(item => (
                      <tr key={item.month} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#0f172a' }}>{item.month}</td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--color-primary, #2563eb)', fontWeight: 700 }}>{item.filed}</td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#059669', fontWeight: 700 }}>{item.closed}</td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#dc2626', fontWeight: 700 }}>{item.overdue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
