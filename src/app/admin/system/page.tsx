/**
 * COMPONENTE: /admin/system
 * 
 * Panel de monitoreo y salud del sistema
 * 
 * Acceso: ADMIN
 * Características:
 * - Estado de servicios (BD, notificaciones)
 * - Métricas operativas del día
 * - Información del sistema
 * - Actualización manual
 * 
 * @author GEFA — Gestión Familiar
 * @date Enero 13, 2026
 */

'use client';

import { useState } from 'react';

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

  const getStatusIcon = (statusValue: string) => {
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
  };

  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
      case 'healthy':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'degraded':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'down':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Estado del Sistema 🔧</h1>
        <button
          onClick={loadSystemInfo}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Cargando...' : 'Actualizar Estado'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded border border-red-200">
          {error}
        </div>
      )}

      {!status && !metrics && !loading && (
        <div className="text-center py-12 bg-gray-50 rounded border border-gray-200">
          <p className="text-gray-600 mb-4">Haga clic en &quot;Actualizar Estado&quot; para cargar la información</p>
        </div>
      )}

      {(status || metrics) && (
        <>
          {/* Estado de Servicios */}
          {status && (
            <div className="mb-6 bg-white p-6 rounded shadow border">
              <h2 className="text-xl font-bold mb-4">Estado de Servicios</h2>
              
              {status.system.degradedMode && (
                <div className="mb-4 p-3 bg-orange-50 text-orange-700 rounded border border-orange-200">
                  ⚠️ Sistema en modo degradado (solo lectura)
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {/* Base de Datos */}
                <div className={`p-4 rounded border ${getStatusColor(status.database.status)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Base de Datos</span>
                    <span className="text-2xl">{getStatusIcon(status.database.status)}</span>
                  </div>
                  <div className="text-sm">
                    <p>Estado: {status.database.connected ? 'Conectada' : 'Desconectada'}</p>
                    <p>Latencia: {status.database.latency}ms</p>
                  </div>
                </div>

                {/* Cola de Notificaciones */}
                <div className={`p-4 rounded border ${getStatusColor(status.queue.notifications.status)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Cola de Notificaciones</span>
                    <span className="text-2xl">{getStatusIcon(status.queue.notifications.status)}</span>
                  </div>
                  <div className="text-sm">
                    <p>Pendientes: {status.queue.notifications.pending}</p>
                    <p>Fallidas: {status.queue.notifications.failed}</p>
                    {status.queue.notifications.lastProcessed && (
                      <p className="text-xs mt-1">
                        Último procesamiento: {new Date(status.queue.notifications.lastProcessed).toLocaleString('es-CO')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Información del Sistema */}
              <div className="mt-4 pt-4 border-t grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Versión</p>
                  <p className="font-medium">{status.system.version}</p>
                </div>
                <div>
                  <p className="text-gray-600">Uptime</p>
                  <p className="font-medium">{status.system.uptimeFormatted}</p>
                </div>
                <div>
                  <p className="text-gray-600">Entorno</p>
                  <p className="font-medium">{status.system.environment}</p>
                </div>
              </div>

              {/* Almacenamiento */}
              <div className="mt-4 pt-4 border-t">
                <h3 className="font-medium mb-2">Almacenamiento</h3>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Documentos</p>
                    <p className="font-medium">{status.storage.documentsCount}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Tamaño Total</p>
                    <p className="font-medium">{status.storage.totalSizeMB} MB</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Promedio por Documento</p>
                    <p className="font-medium">{status.storage.averageSizeMB} MB</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Métricas del Día */}
          {metrics && (
            <div className="bg-white p-6 rounded shadow border">
              <h2 className="text-xl font-bold mb-4">Métricas del Día</h2>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                  <p className="text-sm text-blue-600 mb-1">Casos Radicados Hoy</p>
                  <p className="text-3xl font-bold text-blue-700">{metrics.operations.casesCreatedToday}</p>
                </div>

                <div className="bg-green-50 p-4 rounded border border-green-200">
                  <p className="text-sm text-green-600 mb-1">Casos Cerrados Hoy</p>
                  <p className="text-3xl font-bold text-green-700">{metrics.operations.casesClosedToday}</p>
                </div>

                <div className="bg-purple-50 p-4 rounded border border-purple-200">
                  <p className="text-sm text-purple-600 mb-1">Notificaciones Enviadas</p>
                  <p className="text-3xl font-bold text-purple-700">{metrics.operations.notificationsSentToday}</p>
                </div>

                <div className="bg-orange-50 p-4 rounded border border-orange-200">
                  <p className="text-sm text-orange-600 mb-1">Notificaciones Pendientes</p>
                  <p className="text-3xl font-bold text-orange-700">{metrics.operations.pendingNotifications}</p>
                </div>
              </div>

              {/* Estadísticas Generales */}
              <div className="pt-4 border-t">
                <h3 className="font-medium mb-3">Estadísticas Generales</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total Casos</p>
                    <p className="font-medium text-lg">{metrics.database.totalCases}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Usuarios</p>
                    <p className="font-medium text-lg">{metrics.database.totalUsers}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Notificaciones</p>
                    <p className="font-medium text-lg">{metrics.database.totalNotifications}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Tiempo Promedio Respuesta</p>
                    <p className="font-medium text-lg">{metrics.operations.averageResponseTime} días</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
