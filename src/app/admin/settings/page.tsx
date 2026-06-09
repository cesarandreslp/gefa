/**
 * PÁGINA ADMIN: Configuración del Sistema
 * 
 * Gestión centralizada de parámetros institucionales
 * 
 * Acceso: ADMIN
 * Ruta: /admin/settings
 * 
 * Características:
 * - Editor de festivos (calendario)
 * - Horarios de atención
 * - Días hábiles
 * - Configuración de tipos de caso
 * - Textos legales
 * - Información institucional
 * - Umbrales del sistema
 * - Auditoría de cambios
 * 
 * @author Sistema Ventanilla Única
 * @date Enero 12, 2026
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Holiday {
  date: string;
  name: string;
  type: 'NATIONAL' | 'REGIONAL' | 'INSTITUTIONAL';
}

interface BusinessHours {
  start: string; // HH:MM
  end: string; // HH:MM
}

type AttentionDay = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

interface LegalTexts {
  privacyPolicy: string;
  termsAndConditions: string;
  transparencyNote: string;
}

interface Settings {
  HOLIDAYS?: Holiday[];
  BUSINESS_HOURS?: BusinessHours;
  ATTENTION_DAYS?: AttentionDay[];
  LEGAL_TEXTS?: LegalTexts;
  INSTITUTION_NAME?: string;
  INSTITUTION_ADDRESS?: string;
  INSTITUTION_PHONE?: string;
  NOTIFICATION_FROM_EMAIL?: string;
  NOTIFICATION_FROM_NAME?: string;
  MAX_CASE_LOAD?: number;
  SLA_WARNING_THRESHOLD?: number;
  AUTO_ASSIGNMENT_ENABLED?: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings>({});
  const [activeSection, setActiveSection] = useState<string>('calendar');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Cargar configuración
  const loadSettings = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/settings');

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/admin/login');
          return;
        }
        throw new Error(`Error ${res.status}`);
      }

      const data = await res.json();
      
      // Convertir array de settings a objeto
      const settingsObj: Settings = {};
      data.data.forEach((item: { key: string; value: unknown }) => {
        settingsObj[item.key as keyof Settings] = item.value as never;
      });

      setSettings(settingsObj);
    } catch (err) {
      console.error('Error al cargar configuración:', err);
      setError('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guardar un setting
  const saveSetting = async (key: string, value: unknown) => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/v1/settings/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || `Error ${res.status}`);
      }

      setSuccess('Configuración guardada exitosamente');
      
      // Actualizar estado local
      setSettings((prev) => ({ ...prev, [key]: value }));

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error al guardar:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  // Agregar festivo
  const addHoliday = (holiday: Holiday) => {
    const currentHolidays = settings.HOLIDAYS || [];
    const updatedHolidays = [...currentHolidays, holiday];
    saveSetting('HOLIDAYS', updatedHolidays);
  };

  // Eliminar festivo
  const removeHoliday = (index: number) => {
    const currentHolidays = settings.HOLIDAYS || [];
    const updatedHolidays = currentHolidays.filter((_, i) => i !== index);
    saveSetting('HOLIDAYS', updatedHolidays);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configuración del Sistema</h1>
        <p className="mt-2 text-gray-600">
          Gestione los parámetros institucionales sin modificar código
        </p>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r" role="alert">
          <p className="text-red-800">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r" role="status">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar de navegación */}
        <div className="lg:col-span-1">
          <nav className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setActiveSection('calendar')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeSection === 'calendar'
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  📅 Calendario
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveSection('hours')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeSection === 'hours'
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  🕐 Horarios
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveSection('legal')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeSection === 'legal'
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  📜 Textos Legales
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveSection('institution')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeSection === 'institution'
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  🏛️ Institución
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveSection('thresholds')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeSection === 'thresholds'
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  ⚙️ Umbrales
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* Contenido principal */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Sección: Calendario */}
            {activeSection === 'calendar' && (
              <CalendarSection
                holidays={settings.HOLIDAYS || []}
                attentionDays={settings.ATTENTION_DAYS || ['MON', 'TUE', 'WED', 'THU', 'FRI']}
                onAddHoliday={addHoliday}
                onRemoveHoliday={removeHoliday}
                onUpdateAttentionDays={(days) => saveSetting('ATTENTION_DAYS', days)}
                saving={saving}
              />
            )}

            {/* Sección: Horarios */}
            {activeSection === 'hours' && (
              <HoursSection
                businessHours={settings.BUSINESS_HOURS || { start: '08:00', end: '17:00' }}
                onSave={(hours) => saveSetting('BUSINESS_HOURS', hours)}
                saving={saving}
              />
            )}

            {/* Sección: Textos Legales */}
            {activeSection === 'legal' && (
              <LegalTextsSection
                legalTexts={
                  settings.LEGAL_TEXTS || {
                    privacyPolicy: '',
                    termsAndConditions: '',
                    transparencyNote: '',
                  }
                }
                onSave={(texts) => saveSetting('LEGAL_TEXTS', texts)}
                saving={saving}
              />
            )}

            {/* Sección: Información Institucional */}
            {activeSection === 'institution' && (
              <InstitutionSection
                institutionName={settings.INSTITUTION_NAME || ''}
                institutionAddress={settings.INSTITUTION_ADDRESS || ''}
                institutionPhone={settings.INSTITUTION_PHONE || ''}
                notificationEmail={settings.NOTIFICATION_FROM_EMAIL || ''}
                notificationName={settings.NOTIFICATION_FROM_NAME || ''}
                onSaveInstitutionName={(name) => saveSetting('INSTITUTION_NAME', name)}
                onSaveInstitutionAddress={(address) => saveSetting('INSTITUTION_ADDRESS', address)}
                onSaveInstitutionPhone={(phone) => saveSetting('INSTITUTION_PHONE', phone)}
                onSaveNotificationEmail={(email) => saveSetting('NOTIFICATION_FROM_EMAIL', email)}
                onSaveNotificationName={(name) => saveSetting('NOTIFICATION_FROM_NAME', name)}
              />
            )}

            {/* Sección: Umbrales del Sistema */}
            {activeSection === 'thresholds' && (
              <ThresholdsSection
                maxCaseLoad={settings.MAX_CASE_LOAD || 50}
                slaWarningThreshold={settings.SLA_WARNING_THRESHOLD || 75}
                autoAssignmentEnabled={settings.AUTO_ASSIGNMENT_ENABLED ?? true}
                onSaveMaxCaseLoad={(val) => saveSetting('MAX_CASE_LOAD', val)}
                onSaveSlaWarningThreshold={(val) => saveSetting('SLA_WARNING_THRESHOLD', val)}
                onSaveAutoAssignment={(val) => saveSetting('AUTO_ASSIGNMENT_ENABLED', val)}
                saving={saving}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE: CalendarSection
// ============================================================================
interface CalendarSectionProps {
  holidays: Holiday[];
  attentionDays: AttentionDay[];
  onAddHoliday: (holiday: Holiday) => void;
  onRemoveHoliday: (index: number) => void;
  onUpdateAttentionDays: (days: AttentionDay[]) => void;
  saving: boolean;
}

function CalendarSection({
  holidays,
  attentionDays,
  onAddHoliday,
  onRemoveHoliday,
  onUpdateAttentionDays,
  saving,
}: CalendarSectionProps) {
  const [newHoliday, setNewHoliday] = useState<Holiday>({
    date: '',
    name: '',
    type: 'NATIONAL',
  });

  const handleAddHoliday = () => {
    if (!newHoliday.date || !newHoliday.name) {
      alert('Complete todos los campos');
      return;
    }

    onAddHoliday(newHoliday);
    setNewHoliday({ date: '', name: '', type: 'NATIONAL' });
  };

  const toggleAttentionDay = (day: AttentionDay) => {
    if (attentionDays.includes(day)) {
      onUpdateAttentionDays(attentionDays.filter((d) => d !== day));
    } else {
      onUpdateAttentionDays([...attentionDays, day]);
    }
  };

  const dayLabels: Record<AttentionDay, string> = {
    MON: 'Lunes',
    TUE: 'Martes',
    WED: 'Miércoles',
    THU: 'Jueves',
    FRI: 'Viernes',
    SAT: 'Sábado',
    SUN: 'Domingo',
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Calendario y Días de Atención</h2>

      {/* Días de atención */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Días de Atención</h3>
        <div className="grid grid-cols-7 gap-2">
          {(Object.keys(dayLabels) as AttentionDay[]).map((day) => (
            <button
              key={day}
              onClick={() => toggleAttentionDay(day)}
              disabled={saving}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                attentionDays.includes(day)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {dayLabels[day]}
            </button>
          ))}
        </div>
      </div>

      {/* Festivos */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Festivos y Días No Hábiles</h3>

        {/* Formulario para agregar festivo */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="holiday-date" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha
              </label>
              <input
                type="date"
                id="holiday-date"
                value={newHoliday.date}
                onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="holiday-name" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <input
                type="text"
                id="holiday-name"
                value={newHoliday.name}
                onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                placeholder="Ej: Año Nuevo"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="holiday-type" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                id="holiday-type"
                value={newHoliday.type}
                onChange={(e) =>
                  setNewHoliday({ ...newHoliday, type: e.target.value as Holiday['type'] })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="NATIONAL">Nacional</option>
                <option value="REGIONAL">Regional</option>
                <option value="INSTITUTIONAL">Institucional</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleAddHoliday}
            disabled={saving}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Agregar Festivo
          </button>
        </div>

        {/* Lista de festivos */}
        <div className="space-y-2">
          {holidays.length === 0 && (
            <p className="text-gray-500 text-center py-4">No hay festivos configurados</p>
          )}
          {holidays.map((holiday, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div>
                <p className="font-medium text-gray-900">{holiday.name}</p>
                <p className="text-sm text-gray-600">
                  {new Date(holiday.date + 'T00:00:00').toLocaleDateString('es-CO', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}{' '}
                  - {holiday.type}
                </p>
              </div>
              <button
                onClick={() => onRemoveHoliday(index)}
                disabled={saving}
                className="text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
                aria-label={`Eliminar festivo ${holiday.name}`}
              >
                ❌
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE: HoursSection
// ============================================================================
interface HoursSectionProps {
  businessHours: BusinessHours;
  onSave: (hours: BusinessHours) => void;
  saving: boolean;
}

function HoursSection({ businessHours, onSave, saving }: HoursSectionProps) {
  const [hours, setHours] = useState(businessHours);

  const handleSave = () => {
    if (!hours.start || !hours.end) {
      alert('Complete todos los campos');
      return;
    }

    if (hours.start >= hours.end) {
      alert('La hora de inicio debe ser menor que la hora de fin');
      return;
    }

    onSave(hours);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Horarios de Atención</h2>

      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="start-time" className="block text-sm font-medium text-gray-700 mb-2">
              Hora de Inicio
            </label>
            <input
              type="time"
              id="start-time"
              value={hours.start}
              onChange={(e) => setHours({ ...hours, start: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="end-time" className="block text-sm font-medium text-gray-700 mb-2">
              Hora de Fin
            </label>
            <input
              type="time"
              id="end-time"
              value={hours.end}
              onChange={(e) => setHours({ ...hours, end: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar Horarios'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE: LegalTextsSection
// ============================================================================
interface LegalTextsSectionProps {
  legalTexts: LegalTexts;
  onSave: (texts: LegalTexts) => void;
  saving: boolean;
}

function LegalTextsSection({ legalTexts, onSave, saving }: LegalTextsSectionProps) {
  const [texts, setTexts] = useState(legalTexts);

  const handleSave = () => {
    onSave(texts);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Textos Legales</h2>

      <div className="space-y-6">
        <div>
          <label htmlFor="privacy-policy" className="block text-sm font-medium text-gray-700 mb-2">
            Política de Privacidad
          </label>
          <textarea
            id="privacy-policy"
            value={texts.privacyPolicy}
            onChange={(e) => setTexts({ ...texts, privacyPolicy: e.target.value })}
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Política de privacidad..."
          />
        </div>

        <div>
          <label htmlFor="terms" className="block text-sm font-medium text-gray-700 mb-2">
            Términos y Condiciones
          </label>
          <textarea
            id="terms"
            value={texts.termsAndConditions}
            onChange={(e) => setTexts({ ...texts, termsAndConditions: e.target.value })}
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Términos y condiciones..."
          />
        </div>

        <div>
          <label htmlFor="transparency" className="block text-sm font-medium text-gray-700 mb-2">
            Nota de Transparencia
          </label>
          <textarea
            id="transparency"
            value={texts.transparencyNote}
            onChange={(e) => setTexts({ ...texts, transparencyNote: e.target.value })}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nota de transparencia..."
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar Textos Legales'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE: InstitutionSection
// ============================================================================
interface InstitutionSectionProps {
  institutionName: string;
  institutionAddress: string;
  institutionPhone: string;
  notificationEmail: string;
  notificationName: string;
  onSaveInstitutionName: (name: string) => void;
  onSaveInstitutionAddress: (address: string) => void;
  onSaveInstitutionPhone: (phone: string) => void;
  onSaveNotificationEmail: (email: string) => void;
  onSaveNotificationName: (name: string) => void;
}

function InstitutionSection({
  institutionName,
  institutionAddress,
  institutionPhone,
  notificationEmail,
  notificationName,
  onSaveInstitutionName,
  onSaveInstitutionAddress,
  onSaveInstitutionPhone,
  onSaveNotificationEmail,
  onSaveNotificationName,
}: InstitutionSectionProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Información Institucional</h2>

      <div className="space-y-6">
        {/* Nombre */}
        <div>
          <label htmlFor="inst-name" className="block text-sm font-medium text-gray-700 mb-2">
            Nombre de la Institución
          </label>
          <input
            type="text"
            id="inst-name"
            value={institutionName}
            onChange={(e) => onSaveInstitutionName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Dirección */}
        <div>
          <label htmlFor="inst-address" className="block text-sm font-medium text-gray-700 mb-2">
            Dirección
          </label>
          <input
            type="text"
            id="inst-address"
            value={institutionAddress}
            onChange={(e) => onSaveInstitutionAddress(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Teléfono */}
        <div>
          <label htmlFor="inst-phone" className="block text-sm font-medium text-gray-700 mb-2">
            Teléfono
          </label>
          <input
            type="tel"
            id="inst-phone"
            value={institutionPhone}
            onChange={(e) => onSaveInstitutionPhone(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Email notificaciones */}
        <div>
          <label htmlFor="notif-email" className="block text-sm font-medium text-gray-700 mb-2">
            Email para Notificaciones
          </label>
          <input
            type="email"
            id="notif-email"
            value={notificationEmail}
            onChange={(e) => onSaveNotificationEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Nombre remitente notificaciones */}
        <div>
          <label htmlFor="notif-name" className="block text-sm font-medium text-gray-700 mb-2">
            Nombre del Remitente
          </label>
          <input
            type="text"
            id="notif-name"
            value={notificationName}
            onChange={(e) => onSaveNotificationName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE: ThresholdsSection
// ============================================================================
interface ThresholdsSectionProps {
  maxCaseLoad: number;
  slaWarningThreshold: number;
  autoAssignmentEnabled: boolean;
  onSaveMaxCaseLoad: (val: number) => void;
  onSaveSlaWarningThreshold: (val: number) => void;
  onSaveAutoAssignment: (val: boolean) => void;
  saving: boolean;
}

function ThresholdsSection({
  maxCaseLoad,
  slaWarningThreshold,
  autoAssignmentEnabled,
  onSaveMaxCaseLoad,
  onSaveSlaWarningThreshold,
  onSaveAutoAssignment,
}: ThresholdsSectionProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Umbrales del Sistema</h2>

      <div className="space-y-6">
        {/* Max case load */}
        <div>
          <label htmlFor="max-load" className="block text-sm font-medium text-gray-700 mb-2">
            Carga Máxima de Casos por Funcionario
          </label>
          <input
            type="number"
            id="max-load"
            value={maxCaseLoad}
            onChange={(e) => onSaveMaxCaseLoad(parseInt(e.target.value, 10))}
            min={1}
            max={999}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-sm text-gray-600">
            Número máximo de casos activos que puede tener un funcionario
          </p>
        </div>

        {/* SLA warning threshold */}
        <div>
          <label htmlFor="sla-threshold" className="block text-sm font-medium text-gray-700 mb-2">
            Umbral de Advertencia SLA (%)
          </label>
          <input
            type="number"
            id="sla-threshold"
            value={slaWarningThreshold}
            onChange={(e) => onSaveSlaWarningThreshold(parseInt(e.target.value, 10))}
            min={0}
            max={100}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-sm text-gray-600">
            Porcentaje de tiempo restante para mostrar advertencia
          </p>
        </div>

        {/* Auto assignment */}
        <div>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={autoAssignmentEnabled}
              onChange={(e) => onSaveAutoAssignment(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Habilitar asignación automática de casos
            </span>
          </label>
          <p className="ml-8 mt-1 text-sm text-gray-600">
            Asigna automáticamente casos nuevos según carga de trabajo
          </p>
        </div>
      </div>
    </div>
  );
}
