'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

interface AdminNavProps {
  userRole: string;
}

interface NavItem {
  label: string;
  path: string;
  roles?: string[];
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: '🏠 Tablero',          path: '/admin', exact: true },
  // Operación de la comisaría
  { label: '📁 Casos de Familia', path: '/admin/family' },
  { label: '➕ Radicar caso',     path: '/admin/family/nuevo' },
  { label: '📅 Agenda',           path: '/admin/family/agenda' },
  { label: '⏰ Vencimientos',     path: '/admin/family/vencimientos' },
  { label: '📊 Estadísticas',     path: '/admin/family/stats',  roles: ['ADMIN', 'DIRECTOR', 'SUPERVISOR'] },
  // Dirección y gestión
  { label: '👥 Equipo',           path: '/admin/usuarios',      roles: ['ADMIN', 'DIRECTOR'] },
  { label: '📄 Reportes',         path: '/admin/reports',       roles: ['ADMIN', 'DIRECTOR', 'SUPERVISOR'] },
  { label: '🏛️ Entidad',          path: '/admin/entidad',       roles: ['ADMIN', 'DIRECTOR'] },
  { label: '🔧 Configuración',    path: '/admin/settings',      roles: ['ADMIN', 'DIRECTOR'] },
  { label: '📧 Notificaciones',   path: '/admin/notifications', roles: ['ADMIN', 'DIRECTOR'] },
  { label: '⚙️ Sistema',          path: '/admin/system',        roles: ['ADMIN', 'DIRECTOR'] },
];

export default function AdminNav({ userRole }: AdminNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);

  const isActive = (path: string, exact?: boolean) =>
    exact ? pathname === path : (pathname === path || pathname?.startsWith(path + '/'));

  const getStyle = (path: string, exact?: boolean): React.CSSProperties => {
    const active = isActive(path, exact);
    const hover = hovered === path;

    if (active) {
      return {
        background: 'var(--color-primary, #2563eb)',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontWeight: 600,
        cursor: 'pointer',
        fontSize: '0.9rem',
        padding: '0.45rem 0.9rem',
        transition: 'background 0.15s, color 0.15s',
        whiteSpace: 'nowrap',
      };
    }
    if (hover) {
      return {
        background: '#dbeafe',
        color: 'var(--color-primary, #2563eb)',
        border: 'none',
        borderRadius: '6px',
        fontWeight: 500,
        cursor: 'pointer',
        fontSize: '0.9rem',
        padding: '0.45rem 0.9rem',
        transition: 'background 0.15s, color 0.15s',
        whiteSpace: 'nowrap',
      };
    }
    return {
      background: 'none',
      color: '#374151',
      border: 'none',
      borderRadius: '6px',
      fontWeight: 500,
      cursor: 'pointer',
      fontSize: '0.9rem',
      padding: '0.45rem 0.9rem',
      transition: 'background 0.15s, color 0.15s',
      whiteSpace: 'nowrap',
    };
  };

  const visible = NAV_ITEMS.filter(
    item => !item.roles || item.roles.includes(userRole)
  );

  return (
    <nav
      role="navigation"
      aria-label="Navegación del panel de administración"
      style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '0.75rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        zIndex: 10,
        overflowX: 'auto',
      }}
    >
      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'nowrap' }}>
        <h2 style={{ margin: '0 1rem 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          Panel Admin
        </h2>

        {visible.map(item => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            onMouseEnter={() => setHovered(item.path)}
            onMouseLeave={() => setHovered(null)}
            style={getStyle(item.path, item.exact)}
            aria-current={isActive(item.path, item.exact) ? 'page' : undefined}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
