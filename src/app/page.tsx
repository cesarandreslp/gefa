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
  const entityAddress = settings?.address || tenant.address || 'Dirección no configurada';
  const entityPhone = settings?.phone || tenant.phone || 'No configurado';
  const entityEmail = settings?.institutionalEmail || tenant.institutionalEmail || 'No configurado';
  
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

  return (
    <main>
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
            {entityName}
          </h1>
          <p style={{
            fontSize: '1.25rem',
            marginBottom: 'var(--spacing-xl)',
            color: 'var(--color-text-light)'
          }}>
            {landingConfig.heroSubtitle}
          </p>
          <div className="hero-actions">
            <Link href="/comisaria-en-linea" className="btn btn-secondary btn-lg">
              Radicar denuncia o solicitud
            </Link>
            <Link href="/comisaria-en-linea?tab=consultar" className="btn btn-outline btn-lg">
              Consultar mi caso
            </Link>
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
              <p style={{ fontSize: '1.125rem', lineHeight: '1.8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <MapPin size={20} />
                  <strong>Dirección:</strong> {entityAddress}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Phone size={20} />
                  <strong>Teléfono:</strong> {entityPhone}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={20} />
                  <strong>Email:</strong> {entityEmail}
                </span>
              </p>
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
