import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, MessageSquare, MapPin, Phone, Mail, Clock, CheckCircle, Info, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Atención al Ciudadano - Entidad Institucional',
  description: 'Formularios de contacto y solicitudes para ciudadanos de Ciudad/Municipio',
};

export default function ContactPage() {
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
            Atención al Ciudadano
          </h1>
          <p style={{
            fontSize: '1.25rem',
            color: 'var(--color-text-light)',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            Estamos aquí para servirle. Presente sus solicitudes y consultas de manera fácil y rápida
          </p>
        </div>
      </section>

      {/* Opciones principales */}
      <section className="section">
        <div className="container">
          <div className="grid grid-cols-2" style={{ gap: 'var(--spacing-2xl)', maxWidth: '1000px', margin: '0 auto' }}>
            {/* Presentar solicitud */}
            <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
              <div className="card-icon" style={{ margin: '0 auto var(--spacing-lg)', backgroundColor: 'var(--color-primary)' }}>
                <FileText size={32} color="white" />
              </div>
              <h2 style={{ fontSize: '1.75rem', marginBottom: 'var(--spacing-md)', color: 'var(--color-primary-dark)' }}>
                Presentar una Solicitud
              </h2>
              <p className="card-text" style={{ marginBottom: 'var(--spacing-xl)', fontSize: '1rem' }}>
                Si requiere presentar una petición, queja, reclamo, sugerencia o solicitud ante la Entidad 
                Municipal, puede hacerlo a través de nuestro formulario en línea. Todos los datos quedan 
                registrados y recibirá un número de radicación para hacer seguimiento a su trámite.
              </p>
              <Link href="/atencion-ciudadano/solicitud" className="btn btn-primary btn-lg">
                Ir al Formulario de Solicitud
                <ArrowRight size={20} style={{ marginLeft: 'var(--spacing-sm)' }} />
              </Link>
            </div>

            {/* Contacto general */}
            <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
              <div className="card-icon" style={{ margin: '0 auto var(--spacing-lg)', backgroundColor: 'var(--color-secondary)' }}>
                <MessageSquare size={32} color="white" />
              </div>
              <h2 style={{ fontSize: '1.75rem', marginBottom: 'var(--spacing-md)', color: 'var(--color-primary-dark)' }}>
                Contacto General
              </h2>
              <p className="card-text" style={{ marginBottom: 'var(--spacing-xl)', fontSize: '1rem' }}>
                Si solo desea contactarnos para consultas generales, información o sugerencias sin que requiera 
                un trámite formal, puede usar nuestro formulario de contacto.
              </p>
              <Link href="/atencion-ciudadano/contacto" className="btn btn-secondary btn-lg">
                Ir al Formulario de Contacto
                <ArrowRight size={20} style={{ marginLeft: 'var(--spacing-sm)' }} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Otros canales */}
      <section className="section section-alt">
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 'var(--spacing-2xl)' }}>
            Otros Canales de Atención
          </h2>
          <div className="grid grid-cols-3" style={{ gap: 'var(--spacing-xl)' }}>
            {/* Presencial */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                <div className="card-icon" style={{ backgroundColor: 'var(--color-primary)' }}>
                  <MapPin size={24} color="white" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-primary-dark)' }}>
                  Atención Presencial
                </h3>
              </div>
              <p style={{ marginBottom: 'var(--spacing-sm)' }}>
                <strong>Dirección:</strong><br />
                Carrera 10 #10-10<br />
                Ciudad/Municipio<br />
                Valle del Cauca
              </p>
              <p style={{ 
                marginTop: 'var(--spacing-md)', 
                padding: 'var(--spacing-sm)', 
                backgroundColor: 'var(--color-gray-50)', 
                borderRadius: 'var(--border-radius)',
                fontSize: '0.9rem'
              }}>
                <Clock size={16} style={{ display: 'inline', marginRight: 'var(--spacing-xs)' }} />
                <strong>Horario:</strong><br />
                Lunes a Viernes<br />
                8:00 AM - 12:00 PM<br />
                2:00 PM - 6:00 PM
              </p>
            </div>

            {/* Teléfono */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                <div className="card-icon" style={{ backgroundColor: 'var(--color-secondary)' }}>
                  <Phone size={24} color="white" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-primary-dark)' }}>
                  Atención Telefónica
                </h3>
              </div>
              <p style={{ marginBottom: 'var(--spacing-sm)' }}>
                <strong>Teléfono:</strong><br />
                <a href="tel:+576022280000" style={{ color: 'var(--color-primary)', fontSize: '1.125rem', fontWeight: '600' }}>
                  (602) 228-0000
                </a>
              </p>
              <p style={{ 
                marginTop: 'var(--spacing-lg)', 
                padding: 'var(--spacing-sm)', 
                backgroundColor: 'var(--color-gray-50)', 
                borderRadius: 'var(--border-radius)',
                fontSize: '0.9rem'
              }}>
                <strong>Línea gratuita:</strong><br />
                01-8000-123-456<br />
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>(próximamente)</span>
              </p>
            </div>

            {/* Correo */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                <div className="card-icon" style={{ backgroundColor: '#0dcaf0' }}>
                  <Mail size={24} color="white" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-primary-dark)' }}>
                  Correo Electrónico
                </h3>
              </div>
              <div style={{ fontSize: '0.95rem', lineHeight: '1.8' }}>
                <p style={{ marginBottom: 'var(--spacing-sm)' }}>
                  <strong>General:</strong><br />
                  <a href="mailto:contacto@entidadciudad.gov.co" style={{ color: 'var(--color-primary)' }}>
                    contacto@entidadciudad.gov.co
                  </a>
                </p>
                <p style={{ marginBottom: 'var(--spacing-sm)' }}>
                  <strong>PQRS:</strong><br />
                  <a href="mailto:pqrs@entidadciudad.gov.co" style={{ color: 'var(--color-primary)' }}>
                    pqrs@entidadciudad.gov.co
                  </a>
                </p>
                <p>
                  <strong>Notificaciones:</strong><br />
                  <a href="mailto:notificaciones@entidadciudad.gov.co" style={{ color: 'var(--color-primary)' }}>
                    notificaciones@entidadciudad.gov.co
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Información importante */}
      <section className="section">
        <div className="container">
          <div className="grid grid-cols-2" style={{ gap: 'var(--spacing-2xl)', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Información importante */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                <Info size={28} color="var(--color-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-primary-dark)' }}>
                  Información Importante
                </h3>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[
                  'Todas las solicitudes son registradas con un número único de radicación',
                  'Los tiempos de respuesta dependen del tipo de trámite (ver sección Servicios)',
                  'Sus datos personales son protegidos conforme a la Ley 1581 de 2012',
                  'Puede consultar el estado de su solicitud con el número de radicación',
                  'No se requiere abogado para presentar peticiones o quejas',
                ].map((item, index) => (
                  <li key={index} style={{ 
                    padding: 'var(--spacing-md) 0', 
                    borderBottom: index < 4 ? '1px solid var(--color-border)' : 'none',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--spacing-sm)'
                  }}>
                    <CheckCircle size={18} color="var(--color-secondary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Términos de respuesta */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                <Clock size={28} color="var(--color-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-primary-dark)' }}>
                  Términos de Respuesta
                </h3>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[
                  { label: 'Derechos de Petición', time: '15 días hábiles (prorrogables 10 más)' },
                  { label: 'Tutelas', time: '10 días hábiles' },
                  { label: 'Quejas Disciplinarias', time: 'Verificación en 3 días hábiles' },
                  { label: 'PQRS Generales', time: '15 días hábiles' },
                ].map((item, index) => (
                  <li key={index} style={{ 
                    padding: 'var(--spacing-md)', 
                    borderBottom: index < 3 ? '1px solid var(--color-border)' : 'none',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                      <strong style={{ color: 'var(--color-primary-dark)' }}>{item.label}:</strong>
                      <span style={{ 
                        padding: 'var(--spacing-xs) var(--spacing-md)', 
                        backgroundColor: 'var(--color-primary)', 
                        color: 'white', 
                        borderRadius: 'var(--border-radius)',
                        fontSize: '0.9rem',
                        fontWeight: '600'
                      }}>
                        {item.time}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
