export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { headers } from 'next/headers';
import { resolveTenantByHost } from '@/lib/tenantResolver';
import { prisma } from '@/lib/prisma';
import {
  FileText, Search, MapPin, Phone, Mail, Clock, ShieldCheck, AlertTriangle,
  ArrowRight, PhoneCall, Baby, HeartHandshake,
} from 'lucide-react';

// Líneas de orientación y emergencia en Colombia para asuntos de familia.
// Son nacionales (iguales para toda comisaría); los datos de la sede salen del tenant.
const EMERGENCY_LINES = [
  { num: '155', label: 'Orientación a mujeres víctimas de violencia', icon: HeartHandshake },
  { num: '123', label: 'Emergencias (Policía / atención inmediata)', icon: AlertTriangle },
  { num: '122', label: 'Fiscalía General — denuncias', icon: ShieldCheck },
  { num: '141', label: 'ICBF — protección de niños, niñas y adolescentes', icon: Baby },
];

export default async function AtencionCiudadanoPage() {
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

  return (
    <main id="main-content">
      {/* Hero */}
      <section style={{ backgroundColor: '#ede9fe', backgroundImage: 'linear-gradient(180deg, #ede9fe 0%, #f5f3ff 100%)', padding: 'var(--spacing-3xl) 0', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>
        <div className="container">
          <h1 style={{ fontSize: '3rem', fontWeight: 700, marginBottom: 'var(--spacing-md)', color: 'var(--color-primary-dark)' }}>
            Atención a la Ciudadanía
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--color-text-light)', maxWidth: 820, margin: '0 auto' }}>
            La {entityName} protege a las familias frente a la violencia intrafamiliar y garantiza los
            derechos de los niños, niñas y adolescentes. Su atención es gratuita y confidencial.
          </p>
        </div>
      </section>

      {/* Emergencia */}
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="container">
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', gap: 12, alignItems: 'flex-start', maxWidth: 1000, margin: '0 auto' }}>
            <AlertTriangle size={22} color="#b91c1c" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, color: '#7f1d1d', fontSize: '0.98rem' }}>
              <strong>¿Está en peligro inmediato?</strong> Llame a la línea <strong>123</strong> o a la línea
              nacional <strong>155</strong>. Este portal es para trámites y no reemplaza la atención de emergencia.
            </p>
          </div>
        </div>
      </section>

      {/* Acciones principales */}
      <section className="section">
        <div className="container">
          <div className="grid grid-cols-2" style={{ gap: 'var(--spacing-2xl)', maxWidth: 1000, margin: '0 auto' }}>
            <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
              <div className="card-icon" style={{ margin: '0 auto var(--spacing-lg)', backgroundColor: 'var(--color-primary)' }}>
                <FileText size={32} color="white" />
              </div>
              <h2 style={{ fontSize: '1.6rem', marginBottom: 'var(--spacing-md)', color: 'var(--color-primary-dark)' }}>
                Radicar una denuncia o solicitud
              </h2>
              <p className="card-text" style={{ marginBottom: 'var(--spacing-xl)' }}>
                Denuncie hechos de violencia intrafamiliar o solicite una medida de protección, conciliación de
                custodia, alimentos y visitas, o protección de un niño, niña o adolescente. Recibirá un número de
                radicado para hacer seguimiento.
              </p>
              <Link href="/comisaria-en-linea" className="btn btn-primary btn-lg">
                Radicar en línea <ArrowRight size={20} style={{ marginLeft: 'var(--spacing-sm)' }} />
              </Link>
            </div>

            <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
              <div className="card-icon" style={{ margin: '0 auto var(--spacing-lg)', backgroundColor: 'var(--color-secondary)' }}>
                <Search size={32} color="white" />
              </div>
              <h2 style={{ fontSize: '1.6rem', marginBottom: 'var(--spacing-md)', color: 'var(--color-primary-dark)' }}>
                Consultar mi caso
              </h2>
              <p className="card-text" style={{ marginBottom: 'var(--spacing-xl)' }}>
                Consulte el estado de su trámite con su número de radicado y su documento de identidad. Por
                confidencialidad, solo se muestra el estado y las fechas del proceso.
              </p>
              <Link href="/comisaria-en-linea?tab=consultar" className="btn btn-secondary btn-lg">
                Consultar estado <ArrowRight size={20} style={{ marginLeft: 'var(--spacing-sm)' }} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Líneas de orientación y emergencia */}
      <section className="section section-alt">
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 'var(--spacing-2xl)' }}>
            Líneas de orientación y emergencia
          </h2>
          <div className="grid grid-cols-4" style={{ gap: 'var(--spacing-lg)' }}>
            {EMERGENCY_LINES.map((l) => (
              <div className="card" key={l.num} style={{ textAlign: 'center' }}>
                <l.icon size={28} color="var(--color-primary)" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>{l.num}</div>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-light)', margin: 0 }}>{l.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Canales de atención de la comisaría (datos del tenant) */}
      <section className="section">
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 'var(--spacing-2xl)' }}>
            Atención presencial
          </h2>
          <div className="grid grid-cols-3" style={{ gap: 'var(--spacing-xl)' }}>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                <div className="card-icon" style={{ backgroundColor: 'var(--color-primary)' }}><MapPin size={24} color="white" /></div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-primary-dark)' }}>Sede</h3>
              </div>
              <p style={{ margin: 0 }}>{entityAddress}</p>
              <p style={{ marginTop: 'var(--spacing-md)', display: 'flex', gap: 6, alignItems: 'center', color: 'var(--color-text-light)', fontSize: '0.92rem' }}>
                <Clock size={16} /> <span style={{ whiteSpace: 'pre-line' }}>{entityHours}</span>
              </p>
            </div>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                <div className="card-icon" style={{ backgroundColor: 'var(--color-secondary)' }}><Phone size={24} color="white" /></div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-primary-dark)' }}>Teléfono</h3>
              </div>
              <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-primary)' }}>{entityPhone}</p>
            </div>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                <div className="card-icon" style={{ backgroundColor: '#0891b2' }}><Mail size={24} color="white" /></div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-primary-dark)' }}>Correo</h3>
              </div>
              <p style={{ margin: 0, wordBreak: 'break-word' }}>{entityEmail}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Información importante */}
      <section className="section section-alt">
        <div className="container">
          <div className="card" style={{ maxWidth: 900, margin: '0 auto' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.4rem', color: 'var(--color-primary-dark)', marginBottom: 'var(--spacing-lg)' }}>
              <PhoneCall size={24} /> Información importante
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
              {[
                'La atención de la comisaría de familia es gratuita y no requiere abogado.',
                'Las víctimas de violencia y los niños, niñas y adolescentes reciben atención prioritaria.',
                'Sus datos personales y los del proceso son confidenciales (Ley 1581 de 2012 y Ley 1098 de 2006).',
                'Conserve su número de radicado: con él y su documento puede consultar el estado del caso.',
              ].map((t, i) => (
                <li key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <ShieldCheck size={18} color="var(--color-secondary)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
