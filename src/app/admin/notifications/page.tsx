/**
 * COMPONENTE: /admin/notifications
 * 
 * Panel de administración del sistema de notificaciones
 * Permite ver historial, enviar emails de prueba y procesar cola
 * 
 * Acceso: ADMIN
 * Características:
 * - Historial de notificaciones con filtros
 * - Formulario de test de email
 * - Botón para procesar cola manualmente
 * - Estadísticas de notificaciones
 * 
 * @author GEFA — Gestión Familiar
 * @date Enero 12, 2026
 */

'use client';

import { useState, useEffect } from 'react';
import { NotificationStatus, NotificationType, NotificationChannel } from '@prisma/client';

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
  case?: {
    caseNumber: string;
  } | null;
  recipient?: {
    firstName: string;
    lastName: string;
  } | null;
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

  // Filtros
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<NotificationType | ''>('');
  const [channelFilter, setChannelFilter] = useState<NotificationChannel | ''>('');

  // Cargar historial
  const loadHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      params.append('limit', '100');

      const res = await fetch(`/api/v1/notifications/history?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setNotifications(data.data);
      } else {
        setMessage('Error al cargar historial');
      }
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

  // Procesar cola
  const processQueue = async () => {
    try {
      setProcessing(true);
      setMessage('');

      const res = await fetch('/api/v1/notifications/process', {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        setMessage(`✅ Cola procesada: ${data.data.sent} enviadas, ${data.data.failed} fallidas`);
        loadHistory();
      } else {
        setMessage('❌ Error al procesar cola');
      }
    } catch (error) {
      console.error('Error al procesar cola:', error);
      setMessage('❌ Error al procesar cola');
    } finally {
      setProcessing(false);
    }
  };

  // Enviar email de prueba
  const sendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) return;

    try {
      setTestSending(true);
      setMessage('');

      const res = await fetch('/api/v1/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          subject: testSubject || undefined,
          message: testMessage || undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage('✅ Email de prueba enviado exitosamente');
        setTestEmail('');
        setTestSubject('');
        setTestMessage('');
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error al enviar email de prueba:', error);
      setMessage('❌ Error al enviar email de prueba');
    } finally {
      setTestSending(false);
    }
  };

  // Filtrar notificaciones localmente por canal
  const filteredNotifications = channelFilter
    ? notifications.filter(n => n.channel === channelFilter)
    : notifications;

  // Estadísticas
  const stats = {
    total: notifications.length,
    sent: notifications.filter(n => n.status === 'SENT').length,
    pending: notifications.filter(n => n.status === 'PENDING').length,
    failed: notifications.filter(n => n.status === 'FAILED').length,
    email: notifications.filter(n => n.channel === 'EMAIL').length,
    sms: notifications.filter(n => n.channel === 'SMS').length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Sistema de Notificaciones 📧</h1>

      {message && (
        <div className={`mb-6 p-4 rounded ${
          message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-green-50 p-4 rounded shadow">
          <div className="text-sm text-green-600">Enviadas</div>
          <div className="text-2xl font-bold text-green-700">{stats.sent}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded shadow">
          <div className="text-sm text-yellow-600">Pendientes</div>
          <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
        </div>
        <div className="bg-red-50 p-4 rounded shadow">
          <div className="text-sm text-red-600">Fallidas</div>
          <div className="text-2xl font-bold text-red-700">{stats.failed}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded shadow">
          <div className="text-sm text-blue-600">Email</div>
          <div className="text-2xl font-bold text-blue-700">{stats.email}</div>
        </div>
        <div className="bg-cyan-50 p-4 rounded shadow">
          <div className="text-sm text-cyan-700">SMS</div>
          <div className="text-2xl font-bold text-cyan-800">{stats.sms}</div>
        </div>
      </div>

      {/* Acciones */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Procesar cola */}
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Procesar Cola</h2>
          <p className="text-gray-600 mb-4">
            Procesa manualmente las notificaciones pendientes en la cola.
          </p>
          <button
            onClick={processQueue}
            disabled={processing}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Procesando...' : 'Procesar Cola Ahora'}
          </button>
        </div>

        {/* Enviar email de prueba */}
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Email de Prueba</h2>
          <form onSubmit={sendTestEmail}>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Email destino"
              required
              className="w-full border rounded p-2 mb-2"
            />
            <input
              type="text"
              value={testSubject}
              onChange={(e) => setTestSubject(e.target.value)}
              placeholder="Asunto (opcional)"
              className="w-full border rounded p-2 mb-2"
            />
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Mensaje (opcional)"
              rows={2}
              className="w-full border rounded p-2 mb-2"
            />
            <button
              type="submit"
              disabled={testSending}
              className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testSending ? 'Enviando...' : 'Enviar Email de Prueba'}
            </button>
          </form>
        </div>
      </div>

      {/* Historial */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-bold mb-4">Historial de Notificaciones</h2>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as NotificationStatus | '')}
            className="border rounded p-2"
          >
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="SENT">Enviada</option>
            <option value="FAILED">Fallida</option>
            <option value="READ">Leída</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as NotificationType | '')}
            className="border rounded p-2"
          >
            <option value="">Todos los tipos</option>
            <option value="CASE_FILED">Caso radicado</option>
            <option value="CASE_ASSIGNED">Caso asignado</option>
            <option value="CASE_STATE_CHANGED">Estado cambiado</option>
            <option value="CASE_RESPONSE">Respuesta</option>
            <option value="CASE_OVERDUE">Vencimiento</option>
            <option value="INFORMATION_REQUIRED">Info requerida</option>
            <option value="GENERIC">Genérica</option>
          </select>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as NotificationChannel | '')}
            className="border rounded p-2"
          >
            <option value="">Todos los canales</option>
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Cargando...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No hay notificaciones</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-left">Canal</th>
                  <th className="px-4 py-2 text-left">Destinatario</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Caso</th>
                  <th className="px-4 py-2 text-left">Reintentos</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotifications.map((notif) => (
                  <tr key={notif.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">
                      {new Date(notif.createdAt).toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-xs font-medium">
                        {notif.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        notif.channel === 'EMAIL' ? 'bg-blue-100 text-blue-700' : 'bg-cyan-100 text-cyan-800'
                      }`}>
                        {notif.channel}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {notif.recipient ? (
                        <div>
                          <div className="font-medium">{notif.recipient.firstName} {notif.recipient.lastName}</div>
                          <div className="text-xs text-gray-500">
                            {notif.recipientEmail || notif.recipientPhone}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">{notif.recipientEmail || notif.recipientPhone}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        notif.status === 'SENT' ? 'bg-green-100 text-green-700' :
                        notif.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        notif.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {notif.status}
                      </span>
                      {notif.errorMessage && (
                        <div className="text-xs text-red-600 mt-1" title={notif.errorMessage}>
                          Error: {notif.errorMessage.substring(0, 30)}...
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {notif.case ? (
                        <span className="text-blue-600">{notif.case.caseNumber}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {notif.retryCount > 0 && (
                        <span className="text-orange-600 font-medium">{notif.retryCount}</span>
                      )}
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
