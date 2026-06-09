/**
 * PÁGINA: Reportes Institucionales
 * 
 * Generación y descarga de reportes oficiales
 * 
 * Acceso: ADMIN, SUPERVISOR
 * Ruta: /admin/reports
 * 
 * Características:
 * - Selector de tipo de reporte
 * - Selector de período
 * - Generación en backend
 * - Listado de reportes generados
 * - Descarga CSV
 * 
 * @author GEFA — Gestión Familiar
 * @date Enero 9, 2026
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '@/app/admin/AdminNav';

interface Report {
  id: string;
  reportType: string;
  title: string;
  periodFrom: string;
  periodTo: string;
  generatedAt: string;
  downloadCount: number;
  generatedBy: {
    firstName: string;
    firstLastName: string;
    email: string;
    role: {
      name: string;
    };
  };
}

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Formulario
  const [reportType, setReportType] = useState('MONTHLY_MANAGEMENT');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');

  // Cargar reportes existentes
  const loadReports = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/reports');

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/login');
          return;
        }
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

  // Generar reporte
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError('');
    setSuccessMessage('');

    try {
      // Validar fechas
      if (!periodFrom || !periodTo) {
        setError('Seleccione el período del reporte');
        setGenerating(false);
        return;
      }

      const from = new Date(periodFrom);
      const to = new Date(periodTo);

      if (from > to) {
        setError('La fecha de inicio no puede ser posterior a la fecha de fin');
        setGenerating(false);
        return;
      }

      // Generar reporte
      const res = await fetch('/api/v1/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType,
          periodFrom: from.toISOString(),
          periodTo: to.toISOString(),
        }),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/login');
          return;
        }
        const errorData = await res.json();
        throw new Error(errorData.error || `Error ${res.status}`);
      }

      const data = await res.json();
      setSuccessMessage(`Reporte generado exitosamente: ${data.data.title}`);

      // Recargar lista
      await loadReports();

      // Limpiar formulario
      setPeriodFrom('');
      setPeriodTo('');
    } catch (err) {
      console.error('Error al generar reporte:', err);
      setError(err instanceof Error ? err.message : 'Error al generar reporte');
    } finally {
      setGenerating(false);
    }
  };

  // Descargar reporte
  const handleDownload = async (reportId: string, reportTitle: string) => {
    try {
      const res = await fetch(`/api/v1/reports/download/${reportId}?format=csv`);

      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Recargar para actualizar contador
      await loadReports();
    } catch (err) {
      console.error('Error al descargar reporte:', err);
      setError('Error al descargar reporte. Intente nuevamente.');
    }
  };

  const reportTypeOptions = [
    { value: 'MONTHLY_MANAGEMENT', label: 'Gestión Mensual de Casos' },
    { value: 'SLA_COMPLIANCE', label: 'Cumplimiento SLA Institucional' },
    { value: 'WORKLOAD', label: 'Carga Operativa por Funcionario' },
    { value: 'QUALITY', label: 'Calidad y Trazabilidad' },
    { value: 'HISTORICAL', label: 'Histórico Consolidado' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav userRole="" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            📄 Reportes Institucionales
          </h1>
          <p className="mt-2 text-gray-600">
            Generación de reportes oficiales para control interno y dirección
          </p>
        </div>

        {/* Formulario de generación */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Generar Nuevo Reporte
          </h2>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Reporte
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                {reportTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {reportType === 'MONTHLY_MANAGEMENT' &&
                  'Reporte ejecutivo de gestión mensual de expedientes'}
                {reportType === 'SLA_COMPLIANCE' &&
                  'Análisis de cumplimiento de términos legales'}
                {reportType === 'WORKLOAD' &&
                  'Distribución de carga entre funcionarios'}
                {reportType === 'QUALITY' &&
                  'Indicadores de calidad y trazabilidad'}
                {reportType === 'HISTORICAL' &&
                  'Consolidado histórico con tendencias'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={periodFrom}
                  onChange={(e) => setPeriodFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={periodTo}
                  onChange={(e) => setPeriodTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={generating}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 font-medium"
            >
              {generating ? 'Generando reporte...' : '📊 Generar Reporte'}
            </button>
          </form>

          {/* Mensajes */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {successMessage}
            </div>
          )}
        </div>

        {/* Nota institucional */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            ℹ️ Sobre los Reportes Institucionales
          </h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>
              • Los reportes son documentos oficiales con valor probatorio
            </p>
            <p>
              • Cada reporte incluye un hash SHA-256 para verificar integridad
            </p>
            <p>• La generación y descarga quedan registradas en auditoría</p>
            <p>
              • Cumplen con Ley 1712/2014 (Transparencia y Acceso a la
              Información)
            </p>
          </div>
        </div>

        {/* Lista de reportes generados */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Reportes Generados
            </h2>
          </div>

          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando reportes...</p>
            </div>
          )}

          {!loading && reports.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No hay reportes generados aún
            </div>
          )}

          {!loading && reports.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <caption className="sr-only">Listado de reportes generados del sistema</caption>
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reporte
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Período
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Generado
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Por
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descargas
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {report.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {report.reportType}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {new Date(report.periodFrom).toLocaleDateString('es-CO')}
                        {' - '}
                        {new Date(report.periodTo).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {new Date(report.generatedAt).toLocaleString('es-CO')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {report.generatedBy.firstName}{' '}
                        {report.generatedBy.firstLastName}
                        <div className="text-xs text-gray-500">
                          {report.generatedBy.role.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {report.downloadCount}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleDownload(report.id, report.title)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                          aria-label={`Descargar reporte ${report.title}`}
                        >
                          📥 Descargar CSV
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
    </div>
  );
}
