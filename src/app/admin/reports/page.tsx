/**
 * /admin/reports — Reportes Institucionales
 * Generación y descarga de reportes oficiales. Estilo inline (el proyecto no usa
 * Tailwind). Acceso: ADMIN, SUPERVISOR, SECRETARIA_GOBIERNO.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Download, BarChart3 } from 'lucide-react';
import AdminPageHeader from '../AdminPageHeader';

interface Report {
  id: string;
  reportType: string;
  title: string;
  periodFrom: string;
  periodTo: string;
  generatedAt: string;
  downloadCount: number;
  generatedBy: { firstName: string; firstLastName: string; email: string; role: { name: string } };
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' };
const input: React.CSSProperties = { width: '100%', padding: '0.6rem 0.7rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.88rem', boxSizing: 'border-box' };
const label: React.CSSProperties = { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 5 };
const th: React.CSSProperties = { padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' };
const td: React.CSSProperties = { padding: '0.7rem 1rem', fontSize: '0.85rem', color: '#374151' };

const REPORT_TYPES = [
  { value: 'MONTHLY_MANAGEMENT', label: 'Gestión Mensual de Casos', help: 'Reporte ejecutivo de gestión mensual de expedientes' },
  { value: 'SLA_COMPLIANCE', label: 'Cumplimiento de Términos', help: 'Análisis de cumplimiento de términos legales' },
  { value: 'WORKLOAD', label: 'Carga Operativa por Funcionario', help: 'Distribución de carga entre funcionarios' },
  { value: 'QUALITY', label: 'Calidad y Trazabilidad', help: 'Indicadores de calidad y trazabilidad' },
  { value: 'HISTORICAL', label: 'Histórico Consolidado', help: 'Consolidado histórico con tendencias' },
];

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [reportType, setReportType] = useState('MONTHLY_MANAGEMENT');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');

  const loadReports = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/reports');
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) { router.push('/login'); return; }
        throw new Error(`Error ${res.status}`);
      }
      const data = await res.json();
      setReports(data.data);
    } catch (err) {
      console.error('Error al cargar reportes:', err);
      setError('Error al cargar reportes. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError('');
    setSuccessMessage('');
    try {
      if (!periodFrom || !periodTo) { setError('Seleccione el período del reporte'); setGenerating(false); return; }
      const from = new Date(periodFrom);
      const to = new Date(periodTo);
      if (from > to) { setError('La fecha de inicio no puede ser posterior a la fecha de fin'); setGenerating(false); return; }
      const res = await fetch('/api/v1/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType, periodFrom: from.toISOString(), periodTo: to.toISOString() }),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) { router.push('/login'); return; }
        const errorData = await res.json();
        throw new Error(errorData.error || `Error ${res.status}`);
      }
      const data = await res.json();
      setSuccessMessage(`Reporte generado exitosamente: ${data.data.title}`);
      await loadReports();
      setPeriodFrom(''); setPeriodTo('');
    } catch (err) {
      console.error('Error al generar reporte:', err);
      setError(err instanceof Error ? err.message : 'Error al generar reporte');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (reportId: string, reportTitle: string) => {
    try {
      const res = await fetch(`/api/v1/reports/download/${reportId}?format=csv`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      await loadReports();
    } catch (err) {
      console.error('Error al descargar reporte:', err);
      setError('Error al descargar reporte. Intente nuevamente.');
    }
  };

  const help = REPORT_TYPES.find(r => r.value === reportType)?.help;

  return (
    <div>
      <AdminPageHeader
        title="Reportes Institucionales"
        subtitle="Generación y descarga de reportes oficiales agregados para control interno y dirección."
        icon={<FileText size={24} />}
      />

      {/* Generar */}
      <div style={{ ...card, marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.05rem', margin: '0 0 1rem', color: '#1e293b' }}>Generar nuevo reporte</h2>
        <form onSubmit={handleGenerate}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={label}>Tipo de reporte</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)} style={input} required>
              {REPORT_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {help && <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>{help}</p>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: '1rem' }}>
            <div><label style={label}>Desde</label><input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} style={input} required /></div>
            <div><label style={label}>Hasta</label><input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} style={input} required /></div>
          </div>
          <button type="submit" disabled={generating}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: generating ? '#9ca3af' : 'var(--color-primary, #2563eb)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem 1.25rem', fontWeight: 600, fontSize: '0.9rem', cursor: generating ? 'wait' : 'pointer' }}>
            <BarChart3 size={17} /> {generating ? 'Generando…' : 'Generar reporte'}
          </button>

          {error && <div style={{ marginTop: '1rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.88rem' }}>{error}</div>}
          {successMessage && <div style={{ marginTop: '1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.88rem' }}>{successMessage}</div>}
        </form>
      </div>

      {/* Nota */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e40af', margin: '0 0 0.5rem' }}>Sobre los reportes institucionales</h3>
        <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#1e3a8a', fontSize: '0.83rem', lineHeight: 1.7 }}>
          <li>Documentos oficiales con valor probatorio, con hash SHA-256 de integridad.</li>
          <li>Generación y descarga quedan registradas en auditoría.</li>
          <li>Datos agregados/estadísticos; sin información de casos individuales.</li>
          <li>Cumplen la Ley 1712/2014 (Transparencia y Acceso a la Información).</li>
        </ul>
      </div>

      {/* Lista */}
      <div style={card}>
        <h2 style={{ fontSize: '1.05rem', margin: '0 0 1rem', color: '#1e293b' }}>Reportes generados</h2>
        {loading ? (
          <p style={{ color: '#94a3b8', padding: '1.5rem 0', textAlign: 'center' }}>Cargando…</p>
        ) : reports.length === 0 ? (
          <p style={{ color: '#94a3b8', padding: '2rem 0', textAlign: 'center' }}>No hay reportes generados aún.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={th}>Reporte</th><th style={th}>Período</th><th style={th}>Generado</th><th style={th}>Por</th><th style={th}>Descargas</th><th style={th}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={td}><div style={{ fontWeight: 600, color: '#0f172a' }}>{r.title}</div><div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{r.reportType}</div></td>
                    <td style={td}>{new Date(r.periodFrom).toLocaleDateString('es-CO')} – {new Date(r.periodTo).toLocaleDateString('es-CO')}</td>
                    <td style={td}>{new Date(r.generatedAt).toLocaleString('es-CO')}</td>
                    <td style={td}>{r.generatedBy.firstName} {r.generatedBy.firstLastName}<div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{r.generatedBy.role.name}</div></td>
                    <td style={{ ...td, textAlign: 'center' }}>{r.downloadCount}</td>
                    <td style={td}>
                      <button onClick={() => handleDownload(r.id, r.title)} aria-label={`Descargar reporte ${r.title}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--color-primary, #2563eb)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                        <Download size={15} /> CSV
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
