import type { Metadata } from 'next';
import { Shield, Target, Eye, FileText, Users, Scale, Baby, Handshake, HeartHandshake } from 'lucide-react';

export const metadata: Metadata = {
  title: 'La Comisaría',
  description: 'Información institucional de la Comisaría de Familia',
};

export default function AboutPage() {
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
            La Comisaría de Familia
          </h1>
          <p style={{
            fontSize: '1.25rem',
            color: 'var(--color-text-light)',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            Protección integral de la familia y prevención de la violencia intrafamiliar
          </p>
        </div>
      </section>

      {/* ¿Qué es? Section */}
      <section className="section">
        <div className="container">
          <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', backgroundColor: 'var(--color-primary)', borderRadius: '50%', marginBottom: 'var(--spacing-lg)' }}>
              <Shield size={40} color="white" />
            </div>
            <h2 className="section-title">¿Qué es la Comisaría de Familia?</h2>
            <p style={{ fontSize: '1.125rem', lineHeight: '1.8', color: 'var(--color-text)' }}>
              La Comisaría de Familia es una entidad de carácter administrativo e interdisciplinario que hace
              parte del Sistema Nacional de Bienestar Familiar. Su misión es prevenir, garantizar, restablecer
              y reparar los derechos de los miembros de la familia vulnerados por situaciones de violencia
              intrafamiliar, y brindar protección especial a niños, niñas y adolescentes (Ley 2126 de 2021).
            </p>
          </div>
        </div>
      </section>

      {/* Misión y Visión */}
      <section className="section section-alt">
        <div className="container">
          <div className="grid grid-cols-2" style={{ gap: 'var(--spacing-2xl)' }}>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                <div className="card-icon" style={{ backgroundColor: 'var(--color-secondary)' }}>
                  <Target size={28} color="white" />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--color-primary-dark)' }}>Misión</h2>
              </div>
              <p className="card-text" style={{ fontSize: '1rem', lineHeight: '1.7' }}>
                Garantizar, proteger, restablecer y reparar los derechos de las personas afectadas por
                violencia intrafamiliar, con un enfoque diferencial y de género, brindando atención
                interdisciplinaria, oportuna y confidencial a las familias del municipio y protección
                especial a niños, niñas y adolescentes.
              </p>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                <div className="card-icon" style={{ backgroundColor: 'var(--color-primary)' }}>
                  <Eye size={28} color="white" />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--color-primary-dark)' }}>Visión</h2>
              </div>
              <p className="card-text" style={{ fontSize: '1rem', lineHeight: '1.7' }}>
                Ser una comisaría de familia reconocida por su atención humana, eficaz y oportuna,
                referente en la prevención de la violencia intrafamiliar y en la protección integral de
                la familia y de la niñez, contribuyendo a la construcción de entornos familiares libres
                de violencia y a una convivencia en paz.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Funciones Principales */}
      <section className="section">
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center' }}>Funciones Principales</h2>
          <div className="grid grid-cols-3" style={{ gap: 'var(--spacing-xl)', marginTop: 'var(--spacing-2xl)' }}>
            {[
              { icon: Shield, text: 'Atender y dar trámite a los casos de violencia intrafamiliar' },
              { icon: Scale, text: 'Imponer medidas de protección y de atención a las víctimas' },
              { icon: Baby, text: 'Adelantar procesos de restablecimiento de derechos de NNA (PARD)' },
              { icon: Handshake, text: 'Conciliar custodia, cuota de alimentos y regulación de visitas' },
              { icon: HeartHandshake, text: 'Brindar atención psicosocial a través del equipo interdisciplinario' },
              { icon: FileText, text: 'Practicar el rescate de niños, niñas y adolescentes en riesgo' },
              { icon: Users, text: 'Promover la prevención de la violencia y la convivencia familiar' },
              { icon: Eye, text: 'Hacer seguimiento al cumplimiento de las medidas adoptadas' },
            ].map((item, index) => (
              <div key={index} className="card" style={{ textAlign: 'center' }}>
                <div className="card-icon" style={{ margin: '0 auto var(--spacing-md)' }}>
                  <item.icon size={28} />
                </div>
                <p className="card-text" style={{ fontSize: '0.95rem' }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Marco Legal */}
      <section className="section section-alt">
        <div className="container">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)', justifyContent: 'center' }}>
              <div className="card-icon">
                <Scale size={28} />
              </div>
              <h2 className="section-title" style={{ margin: 0 }}>Marco Legal</h2>
            </div>
            <div className="card">
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[
                  'Constitución Política de Colombia - Artículo 42 (protección de la familia)',
                  'Ley 294 de 1996 - Prevención y sanción de la violencia intrafamiliar',
                  'Ley 575 de 2000 - Medidas de protección',
                  'Ley 1098 de 2006 - Código de la Infancia y la Adolescencia (PARD)',
                  'Ley 1257 de 2008 - Violencia y discriminación contra la mujer',
                  'Ley 2126 de 2021 - Reglamentación de las Comisarías de Familia',
                ].map((item, index) => (
                  <li key={index} style={{ 
                    padding: 'var(--spacing-md)', 
                    borderBottom: index < 5 ? '1px solid var(--color-border)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)'
                  }}>
                    <span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>•</span>
                    <span style={{ fontSize: '1rem' }}>{item}</span>
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
