'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut } from 'lucide-react';

interface UserData {
  fullName: string;
  email: string;
  role: {
    code: string;
    name: string;
  };
}

export default function UserMenu() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    loadUserData();
    
    const handleStorageChange = () => {
      loadUserData();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const isAuthenticated = localStorage.getItem('isAuthenticated');

      if (isAuthenticated !== 'true') {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/v1/auth/me', {
        credentials: 'include',
      });

      if (!response.ok) {
        console.error('Error en la respuesta:', response.status);
        
        // Si es 401, el token expiró - limpiar todo y redirigir
        if (response.status === 401) {
          console.log('Token expirado - limpiando sesión');
          localStorage.removeItem('token');
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('user');
          localStorage.removeItem('userEmail');
          setUser(null);
          setIsLoading(false);
          window.location.href = '/';
          return;
        }
        
        setUser(null);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Datos del usuario cargados:', data);
      
      // La respuesta viene en data.data.user
      const userData = data.data?.user || data.user || data;
      console.log('userData extraído:', userData);
      
      setUser(userData);
      setIsLoading(false);
    } catch (error) {
      console.error('Error al cargar usuario:', error);
      setUser(null);
      setIsLoading(false);
    }
  };

  const getInitials = (name: string): string => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    sessionStorage.removeItem('sessionActive');
    setUser(null);
    router.push('/');
  };

  if (isLoading) {
    return (
      <div style={{
        padding: '0.5rem 1rem',
        color: 'white',
        fontSize: '0.875rem'
      }}>
        Cargando...
      </div>
    );
  }

  // Si no hay usuario pero sí hay sesión activa, mostrar botón mínimo de cerrar sesión
  if (!user) {
    const isAuthenticated = typeof window !== 'undefined' && localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) return null;
    return (
      <button
        onClick={handleLogout}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white', border: '2px solid var(--color-primary)', borderRadius: '8px', padding: '0.5rem 1rem', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
      >
        <LogOut size={16} /> Cerrar Sesión
      </button>
    );
  }

  console.log('Renderizando UserMenu con usuario:', user.fullName);

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          backgroundColor: 'white',
          border: '2px solid var(--color-primary)',
          borderRadius: '8px',
          padding: '0.5rem 1rem',
          color: 'var(--color-primary)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f0f9ff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'white';
        }}
      >
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: 'white',
          color: 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '600',
          fontSize: '0.875rem'
        }}>
          {getInitials(user.fullName)}
        </div>

        <div style={{ 
          fontSize: '0.875rem', 
          fontWeight: '600',
          lineHeight: '1.2',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100px'
        }}>
          {user.fullName}
        </div>

        <ChevronDown 
          size={16} 
          style={{
            transition: 'transform 0.2s',
            transform: isMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
      </button>

      {isMenuOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 0.5rem)',
          right: 0,
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
          minWidth: '220px',
          overflow: 'hidden',
          zIndex: 1000
        }}>
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb'
          }}>
            <div style={{ 
              fontSize: '0.875rem', 
              fontWeight: '600',
              color: '#111827',
              marginBottom: '0.25rem'
            }}>
              {user.fullName}
            </div>
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#6b7280',
              marginBottom: '0.5rem'
            }}>
              {user.email}
            </div>
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#4b5563',
              fontWeight: '500',
              backgroundColor: '#e5e7eb',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              display: 'inline-block'
            }}>
              {user.role.name}
            </div>
          </div>

          <div style={{ padding: '0.5rem 0' }}>
            <div style={{ 
              height: '1px', 
              backgroundColor: '#e5e7eb',
              margin: '0.5rem 0'
            }} />

            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: '#dc2626',
                textAlign: 'left',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fef2f2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <LogOut size={16} />
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
