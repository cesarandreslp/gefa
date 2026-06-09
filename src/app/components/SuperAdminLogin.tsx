'use client';

import { useState } from 'react';
import Image from 'next/image';

/**
 * Formulario de login directo para el Super Admin
 * Se muestra inmediatamente sin necesidad de hacer clic en un botón
 */
export default function SuperAdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error?.message || 'Credenciales incorrectas');
        setLoading(false);
        return;
      }

      const roleCode = data.data?.user?.role?.code;

      if (roleCode === 'SUPER_ADMIN') {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userEmail', email);
        window.location.href = '/super-admin';
      } else {
        setError('Solo usuarios Super Admin pueden acceder desde este portal.');
        setLoading(false);
      }
    } catch {
      setError('Error al conectar con el servidor');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0f172a',
      backgroundImage: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 70%)',
      padding: '1rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Image 
            src="/logo oss.png" 
            alt="OSS" 
            width={180} 
            height={60} 
            style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
            priority
          />
        </div>

        {/* Card de login */}
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          padding: '2.5rem',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
          border: '1px solid #334155',
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#f1f5f9',
            marginBottom: '0.5rem',
            textAlign: 'center',
          }}>
            Panel de Administración
          </h1>
          <p style={{
            fontSize: '0.9rem',
            color: '#94a3b8',
            marginBottom: '2rem',
            textAlign: 'center',
          }}>
            Acceso exclusivo para Super Administradores
          </p>

          {/* Error */}
          {error && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              color: '#f87171',
              fontSize: '0.875rem',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            {/* Honeypot inputs — prevent browser autofill */}
            <input type="text"     name="username_fake" style={{ display: 'none' }} autoComplete="username"         readOnly tabIndex={-1} aria-hidden />
            <input type="password" name="password_fake" style={{ display: 'none' }} autoComplete="current-password" readOnly tabIndex={-1} aria-hidden />

            {/* Email */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '500',
                color: '#cbd5e1',
                marginBottom: '0.5rem',
              }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="new-password"
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '0.95rem',
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                placeholder="admin@ejemplo.com"
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '500',
                color: '#cbd5e1',
                marginBottom: '0.5rem',
              }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    paddingRight: '3rem',
                    fontSize: '0.95rem',
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    fontSize: '1.1rem',
                    padding: 0,
                  }}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.875rem',
                fontSize: '1rem',
                fontWeight: '600',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: loading ? '#475569' : '#3b82f6',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                boxShadow: loading ? 'none' : '0 0 20px rgba(59, 130, 246, 0.3)',
              }}
            >
              {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          fontSize: '0.8rem',
          color: '#475569',
          marginTop: '2rem',
        }}>
          Sistema de Ventanilla Única Multi-Entidad
        </p>
      </div>
    </div>
  );
}
