/**
 * Página de Supervisión Institucional
 * /admin/supervision
 * Solo SUPERVISOR y ADMIN
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Metrics {
  totalCases: number;
  casesByState: Array<{
    stateCode: string;
    stateName: string;
    count: number;
  }>;
  overdueCases: number;
  casesByAssignee: Array<{
    userId: string;
    userName: string;
    count: number;
  }>;
}

interface OverdueCase {
  id: string;
  fileNumber: string;
  citizenName: string;
  assigneeName: string | null;
  stateCode: string;
  stateName: string;
  dueDate: string;
  daysOverdue: number;
  createdAt: string;
}

export default function SupervisionPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [overdueCases, setOverdueCases] = useState<OverdueCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtros
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stateCode, setStateCode] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        router.push('/login');
        return;
      }

      // Construir query params
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (stateCode) params.append('stateCode', stateCode);

      const queryString = params.toString();

      // Cargar métricas
      const metricsRes = await fetch(
        `/api/v1/supervision/metrics${queryString ? `?${queryString}` : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!metricsRes.ok) throw new Error('Error al cargar métricas');

      const metricsData = await metricsRes.json();
      setMetrics(metricsData.metrics);

      // Cargar casos vencidos
      const overdueRes = await fetch(
        `/api/v1/supervision/overdue${queryString ? `?${queryString}` : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!overdueRes.ok) throw new Error('Error al cargar casos vencidos');

      const overdueData = await overdueRes.json();
      setOverdueCases(overdueData.cases || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (stateCode) params.append('stateCode', stateCode);

      const queryString = params.toString();

      const res = await fetch(
        `/api/v1/supervision/export${queryString ? `?${queryString}` : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error('Error al exportar');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `supervision_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al exportar');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <p>Cargando supervisión...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Panel de Supervisión Institucional
          </h1>
          <p className="text-gray-600 mt-2">
            Métricas operativas y casos críticos (Solo lectura)
          </p>
        </div>

        <button
          onClick={handleExport}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          📊 Exportar Reporte CSV
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Filtros Globales */}
      <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-3">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha inicio
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha fin
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <input
              type="text"
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
              placeholder="Ej: RADICADO"
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={loadData}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Métricas Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {/* Total Expedientes */}
          <div className="p-6 bg-white border border-gray-200 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Total Expedientes
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              {metrics.totalCases}
            </p>
          </div>

          {/* Expedientes Vencidos */}
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg shadow">
            <h3 className="text-sm font-medium text-red-700 mb-2">
              Vencidos (SLA)
            </h3>
            <p className="text-3xl font-bold text-red-900">
              {metrics.overdueCases}
            </p>
          </div>

          {/* Expedientes por Estado */}
          <div className="p-6 bg-white border border-gray-200 rounded-lg shadow col-span-2">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Por Estado
            </h3>
            <div className="space-y-2">
              {metrics.casesByState.slice(0, 3).map((state) => (
                <div key={state.stateCode} className="flex justify-between">
                  <span className="text-sm text-gray-600">{state.stateName}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {state.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabla: Casos Críticos (Vencidos) */}
      <div className="bg-white border border-gray-200 rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            🚨 Casos Críticos (Vencidos)
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Expedientes que han superado su fecha límite
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <caption className="sr-only">Casos críticos con atraso en la fecha límite</caption>
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Radicado
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ciudadano
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Funcionario
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha Límite
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Días Atraso
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {overdueCases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    ✅ No hay casos vencidos
                  </td>
                </tr>
              ) : (
                overdueCases.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {c.fileNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {c.citizenName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {c.assigneeName || 'Sin asignar'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {c.stateName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(c.dueDate).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-red-600">
                      {c.daysOverdue} días
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
