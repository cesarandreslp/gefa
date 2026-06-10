'use client';

import { useState } from 'react';

interface FormData {
  // Entidad
  nombre: string;
  sigla: string;
  correoInstitucional: string;
  telefono: string;
  direccion: string;
  logoUrl: string;
  // Admin
  adminNombre: string;
  adminEmail: string;
  adminPassword: string;
  adminPasswordConfirm: string;
}

const initialForm: FormData = {
  nombre: '',
  sigla: '',
  correoInstitucional: '',
  telefono: '',
  direccion: '',
  logoUrl: '',
  adminNombre: '',
  adminEmail: '',
  adminPassword: '',
  adminPasswordConfirm: '',
};

export default function RegistroEntidadPage() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ sigla: string; email: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const validateStep1 = (): boolean => {
    if (!form.nombre.trim()) { setError('El nombre de la entidad es obligatorio'); return false; }
    if (!form.sigla.trim()) { setError('La sigla es obligatoria'); return false; }
    if (!/^[A-Za-z0-9]{3,20}$/.test(form.sigla.trim())) {
      setError('La sigla debe tener entre 3 y 20 caracteres alfanuméricos'); return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!form.adminNombre.trim()) { setError('El nombre del administrador es obligatorio'); return false; }
    if (!form.adminEmail.trim()) { setError('El correo del administrador es obligatorio'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail)) {
      setError('El correo electrónico no es válido'); return false;
    }
    if (form.adminPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres'); return false;
    }
    if (form.adminPassword !== form.adminPasswordConfirm) {
      setError('Las contraseñas no coinciden'); return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/registro-entidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          sigla: form.sigla.trim().toUpperCase(),
          correoInstitucional: form.correoInstitucional.trim() || undefined,
          telefono: form.telefono.trim() || undefined,
          direccion: form.direccion.trim() || undefined,
          logoUrl: form.logoUrl.trim() || undefined,
          adminNombre: form.adminNombre.trim(),
          adminEmail: form.adminEmail.trim().toLowerCase(),
          adminPassword: form.adminPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Error al registrar la entidad');
        return;
      }

      setSuccess({
        sigla: data.data.tenant.sigla,
        email: data.data.admin.email,
      });
    } catch {
      setError('Error de conexión. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // ========================
  // PANTALLA DE ÉXITO
  // ========================
  if (success) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{
          maxWidth: '520px',
          width: '100%',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          padding: '3rem 2.5rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h1 style={{ color: '#059669', fontSize: '1.75rem', marginBottom: '0.5rem', fontWeight: '700' }}>
            ¡Entidad registrada con éxito!
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1rem', lineHeight: '1.6', marginBottom: '2rem' }}>
            La entidad <strong>{success.sigla}</strong> ha sido creada junto con su estructura base de roles
            y tipos de caso.
          </p>

          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '2rem',
            textAlign: 'left',
          }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: '#374151' }}>
              <strong>📧 Correo:</strong> {success.email}
            </p>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
              <strong>🔑 Contraseña:</strong> La que definió en el formulario
            </p>
          </div>

          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '0.875rem 2.5rem',
              background: 'var(--color-primary, #1e40af)',
              color: 'white',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '1rem',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
          >
            Ir al inicio e iniciar sesión
          </a>
        </div>
      </div>
    );
  }

  // ========================
  // FORMULARIO
  // ========================
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
          padding: '2rem 2.5rem',
          color: 'white',
        }}>
          <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: '700' }}>
            🏛️ Registro de Nueva Entidad
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
            Configure su entidad en la plataforma GEFA — Gestión Familiar
          </p>
        </div>

        {/* Indicador de paso */}
        <div style={{ display: 'flex', padding: '1.25rem 2.5rem 0', gap: '0.75rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{
              height: '4px',
              borderRadius: '2px',
              background: step >= 1 ? 'var(--color-primary)' : '#e5e7eb',
              transition: 'background 0.3s',
            }} />
            <p style={{ fontSize: '0.75rem', color: step === 1 ? '#1e40af' : '#9ca3af', marginTop: '0.375rem', fontWeight: step === 1 ? '600' : '400' }}>
              1. Datos de la Entidad
            </p>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              height: '4px',
              borderRadius: '2px',
              background: step >= 2 ? 'var(--color-primary)' : '#e5e7eb',
              transition: 'background 0.3s',
            }} />
            <p style={{ fontSize: '0.75rem', color: step === 2 ? '#1e40af' : '#9ca3af', marginTop: '0.375rem', fontWeight: step === 2 ? '600' : '400' }}>
              2. Administrador
            </p>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem 2.5rem 2.5rem' }}>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '0.875rem 1rem',
              marginBottom: '1.25rem',
              color: '#991b1b',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* ====== PASO 1: Datos de la Entidad ====== */}
          {step === 1 && (
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>Nombre de la entidad *</label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Ej: Comisaría de Familia de Cali"
                  style={inputStyle}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>Sigla *</label>
                <input
                  type="text"
                  name="sigla"
                  value={form.sigla}
                  onChange={handleChange}
                  placeholder="Ej: PMCALI"
                  style={inputStyle}
                  maxLength={20}
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0' }}>
                  Identificador único (3-20 caracteres alfanuméricos)
                </p>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>Correo institucional</label>
                <input
                  type="email"
                  name="correoInstitucional"
                  value={form.correoInstitucional}
                  onChange={handleChange}
                  placeholder="contacto@entidad.gov.co"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={labelStyle}>Teléfono</label>
                  <input
                    type="tel"
                    name="telefono"
                    value={form.telefono}
                    onChange={handleChange}
                    placeholder="(+57) ..."
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Dirección</label>
                  <input
                    type="text"
                    name="direccion"
                    value={form.direccion}
                    onChange={handleChange}
                    placeholder="Calle ..."
                    style={inputStyle}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleNext}
                style={{
                  ...btnPrimary,
                  width: '100%',
                  marginTop: '0.5rem',
                }}
              >
                Siguiente →
              </button>
            </div>
          )}

          {/* ====== PASO 2: Datos del Administrador ====== */}
          {step === 2 && (
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>Nombre completo del administrador *</label>
                <input
                  type="text"
                  name="adminNombre"
                  value={form.adminNombre}
                  onChange={handleChange}
                  placeholder="Nombre y apellidos"
                  style={inputStyle}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>Correo electrónico *</label>
                <input
                  type="email"
                  name="adminEmail"
                  value={form.adminEmail}
                  onChange={handleChange}
                  placeholder="admin@entidad.gov.co"
                  style={inputStyle}
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0' }}>
                  Se usará para iniciar sesión
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={labelStyle}>Contraseña *</label>
                  <input
                    type="password"
                    name="adminPassword"
                    value={form.adminPassword}
                    onChange={handleChange}
                    placeholder="Mínimo 8 caracteres"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Confirmar contraseña *</label>
                  <input
                    type="password"
                    name="adminPasswordConfirm"
                    value={form.adminPasswordConfirm}
                    onChange={handleChange}
                    placeholder="Repita la contraseña"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Lo que se creará */}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1.5rem',
                fontSize: '0.8rem',
                color: '#1e40af',
              }}>
                <strong>Se creará automáticamente:</strong>
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                  <li>Entidad: <strong>{form.nombre || '...'}</strong> ({form.sigla?.toUpperCase() || '...'})</li>
                  <li>Roles: Administrador, Revisor, Funcionario</li>
                  <li>Tipos de caso: Derecho de Petición, Queja, Solicitud General</li>
                  <li>Usuario administrador con acceso completo</li>
                </ul>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={handleBack}
                  style={{
                    ...btnSecondary,
                    flex: 1,
                  }}
                >
                  ← Atrás
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    ...btnPrimary,
                    flex: 2,
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? '⏳ Registrando...' : '🏛️ Registrar Entidad'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// ========================
// ESTILOS
// ========================
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#374151',
  marginBottom: '0.375rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  border: '1.5px solid #d1d5db',
  borderRadius: '10px',
  fontSize: '0.95rem',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  boxSizing: 'border-box',
};

const btnPrimary: React.CSSProperties = {
  padding: '0.875rem 2rem',
  background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  fontWeight: '600',
  fontSize: '1rem',
  cursor: 'pointer',
  transition: 'transform 0.15s, box-shadow 0.15s',
};

const btnSecondary: React.CSSProperties = {
  padding: '0.875rem 2rem',
  background: 'white',
  color: '#374151',
  border: '1.5px solid #d1d5db',
  borderRadius: '10px',
  fontWeight: '600',
  fontSize: '1rem',
  cursor: 'pointer',
  transition: 'background 0.15s',
};
