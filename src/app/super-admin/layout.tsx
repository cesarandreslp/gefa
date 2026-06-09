'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Shield, LogOut, Settings, Users, Server } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Ecosistema Tenants', path: '/super-admin', icon: Server, exact: true },
];

const SETTINGS_ITEMS = [
  { label: 'Auditoría General',  path: '/super-admin/auditoria', icon: Users },
  { label: 'Configuraciones',    path: '/super-admin/configuraciones', icon: Settings },
];

function SidebarLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const bg = active ? '#3b82f6' : hovered ? '#374151' : 'transparent';
  const color = active ? 'white' : hovered ? '#f9fafb' : '#9ca3af';

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '11px 12px',
        borderRadius: '8px',
        color,
        textDecoration: 'none',
        backgroundColor: bg,
        fontWeight: active ? 600 : 500,
        fontSize: '0.9rem',
        transition: 'background-color 0.15s, color 0.15s',
        borderLeft: active ? '3px solid #93c5fd' : '3px solid transparent',
      }}
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [logoutHovered, setLogoutHovered] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ fullName: string; email: string } | null>(null);

  useEffect(() => {
    fetch('/api/v1/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        const u = json?.data?.user;
        if (u?.fullName) {
          setCurrentUser({ fullName: u.fullName, email: u.email });
        }
      })
      .catch(() => {});
  }, []);

  const isActive = (path: string, exact = false) => {
    if (path === '#') return false;
    return exact ? pathname === path : pathname === path || pathname?.startsWith(path + '/');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
      router.push('/admin/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f3f4f6', color: '#111827', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: '260px', backgroundColor: '#1f2937', color: 'white', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #374151' }}>
          <Shield size={28} color="#60a5fa" />
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#f3f4f6' }}>Super Admin</h1>
        </div>

        <nav style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {NAV_ITEMS.map(item => (
            <SidebarLink
              key={item.path}
              href={item.path}
              icon={item.icon}
              label={item.label}
              active={isActive(item.path, item.exact)}
            />
          ))}

          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, letterSpacing: '0.08em', margin: '20px 0 8px 4px' }}>
            Global Settings
          </div>

          {SETTINGS_ITEMS.map(item => (
            <SidebarLink
              key={item.path}
              href={item.path}
              icon={item.icon}
              label={item.label}
              active={isActive(item.path)}
            />
          ))}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid #374151' }}>
          <button
            onClick={handleLogout}
            onMouseEnter={() => setLogoutHovered(true)}
            onMouseLeave={() => setLogoutHovered(false)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '11px 12px',
              borderRadius: '8px',
              color: logoutHovered ? '#fca5a5' : '#ef4444',
              backgroundColor: logoutHovered ? 'rgba(239,68,68,0.12)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'background-color 0.15s, color 0.15s',
            }}
          >
            <LogOut size={18} />
            Cerrar Sesión Global
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <header style={{ height: '70px', backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#374151' }}>Dashboard Master</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.85rem' }}>
              {currentUser?.fullName ? currentUser.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'SA'}
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem' }}>{currentUser?.fullName ?? '—'}</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>{currentUser?.email ?? '—'}</p>
            </div>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
