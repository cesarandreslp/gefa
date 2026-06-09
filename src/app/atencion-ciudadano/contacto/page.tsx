export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { headers } from 'next/headers';
import { resolveTenantByHost } from '@/lib/tenantResolver';
import { prisma } from '@/lib/prisma';
import { MapPin, Phone, Mail, Clock, FileText, AlertTriangle } from 'lucide-react';

export default async function ContactoPage() {
  const headersList = headers();
  const host = headersList.get('x-tenant-domain') || headersList.get('host');
  const tenant = await resolveTenantByHost(host);
  const settings = tenant
    ? await prisma.tenantSettings.findUnique({ where: { tenantId: tenant.id } })
    : null;

  const entityName = tenant?.name || 'Comisaría de Familia';
  const entityAddress = settings?.address || tenant?.address || 'Consulte la sede en su municipio';
  const entityPhone = settings?.phone || tenant?.phone || 'No configurado';
  const entityEmail = settings?.institutionalEmail || tenant?.institutionalEmail || 'No configurado';
  const entityHours = settings?.businessHours || 'Lunes a viernes, 8:00 a.m. – 5:00 p.m.';

  const row: React.CSSProperties = { display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1rem' };

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <h1 style={{ color: 'var(--color-primary-dark)' }}>Contacto</h1>
        <p style={{ color: 'var(--color-text-light)', fontSize: '1.1rem' }}>
          Comuníquese con la {entityName}. Para radicar una denuncia o solicitud y hacerle seguimiento,
          use el portal en línea.
        </p>

        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', gap: 12, alignItems: 'flex-start', margin: '1.5rem 0' }}>
          <AlertTriangle size={22} color="#b91c1c" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0, color: '#7f1d1d' }}>
            <strong>¿Está en peligro inmediato?</strong> Llame a la línea <strong>123</strong> o a la línea
            nacional <strong>155</strong>.
          </p>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={row}>
            <MapPin size={22} color="var(--color-primary)" style={{ flexShrink: 0 }} />
            <div><strong>Dirección:</strong><br />{entityAddress}</div>
          </div>
          <div style={row}>
            <Clock size={22} color="var(--color-primary)" style={{ flexShrink: 0 }} />
            <div><strong>Horario de atención:</strong><br /><span style={{ whiteSpace: 'pre-line' }}>{entityHours}</span></div>
          </div>
          <div style={row}>
            <Phone size={22} color="var(--color-primary)" style={{ flexShrink: 0 }} />
            <div><strong>Teléfono:</strong><br />{entityPhone}</div>
          </div>
          <div style={{ ...row, marginBottom: 0 }}>
            <Mail size={22} color="var(--color-primary)" style={{ flexShrink: 0 }} />
            <div><strong>Correo electrónico:</strong><br />{entityEmail}</div>
          </div>
        </div>

        <Link href="/comisaria-en-linea" className="btn btn-primary btn-lg">
          <FileText size={20} style={{ marginRight: '0.5rem' }} /> Radicar una denuncia o solicitud
        </Link>
      </div>
    </main>
  );
}
