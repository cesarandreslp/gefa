/**
 * Página de Administración de SLA
 * /admin/sla-config
 * Solo ADMIN
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SLAConfig {
  id: string;
  caseTypeId: string;
  slaDays: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  caseType: {
    code: string;
    name: string;
  };
}

interface CaseType {
  id: string;
  code: string;
  name: string;
  defaultLegalTermDays: number;
}

export default function SLAConfigPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<SLAConfig[]>([]);
  const [caseTypes, setCaseTypes] = useState<CaseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SLAConfig | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    caseTypeId: '',
    slaDays: 15,
    description: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/login');
        return;
      }

      // Cargar configuraciones existentes
      const configsRes = await fetch('/api/v1/sla-config', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!configsRes.ok) throw new Error('Error al cargar configuraciones');
      
      const configsData = await configsRes.json();
      setConfigs(configsData.configs || []);

      // Cargar tipos de caso
      const typesRes = await fetch('/api/v1/case-types', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!typesRes.ok) throw new Error('Error al cargar tipos de caso');
      
      const typesData = await typesRes.json();
      setCaseTypes(typesData.caseTypes || []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const url = editingConfig
        ? `/api/v1/sla-config/${editingConfig.caseTypeId}`
        : '/api/v1/sla-config';
      
      const method = editingConfig ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }

      // Recargar datos y cerrar formulario
      await loadData();
      setShowForm(false);
      setEditingConfig(null);
      setFormData({ caseTypeId: '', slaDays: 15, description: '' });

    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar');
    }
  };

  const handleEdit = (config: SLAConfig) => {
    setEditingConfig(config);
    setFormData({
      caseTypeId: config.caseTypeId,
      slaDays: config.slaDays,
      description: config.description || '',
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingConfig(null);
    setFormData({ caseTypeId: '', slaDays: 15, description: '' });
  };

  if (loading) {
    return (
      <div className="p-8">
        <p>Cargando configuraciones...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Configuración de SLA
          </h1>
          <p className="text-gray-600 mt-2">
            Gestión de términos de respuesta institucional
          </p>
        </div>
        
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Nueva Configuración
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="mb-6 p-6 border border-gray-200 rounded-lg bg-white shadow">
          <h2 className="text-xl font-bold mb-4">
            {editingConfig ? 'Editar' : 'Nueva'} Configuración SLA
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo de Caso */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Caso *
              </label>
              <select
                value={formData.caseTypeId}
                onChange={(e) => setFormData({ ...formData, caseTypeId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                required
                disabled={!!editingConfig}
              >
                <option value="">Seleccione...</option>
                {caseTypes.map((type) => {
                  const hasConfig = configs.some(c => c.caseTypeId === type.id);
                  return (
                    <option 
                      key={type.id} 
                      value={type.id}
                      disabled={hasConfig && !editingConfig}
                    >
                      {type.name} ({type.code}) {hasConfig ? '✓' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Días SLA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Días Hábiles (SLA) *
              </label>
              <input
                type="number"
                min="1"
                max="180"
                value={formData.slaDays}
                onChange={(e) => setFormData({ ...formData, slaDays: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                required
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                rows={3}
                placeholder="Observaciones adicionales sobre este SLA..."
              />
            </div>

            {/* Botones */}
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {editingConfig ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla de Configuraciones */}
      <div className="bg-white border border-gray-200 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <caption className="sr-only">Configuración de SLA por tipo de caso</caption>
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Tipo de Caso
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Código
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Días SLA
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Descripción
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Estado
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {configs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No hay configuraciones. Cree una para comenzar.
                </td>
              </tr>
            ) : (
              configs.map((config) => (
                <tr key={config.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {config.caseType.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {config.caseType.code}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {config.slaDays} días
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {config.description || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${
                      config.isActive 
                        ? 'bg-green-100 text-green-800 border-green-300' 
                        : 'bg-gray-100 text-gray-800 border-gray-300'
                    }`}>
                      {config.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => handleEdit(config)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                      aria-label={`Editar configuración de ${config.caseType.name}`}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
