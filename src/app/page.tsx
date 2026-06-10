export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { headers } from 'next/headers';
import { resolveTenantByHost } from '@/lib/tenantResolver';
import { prisma } from '@/lib/prisma';
import { getLandingConfig } from '@/lib/landingDefaults';
import GefaLanding from './components/GefaLanding';
import {
  FileText, Scale, Users, Shield, Baby, BarChart3, Mail, Phone, MapPin, Clock,
  ClipboardList, Building2, Map, Heart, Briefcase, Gavel, Landmark, Globe,
  BookOpen, Stethoscope, Leaf, Handshake, AlertTriangle, Plus, Search,
} from 'lucide-react';

// Mapeo de string a componente de ícono
const ICON_MAP: Record<string, React.ComponentType<{ size?: number | string }>> = {
  FileText, Scale, Users, Shield, Baby, BarChart3, ClipboardList, Building2,
  Map, Heart, Briefcase, Gavel, Landmark, Phone: Phone, Globe, BookOpen,
  Stethoscope, Leaf, Handshake, AlertTriangle, Plus, Search,
};

export default async function HomePage() {
  // Sin tenant asociado al host (dominio raíz del SaaS), mostrar la landing
  // informativa del producto GEFA. El acceso al control plane queda en /acceso.
  const headersList = headers();
  const host = headersList.get('x-tenant-domain') || headersList.get('host');
  const tenant = await resolveTenantByHost(host);

  if (!tenant) {
    return <GefaLanding />;
  }

  // Cargar configuración de la entidad desde TenantSettings
  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId: tenant.id }
  });

  // Cargar tipo de institución
  const tenantWithType = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: { institutionType: { select: { name: true } } }
  });

  const institutionTypeName = tenantWithType?.institutionType?.name;
  const rawName = tenant.name || 'Comisaría de Familia';
  // Formato: "[Tipo de institución] de [Ciudad]" (ej: "Comisaría de Familia de Buga")
  const institutionLabel = (institutionTypeName && !rawName.toLowerCase().includes(institutionTypeName.toLowerCase()))
    ? `${institutionTypeName} de ${rawName}`
    : rawName;
  const entityName = institutionLabel;
  const entityAddress = settings?.address || tenant.address || null;
  const entityPhone = settings?.phone || tenant.phone || null;
  const entityEmail = settings?.institutionalEmail || tenant.institutionalEmail || null;
  
  // Parsear horarios (puede ser JSON o string plano)
  let entityHoursFormatted = '';
  try {
    const raw = settings?.businessHours;
    if (raw) {
      const hours = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const lines: string[] = [];
      if (hours.weekdays?.enabled) {
        lines.push(`Lunes a Viernes: ${hours.weekdays.open} - ${hours.weekdays.close}`);
      }
      if (hours.saturday?.enabled) {
        lines.push(`Sábados: ${hours.saturday.open} - ${hours.saturday.close}`);
      }
      if (hours.sunday?.enabled) {
        lines.push(`Domingos: ${hours.sunday.open} - ${hours.sunday.close}`);
      }
      entityHoursFormatted = lines.join('\n') || 'Horario no configurado';
    } else {
      entityHoursFormatted = 'Lunes a Viernes: 8:00 AM - 12:00 PM / 2:00 PM - 6:00 PM';
    }
  } catch {
    entityHoursFormatted = String(settings?.businessHours || 'Lunes a Viernes: 8:00 AM - 12:00 PM / 2:00 PM - 6:00 PM');
  }

  // Obtener configuración de la landing (servicios, subtítulo, CTA)
  const landingConfig = getLandingConfig(
    settings?.metadata as Record<string, unknown> | null
  );

  const enabledServices = landingConfig.services.filter(s => s.enabled);

  // Accesos rápidos a los servicios de la comisaría (siempre visibles).
  const quickAccess = [
    { icon: Shield, title: 'Medidas de protección', text: 'Solicita protección frente a la violencia intrafamiliar.', href: '/comisaria-en-linea' },
    { icon: Scale, title: 'Custodia, alimentos y visitas', text: 'Concilia la custodia, la cuota alimentaria y el régimen de visitas.', href: '/comisaria-en-linea' },
    { icon: Baby, title: 'Restablecimiento de derechos', text: 'Protección integral de niñas, niños y adolescentes (PARD).', href: '/comisaria-en-linea' },
    { icon: Search, title: 'Consultar mi caso', text: 'Revisa el estado de tu denuncia o solicitud con tu radicado.', href: '/comisaria-en-linea?tab=consultar' },
  ];

  return (
    <main>
      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 55%, var(--color-primary-light) 100%)',
        color: 'white',
        padding: 'var(--spacing-3xl) 0',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Patrón decorativo sutil */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, opacity: 0.10,
          backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
          backgroundSize: '26px 26px',
        }} />
        <div className="container" style={{ position: 'relative', maxWidth: '860px', textAlign: 'center' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.35)',
            padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 600,
            marginBottom: 'var(--spacing-lg)', backdropFilter: 'blur(4px)',
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#5ee0a0', display: 'inline-block' }} />
            Atención y protección integral a la familia
          </span>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 700,
            marginBottom: 'var(--spacing-md)', color: 'white', lineHeight: 1.1,
          }}>
            {entityName}
          </h1>
          <p style={{
            fontSize: '1.2rem', marginBottom: 'var(--spacing-xl)',
            color: 'rgba(255,255,255,0.92)', maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto',
          }}>
            {landingConfig.heroSubtitle}
          </p>
          <div className="hero-actions">
            <Link href="/comisaria-en-linea" className="btn btn-lg" style={{ backgroundColor: 'white', color: 'var(--color-primary)', border: '2px solid white' }}>
              Radicar denuncia o solicitud
            </Link>
            <Link href="/comisaria-en-linea?tab=consultar" className="btn btn-lg" style={{ backgroundColor: 'transparent', color: 'white', border: '2px solid white' }}>
              Consultar mi caso
            </Link>
          </div>
        </div>
      </section>

      {/* Accesos rápidos — tarjetas de servicios de la comisaría */}
      <section className="section" style={{ paddingTop: 'var(--spacing-2xl)', paddingBottom: 'var(--spacing-2xl)' }}>
        <div className="container">
          <div className="grid grid-cols-4 cards-overlap" style={{ position: 'relative', zIndex: 2 }}>
            {quickAccess.map((q) => {
              const Icon = q.icon;
              return (
                <Link href={q.href} key={q.title} className="card" style={{ textDecoration: 'none', display: 'block' }}>
                  <div className="card-icon"><Icon size={28} /></div>
                  <h3 className="card-title">{q.title}</h3>
                  <p className="card-text" style={{ marginBottom: 0 }}>{q.text}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Servicios Destacados - Solo se muestra si el admin ha configurado servicios */}
      {enabledServices.length > 0 && (
        <section className="section">
          <div className="container">
            <h2 className="section-title">Nuestros Servicios</h2>
            <p className="section-subtitle">
              La {entityName} ofrece una amplia gama de servicios para la ciudadanía
            </p>

            <div className="grid grid-cols-3">
              {enabledServices.map((service) => {
                const IconComponent = ICON_MAP[service.icon] || FileText;
                return (
                  <div className="card" key={service.id}>
                    <div className="card-icon">
                      <IconComponent size={28} />
                    </div>
                    <h3 className="card-title">{service.title}</h3>
                    <p className="card-text">{service.description}</p>
                    <Link href={service.linkUrl} className="btn btn-primary">
                      {service.linkText}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Información de Contacto */}
      <section className="section section-alt">
        <div className="container">
          <div className="grid grid-cols-2">
            <div>
              <h2 style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={28} />
                Horarios de Atención
              </h2>
              <p style={{ fontSize: '1.125rem', marginBottom: 'var(--spacing-md)', whiteSpace: 'pre-line' }}>
                {entityHoursFormatted}
              </p>
              <p style={{ color: 'var(--color-text-light)' }}>
                <em>Atención presencial y virtual</em>
              </p>
            </div>

            <div>
              <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Contacto</h2>
              {(entityAddress || entityPhone || entityEmail) ? (
                <p style={{ fontSize: '1.125rem', lineHeight: '1.8' }}>
                  {entityAddress && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <MapPin size={20} />
                      <span><strong>Dirección:</strong> {entityAddress}</span>
                    </span>
                  )}
                  {entityPhone && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <Phone size={20} />
                      <span><strong>Teléfono:</strong> {entityPhone}</span>
                    </span>
                  )}
                  {entityEmail && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Mail size={20} />
                      <span><strong>Email:</strong> {entityEmail}</span>
                    </span>
                  )}
                </p>
              ) : (
                <p style={{ fontSize: '1.05rem', color: 'var(--color-text-light)' }}>
                  Acércate a nuestras sedes en horario de atención o radica y consulta tu caso en línea.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="section text-center">
        <div className="container">
          <h2 style={{ marginBottom: 'var(--spacing-md)' }}>¿Necesitas ayuda?</h2>
          <p style={{ fontSize: '1.125rem', color: 'var(--color-text-light)', marginBottom: 'var(--spacing-xl)' }}>
            {landingConfig.ctaText}
          </p>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/atencion-ciudadano/contacto" className="btn btn-primary btn-lg">
              Contáctanos
            </Link>
            <Link href="/la-entidad" className="btn btn-outline btn-lg">
              Conoce más sobre nosotros
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
