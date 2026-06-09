'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { Search, RefreshCw, Download, Shield, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';

type Scope = 'tenant' | 'superadmin';

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  userId: string;
  userEmail: string;
  userRole: string;
  entityType: string;
  entityId: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  metadata?: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  tenant?: { name: string; sigla: string };
}

interface Tenant { id: string; name: string; sigla: string; }

const ACTION_LABELS: Record<string, string> = {
  // Sesión
  LOGIN: 'Inicio de sesión',
  LOGOUT: 'Cierre de sesión',
  // Expedientes / Casos
  CASE_CREATED: 'Expediente creado',
  CASE_VIEWED: 'Expediente consultado',
  STATUS_CHANGED: 'Estado cambiado',
  ASSIGNED: 'Expediente asignado',
  REASSIGNED: 'Expediente reasignado',
  COMMENT_ADDED: 'Comentario añadido',
  INTERNAL_NOTE: 'Nota interna',
  // Documentos
  DOCUMENT_UPLOADED: 'Documento subido',
  DOCUMENT_VIEWED: 'Documento consultado',
  DOCUMENT_DELETED: 'Documento eliminado',
  // Usuarios
  USER_CREATED: 'Usuario creado',
  USER_UPDATED: 'Usuario actualizado',
  USER_DEACTIVATED: 'Usuario desactivado',
  USER_ACTIVATED: 'Usuario activado',
  // Solicitudes ciudadanas
  CITIZEN_REQUEST: 'Solicitud ciudadana',
  CITIZEN_CONTACT: 'Contacto ciudadano',
  SOLICITUD_RESPONDIDA: 'Solicitud respondida',
  SOLICITUD_RECHAZADA: 'Solicitud rechazada',
  // Supervisión / Reportes
  SUPERVISION_VIEWED: 'Supervisión consultada',
  SUPERVISION_EXPORTED: 'Supervisión exportada',
  METRICS_VIEWED: 'Métricas consultadas',
  REPORT_GENERATED: 'Reporte generado',
  REPORT_DOWNLOADED: 'Reporte descargado',
  // Configuración
  SETTING_CREATED: 'Configuración creada',
  SETTING_UPDATED: 'Configuración actualizada',
  SLA_CREATED: 'SLA creado',
  SLA_UPDATED: 'SLA actualizado',
  // Notificaciones
  NOTIFICATION_SENT: 'Notificación enviada',
  NOTIFICATION_FAILED: 'Notificación fallida',
  NOTIFICATION_DELIVERED: 'Notificación entregada',
  // Entidades (Tenants)
  TENANT_CREATED: 'Entidad creada',
  TENANT_UPDATED: 'Entidad actualizada',
  TENANT_DEACTIVATED: 'Entidad desactivada',
  TENANT_ACTIVATED: 'Entidad activada',
  // Super Admins
  ADMIN_CREATED: 'Super admin creado',
  ADMIN_UPDATED: 'Super admin actualizado',
  ADMIN_PASSWORD_RESET: 'Contraseña reseteada',
};

const ACTION_COLORS: Record<string, string> = {
  LOGIN: '#dbeafe',        LOGOUT: '#f3f4f6',
  CASE_CREATED: '#d1fae5', STATUS_CHANGED: '#fef3c7',
  ASSIGNED: '#dbeafe',     REASSIGNED: '#fef3c7',
  INTERNAL_NOTE: '#f3e8ff', COMMENT_ADDED: '#f3e8ff',
  DOCUMENT_UPLOADED: '#ede9fe', DOCUMENT_DELETED: '#fee2e2', DOCUMENT_VIEWED: '#f3f4f6',
  USER_CREATED: '#d1fae5', USER_UPDATED: '#fef3c7',
  USER_DEACTIVATED: '#fee2e2', USER_ACTIVATED: '#d1fae5',
  CITIZEN_REQUEST: '#ecfdf5', CITIZEN_CONTACT: '#ecfdf5',
  SOLICITUD_RESPONDIDA: '#d1fae5', SOLICITUD_RECHAZADA: '#fee2e2',
  TENANT_CREATED: '#d1fae5', TENANT_UPDATED: '#fef3c7',
  TENANT_DEACTIVATED: '#fee2e2', TENANT_ACTIVATED: '#d1fae5',
  ADMIN_CREATED: '#dbeafe', ADMIN_UPDATED: '#fef3c7',
  NOTIFICATION_FAILED: '#fee2e2',
  SETTING_CREATED: '#fef9c3', SETTING_UPDATED: '#fef9c3',
  SLA_CREATED: '#fef9c3',   SLA_UPDATED: '#fef9c3',
};

const ACTION_TEXT_COLORS: Record<string, string> = {
  LOGIN: '#1d4ed8',        LOGOUT: '#374151',
  CASE_CREATED: '#065f46', STATUS_CHANGED: '#92400e',
  ASSIGNED: '#1d4ed8',     REASSIGNED: '#92400e',
  INTERNAL_NOTE: '#6d28d9', COMMENT_ADDED: '#6d28d9',
  DOCUMENT_UPLOADED: '#5b21b6', DOCUMENT_DELETED: '#991b1b', DOCUMENT_VIEWED: '#374151',
  USER_CREATED: '#065f46', USER_UPDATED: '#92400e',
  USER_DEACTIVATED: '#991b1b', USER_ACTIVATED: '#065f46',
  CITIZEN_REQUEST: '#047857', CITIZEN_CONTACT: '#047857',
  SOLICITUD_RESPONDIDA: '#065f46', SOLICITUD_RECHAZADA: '#991b1b',
  TENANT_CREATED: '#065f46', TENANT_UPDATED: '#92400e',
  TENANT_DEACTIVATED: '#991b1b', TENANT_ACTIVATED: '#065f46',
  ADMIN_CREATED: '#1d4ed8', ADMIN_UPDATED: '#92400e',
  NOTIFICATION_FAILED: '#991b1b',
  SETTING_CREATED: '#854d0e', SETTING_UPDATED: '#854d0e',
  SLA_CREATED: '#854d0e',   SLA_UPDATED: '#854d0e',
};

function ActionBadge({ action }: { action: string }) {
  const bg = ACTION_COLORS[action] || '#f3f4f6';
  const color = ACTION_TEXT_COLORS[action] || '#374151';
  return (
    <span style={{
      background: bg, color, padding: '2px 10px', borderRadius: '9999px',
      fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {ACTION_LABELS[action] || action}
    </span>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('es-CO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}

export default function AuditoriaPage() {
  const [scope, setScope] = useState<Scope>('tenant');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const EMPTY_FILTERS = { tenantId: '', userEmail: '', action: '', entityType: '', dateFrom: '', dateTo: '' };
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);

  const fetchLogs = useCallback(async (f: typeof EMPTY_FILTERS, p: number, s: Scope) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '50', scope: s });
      if (f.tenantId)   params.set('tenantId', f.tenantId);
      if (f.userEmail)  params.set('userEmail', f.userEmail);
      if (f.action)     params.set('action', f.action);
      if (f.entityType) params.set('entityType', f.entityType);
      if (f.dateFrom)   params.set('dateFrom', f.dateFrom);
      if (f.dateTo)     params.set('dateTo', f.dateTo);

      const res = await fetch(`/api/v1/super-admin/audit-logs?${params}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data.logs);
        setTotal(json.data.total);
        setPages(json.data.pages);
        if (tenants.length === 0) setTenants(json.data.tenants);
      }
    } finally {
      setLoading(false);
    }
  }, [tenants.length]);

  useEffect(() => { fetchLogs(applied, page, scope); }, [applied, page, scope, fetchLogs]);

  const handleApply = () => { setPage(1); setApplied(filters); };
  const handleClear = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setApplied(EMPTY_FILTERS);
  };

  const handleScopeChange = (s: Scope) => {
    setScope(s);
    setFilters(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
    setExpandedId(null);
  };

  const handleExportCSV = () => {
    const headers = ['Fecha/Hora', 'Entidad', 'Usuario', 'Rol', 'Acción', 'Tipo Entidad', 'ID Entidad', 'IP', 'Estado'];
    const rows = logs.map(l => [
      formatDate(l.timestamp),
      l.tenant ? `${l.tenant.name} (${l.tenant.sigla})` : '-',
      l.userEmail,
      l.userRole,
      ACTION_LABELS[l.action] || l.action,
      l.entityType,
      l.entityId,
      l.ipAddress,
      l.success ? 'OK' : 'Error',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Shield size={24} color="#2563eb" />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#111827' }}>Auditoría General</h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
              {total.toLocaleString()} registros encontrados · Logs inmutables con integridad SHA-256
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => fetchLogs(applied, page, scope)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'white', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#374151' }}
          >
            <RefreshCw size={15} /> Actualizar
          </button>
          <button
            onClick={handleExportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: '#2563eb', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'white', fontWeight: 600 }}
          >
            <Download size={15} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', overflow: 'hidden', width: 'fit-content' }}>
        {([
          { key: 'tenant',     label: 'Entidades (Tenants)', icon: Shield },
          { key: 'superadmin', label: 'Super Admins',        icon: ShieldCheck },
        ] as { key: Scope; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleScopeChange(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1.25rem',
              border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
              background: scope === key ? '#2563eb' : 'transparent',
              color: scope === key ? 'white' : '#6b7280',
              transition: 'background 0.15s, color 0.15s',
              borderRight: key === 'tenant' ? '1px solid #e5e7eb' : 'none',
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
          {scope === 'tenant' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600 }}>Entidad</label>
              <select
                value={filters.tenantId}
                onChange={e => setFilters(f => ({ ...f, tenantId: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              >
                <option value="">Todas las entidades</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.sigla})</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600 }}>Correo del usuario</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="usuario@entidad.gov.co"
                value={filters.userEmail}
                onChange={e => setFilters(f => ({ ...f, userEmail: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleApply()}
                style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600 }}>Tipo de acción</label>
            <select
              value={filters.action}
              onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
            >
              <option value="">Todas las acciones</option>
              {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600 }}>Tipo de entidad</label>
            <select
              value={filters.entityType}
              onChange={e => setFilters(f => ({ ...f, entityType: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
            >
              <option value="">Todos los tipos</option>
              {['User', 'Case', 'Document', 'Tenant', 'Setting', 'Notification'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600 }}>Fecha desde</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600 }}>Fecha hasta</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button onClick={handleClear} style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: '0.85rem', color: '#374151' }}>
            Limpiar
          </button>
          <button onClick={handleApply} style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', background: '#2563eb', cursor: 'pointer', fontSize: '0.85rem', color: 'white', fontWeight: 600 }}>
            Aplicar filtros
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>
            <RefreshCw size={32} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} />
            Cargando registros...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>
            <Shield size={32} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
            No hay registros para los filtros seleccionados.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Fecha / Hora', 'Entidad', 'Usuario', 'Acción', 'Objeto', 'IP', 'Estado', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <Fragment key={log.id}>
                  <tr
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: expandedId === log.id ? '#f0f9ff' : 'white' }}
                    onMouseEnter={e => { if (expandedId !== log.id) (e.currentTarget as HTMLElement).style.background = '#f9fafb'; }}
                    onMouseLeave={e => { if (expandedId !== log.id) (e.currentTarget as HTMLElement).style.background = 'white'; }}
                  >
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: '#111827', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                      {formatDate(log.timestamp)}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#374151' }}>
                      {log.tenant ? (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{log.tenant.sigla}</div>
                          <div style={{ color: '#9ca3af', fontSize: '0.72rem' }}>{log.tenant.name}</div>
                        </div>
                      ) : scope === 'superadmin' ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb', background: '#dbeafe', padding: '2px 8px', borderRadius: '9999px' }}>Super Admin</span>
                      ) : <span style={{ color: '#9ca3af' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: '#111827', fontWeight: 500 }}>{log.userEmail}</div>
                      <div style={{ color: '#9ca3af', fontSize: '0.72rem' }}>{log.userRole}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <ActionBadge action={log.action} />
                    </td>
                    <td style={{ padding: '12px 16px', color: '#374151' }}>
                      <div>{log.entityType}</div>
                      <div style={{ color: '#9ca3af', fontSize: '0.72rem', fontFamily: 'monospace' }}>{log.entityId.slice(0, 8)}…</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                      {log.ipAddress}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 600,
                        background: log.success ? '#d1fae5' : '#fee2e2',
                        color: log.success ? '#065f46' : '#991b1b',
                      }}>
                        {log.success ? 'OK' : 'Error'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: '0.75rem' }}>
                      {expandedId === log.id ? '▲' : '▼'}
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr style={{ background: '#f0f9ff', borderBottom: '1px solid #e5e7eb' }}>
                      <td colSpan={8} style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', fontSize: '0.8rem' }}>
                          <div>
                            <div style={{ fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Agente del navegador</div>
                            <div style={{ color: '#6b7280', wordBreak: 'break-all' }}>{log.userAgent || '—'}</div>
                          </div>
                          {log.metadata && (
                            <div>
                              <div style={{ fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Metadata</div>
                              <pre style={{ margin: 0, color: '#374151', fontSize: '0.75rem', background: '#e0f2fe', padding: '0.5rem', borderRadius: '6px', overflow: 'auto', maxHeight: '120px' }}>
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                          {(log.before || log.after) && (
                            <div>
                              <div style={{ fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Cambios</div>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {log.before && (
                                  <pre style={{ flex: 1, margin: 0, color: '#991b1b', fontSize: '0.72rem', background: '#fee2e2', padding: '0.5rem', borderRadius: '6px', overflow: 'auto', maxHeight: '120px' }}>
                                    Antes: {JSON.stringify(log.before, null, 2)}
                                  </pre>
                                )}
                                {log.after && (
                                  <pre style={{ flex: 1, margin: 0, color: '#065f46', fontSize: '0.72rem', background: '#d1fae5', padding: '0.5rem', borderRadius: '6px', overflow: 'auto', maxHeight: '120px' }}>
                                    Después: {JSON.stringify(log.after, null, 2)}
                                  </pre>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}

        {/* Paginación */}
        {!loading && pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
              Página {page} de {pages} · {total.toLocaleString()} registros totales
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, fontSize: '0.85rem' }}
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: page === pages ? 'not-allowed' : 'pointer', opacity: page === pages ? 0.4 : 1, fontSize: '0.85rem' }}
              >
                Siguiente <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
