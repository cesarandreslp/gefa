/**
 * /admin/system — Estado del Sistema
 * Panel de monitoreo y salud del sistema. Estilo inline (el proyecto no usa
 * Tailwind). Acceso: ADMIN.
 */

'use client';

import { useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import AdminPageHeader from '../AdminPageHeader';

interface SystemStatus {
  database: {
    connected: boolean;
    status: string;
    latency: number;
  };
  queue: {
    notifications: {
      status: string;
      pending: number;
      failed: number;
      lastProcessed: string | null;
    };
  };
  storage: {
    documentsCount: number;
    totalSizeMB: number;
    averageSizeMB: number;
  };
  system: {
    uptime: number;
    uptimeFormatted: string;
    version: string;
    environment: string;
    degradedMode: boolean;
  };
}

interface SystemMetrics {
  system: {
    nodeVersion: string;
    environment: string;
    uptime: number;
    version: string;
  };
  database: {
    totalCases: number;
    totalUsers: number;
    totalNotifications: number;
  };
  operations: {
    casesCreatedToday: number;
    casesClosedToday: number;
    notificationsSentToday: number;
    pendingNotifications: number;
    averageResponseTime: number;
  };
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.5rem' };
const sectionTitle: React.CSSProperties = { fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '0 0 1rem' };
const muted: React.CSSProperties = { color: '#64748b', fontSize: '0.78rem', margin: 0 };
const value: React.CSSProperties = { fontWeight: 600, color: '#0f172a', margin: '0.15rem 0 0' };

function statusColor(statusValue: string): React.CSSProperties {
  switch (statusValue) {
    case 'healthy':
      return { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' };
    case 'degraded':
      return { background: '#fefce8', color: '#854d0e', border: '1px solid #fef08a' };
    case 'down':
      return { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' };
    default:
      return { background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' };
  }
}

function statusIcon(statusValue: string) {
  switch (statusValue) {
    case 'healthy':
      return '🟢';
    case 'degraded':
      return '🟡';
    case 'down':
      return '🔴';
    default:
      return '⚪';
  }
}

export default function SystemPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadSystemInfo = async () => {
    try {
      setLoading(true);
      setError('');

      const [statusRes, metricsRes] = await Promise.all([
        fetch('/api/v1/system/status'),
        fetch('/api/v1/system/metrics'),
      ]);

      if (!statusRes.ok || !metricsRes.ok) {
        throw new Error('Error al cargar información del sistema');
      }

      const statusData = await statusRes.json();
      const metricsData = await metricsRes.json();

      if (statusData.success) setStatus(statusData.data);
      if (metricsData.success) setMetrics(metricsData.data);
    } catch (err) {
      console.error('Error cargando información del sistema:', err);
      setError('Error al cargar información del sistema');
    } finally {
      setLoading(false);
    }
  };

  const metricCards: { label: string; val: number; bg: string; bd: string; fg: string }[] = metrics
    ? [
        { label: 'Casos Radicados Hoy', val: metrics.operations.casesCreatedToday, bg: '#eff6ff', bd: '#bfdbfe', fg: '#1d4ed8' },
        { label: 'Casos Cerrados Hoy', val: metrics.operations.casesClosedToday, bg: '#f0fdf4', bd: '#bbf7d0', fg: '#15803d' },
        { label: 'Notificaciones Enviadas', val: metrics.operations.notificationsSentToday, bg: '#ecfeff', bd: '#a5f3fc', fg: '#0e7490' },
        { label: 'Notificaciones Pendientes', val: metrics.operations.pendingNotifications, bg: '#fff7ed', bd: '#fed7aa', fg: '#c2410c' },
      ]
    : [];

  return (
    <div>
      <AdminPageHeader
        title="Estado del Sistema"
        subtitle="Monitoreo de servicios, almacenamiento y métricas operativas del día."
        icon={<Activity size={24} />}
        actions={
          <button
            onClick={loadSystemInfo}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: loading ? '#9ca3af' : 'var(--color-primary, #2563eb)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.65rem 1.1rem', fontWeight: 600, fontSize: '0.9rem', cursor: loading ? 'wait' : 'pointer' }}
          >
            <RefreshCw size={16} /> {loading ? 'Cargando…' : 'Actualizar estado'}
          </button>
        }
      />

      {error && (
        <div style={{ marginBottom: '1.5rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.88rem' }}>
          {error}
        </div>
      )}

      {!status && !metrics && !loading && (
        <div style={{ ...card, textAlign: 'center', color: '#94a3b8' }}>
          <p style={{ margin: 0 }}>Haga clic en «Actualizar estado» para cargar la información.</p>
        </div>
      )}

      {status && (
        <div style={{ ...card, marginBottom: '1.5rem' }}>
          <h2 style={sectionTitle}>Estado de servicios</h2>

          {status.system.degradedMode && (
            <div style={{ marginBottom: '1rem', background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', padding: '0.7rem 1rem', borderRadius: 8, fontSize: '0.85rem' }}>
              ⚠️ Sistema en modo degradado (solo lectura)
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div style={{ padding: '1rem', borderRadius: 10, ...statusColor(status.database.status) }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>Base de Datos</span>
                <span style={{ fontSize: '1.4rem' }}>{statusIcon(status.database.status)}</span>
              </div>
              <div style={{ fontSize: '0.82rem', lineHeight: 1.6 }}>
                <p style={{ margin: 0 }}>Estado: {status.database.connected ? 'Conectada' : 'Desconectada'}</p>
                <p style={{ margin: 0 }}>Latencia: {status.database.latency}ms</p>
              </div>
            </div>

            <div style={{ padding: '1rem', borderRadius: 10, ...statusColor(status.queue.notifications.status) }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>Cola de Notificaciones</span>
                <span style={{ fontSize: '1.4rem' }}>{statusIcon(status.queue.notifications.status)}</span>
              </div>
              <div style={{ fontSize: '0.82rem', lineHeight: 1.6 }}>
                <p style={{ margin: 0 }}>Pendientes: {status.queue.notifications.pending}</p>
                <p style={{ margin: 0 }}>Fallidas: {status.queue.notifications.failed}</p>
                {status.queue.notifications.lastProcessed && (
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem' }}>
                    Último procesamiento: {new Date(status.queue.notifications.lastProcessed).toLocaleString('es-CO')}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
            <div><p style={muted}>Versión</p><p style={value}>{status.system.version}</p></div>
            <div><p style={muted}>Uptime</p><p style={value}>{status.system.uptimeFormatted}</p></div>
            <div><p style={muted}>Entorno</p><p style={value}>{status.system.environment}</p></div>
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155', margin: '0 0 0.75rem' }}>Almacenamiento</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
              <div><p style={muted}>Documentos</p><p style={value}>{status.storage.documentsCount}</p></div>
              <div><p style={muted}>Tamaño Total</p><p style={value}>{status.storage.totalSizeMB} MB</p></div>
              <div><p style={muted}>Promedio por Documento</p><p style={value}>{status.storage.averageSizeMB} MB</p></div>
            </div>
          </div>
        </div>
      )}

      {metrics && (
        <div style={card}>
          <h2 style={sectionTitle}>Métricas del día</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: '1.5rem' }}>
            {metricCards.map((m) => (
              <div key={m.label} style={{ background: m.bg, border: `1px solid ${m.bd}`, borderRadius: 10, padding: '1rem' }}>
                <p style={{ fontSize: '0.78rem', color: m.fg, margin: '0 0 0.35rem' }}>{m.label}</p>
                <p style={{ fontSize: '1.9rem', fontWeight: 700, color: m.fg, margin: 0 }}>{m.val}</p>
              </div>
            ))}
          </div>

          <div style={{ paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155', margin: '0 0 0.75rem' }}>Estadísticas generales</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
              <div><p style={muted}>Total Casos</p><p style={{ ...value, fontSize: '1.1rem' }}>{metrics.database.totalCases}</p></div>
              <div><p style={muted}>Total Usuarios</p><p style={{ ...value, fontSize: '1.1rem' }}>{metrics.database.totalUsers}</p></div>
              <div><p style={muted}>Total Notificaciones</p><p style={{ ...value, fontSize: '1.1rem' }}>{metrics.database.totalNotifications}</p></div>
              <div><p style={muted}>Tiempo Promedio Respuesta</p><p style={{ ...value, fontSize: '1.1rem' }}>{metrics.operations.averageResponseTime} días</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
