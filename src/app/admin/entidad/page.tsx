'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AVAILABLE_ICONS, ICON_LABELS } from '@/lib/landingDefaults';
import type { LandingConfig } from '@/lib/landingDefaults';

export default function TenantEntidadPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    address: '',
    phone: '',
    institutionalEmail: '',
    anticorruptionPhone: '',
    judicialNoticesEmail: '',
    logoUrl: '',
    primaryColor: '#1D4ED8',
    groqApiKey: '',
    smtpUser: '',
    smtpPass: '',
    smtpFromName: '',
  });
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  const [landingConfig, setLandingConfig] = useState<LandingConfig | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch('/api/v1/tenant-settings');
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al cargar los datos');
      
      const d = json.data;
      setFormData({
        address: d?.address || '',
        phone: d?.phone || '',
        institutionalEmail: d?.institutionalEmail || '',
        anticorruptionPhone: d?.anticorruptionPhone || '',
        judicialNoticesEmail: d?.judicialNoticesEmail || '',
        logoUrl: d?.logoUrl || '',
        primaryColor: d?.primaryColor || '#1D4ED8',
        groqApiKey: d?.groqApiKey || '',
        smtpUser: d?.smtpUser || '',
        smtpPass: d?.smtpPass || '',
        smtpFromName: d?.smtpFromName || '',
      });

      // Cargar landing config desde mi-entidad API
      try {
        const lcRes = await fetch('/api/v1/mi-entidad');
        if (lcRes.ok) {
          const lcJson = await lcRes.json();
          if (lcJson.data?.landingConfig) {
            setLandingConfig(lcJson.data.landingConfig);
          }
        }
      } catch { /* silenciar error de landing */ }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/v1/tenant-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const json = await res.json();

      if (!res.ok) {
        if (json.details) {
          // Flatten Zod errors
          const errors = Object.values(json.details)
            .map((e: any) => e?._errors?.[0])
            .filter(Boolean);
          throw new Error(errors.join(', ') || json.error);
        }
        throw new Error(json.error || 'Error al guardar');
      }

      setSuccess('Configuración institucional guardada exitosamente');

      // Guardar landing config si se modificó
      if (landingConfig) {
        const lcRes = await fetch('/api/v1/mi-entidad', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ landingConfig })
        });
        if (!lcRes.ok) {
          console.warn('Error al guardar servicios de landing');
        }
      }

      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando configuración de la entidad...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configuración de la Entidad</h1>
        <p className="mt-2 text-gray-600">
          Esta información se mostrará públicamente a los ciudadanos en el pie de página y los comprobantes oficiales.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r shadow-sm">
          <p className="text-red-800">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r shadow-sm">
          <p className="text-green-800 font-medium">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-3">Información de Contacto</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección Principal / Sede Electrónica
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              placeholder="Ej: Calle 1 # 2-3, Barrio Centro"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono / Conmutador
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="Ej: (+57) 2 0000000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correo Electrónico Institucional
            </label>
            <input
              type="email"
              value={formData.institutionalEmail}
              onChange={(e) => setFormData({...formData, institutionalEmail: e.target.value})}
              placeholder="Ej: contactenos@municipio.gov.co"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notificaciones Judiciales
            </label>
            <input
              type="email"
              value={formData.judicialNoticesEmail}
              onChange={(e) => setFormData({...formData, judicialNoticesEmail: e.target.value})}
              placeholder="Ej: notificaciones@municipio.gov.co"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Línea Anticorrupción
            </label>
            <input
              type="text"
              value={formData.anticorruptionPhone}
              onChange={(e) => setFormData({...formData, anticorruptionPhone: e.target.value})}
              placeholder="Ej: (+57) 018000919748"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <p className="text-xs text-gray-500 mt-1">Este número se mostrará resaltado en el portal para denuncias de corrupción.</p>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-800 border-b pb-3 mt-8">Identidad Visual (Branding)</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enlace del Escudo / Logo (URL)
            </label>
            <input
              type="url"
              value={formData.logoUrl}
              onChange={(e) => setFormData({...formData, logoUrl: e.target.value})}
              placeholder="https://..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color Primario
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.primaryColor || '#000000'}
                onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
                className="w-12 h-10 border-0 rounded cursor-pointer p-0"
              />
              <input
                type="text"
                value={formData.primaryColor}
                onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
                placeholder="#1D4ED8"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
              />
            </div>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-800 border-b pb-3 mt-8">Correo Institucional (SMTP)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cuenta de correo (Gmail)</label>
            <input
              type="email"
              value={formData.smtpUser}
              onChange={(e) => setFormData({...formData, smtpUser: e.target.value})}
              placeholder="notificaciones@entidad.gov.co"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña de aplicación</label>
            <div className="relative">
              <input
                type={showSmtpPass ? 'text' : 'password'}
                value={formData.smtpPass}
                onChange={(e) => setFormData({...formData, smtpPass: e.target.value})}
                placeholder="xxxx xxxx xxxx xxxx"
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
              />
              <button type="button" onClick={() => setShowSmtpPass(!showSmtpPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showSmtpPass ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Genera una en Google → Cuenta → Seguridad → Contraseñas de aplicación.</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del remitente</label>
            <input
              type="text"
              value={formData.smtpFromName}
              onChange={(e) => setFormData({...formData, smtpFromName: e.target.value})}
              placeholder="Ej: Nombre oficial de la entidad"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <p className="text-xs text-gray-500 mt-1">Así aparecerá la entidad en el correo del ciudadano.</p>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-800 border-b pb-3 mt-8">Inteligencia Artificial</h2>
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GROQ API Key
            </label>
            <input
              type="password"
              value={formData.groqApiKey}
              onChange={(e) => setFormData({...formData, groqApiKey: e.target.value})}
              placeholder="gsk_..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              API key exclusiva para esta entidad. Si se deja vacía, se usará la key global del sistema como respaldo.
            </p>
          </div>
        </div>

        {/* Servicios de la Página Principal */}
        {landingConfig && (
          <>
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-3 mt-8">Servicios de la Página Principal</h2>
            <p className="text-sm text-gray-500 mb-4">
              Estos servicios se muestran a los ciudadanos en la página de inicio. Puede editar el título, descripción y enlace de cada uno.
            </p>

            {/* Hero subtitle */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Subtítulo del Banner Principal</label>
              <input
                type="text"
                value={landingConfig.heroSubtitle}
                onChange={(e) => setLandingConfig({...landingConfig, heroSubtitle: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* CTA text */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Texto del Llamado a la Acción</label>
              <input
                type="text"
                value={landingConfig.ctaText}
                onChange={(e) => setLandingConfig({...landingConfig, ctaText: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Services list */}
            <div className="space-y-4">
              {landingConfig.services.map((service, index) => (
                <div
                  key={service.id}
                  className={`border rounded-lg p-4 ${
                    service.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-medium text-gray-700">#{index + 1}</span>
                      <select
                        value={service.icon}
                        onChange={(e) => {
                          const updated = [...landingConfig.services];
                          updated[index] = { ...updated[index], icon: e.target.value };
                          setLandingConfig({...landingConfig, services: updated});
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        {AVAILABLE_ICONS.map(icon => (
                          <option key={icon} value={icon}>{ICON_LABELS[icon] ?? icon}</option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={service.enabled}
                        onChange={(e) => {
                          const updated = [...landingConfig.services];
                          updated[index] = { ...updated[index], enabled: e.target.checked };
                          setLandingConfig({...landingConfig, services: updated});
                        }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-600">Visible</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Título</label>
                      <input
                        type="text"
                        value={service.title}
                        onChange={(e) => {
                          const updated = [...landingConfig.services];
                          updated[index] = { ...updated[index], title: e.target.value };
                          setLandingConfig({...landingConfig, services: updated});
                        }}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Texto del Botón</label>
                      <input
                        type="text"
                        value={service.linkText}
                        onChange={(e) => {
                          const updated = [...landingConfig.services];
                          updated[index] = { ...updated[index], linkText: e.target.value };
                          setLandingConfig({...landingConfig, services: updated});
                        }}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Descripción</label>
                      <textarea
                        value={service.description}
                        onChange={(e) => {
                          const updated = [...landingConfig.services];
                          updated[index] = { ...updated[index], description: e.target.value };
                          setLandingConfig({...landingConfig, services: updated});
                        }}
                        rows={2}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">URL del Enlace</label>
                      <input
                        type="text"
                        value={service.linkUrl}
                        onChange={(e) => {
                          const updated = [...landingConfig.services];
                          updated[index] = { ...updated[index], linkUrl: e.target.value };
                          setLandingConfig({...landingConfig, services: updated});
                        }}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="pt-6 border-t flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium shadow-sm hover:shadow"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Guardar Configuración
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
