'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, Fragment } from 'react';
import Image from 'next/image';
import {
  LayoutDashboard, Folder, FilePlus, Calendar, Clock, BarChart3, TrendingUp,
  Building2, Users, FileText, Landmark, Settings, Bell, Server, ShieldCheck,
  MapPin, UserCheck, FileSignature, Menu, ChevronLeft, ChevronRight, X, LogOut,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  Icon: React.ComponentType<{ size?: number | string }>;
  roles?: string[];
  exact?: boolean;
  separatorBefore?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tablero', path: '/admin', Icon: LayoutDashboard, exact: true },
  { label: 'Casos de Familia', path: '/admin/family', Icon: Folder, exact: true },
  // El ADMIN no radica casos (solo roles operativos).
  { label: 'Radicar caso', path: '/admin/family/nuevo', Icon: FilePlus, roles: ['DIRECTOR', 'FUNCIONARIO', 'VENTANILLA_UNICA'] },
  { label: 'Agenda', path: '/admin/family/agenda', Icon: Calendar },
  { label: 'Vencimientos', path: '/admin/family/vencimientos', Icon: Clock },
  // Localizador de procesos: en qué comisaría tiene caso un ciudadano (atención al mostrador).
  { label: 'Localizar proceso', path: '/admin/localizar', Icon: MapPin, roles: ['ADMIN', 'DIRECTOR', 'FUNCIONARIO', 'VENTANILLA_UNICA', 'AUXILIAR_ATENCION_USUARIO'] },
  // Tablero de turnos del equipo (despacho por disponibilidad del paso 2).
  { label: 'Atención (turnos)', path: '/admin/atenciones', Icon: UserCheck, roles: ['ADMIN', 'DIRECTOR', 'FUNCIONARIO', 'VENTANILLA_UNICA', 'AUXILIAR_ATENCION_USUARIO'] },
  { label: 'Estadísticas', path: '/admin/family/stats', Icon: BarChart3, roles: ['ADMIN', 'DIRECTOR', 'SUPERVISOR'] },
  { label: 'Seguimiento', path: '/admin/seguimiento', Icon: TrendingUp, roles: ['ADMIN', 'DIRECTOR', 'SUPERVISOR', 'SECRETARIA_GOBIERNO'], separatorBefore: true },
  { label: 'Comisarías', path: '/admin/comisarias', Icon: Building2, roles: ['ADMIN'] },
  { label: 'Equipo', path: '/admin/usuarios', Icon: Users, roles: ['ADMIN', 'DIRECTOR'] },
  { label: 'Plantillas', path: '/admin/plantillas', Icon: FileSignature, roles: ['ADMIN', 'DIRECTOR'] },
  { label: 'Reportes', path: '/admin/reports', Icon: FileText, roles: ['ADMIN', 'DIRECTOR', 'SUPERVISOR'] },
  { label: 'Entidad', path: '/admin/entidad', Icon: Landmark, roles: ['ADMIN', 'DIRECTOR'] },
  { label: 'Configuración', path: '/admin/settings', Icon: Settings, roles: ['ADMIN', 'DIRECTOR'] },
  { label: 'Notificaciones', path: '/admin/notifications', Icon: Bell, roles: ['ADMIN', 'DIRECTOR'] },
  { label: 'Sistema', path: '/admin/system', Icon: Server, roles: ['ADMIN', 'DIRECTOR'] },
];

const SECRETARIA_PATHS = new Set(['/admin/seguimiento', '/admin/family/stats', '/admin/reports']);

interface MeUser {
  fullName: string;
  email: string;
  role?: { code: string; name: string } | null;
  comisaria?: { code: string; name: string } | null;
}

function initials(name: string): string {
  if (!name) return '··';
  return name.split(' ').filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function AdminShell({
  userRole,
  tenantName,
  logoUrl,
  children,
}: {
  userRole: string;
  tenantName: string;
  logoUrl?: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [me, setMe] = useState<MeUser | null>(null);

  useEffect(() => {
    setCollapsed(localStorage.getItem('adminSidebarCollapsed') === '1');
  }, []);
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);
  useEffect(() => {
    fetch('/api/v1/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d?.data?.user ?? null))
      .catch(() => {});
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem('adminSidebarCollapsed', c ? '0' : '1');
      return !c;
    });
  };

  const logout = async () => {
    try { await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' }); } catch { /* noop */ }
    ['token', 'user', 'isAuthenticated', 'userEmail'].forEach((k) => localStorage.removeItem(k));
    sessionStorage.removeItem('sessionActive');
    router.push('/');
  };

  const isActive = (path: string, exact?: boolean) =>
    exact ? pathname === path : (pathname === path || pathname?.startsWith(path + '/'));

  const visible = NAV_ITEMS.filter((item) =>
    userRole === 'SECRETARIA_GOBIERNO'
      ? SECRETARIA_PATHS.has(item.path)
      : (!item.roles || item.roles.includes(userRole))
  );

  const hasLogo = !!logoUrl && !logoUrl.endsWith('/logo.png');
  const sbWidth = collapsed ? 68 : 248;

  const renderItem = (item: NavItem, forceExpanded = false) => {
    const showLabel = forceExpanded || !collapsed;
    const active = isActive(item.path, item.exact);
    const hover = hovered === item.path;
    const { Icon } = item;
    return (
      <Fragment key={item.path}>
        {item.separatorBefore && <div style={{ height: 1, background: 'rgba(255,255,255,0.18)', margin: '0.5rem 0.75rem' }} />}
        <button
          onClick={() => { router.push(item.path); setMobileOpen(false); }}
          onMouseEnter={() => setHovered(item.path)}
          onMouseLeave={() => setHovered(null)}
          title={!showLabel ? item.label : undefined}
          aria-current={active ? 'page' : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.8rem', width: '100%',
            padding: '0.6rem 0.85rem', margin: '1px 0', border: 'none', borderRadius: '8px',
            cursor: 'pointer', fontSize: '0.9rem', fontWeight: active ? 600 : 500, textAlign: 'left',
            whiteSpace: 'nowrap', overflow: 'hidden',
            justifyContent: showLabel ? 'flex-start' : 'center',
            background: active ? 'white' : hover ? 'rgba(255,255,255,0.14)' : 'transparent',
            color: active ? 'var(--color-primary)' : 'white',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          <Icon size={19} />
          {showLabel && <span>{item.label}</span>}
        </button>
      </Fragment>
    );
  };

  const renderBrand = (forceExpanded = false) => {
    const showText = forceExpanded || !collapsed;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: showText ? '1rem 0.85rem' : '1rem 0', justifyContent: showText ? 'flex-start' : 'center', minHeight: 64, borderBottom: '1px solid rgba(255,255,255,0.18)' }}>
        {hasLogo ? (
          <Image src={logoUrl!} alt={tenantName} width={40} height={40} style={{ maxHeight: 40, width: 'auto', objectFit: 'contain', background: 'white', borderRadius: 8, padding: 2 }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck size={22} color="white" />
          </div>
        )}
        {showText && (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis' }}>{tenantName}</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)' }}>Panel administrativo</div>
          </div>
        )}
      </div>
    );
  };

  const renderUserPanel = (forceExpanded = false) => {
    const showText = forceExpanded || !collapsed;
    return (
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.18)', padding: showText ? '0.85rem' : '0.7rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', justifyContent: showText ? 'flex-start' : 'center', marginBottom: showText ? '0.65rem' : 0 }}>
          <div title={me?.fullName} style={{ width: 38, height: 38, borderRadius: '50%', background: 'white', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
            {initials(me?.fullName ?? '')}
          </div>
          {showText && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me?.fullName ?? '—'}</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)' }}>{me?.role?.name ?? userRole}</div>
              {me?.comisaria && <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🏢 {me.comisaria.name}</div>}
            </div>
          )}
        </div>
        <button
          onClick={logout}
          title="Cerrar sesión"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
        >
          <LogOut size={16} />{showText && 'Cerrar sesión'}
        </button>
      </div>
    );
  };

  return (
    <div style={{ '--sb-w': `${sbWidth}px` } as React.CSSProperties}>
      {/* Sidebar de escritorio */}
      <aside className="admin-sidebar" style={{ width: sbWidth, background: 'var(--color-primary)', color: 'white', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100, transition: 'width 0.18s ease' }}>
        {renderBrand()}
        <nav role="navigation" aria-label="Navegación del panel" style={{ flex: 1, overflowY: 'auto', padding: '0.6rem 0.5rem' }}>
          {visible.map((it) => renderItem(it))}
        </nav>
        {renderUserPanel()}
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
          style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-end', gap: '0.4rem', padding: '0.6rem 0.85rem', background: 'rgba(0,0,0,0.12)', border: 'none', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', fontSize: '0.8rem' }}
        >
          {collapsed ? <ChevronRight size={18} /> : <><span>Contraer</span><ChevronLeft size={18} /></>}
        </button>
      </aside>

      {/* Barra superior móvil */}
      <div className="admin-topbar" style={{ display: 'none', alignItems: 'center', gap: '0.6rem', background: 'var(--color-primary)', color: 'white', padding: '0.6rem 0.9rem', position: 'sticky', top: 0, zIndex: 90 }}>
        <button onClick={() => setMobileOpen(true)} aria-label="Abrir menú" style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', padding: 4 }}>
          <Menu size={24} />
        </button>
        <ShieldCheck size={20} />
        <span style={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenantName}</span>
      </div>

      {/* Cajón móvil */}
      {mobileOpen && (
        <div className="admin-drawer-overlay" onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }}>
          <aside
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '82%', maxWidth: 290, background: 'var(--color-primary)', color: 'white', display: 'flex', flexDirection: 'column', animation: 'slideInLeft 0.25s ease-out' }}
          >
            <button onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', zIndex: 1 }}>
              <X size={22} />
            </button>
            {renderBrand(true)}
            <nav role="navigation" aria-label="Navegación del panel" style={{ flex: 1, overflowY: 'auto', padding: '0.6rem 0.5rem' }}>
              {visible.map((it) => renderItem(it, true))}
            </nav>
            {renderUserPanel(true)}
          </aside>
        </div>
      )}

      {/* Contenido */}
      <div className="admin-content" style={{ marginLeft: 'var(--sb-w)', minHeight: '100vh', transition: 'margin-left 0.18s ease' }}>
        <main id="main-content" style={{ padding: '1.5rem' }}>{children}</main>
      </div>

      <style>{`
        @keyframes slideInLeft { from { transform: translateX(-100%) } to { transform: translateX(0) } }
        @media (max-width: 768px) {
          .admin-sidebar { display: none !important; }
          .admin-topbar { display: flex !important; }
          .admin-content { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
