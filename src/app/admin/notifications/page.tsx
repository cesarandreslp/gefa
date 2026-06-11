/**
 * /admin/notifications — Centro de notificaciones de la Comisaría
 * Historial, envío de prueba y procesamiento de cola. Estilo inline (el proyecto
 * no usa Tailwind). Acceso: ADMIN.
 */

'use client';

import { useState, useEffect } from 'react';
import { NotificationStatus, NotificationType, NotificationChannel } from '@prisma/client';
import { Bell, Send, RefreshCw, Mail } from 'lucide-react';
import AdminPageHeader from '../AdminPageHeader';

interface Notification {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  subject?: string | null;
  message: string;
  sentAt?: Date | null;
  readAt?: Date | null;
  failedAt?: Date | null;
  errorMessage?: string | null;
  retryCount: number;
  createdAt: Date;
  case?: { caseNumber: string } | null;
  recipient?: { firstName: string; lastName: string } | null;
}

const TYPE_LABELS: Record<string, string> = {
  CASE_FILED: 'Caso radicado',
  CASE_ASSIGNED: 'Caso asignado',
  CASE_STATE_CHANGED: 'Cambio de estado',
  CASE_RESPONSE: 'Respuesta',
  CASE_OVERDUE: 'Vencimiento',
  INFORMATION_REQUIRED: 'Información requerida',
  GENERIC: 'Citación / medida / aviso',
};

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.1rem 1.25rem' };
const input: React.CSSProperties = { width: '100%', padding: '0.6rem 0.7rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.88rem', boxSizing: 'border-box' };
const th: React.CSSProperties = { padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' };
const td: React.CSSProperties = { padding: '0.7rem 1rem', fontSize: '0.85rem', color: '#374151' };

function statusStyle(s: NotificationStatus): React.CSSProperties {
  const map: Record<string, [string, string]> = {
    SENT: ['#dcfce7', '#166534'], DELIVERED: ['#dcfce7', '#166534'], READ: ['#dbeafe', '#1e40af'],
    PENDING: ['#fef9c3', '#854d0e'], FAILED: ['#fee2e2', '#991b1b'],
  };
  const [bg, color] = map[s] ?? ['#f1f5f9', '#475569'];
  return { background: bg, color, borderRadius: 999, padding: '0.12rem 0.55rem', fontSize: '0.72rem', fontWeight: 700 };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testSubject, setTestSubject] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [message, setMessage] = useState('');

  const [statusFilter, setStatusFilter] = useState<NotificationStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<NotificationType | ''>('');
  const [channelFilter, setChannelFilter] = useState<NotificationChannel | ''>('');

  const loadHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      params.append('limit', '100');
      const res = await fetch(`/api/v1/notifications/history?${params.toString()}`);
      const data = await res.json();
      if (data.success) setNotifications(data.data);
      else setMessage('Error al cargar historial');
    } catch (error) {
      console.error('Error al cargar historial:', error);
      setMessage('Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter]);

  const processQueue = async () => {
    try {
      setProcessing(true);
      setMessage('');
      const res = await fetch('/api/v1/notifications/process', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessage(`✅ Cola procesada: ${data.data.sent} enviadas, ${data.data.failed} fallidas`);
        loadHistory();
      } else setMessage('❌ Error al procesar cola');
    } catch (error) {
      console.error('Error al procesar cola:', error);
      setMessage('❌ Error al procesar cola');
    } finally {
      setProcessing(false);
    }
  };

  const sendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) return;
    try {
      setTestSending(true);
      setMessage('');
      const res = await fetch('/api/v1/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail, subject: testSubject || undefined, message: testMessage || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('✅ Email de prueba enviado exitosamente');
        setTestEmail(''); setTestSubject(''); setTestMessage('');
      } else setMessage(`❌ Error: ${data.error}`);
    } catch (error) {
      console.error('Error al enviar email de prueba:', error);
      setMessage('❌ Error al enviar email de prueba');
    } finally {
      setTestSending(false);
    }
  };

  const filteredNotifications = channelFilter ? notifications.filter(n => n.channel === channelFilter) : notifications;
  const stats = {
    total: notifications.length,
    sent: notifications.filter(n => n.status === 'SENT').length,
    pending: notifications.filter(n => n.status === 'PENDING').length,
    failed: notifications.filter(n => n.status === 'FAILED').length,
    email: notifications.filter(n => n.channel === 'EMAIL').length,
    sms: notifications.filter(n => n.channel === 'SMS').length,
  };
  const KPIS: Array<{ label: string; value: number; color: string }> = [
    { label: 'Total', value: stats.total, color: '#334155' },
    { label: 'Enviadas', value: stats.sent, color: '#059669' },
    { label: 'Pendientes', value: stats.pending, color: '#b45309' },
    { label: 'Fallidas', value: stats.failed, color: '#dc2626' },
    { label: 'Email', value: stats.email, color: '#1a5fb4' },
    { label: 'SMS', value: stats.sms, color: '#0891b2' },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Notificaciones de la Comisaría"
        subtitle="Avisos automáticos al ciudadano: radicación, cambio de estado, citación a audiencia y medida de protección (Ley 2126/2021, 1098/2006, 575/2000, 1257/2008). Requiere SMTP configurado para el envío real."
        icon={<Bell size={24} />}
        actions={
          <button onClick={processQueue} disabled={processing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--color-primary, #2563eb)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem 1.1rem', fontWeight: 600, fontSize: '0.88rem', cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.7 : 1 }}>
            <RefreshCw size={16} /> {processing ? 'Procesando…' : 'Procesar cola'}
          </button>
        }
      />

      {message && (
        <div style={{ ...card, marginBottom: '1.25rem', borderColor: message.includes('✅') ? '#bbf7d0' : '#fecaca', background: message.includes('✅') ? '#f0fdf4' : '#fef2f2', color: message.includes('✅') ? '#166534' : '#991b1b' }}>
          {message}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
        {KPIS.map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.9rem 1rem' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{k.label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: k.color, lineHeight: 1.1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Email de prueba */}
      <div style={{ ...card, marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', margin: '0 0 0.85rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}><Send size={17} /> Email de prueba</h2>
        <form onSubmit={sendTestEmail} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, alignItems: 'end' }}>
          <div><label style={{ fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: 4 }}>Destino *</label><input type="email" required value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="correo@destino.com" style={input} /></div>
          <div><label style={{ fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: 4 }}>Asunto</label><input type="text" value={testSubject} onChange={e => setTestSubject(e.target.value)} placeholder="(opcional)" style={input} /></div>
          <div><label style={{ fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: 4 }}>Mensaje</label><input type="text" value={testMessage} onChange={e => setTestMessage(e.target.value)} placeholder="(opcional)" style={input} /></div>
          <button type="submit" disabled={testSending}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem 1rem', fontWeight: 600, fontSize: '0.88rem', cursor: testSending ? 'wait' : 'pointer', opacity: testSending ? 0.7 : 1 }}>
            <Mail size={16} /> {testSending ? 'Enviando…' : 'Enviar prueba'}
          </button>
        </form>
      </div>

      {/* Historial */}
      <div style={card}>
        <h2 style={{ fontSize: '1rem', margin: '0 0 0.85rem', color: '#1e293b' }}>Historial de notificaciones</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: '1rem' }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as NotificationStatus | '')} style={{ ...input, width: 'auto' }}>
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="SENT">Enviada</option>
            <option value="FAILED">Fallida</option>
            <option value="READ">Leída</option>
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as NotificationType | '')} style={{ ...input, width: 'auto' }}>
            <option value="">Todos los tipos</option>
            {Object.entries(TYPE_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
          <select value={channelFilter} onChange={e => setChannelFilter(e.target.value as NotificationChannel | '')} style={{ ...input, width: 'auto' }}>
            <option value="">Todos los canales</option>
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
          </select>
        </div>

        {loading ? (
          <p style={{ color: '#94a3b8', padding: '1.5rem 0', textAlign: 'center' }}>Cargando…</p>
        ) : filteredNotifications.length === 0 ? (
          <p style={{ color: '#94a3b8', padding: '2rem 0', textAlign: 'center' }}>No hay notificaciones todavía. Se generarán automáticamente al ocurrir actuaciones en los casos.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={th}>Fecha</th><th style={th}>Tipo</th><th style={th}>Canal</th><th style={th}>Destinatario</th><th style={th}>Estado</th><th style={th}>Caso</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotifications.map(n => (
                  <tr key={n.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={td}>{new Date(n.createdAt).toLocaleString('es-CO')}</td>
                    <td style={td}>{TYPE_LABELS[n.type] ?? n.type}</td>
                    <td style={td}><span style={{ background: n.channel === 'EMAIL' ? '#dbeafe' : '#cffafe', color: n.channel === 'EMAIL' ? '#1e40af' : '#0e7490', borderRadius: 6, padding: '0.1rem 0.45rem', fontSize: '0.72rem', fontWeight: 700 }}>{n.channel}</span></td>
                    <td style={td}>{n.recipientEmail || n.recipientPhone || '—'}</td>
                    <td style={td}>
                      <span style={statusStyle(n.status)}>{n.status}</span>
                      {n.errorMessage && <div title={n.errorMessage} style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: 2 }}>{n.errorMessage.substring(0, 30)}…</div>}
                    </td>
                    <td style={{ ...td, color: 'var(--color-primary, #2563eb)' }}>{n.case?.caseNumber ?? '—'}</td>
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
