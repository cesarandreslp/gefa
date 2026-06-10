'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, X } from 'lucide-react';

/**
 * Modal de login para administradores
 */
export default function LoginModal({
  logoUrl,
  tenantName
}: {
  logoUrl?: string;
  tenantName?: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para el nuevo modal
  const [newModalEmail, setNewModalEmail] = useState('');
  const [newModalPassword, setNewModalPassword] = useState('');
  const [newModalLoading, setNewModalLoading] = useState(false);
  const [newModalError, setNewModalError] = useState('');

  useEffect(() => {
    // Verificar si el usuario está autenticado
    const checkAuth = () => {
      const authStatus = localStorage.getItem('isAuthenticated');
      setIsAuthenticated(authStatus === 'true');
    };
    
    checkAuth();
    
    // Escuchar cambios en el storage
    window.addEventListener('storage', checkAuth);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    setIsAuthenticated(false);
    router.push('/');
  };

  const handleNewModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewModalError('');
    setNewModalLoading(true);

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: newModalEmail, 
          password: newModalPassword 
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setNewModalError(data.error?.message || 'Credenciales incorrectas');
        setNewModalLoading(false);
        return;
      }

      // Login exitoso - guardar en localStorage y marcar sesión activa
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userEmail', newModalEmail);
      localStorage.setItem('token', data.data?.token || '');
      sessionStorage.setItem('sessionActive', '1');
      setIsAuthenticated(true);
      
      // Debug: ver qué rol tiene el usuario
      console.log('🔍 Rol del usuario:', data.data?.user?.role?.code, 'Nivel:', data.data?.user?.role?.level);
      console.log('🔍 Data completa:', data);
      
      // Redirigir según el nivel del rol del usuario
      // Level 85 = Funcionarios que gestionan casos (delegados, analistas, etc.)
      const roleCode = data.data?.user?.role?.code;
      const roleLevel = data.data?.user?.role?.level;

      if (roleCode === 'SUPER_ADMIN') {
        router.push('/super-admin');
      } else {
        // Panel unificado de la comisaría
        router.push('/admin');
      }
      setIsLoginModalOpen(false);
    } catch {
      setNewModalError('Error al iniciar sesión');
    } finally {
      setNewModalLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('Iniciando login...');

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      console.log('Respuesta recibida:', response.status);

      const data = await response.json();
      console.log('Data:', data);

      if (!response.ok || !data.success) {
        console.log('Login falló');
        setError(data.error?.message || 'Credenciales incorrectas');
        setLoading(false);
        return;
      }

      // Login exitoso
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userEmail', email);
      localStorage.setItem('token', data.data?.token || '');
      sessionStorage.setItem('sessionActive', '1');
      console.log('Login exitoso, verificando rol...');
      const roleCode = data.user?.role?.code || data.data?.user?.role?.code;
      const roleLevel = data.user?.role?.level || data.data?.user?.role?.level;
      if (roleCode === 'SUPER_ADMIN') {
        router.push('/super-admin');
      } else {
        // Panel unificado de la comisaría
        router.push('/admin');
        router.refresh();
      }
    } catch (error) {
      console.error('Error en login:', error);
      setError('Error al conectar con el servidor');
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botón Iniciar Sesión / Cerrar Sesión */}
      {!isAuthenticated ? (
        <button
          onClick={() => setIsLoginModalOpen(true)}
          className="btn-login"
          style={{ border: 'none', cursor: 'pointer' }}
        >
          Iniciar Sesión
        </button>
      ) : (
        <button
          onClick={handleLogout}
          className="btn-login"
          style={{ border: 'none', cursor: 'pointer' }}
        >
          Cerrar Sesión
        </button>
      )}

      {/* Modal */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          {/* Contenido del modal */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '450px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div
              style={{
                padding: '1.5rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: 'var(--color-primary)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LogIn size={20} color="white" />
                </div>
                <h2
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: '#1f2937',
                    margin: 0,
                  }}
                >
                  Iniciar Sesión
                </h2>
              </div>
              <button
                onClick={handleClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Cerrar modal"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body del modal */}
            <form onSubmit={handleSubmit} autoComplete="off" style={{ padding: '1.5rem' }}>
              {/* Honeypot inputs — prevent browser autofill */}
              <input type="text"     name="username_fake" style={{ display: 'none' }} autoComplete="username"         readOnly tabIndex={-1} aria-hidden />
              <input type="password" name="password_fake" style={{ display: 'none' }} autoComplete="current-password" readOnly tabIndex={-1} aria-hidden />
              <p
                style={{
                  fontSize: '0.95rem',
                  color: '#6b7280',
                  marginBottom: '1.5rem',
                }}
              >
                Acceso exclusivo para funcionarios de la Comisaría de Familia
              </p>

              {/* Mensaje de error */}
              {error && (
                <div
                  style={{
                    backgroundColor: '#fee',
                    border: '1px solid #fcc',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    color: '#c33',
                    fontSize: '0.9rem',
                  }}
                >
                  {error}
                </div>
              )}

              {/* Campo Email */}
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="login-email-modal"
                  style={{
                    display: 'block',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                  }}
                >
                  Correo Electrónico
                </label>
                <input
                  type="text"
                  id="login-email-modal"
                  name="email-modal"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    outline: 'none',
                  }}
                  placeholder="correo@entidadciudad.gov.co"
                />
              </div>

              {/* Campo Contraseña */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  htmlFor="login-password-modal"
                  style={{
                    display: 'block',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                  }}
                >
                  Contraseña
                </label>
                <input
                  type="password"
                  id="login-password-modal"
                  name="password-modal"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    outline: 'none',
                  }}
                  placeholder="••••••••"
                />
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    border: '2px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  onClick={() => console.log('Click en botón Ingresar')}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: loading ? '#6b7280' : 'var(--color-primary)',
                    color: 'white',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Nuevo Modal Login */}
      {isLoginModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '380px',
              padding: '2.5rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsLoginModalOpen(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Cerrar modal"
            >
              <X size={24} />
            </button>

            {/* Titulo / Logo */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
              {logoUrl ? (
                <img src={logoUrl} alt={tenantName || 'Login'} style={{ maxHeight: '60px', marginBottom: '1rem' }} />
              ) : (
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)', marginBottom: '1rem', textAlign: 'center' }}>
                  {tenantName || 'Comisaría de Familia'}
                </h2>
              )}
              <h3
                style={{
                  fontSize: '1.1rem',
                  fontWeight: '500',
                  color: '#4b5563',
                  margin: 0,
                  textAlign: 'center',
                }}
              >
                Ingresa a tu cuenta para continuar
              </h3>
            </div>

            {/* Honeypot inputs — prevent browser autofill */}
            <input type="text"     name="username_fake2" style={{ display: 'none' }} autoComplete="username"         readOnly tabIndex={-1} aria-hidden />
            <input type="password" name="password_fake2" style={{ display: 'none' }} autoComplete="current-password" readOnly tabIndex={-1} aria-hidden />

            {/* Campo 1 */}
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem',
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={newModalEmail}
                onChange={(e) => setNewModalEmail(e.target.value)}
                autoComplete="new-password"
                required
                disabled={newModalLoading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.95rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                placeholder="correo@ejemplo.com"
              />
            </div>

            {/* Campo 2 */}
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem',
                }}
              >
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newModalPassword}
                  onChange={(e) => setNewModalPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={newModalLoading}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    paddingRight: '2.5rem',
                    fontSize: '0.95rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Tu contraseña"
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
                    color: '#9ca3af',
                    padding: 0,
                    fontSize: '1.2rem',
                  }}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Recordarme y olvidaste contraseña */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ color: '#374151' }}>Recordarme</span>
              </label>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                style={{
                  color: 'var(--color-primary)',
                  textDecoration: 'none',
                }}
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {/* Mensaje de error */}
            {newModalError && (
              <div
                style={{
                  backgroundColor: '#fee',
                  border: '1px solid #fcc',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  color: '#c33',
                  fontSize: '0.9rem',
                }}
              >
                {newModalError}
              </div>
            )}

            {/* Botón Iniciar Sesión */}
            <button
              type="button"
              onClick={handleNewModalSubmit}
              disabled={newModalLoading}
              style={{
                width: '100%',
                padding: '0.875rem',
                fontSize: '1rem',
                fontWeight: '600',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: newModalLoading ? '#9ca3af' : 'var(--color-primary)',
                color: 'white',
                cursor: newModalLoading ? 'not-allowed' : 'pointer',
                marginBottom: '1rem',
              }}
            >
              {newModalLoading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>

            {/* Enlace soporte */}
            <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
              ¿Problemas para acceder?{' '}
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                style={{
                  color: 'var(--color-primary)',
                  textDecoration: 'none',
                }}
              >
                Contacta soporte
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
