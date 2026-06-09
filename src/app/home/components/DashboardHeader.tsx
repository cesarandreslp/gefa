'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, User, Settings, LogOut } from 'lucide-react';

export default function DashboardHeader() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [tenantName, setTenantName] = useState<string>('Cargando...');
  const [tenantSigla, setTenantSigla] = useState<string>('...');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const response = await fetch('/api/v1/auth/me');
      if (response.ok) {
        const userData = await response.json();
        if (userData.success && userData.data?.user) {
          const user = userData.data.user;
          setUserName(user.fullName || 'Usuario');
          setUserEmail(user.email || '');
          setUserRole(user.role?.name || '');
          
          if (user.tenant) {
            setTenantName(user.tenant.name || 'Sistema Ventanilla Única');
            setTenantSigla(user.tenant.sigla || 'VU');
          }
        }
      }
    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    router.push('/');
  };

  return (
    <div style={{
      backgroundColor: '#0d47a1',
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          color: '#0d47a1',
          fontSize: '1.25rem'
        }}>
          {tenantSigla.charAt(0)}
        </div>
        <div>
          <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: '700', color: 'white' }}>
            {tenantName}
          </h1>
          <p style={{ fontSize: '0.75rem', margin: 0, opacity: 0.9, color: 'white' }}>
            {tenantSigla}
          </p>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem 1rem',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '600',
            color: 'white',
            fontSize: '0.875rem'
          }}>
            {getInitials(userName)}
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: '600', color: 'white', margin: 0 }}>
              {userName}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', margin: 0 }}>
              {userRole}
            </p>
          </div>
          <ChevronDown size={20} color="white" style={{
            transition: 'transform 0.2s',
            transform: isMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }} />
        </button>

        {isMenuOpen && (
          <>
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 999
              }}
              onClick={() => setIsMenuOpen(false)}
            />
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 0.5rem)',
              right: 0,
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minWidth: '250px',
              overflow: 'hidden',
              zIndex: 1000
            }}>
              <div style={{
                padding: '1rem',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                  {userName}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                  {userEmail}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-primary)', margin: '0.25rem 0 0 0', fontWeight: '500' }}>
                  {userRole}
                </p>
              </div>

              <div style={{ padding: '0.5rem' }}>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    // router.push('/home/perfil');
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <User size={18} color="#6b7280" />
                  <span style={{ fontSize: '0.875rem', color: '#374151' }}>Mi Perfil</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    // router.push('/home/configuracion');
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Settings size={18} color="#6b7280" />
                  <span style={{ fontSize: '0.875rem', color: '#374151' }}>Configuración</span>
                </button>

                <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '0.5rem 0' }} />

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleLogout();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#fee2e2';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <LogOut size={18} color="#dc2626" />
                  <span style={{ fontSize: '0.875rem', color: '#dc2626', fontWeight: '500' }}>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
