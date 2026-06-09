import Link from 'next/link';
import { headers } from 'next/headers';
import { resolveTenantByHost } from '@/lib/tenantResolver';
import { prisma } from '@/lib/prisma';
import { getLandingConfig } from '@/lib/landingDefaults';
import {
  FileText, Scale, Users, Shield, Baby, BarChart3, MapPin, Phone, Mail, Clock,
  ClipboardList, Building2, Map, Heart, Briefcase, Gavel, Landmark, Globe,
  BookOpen, Stethoscope, Leaf, Handshake, AlertTriangle, Plus, Search, Eye, AlertCircle,
} from 'lucide-react';

// Mapeo de string a componente de ícono
const ICON_MAP: Record<string, React.ComponentType<{ size?: number | string; color?: string }>> = {
  FileText, Scale, Users, Shield, Baby, BarChart3, ClipboardList, Building2,
  Map, Heart, Briefcase, Gavel, Landmark, Phone, Globe, BookOpen,
  Stethoscope, Leaf, Handshake, AlertTriangle, Plus, Search, Eye, AlertCircle,
};

// Colores por índice para dar variedad a las cards
const SERVICE_COLORS = [
  'var(--color-primary)', 'var(--color-secondary)', '#dc3545',
  '#6f42c1', '#fd7e14', '#20c997', '#0dcaf0',
];

export default async function ServicesPage() {
  const headersList = headers();
  const host = headersList.get('x-tenant-domain') || headersList.get('host');
  const tenant = await resolveTenantByHost(host);

  if (!tenant) {
    return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Entidad no encontrada</div>;
  }

  // Cargar settings y tipo de institución
  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId: tenant.id }
  });

  await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: { institutionType: { select: { name: true } } }
  });

  const landingConfig = getLandingConfig(
    settings?.metadata as Record<string, unknown> | null
  );

  const enabledServices = landingConfig.services.filter(s => s.enabled);

  // Datos de contacto
  const entityAddress = settings?.address || tenant.address || 'Dirección no configurada';
  const entityPhone = settings?.phone || tenant.phone || 'No configurado';
  const entityEmail = settings?.institutionalEmail || tenant.institutionalEmail || 'No configurado';

  // Horarios
  let hoursDisplay = { weekdays: 'Lunes a Viernes', morning: '8:00 AM - 12:00 PM', afternoon: '2:00 PM - 6:00 PM' };
  try {
    const raw = settings?.businessHours;
    if (raw) {
      const hours = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (hours.weekdays?.enabled) {
        hoursDisplay.morning = hours.weekdays.open;
        hoursDisplay.afternoon = hours.weekdays.close;
      }
    }
  } catch { /* usar defaults */ }

  return (
    <main id="main-content">
      {/* Hero Section */}
      <section style={{
        backgroundColor: '#e8f0f8',
        backgroundImage: 'linear-gradient(180deg, #e8f0f8 0%, #f5f9fc 100%)',
        padding: 'var(--spacing-3xl) 0',
        textAlign: 'center',
        borderBottom: '1px solid var(--color-border)'
      }}>
        <div className="container">
          <h1 style={{
            fontSize: '3rem',
            fontWeight: '700',
            marginBottom: 'var(--spacing-md)',
            color: 'var(--color-primary-dark)'
          }}>
            Nuestros Servicios
          </h1>
          <p style={{
            fontSize: '1.25rem',
            color: 'var(--color-text-light)',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            {landingConfig.heroSubtitle}
          </p>
        </div>
      </section>

      {/* Servicios Grid */}
      <section className="section">
        <div className="container">
          <style>{`
            .service-card:target {
              outline: 3px solid var(--color-primary);
              outline-offset: 4px;
              animation: highlightPulse 2s ease-out;
            }
            @keyframes highlightPulse {
              0% { box-shadow: 0 0 0 0 rgba(29, 78, 216, 0.4); }
              70% { box-shadow: 0 0 0 12px rgba(29, 78, 216, 0); }
              100% { box-shadow: 0 0 0 0 rgba(29, 78, 216, 0); }
            }
          `}</style>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-xl)' }}>
            {enabledServices.map((service, index) => {
              const IconComponent = ICON_MAP[service.icon] || FileText;
              const color = SERVICE_COLORS[index % SERVICE_COLORS.length];
              // Extraer el hash del linkUrl para usarlo como ID (ej: '/servicios#servicios-publicos' → 'servicios-publicos')
              const hashId = service.linkUrl.includes('#') ? service.linkUrl.split('#')[1] : `servicio-${service.id}`;
              return (
                <div
                  key={service.id}
                  id={hashId}
                  className="card service-card"
                  style={{ height: '100%', display: 'flex', flexDirection: 'column', scrollMarginTop: '2rem' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                    <div className="card-icon" style={{ backgroundColor: color }}>
                      <IconComponent size={28} color="white" />
                    </div>
                    <h3 className="card-title" style={{ margin: 0, fontSize: '1.25rem' }}>{service.title}</h3>
                  </div>
                  <p className="card-text" style={{ marginBottom: 'var(--spacing-md)', flexGrow: 1 }}>
                    {service.description}
                  </p>
                  <Link href={service.linkUrl} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                    {service.linkText}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cómo acceder */}
      <section className="section section-alt">
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 'var(--spacing-2xl)' }}>
            Cómo Acceder a Nuestros Servicios
          </h2>
          <div className="grid grid-cols-2" style={{ gap: 'var(--spacing-2xl)', maxWidth: '900px', margin: '0 auto' }}>
            <div className="card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)', color: 'var(--color-primary-dark)' }}>
                <MapPin size={24} color="var(--color-primary)" />
                Canales de Atención
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--color-border)' }}>
                  <strong>Presencial:</strong> {entityAddress}
                </li>
                <li style={{ padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <Phone size={16} color="var(--color-primary)" />
                  <div><strong>Teléfono:</strong> {entityPhone}</div>
                </li>
                <li style={{ padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <Mail size={16} color="var(--color-primary)" />
                  <div><strong>Correo:</strong> {entityEmail}</div>
                </li>
                <li style={{ padding: 'var(--spacing-sm) 0', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <FileText size={16} color="var(--color-primary)" />
                  <div><strong>Web:</strong> A través de nuestro formulario de contacto</div>
                </li>
              </ul>
            </div>

            <div className="card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)', color: 'var(--color-primary-dark)' }}>
                <Clock size={24} color="var(--color-primary)" />
                Horarios de Atención
              </h3>
              <div style={{ padding: 'var(--spacing-lg)', backgroundColor: 'var(--color-gray-50)', borderRadius: 'var(--border-radius)', textAlign: 'center' }}>
                <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: 'var(--spacing-sm)', color: 'var(--color-primary-dark)' }}>
                  {hoursDisplay.weekdays}
                </p>
                <p style={{ fontSize: '1rem', marginBottom: 'var(--spacing-sm)' }}>
                  {hoursDisplay.morning}
                </p>
                <p style={{ fontSize: '1rem' }}>
                  {hoursDisplay.afternoon}
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div style={{ textAlign: 'center', marginTop: 'var(--spacing-3xl)' }}>
            <Link href="/atencion-ciudadano/solicitud" className="btn btn-primary btn-lg">
              Radicar una Solicitud
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
