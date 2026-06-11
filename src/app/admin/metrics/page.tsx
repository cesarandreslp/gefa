/**
 * PÁGINA: Panel de Métricas Institucionales
 * 
 * Visualiza indicadores de gestión (MiPG)
 * 
 * Acceso: ADMIN, SUPERVISOR
 * Ruta: /admin/metrics
 * 
 * Características:
 * - KPIs principales en cards
 * - Filtros de fecha
 * - Gráficas simples sin librerías pesadas
 * - Explicación de cada indicador
 * 
 * @author GEFA — Gestión Familiar
 * @date Enero 9, 2026
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface InstitutionalMetrics {
  period: {
    from: string;
    to: string;
  };
  sla: {
    totalCasesWithSLA: number;
    casesOnTime: number;
    casesWarning: number;
    casesOverdue: number;
    compliancePercentage: number;
  };
  time: {
    averageResolutionDays: number;
    averageResolutionDaysByType: {
      caseTypeId: string;
      caseTypeName: string;
      averageDays: number;
    }[];
  };
  distribution: {
    totalCases: number;
    activeOverdue: number;
    byType: {
      caseTypeId: string;
      caseTypeName: string;
      count: number;
    }[];
    byState: {
      stateId: string;
      stateName: string;
      count: number;
    }[];
  };
  users: {
    activeByUser: {
      userId: string;
      userName: string;
      count: number;
    }[];
    closedByUser: {
      userId: string;
      userName: string;
      count: number;
    }[];
  };
  quality: {
    totalReopened: number;
    reopenedPercentage: number;
    casesWithCompleteTraceability: number;
    traceabilityPercentage: number;
  };
  trends: {
    month: string;
    filed: number;
    closed: number;
    overdue: number;
  }[];
}

export default function MetricsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<InstitutionalMetrics | null>(null);
  const [error, setError] = useState('');

  // Filtros
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Cargar métricas
  const loadMetrics = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('from', new Date(fromDate).toISOString());
      if (toDate) params.append('to', new Date(toDate).toISOString());

      const res = await fetch(`/api/v1/metrics?${params.toString()}`);

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/login');
          return;
        }
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

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    loadMetrics();
  };

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    // Recargar sin filtros
    setTimeout(() => loadMetrics(), 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            📊 Indicadores de Gestión Institucional
          </h1>
          <p className="mt-2 text-gray-600">
            Panel de métricas MiPG (Modelo Integrado de Planeación y Gestión)
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <form onSubmit={handleFilter} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {loading ? 'Cargando...' : 'Filtrar'}
                </button>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando métricas...</p>
          </div>
        )}

        {/* Métricas */}
        {!loading && metrics && (
          <div className="space-y-6">
            {/* Período */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Período analizado:</strong>{' '}
                {new Date(metrics.period.from).toLocaleDateString('es-CO')} hasta{' '}
                {new Date(metrics.period.to).toLocaleDateString('es-CO')}
              </p>
            </div>

            {/* 1. SLA - Cards principales */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                1. Cumplimiento de Términos (SLA)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm text-gray-600 mb-1">Total Expedientes</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {metrics.sla.totalCasesWithSLA}
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg shadow p-6 border-l-4 border-green-500">
                  <div className="text-sm text-green-700 mb-1">🟢 A Tiempo</div>
                  <div className="text-3xl font-bold text-green-900">
                    {metrics.sla.casesOnTime}
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg shadow p-6 border-l-4 border-yellow-500">
                  <div className="text-sm text-yellow-700 mb-1">🟡 Advertencia</div>
                  <div className="text-3xl font-bold text-yellow-900">
                    {metrics.sla.casesWarning}
                  </div>
                </div>

                <div className="bg-red-50 rounded-lg shadow p-6 border-l-4 border-red-500">
                  <div className="text-sm text-red-700 mb-1">🔴 Vencidos</div>
                  <div className="text-3xl font-bold text-red-900">
                    {metrics.sla.casesOverdue}
                  </div>
                </div>
              </div>

              <div className="mt-4 bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">
                      % Cumplimiento SLA (A tiempo + Advertencia)
                    </div>
                    <div className="text-4xl font-bold text-blue-600">
                      {metrics.sla.compliancePercentage.toFixed(2)}%
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 max-w-md">
                    <strong>Interpretación:</strong> Porcentaje de expedientes que están
                    dentro del término legal o cerca de vencerse. Meta institucional: ≥ 90%
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Tiempo Promedio */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                2. Tiempo Promedio de Atención
              </h2>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="mb-6">
                  <div className="text-sm text-gray-600 mb-1">
                    Promedio General (casos cerrados)
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {metrics.time.averageResolutionDays.toFixed(2)} días
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Tiempo promedio desde radicación hasta cierre del expediente
                  </p>
                </div>

                {metrics.time.averageResolutionDaysByType.length > 0 && (
                  <div>
                    <h3 className="text-md font-semibold text-gray-700 mb-3">
                      Promedio por Tipo de Trámite
                    </h3>
                    <div className="space-y-2">
                      {metrics.time.averageResolutionDaysByType.map((item) => (
                        <div
                          key={item.caseTypeId}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded"
                        >
                          <span className="text-sm text-gray-700">{item.caseTypeName}</span>
                          <span className="text-lg font-semibold text-blue-600">
                            {item.averageDays.toFixed(2)} días
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Distribución */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                3. Distribución de Expedientes
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm text-gray-600 mb-1">Total en Período</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {metrics.distribution.totalCases}
                  </div>
                </div>

                <div className="bg-red-50 rounded-lg shadow p-6 border-l-4 border-red-500">
                  <div className="text-sm text-red-700 mb-1">Activos Vencidos (Críticos)</div>
                  <div className="text-3xl font-bold text-red-900">
                    {metrics.distribution.activeOverdue}
                  </div>
                  <p className="text-sm text-red-600 mt-2">
                    Requieren atención inmediata
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {/* Por Tipo */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-md font-semibold text-gray-700 mb-3">
                    Por Tipo de Trámite
                  </h3>
                  {metrics.distribution.byType.length > 0 ? (
                    <div className="space-y-2">
                      {metrics.distribution.byType.map((item) => (
                        <div
                          key={item.caseTypeId}
                          className="flex justify-between items-center"
                        >
                          <span className="text-sm text-gray-700">{item.caseTypeName}</span>
                          <span className="font-semibold text-gray-900">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No hay datos</p>
                  )}
                </div>

                {/* Por Estado */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-md font-semibold text-gray-700 mb-3">
                    Por Estado Actual
                  </h3>
                  {metrics.distribution.byState.length > 0 ? (
                    <div className="space-y-2">
                      {metrics.distribution.byState.map((item) => (
                        <div
                          key={item.stateId}
                          className="flex justify-between items-center"
                        >
                          <span className="text-sm text-gray-700">{item.stateName}</span>
                          <span className="font-semibold text-gray-900">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No hay datos</p>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Usuarios */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                4. Productividad por Funcionario
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Activos */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-md font-semibold text-gray-700 mb-3">
                    Casos Activos Asignados
                  </h3>
                  {metrics.users.activeByUser.length > 0 ? (
                    <div className="space-y-2">
                      {metrics.users.activeByUser.map((item) => (
                        <div
                          key={item.userId}
                          className="flex justify-between items-center p-2 bg-blue-50 rounded"
                        >
                          <span className="text-sm text-gray-700">{item.userName}</span>
                          <span className="font-semibold text-blue-600">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No hay datos</p>
                  )}
                </div>

                {/* Cerrados */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-md font-semibold text-gray-700 mb-3">
                    Casos Cerrados por Funcionario
                  </h3>
                  {metrics.users.closedByUser.length > 0 ? (
                    <div className="space-y-2">
                      {metrics.users.closedByUser.map((item) => (
                        <div
                          key={item.userId}
                          className="flex justify-between items-center p-2 bg-green-50 rounded"
                        >
                          <span className="text-sm text-gray-700">{item.userName}</span>
                          <span className="font-semibold text-green-600">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No hay datos</p>
                  )}
                </div>
              </div>
            </div>

            {/* 5. Calidad */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                5. Indicadores de Calidad
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm text-gray-600 mb-1">Casos Reabiertos</div>
                  <div className="text-3xl font-bold text-orange-600">
                    {metrics.quality.totalReopened}
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    {metrics.quality.reopenedPercentage.toFixed(2)}% del total
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Casos que volvieron a estados no finales después de cerrados. Meta: {'<'} 5%
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm text-gray-600 mb-1">Trazabilidad Completa</div>
                  <div className="text-3xl font-bold text-green-600">
                    {metrics.quality.casesWithCompleteTraceability}
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    {metrics.quality.traceabilityPercentage.toFixed(2)}% del total
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Casos con al menos 1 transición de estado registrada. Meta: 100%
                  </p>
                </div>
              </div>
            </div>

            {/* 6. Tendencias */}
            {metrics.trends.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  6. Tendencia Mensual
                </h2>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <caption className="sr-only">Tendencia mensual de casos: radicados, cerrados y vencidos</caption>
                      <thead>
                        <tr className="border-b">
                          <th scope="col" className="text-left py-2 px-4 text-sm font-semibold text-gray-700">
                            Mes
                          </th>
                          <th scope="col" className="text-right py-2 px-4 text-sm font-semibold text-gray-700">
                            Radicados
                          </th>
                          <th scope="col" className="text-right py-2 px-4 text-sm font-semibold text-gray-700">
                            Cerrados
                          </th>
                          <th scope="col" className="text-right py-2 px-4 text-sm font-semibold text-gray-700">
                            Vencidos
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.trends.map((item) => (
                          <tr key={item.month} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-4 text-sm text-gray-900">{item.month}</td>
                            <td className="py-2 px-4 text-sm text-right text-blue-600 font-semibold">
                              {item.filed}
                            </td>
                            <td className="py-2 px-4 text-sm text-right text-green-600 font-semibold">
                              {item.closed}
                            </td>
                            <td className="py-2 px-4 text-sm text-right text-red-600 font-semibold">
                              {item.overdue}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    <strong>Nota:</strong> Los vencidos mostrados son los que estaban vencidos
                    en ese mes específico, no acumulativos.
                  </p>
                </div>
              </div>
            )}

            {/* Explicación MiPG */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                ℹ️ Sobre estos Indicadores
              </h3>
              <div className="text-sm text-blue-800 space-y-2">
                <p>
                  <strong>MiPG (Modelo Integrado de Planeación y Gestión):</strong> Marco de
                  referencia para dirigir, planear, ejecutar, hacer seguimiento, evaluar y
                  controlar la gestión de las entidades públicas.
                </p>
                <p>
                  Estos indicadores permiten a la comisaría de familia evidenciar la
                  eficiencia, eficacia y transparencia de su gestión ante los órganos de control
                  y la ciudadanía.
                </p>
                <p>
                  <strong>Todos los cálculos se realizan en el servidor</strong> (backend)
                  para garantizar auditabilidad y consistencia.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
