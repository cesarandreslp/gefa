'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import './globals.css';
import './styles/utilities.css';
import SkipLink from './components/SkipLink';
import LoginModal from './components/LoginModal';
import UserMenu from './components/UserMenu';
import GovCoTopBar from './components/GovCoTopBar';

export default function ClientLayout({
  children,
  tenantName,
  logoUrl,
  city,
  primaryColor,
  secondaryColor,
  hasTenant = true,
  faviconUrl,
  contactData = {}
}: {
  children: React.ReactNode;
  tenantName: string;
  logoUrl: string;
  city: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  hasTenant?: boolean;
  faviconUrl?: string;
  contactData?: {
    address?: string;
    businessHours?: string;
    phone?: string;
    mobilePhone?: string | null;
    tollFreePhone?: string | null;
    anticorruptionPhone?: string | null;
    fax?: string | null;
    institutionalEmail?: string;
    judicialNoticesEmail?: string | null;
    facebook?: string | null;
    twitter?: string | null;
    youtube?: string | null;
    instagram?: string | null;
  };
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const isDashboard = pathname?.startsWith('/home');

  // Cerrar sesión si el navegador fue cerrado (sessionStorage no sobrevive al cierre).
  // Las rutas /super-admin y /admin/* tienen su seguridad manejada por el middleware
  // server-side; no aplicamos el guard de sessionStorage para evitar falsos positivos
  // causados por recargas completas (window.location.href) que en algunos entornos
  // no preservan sessionStorage entre contextos.
  useEffect(() => {
    const isPrivilegedRoute = pathname?.startsWith('/super-admin') || pathname?.startsWith('/admin');
    if (isPrivilegedRoute) {
      setIsLoggedIn(true);
      return;
    }
    const wasLoggedIn = localStorage.getItem('isAuthenticated') === 'true';
    const sessionAlive = sessionStorage.getItem('sessionActive') === '1';
    if (wasLoggedIn && !sessionAlive) {
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userEmail');
      fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
      setIsLoggedIn(false);
    } else {
      setIsLoggedIn(wasLoggedIn && sessionAlive);
    }
  }, [pathname]);

  // Asegurar que siempre inicie en la parte superior al montar y al cambiar de ruta
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Scroll to top cuando cambia la ruta
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Esperar a que el componente esté montado en el cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug
  useEffect(() => {
    if (mounted) {
      console.log('Pathname:', pathname);
      console.log('isDashboard:', isDashboard);
    }
  }, [pathname, isDashboard, mounted]);

  // Modo Super Admin: layout minimal sin header/footer institucional
  if (!hasTenant) {
    return (
      <html lang="es">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          {faviconUrl && <link rel="icon" type="image/png" href={faviconUrl} />}
        </head>
        <body style={{ margin: 0, padding: 0 }}>
          <main id="main-content" role="main">
            {children}
          </main>
        </body>
      </html>
    );
  }

  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {faviconUrl && <link rel="icon" type="image/png" href={faviconUrl} />}
        {(primaryColor || secondaryColor) && (
          <style dangerouslySetInnerHTML={{
            __html: `
              :root {
                ${primaryColor ? `--color-primary: ${primaryColor};` : ''}
                ${secondaryColor ? `--color-secondary: ${secondaryColor};` : ''}
              }
            `
          }} />
        )}
      </head>
      <body>
        {/* Logo flotante en esquina superior izquierda */}
        <div className="main-logo-container" style={{
          position: 'fixed',
          top: '45px',
          left: '1rem',
          zIndex: 2000,
          display: mobileMenuOpen ? 'none' : 'block'
        }}>
          <Image 
            src={logoUrl || "/logo.png"} 
            alt={tenantName} 
            width={200}
            height={50}
            className="main-logo-img"
            style={{ maxHeight: '40px', objectFit: 'contain', width: 'auto' }}
            priority
          />
        </div>        {/* Skip link para accesibilidad WCAG 2.1 AA */}
        <SkipLink />

        {/* Contenedor sticky para top bar y header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
          {/* Barra superior oficial de Gov.co */}
          <GovCoTopBar />

          <header>
          {/* Navegación principal */}
          <nav 
            style={{ 
              padding: '1rem 0', 
              backgroundColor: 'white', 
              color: 'var(--color-primary)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              borderBottom: '2px solid var(--color-primary)'
            }}
            role="navigation"
            aria-label="Navegación principal"
          >
            <div className="container" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              {/* Botón hamburguesa (solo móvil) */}
              <button 
                className="mobile-menu-button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{
                  display: 'none',
                  background: 'none',
                  border: 'none',
                  fontSize: '1.75rem',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  marginLeft: 'auto'
                }}
                aria-label="Abrir menú"
              >
                ☰
              </button>

              {/* Navegación principal (solo escritorio) */}
              <div className="desktop-nav" style={{ display: 'flex', gap: '1rem', flexWrap: 'nowrap', alignItems: 'center', whiteSpace: 'nowrap' }}>
                <a href="/" className="nav-link">Inicio</a>
                <a href="/la-entidad" className="nav-link">La Comisaría</a>
                <a href="/atencion-ciudadano" className="nav-link">Atención y Servicios a la Ciudadanía</a>
                <a href="/atencion-ciudadano/consultar" className="nav-link">Consultar Solicitud</a>
                {mounted && isLoggedIn && !isDashboard && (
                  <a
                    href="/home"
                    className="nav-link"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: 'white',
                      padding: '0.4rem 1rem',
                      borderRadius: '6px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Mi Panel
                  </a>
                )}
                {mounted && (
                  isDashboard ? (
                    <UserMenu />
                  ) : (
                    <LoginModal logoUrl={logoUrl} tenantName={tenantName} />
                  )
                )}
              </div>
            </div>
          </nav>

          {/* Menú móvil desplegable */}
          {mobileMenuOpen && (
            <div 
              className="mobile-menu-overlay"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 2500,
                animation: 'fadeIn 0.2s ease-in'
              }}
              onClick={() => setMobileMenuOpen(false)}
            >
              <div 
                className="mobile-menu"
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: '85%',
                  maxWidth: '320px',
                  backgroundColor: 'white',
                  boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
                  overflowY: 'auto',
                  animation: 'slideInRight 0.3s ease-out'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header del menú móvil */}
                <div style={{
                  padding: '1.5rem',
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
                      Menú
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.813rem', opacity: 0.9 }}>
                      {tenantName}
                    </p>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'white',
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      padding: '0.5rem',
                      lineHeight: 1
                    }}
                    aria-label="Cerrar menú"
                  >
                    ✕
                  </button>
                </div>

                {/* Enlaces del menú */}
                <nav style={{ padding: '0.5rem 0' }}>
                  <a 
                    href="/" 
                    className="mobile-menu-link"
                    style={{
                      display: 'block',
                      padding: '1rem 1.5rem',
                      color: '#1f2937',
                      textDecoration: 'none',
                      fontSize: '1rem',
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    🏠 Inicio
                  </a>
                  <a
                    href="/la-entidad"
                    className="mobile-menu-link"
                    style={{
                      display: 'block',
                      padding: '1rem 1.5rem',
                      color: '#1f2937',
                      textDecoration: 'none',
                      fontSize: '1rem',
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    🏛️ La Comisaría
                  </a>
                  <a 
                    href="/atencion-ciudadano" 
                    className="mobile-menu-link"
                    style={{
                      display: 'block',
                      padding: '1rem 1.5rem',
                      color: '#1f2937',
                      textDecoration: 'none',
                      fontSize: '1rem',
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    👥 Atención y Servicios a la Ciudadanía
                  </a>
                  <a 
                    href="/atencion-ciudadano/consultar" 
                    className="mobile-menu-link"
                    style={{
                      display: 'block',
                      padding: '1rem 1.5rem',
                      color: '#1f2937',
                      textDecoration: 'none',
                      fontSize: '1rem',
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'background-color 0.2s',
                      backgroundColor: '#eff6ff'
                    }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    📝 Consultar Solicitud
                  </a>
                </nav>

                {/* Mi Panel (solo cuando está logueado y fuera del dashboard) */}
                {mounted && isLoggedIn && !isDashboard && (
                  <a
                    href="/home"
                    className="mobile-menu-link"
                    style={{
                      display: 'block',
                      padding: '1rem 1.5rem',
                      color: 'var(--color-primary)',
                      textDecoration: 'none',
                      fontSize: '1rem',
                      fontWeight: 600,
                      borderBottom: '1px solid #f3f4f6',
                    }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    🏠 Mi Panel
                  </a>
                )}

                {/* Login/User en menú móvil */}
                <div style={{ padding: '1.5rem 1.5rem 1.5rem 2.5rem', borderTop: '1px solid #e5e7eb' }}>
                  {mounted && (
                    isDashboard ? (
                      <div>
                        <UserMenu />
                      </div>
                    ) : (
                      <LoginModal logoUrl={logoUrl} tenantName={tenantName} />
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </header>
        </div>
        
        <main 
          id="main-content" 
          style={{ minHeight: 'calc(100vh - 300px)' }}
          role="main"
        >
          {children}
        </main>

        <footer 
          style={{ 
            backgroundColor: 'var(--color-gray-800)', 
            color: 'white', 
            padding: 'var(--spacing-3xl) 0 var(--spacing-lg) 0',
            marginTop: 'var(--spacing-3xl)'
          }}
          role="contentinfo"
        >
          <div className="container">
            <div className="grid grid-cols-4" style={{ marginBottom: 'var(--spacing-xl)', gap: '2rem' }}>
              <div>
                <Link href={'https://www.gov.co'} target='_blank' rel='noopener noreferrer'>
                  <Image src={'/gov.co.png'} alt='Gov.co' width={120} height={40} style={{ marginBottom: '1rem', filter: 'brightness(0) invert(1)' }}/>
                </Link>
                {/* Aqui idealmente hiría la Marca Pais CO: <Image src="/marca-pais.png" ... /> */}
                <h3 style={{ color: 'white', fontSize: '1.125rem', marginBottom: 'var(--spacing-md)' }}>
                  {tenantName}
                </h3>
                <p style={{ fontSize: '0.875rem', lineHeight: '1.6', opacity: 0.9 }}>
                  Portal Único del Estado Colombiano.<br/>
                  Protección integral de la familia y prevención de la violencia intrafamiliar en {city}.
                </p>
              </div>
              
              <div>
                <h4 style={{ color: 'white', fontSize: '1rem', marginBottom: 'var(--spacing-md)' }}>
                  Menús Obligatorios
                </h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ marginBottom: 'var(--spacing-sm)' }}>
                    <a href="/la-entidad" style={{ color: 'white', opacity: 0.9, fontSize: '0.875rem' }}>
                      La Comisaría
                    </a>
                  </li>
                  <li style={{ marginBottom: 'var(--spacing-sm)' }}>
                    <a href="/atencion-ciudadano" style={{ color: 'white', opacity: 0.9, fontSize: '0.875rem' }}>
                      Atención y Servicios a la Ciudadanía
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 style={{ color: 'white', fontSize: '1rem', marginBottom: 'var(--spacing-md)' }}>
                  Políticas y Legal
                </h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ marginBottom: 'var(--spacing-sm)' }}>
                    <a href="/privacidad" style={{ color: 'white', opacity: 0.9, fontSize: '0.875rem' }}>
                      Política de Privacidad y Tratamiento de Datos Personales
                    </a>
                  </li>
                  <li style={{ marginBottom: 'var(--spacing-sm)' }}>
                    <a href="/terminos" style={{ color: 'white', opacity: 0.9, fontSize: '0.875rem' }}>
                      Términos y Condiciones de Uso
                    </a>
                  </li>
                  <li style={{ marginBottom: 'var(--spacing-sm)' }}>
                    <a href="/derechos-autor" style={{ color: 'white', opacity: 0.9, fontSize: '0.875rem' }}>
                      Política de Derechos de Autor
                    </a>
                  </li>
                  <li style={{ marginBottom: 'var(--spacing-sm)' }}>
                    <a href="/accesibilidad" style={{ color: 'white', opacity: 0.9, fontSize: '0.875rem' }}>
                      Accesibilidad Web
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 style={{ color: 'white', fontSize: '1rem', marginBottom: 'var(--spacing-md)' }}>
                  Contacto
                </h4>
                <p style={{ fontSize: '0.875rem', lineHeight: '1.8', opacity: 0.9 }}>
                  {contactData?.address && (<>📍 Dirección: {contactData.address}<br /></>)}
                  {contactData?.businessHours && (() => {
                    try {
                      const s = JSON.parse(contactData.businessHours);
                      const lines: string[] = [];
                      if (s.weekdays?.enabled) lines.push(`Lunes a Viernes: ${s.weekdays.open} - ${s.weekdays.close}`);
                      if (s.saturday?.enabled) lines.push(`Sábado: ${s.saturday.open} - ${s.saturday.close}`);
                      if (s.sunday?.enabled) lines.push(`Domingo: ${s.sunday.open} - ${s.sunday.close}`);
                      if (lines.length === 0) return null;
                      return (<>🕐 Horario:<br />{lines.map((line, i) => (
                        <span key={i}>&nbsp;&nbsp;&nbsp;&nbsp;{line}<br /></span>
                      ))}</>);
                    } catch { return <>🕐 Horario:<br />&nbsp;&nbsp;&nbsp;&nbsp;{contactData.businessHours}<br /></>; }
                  })()}
                  {contactData?.phone && (<>📞 Conmutador: {contactData.phone}<br /></>)}
                  {contactData?.mobilePhone && (<>📱 Teléfono Móvil: {contactData.mobilePhone}<br /></>)}
                  {contactData?.tollFreePhone && (<>📞 Línea de Atención Gratuita: {contactData.tollFreePhone}<br /></>)}
                  {contactData?.anticorruptionPhone && (<>📞 Línea Anticorrupción: {contactData.anticorruptionPhone}<br /></>)}
                  {contactData?.fax && (<>📠 Fax: {contactData.fax}<br /></>)}
                  {contactData?.institutionalEmail && (<>✉️ Correo Institucional: {contactData.institutionalEmail}<br /></>)}
                  {contactData?.judicialNoticesEmail && (<>⚖️ Notificaciones Judiciales: {contactData.judicialNoticesEmail}</>)}
                  {!contactData?.address && !contactData?.phone && !contactData?.institutionalEmail && (
                    <>📍 Dirección principal del {tenantName}<br />📞 Conmutador: (+57) (2) 0000000<br />✉️ contactenos@{city.toLowerCase().replace(/\s+/g, '')}.gov.co</>
                  )}
                </p>
                {/* Redes Sociales */}
                {(contactData?.facebook || contactData?.twitter || contactData?.youtube || contactData?.instagram) && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                    {contactData?.facebook && (
                      <a href={contactData.facebook} target="_blank" rel="noopener noreferrer" title="Facebook" style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      </a>
                    )}
                    {contactData?.twitter && (
                      <a href={contactData.twitter} target="_blank" rel="noopener noreferrer" title="X (Twitter)" style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      </a>
                    )}
                    {contactData?.youtube && (
                      <a href={contactData.youtube} target="_blank" rel="noopener noreferrer" title="YouTube" style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                      </a>
                    )}
                    {contactData?.instagram && (
                      <a href={contactData.instagram} target="_blank" rel="noopener noreferrer" title="Instagram" style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ 
              borderTop: '1px solid rgba(255,255,255,0.1)', 
              paddingTop: 'var(--spacing-lg)', 
              textAlign: 'center',
              fontSize: '0.875rem',
              opacity: 0.8
            }}>
              <p style={{ margin: '0 0 var(--spacing-sm) 0' }}>
                © {new Date().getFullYear()} {tenantName}. Todos los derechos reservados.
              </p>
              <p style={{ margin: 0 }}>
                Sitio diseñado según las especificaciones de Resolución 1519 MINTIC - Ley 1712/2014, Ley 1437/2011.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
