/**
 * /admin/settings — Configuración del Sistema
 * Gestión centralizada de parámetros institucionales. Estilo inline (el proyecto
 * no usa Tailwind). Acceso: ADMIN.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings as SettingsIcon } from 'lucide-react';
import AdminPageHeader from '../AdminPageHeader';

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

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.5rem' };
const input: React.CSSProperties = { width: '100%', padding: '0.6rem 0.7rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.88rem', boxSizing: 'border-box' };
const label: React.CSSProperties = { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 5 };
const help: React.CSSProperties = { margin: '0.35rem 0 0', fontSize: '0.78rem', color: '#94a3b8' };
const sectionTitle: React.CSSProperties = { fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1.25rem' };

function primaryBtn(disabled?: boolean): React.CSSProperties {
  return { background: disabled ? '#9ca3af' : 'var(--color-primary, #2563eb)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.65rem 1.25rem', fontWeight: 600, fontSize: '0.9rem', cursor: disabled ? 'wait' : 'pointer' };
}

const SECTIONS: { id: string; label: string; icon: string }[] = [
  { id: 'calendar', label: 'Calendario', icon: '📅' },
  { id: 'hours', label: 'Horarios', icon: '🕐' },
  { id: 'legal', label: 'Textos Legales', icon: '📜' },
  { id: 'institution', label: 'Institución', icon: '🏛️' },
  { id: 'thresholds', label: 'Umbrales', icon: '⚙️' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings>({});
  const [activeSection, setActiveSection] = useState<string>('calendar');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const saveSetting = async (key: string, value: unknown) => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/v1/settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || `Error ${res.status}`);
      }

      setSuccess('Configuración guardada exitosamente');
      setSettings((prev) => ({ ...prev, [key]: value }));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error al guardar:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const addHoliday = (holiday: Holiday) => {
    const currentHolidays = settings.HOLIDAYS || [];
    saveSetting('HOLIDAYS', [...currentHolidays, holiday]);
  };

  const removeHoliday = (index: number) => {
    const currentHolidays = settings.HOLIDAYS || [];
    saveSetting('HOLIDAYS', currentHolidays.filter((_, i) => i !== index));
  };

  if (loading) {
    return <p style={{ color: '#94a3b8', padding: '2rem 0', textAlign: 'center' }}>Cargando configuración…</p>;
  }

  return (
    <div>
      <AdminPageHeader
        title="Configuración del Sistema"
        subtitle="Gestione los parámetros institucionales sin modificar código."
        icon={<SettingsIcon size={24} />}
      />

      {error && (
        <div style={{ marginBottom: '1.5rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.88rem' }} role="alert">{error}</div>
      )}
      {success && (
        <div style={{ marginBottom: '1.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.88rem' }} role="status">{success}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 220px) 1fr', gap: 24, alignItems: 'start' }}>
        <nav style={{ ...card, padding: '0.75rem' }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {SECTIONS.map((s) => {
              const active = activeSection === s.id;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setActiveSection(s.id)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '0.6rem 0.85rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: '0.88rem', fontWeight: active ? 600 : 500,
                      background: active ? 'var(--color-primary, #2563eb)' : 'transparent',
                      color: active ? '#fff' : '#475569',
                    }}
                  >
                    {s.icon} {s.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div style={card}>
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

          {activeSection === 'hours' && (
            <HoursSection
              businessHours={settings.BUSINESS_HOURS || { start: '08:00', end: '17:00' }}
              onSave={(hours) => saveSetting('BUSINESS_HOURS', hours)}
              saving={saving}
            />
          )}

          {activeSection === 'legal' && (
            <LegalTextsSection
              legalTexts={settings.LEGAL_TEXTS || { privacyPolicy: '', termsAndConditions: '', transparencyNote: '' }}
              onSave={(texts) => saveSetting('LEGAL_TEXTS', texts)}
              saving={saving}
            />
          )}

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
  );
}

// ============================================================================
// CalendarSection
// ============================================================================
interface CalendarSectionProps {
  holidays: Holiday[];
  attentionDays: AttentionDay[];
  onAddHoliday: (holiday: Holiday) => void;
  onRemoveHoliday: (index: number) => void;
  onUpdateAttentionDays: (days: AttentionDay[]) => void;
  saving: boolean;
}

function CalendarSection({ holidays, attentionDays, onAddHoliday, onRemoveHoliday, onUpdateAttentionDays, saving }: CalendarSectionProps) {
  const [newHoliday, setNewHoliday] = useState<Holiday>({ date: '', name: '', type: 'NATIONAL' });

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
    MON: 'Lunes', TUE: 'Martes', WED: 'Miércoles', THU: 'Jueves', FRI: 'Viernes', SAT: 'Sábado', SUN: 'Domingo',
  };

  return (
    <div>
      <h2 style={sectionTitle}>Calendario y Días de Atención</h2>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155', margin: '0 0 0.75rem' }}>Días de Atención</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(Object.keys(dayLabels) as AttentionDay[]).map((day) => {
            const active = attentionDays.includes(day);
            return (
              <button
                key={day}
                onClick={() => toggleAttentionDay(day)}
                disabled={saving}
                style={{
                  padding: '0.5rem 0.85rem', borderRadius: 8, border: 'none', fontSize: '0.83rem', fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
                  background: active ? 'var(--color-primary, #2563eb)' : '#e2e8f0',
                  color: active ? '#fff' : '#475569',
                }}
              >
                {dayLabels[day]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155', margin: '0 0 0.75rem' }}>Festivos y Días No Hábiles</h3>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <div>
              <label htmlFor="holiday-date" style={label}>Fecha</label>
              <input type="date" id="holiday-date" value={newHoliday.date} onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })} style={input} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label htmlFor="holiday-name" style={label}>Nombre</label>
              <input type="text" id="holiday-name" value={newHoliday.name} onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })} placeholder="Ej: Año Nuevo" style={input} />
            </div>
            <div>
              <label htmlFor="holiday-type" style={label}>Tipo</label>
              <select id="holiday-type" value={newHoliday.type} onChange={(e) => setNewHoliday({ ...newHoliday, type: e.target.value as Holiday['type'] })} style={input}>
                <option value="NATIONAL">Nacional</option>
                <option value="REGIONAL">Regional</option>
                <option value="INSTITUTIONAL">Institucional</option>
              </select>
            </div>
          </div>
          <button onClick={handleAddHoliday} disabled={saving} style={{ ...primaryBtn(saving), marginTop: '1rem' }}>Agregar Festivo</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {holidays.length === 0 && (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>No hay festivos configurados</p>
          )}
          {holidays.map((holiday, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 8 }}>
              <div>
                <p style={{ fontWeight: 600, color: '#0f172a', margin: 0 }}>{holiday.name}</p>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.15rem 0 0' }}>
                  {new Date(holiday.date + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} - {holiday.type}
                </p>
              </div>
              <button onClick={() => onRemoveHoliday(index)} disabled={saving} style={{ background: 'none', border: 'none', cursor: saving ? 'wait' : 'pointer', fontSize: '1rem' }} aria-label={`Eliminar festivo ${holiday.name}`}>❌</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HoursSection
// ============================================================================
interface HoursSectionProps {
  businessHours: BusinessHours;
  onSave: (hours: BusinessHours) => void;
  saving: boolean;
}

function HoursSection({ businessHours, onSave, saving }: HoursSectionProps) {
  const [hours, setHours] = useState(businessHours);

  const handleSave = () => {
    if (!hours.start || !hours.end) { alert('Complete todos los campos'); return; }
    if (hours.start >= hours.end) { alert('La hora de inicio debe ser menor que la hora de fin'); return; }
    onSave(hours);
  };

  return (
    <div>
      <h2 style={sectionTitle}>Horarios de Atención</h2>
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div>
            <label htmlFor="start-time" style={label}>Hora de Inicio</label>
            <input type="time" id="start-time" value={hours.start} onChange={(e) => setHours({ ...hours, start: e.target.value })} style={input} />
          </div>
          <div>
            <label htmlFor="end-time" style={label}>Hora de Fin</label>
            <input type="time" id="end-time" value={hours.end} onChange={(e) => setHours({ ...hours, end: e.target.value })} style={input} />
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ ...primaryBtn(saving), marginTop: '1.5rem' }}>{saving ? 'Guardando…' : 'Guardar Horarios'}</button>
      </div>
    </div>
  );
}

// ============================================================================
// LegalTextsSection
// ============================================================================
interface LegalTextsSectionProps {
  legalTexts: LegalTexts;
  onSave: (texts: LegalTexts) => void;
  saving: boolean;
}

function LegalTextsSection({ legalTexts, onSave, saving }: LegalTextsSectionProps) {
  const [texts, setTexts] = useState(legalTexts);

  return (
    <div>
      <h2 style={sectionTitle}>Textos Legales</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label htmlFor="privacy-policy" style={label}>Política de Privacidad</label>
          <textarea id="privacy-policy" value={texts.privacyPolicy} onChange={(e) => setTexts({ ...texts, privacyPolicy: e.target.value })} rows={6} style={{ ...input, resize: 'vertical' }} placeholder="Política de privacidad…" />
        </div>
        <div>
          <label htmlFor="terms" style={label}>Términos y Condiciones</label>
          <textarea id="terms" value={texts.termsAndConditions} onChange={(e) => setTexts({ ...texts, termsAndConditions: e.target.value })} rows={6} style={{ ...input, resize: 'vertical' }} placeholder="Términos y condiciones…" />
        </div>
        <div>
          <label htmlFor="transparency" style={label}>Nota de Transparencia</label>
          <textarea id="transparency" value={texts.transparencyNote} onChange={(e) => setTexts({ ...texts, transparencyNote: e.target.value })} rows={4} style={{ ...input, resize: 'vertical' }} placeholder="Nota de transparencia…" />
        </div>
        <div>
          <button onClick={() => onSave(texts)} disabled={saving} style={primaryBtn(saving)}>{saving ? 'Guardando…' : 'Guardar Textos Legales'}</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// InstitutionSection
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
  institutionName, institutionAddress, institutionPhone, notificationEmail, notificationName,
  onSaveInstitutionName, onSaveInstitutionAddress, onSaveInstitutionPhone, onSaveNotificationEmail, onSaveNotificationName,
}: InstitutionSectionProps) {
  return (
    <div>
      <h2 style={sectionTitle}>Información Institucional</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label htmlFor="inst-name" style={label}>Nombre de la Institución</label>
          <input type="text" id="inst-name" value={institutionName} onChange={(e) => onSaveInstitutionName(e.target.value)} style={input} />
        </div>
        <div>
          <label htmlFor="inst-address" style={label}>Dirección</label>
          <input type="text" id="inst-address" value={institutionAddress} onChange={(e) => onSaveInstitutionAddress(e.target.value)} style={input} />
        </div>
        <div>
          <label htmlFor="inst-phone" style={label}>Teléfono</label>
          <input type="tel" id="inst-phone" value={institutionPhone} onChange={(e) => onSaveInstitutionPhone(e.target.value)} style={input} />
        </div>
        <div>
          <label htmlFor="notif-email" style={label}>Email para Notificaciones</label>
          <input type="email" id="notif-email" value={notificationEmail} onChange={(e) => onSaveNotificationEmail(e.target.value)} style={input} />
        </div>
        <div>
          <label htmlFor="notif-name" style={label}>Nombre del Remitente</label>
          <input type="text" id="notif-name" value={notificationName} onChange={(e) => onSaveNotificationName(e.target.value)} style={input} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ThresholdsSection
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
  maxCaseLoad, slaWarningThreshold, autoAssignmentEnabled,
  onSaveMaxCaseLoad, onSaveSlaWarningThreshold, onSaveAutoAssignment,
}: ThresholdsSectionProps) {
  return (
    <div>
      <h2 style={sectionTitle}>Umbrales del Sistema</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label htmlFor="max-load" style={label}>Carga Máxima de Casos por Funcionario</label>
          <input type="number" id="max-load" value={maxCaseLoad} onChange={(e) => onSaveMaxCaseLoad(parseInt(e.target.value, 10))} min={1} max={999} style={input} />
          <p style={help}>Número máximo de casos activos que puede tener un funcionario</p>
        </div>
        <div>
          <label htmlFor="sla-threshold" style={label}>Umbral de Advertencia de Términos (%)</label>
          <input type="number" id="sla-threshold" value={slaWarningThreshold} onChange={(e) => onSaveSlaWarningThreshold(parseInt(e.target.value, 10))} min={0} max={100} style={input} />
          <p style={help}>Porcentaje de tiempo restante para mostrar advertencia</p>
        </div>
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={autoAssignmentEnabled} onChange={(e) => onSaveAutoAssignment(e.target.checked)} style={{ width: 18, height: 18 }} />
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#374151' }}>Habilitar asignación automática de casos</span>
          </label>
          <p style={{ ...help, marginLeft: 28 }}>Asigna automáticamente casos nuevos según carga de trabajo</p>
        </div>
      </div>
    </div>
  );
}
