'use client';

import React from 'react';

/**
 * Encabezado de página consistente para el panel admin. Reemplaza las cabeceras
 * ad-hoc (con fondo gris y botón "Volver") que duplicaban la navegación del
 * sidebar. Estilo institucional: caja de ícono en color primario + título + subtítulo,
 * y un slot de acciones a la derecha.
 */
export default function AdminPageHeader({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
        paddingBottom: '1.1rem',
        borderBottom: '1px solid #e2e8f0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', minWidth: 0 }}>
        {icon && (
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: 'color-mix(in srgb, var(--color-primary, #2563eb) 12%, white)',
              color: 'var(--color-primary, #2563eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{title}</h1>
          {subtitle && <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}
