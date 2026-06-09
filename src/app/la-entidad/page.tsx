import type { Metadata } from 'next';
import { Shield, Target, Eye, FileText, Users, Scale } from 'lucide-react';

export const metadata: Metadata = {
  title: 'La Entidad',
  description: 'Información institucional de la Entidad Institucional',
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
            La Entidad Institucional
          </h1>
          <p style={{
            fontSize: '1.25rem',
            color: 'var(--color-text-light)',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            Defensores de los derechos humanos y garantes de la transparencia en Ciudad/Municipio
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
            <h2 className="section-title">¿Qué es la Entidad Institucional?</h2>
            <p style={{ fontSize: '1.125rem', lineHeight: '1.8', color: 'var(--color-text)' }}>
              La Entidad Institucional es una entidad del nivel territorial que hace parte de la rama ejecutiva 
              del poder público y tiene autonomía presupuestal y administrativa. Su función principal es la 
              defensa de los derechos humanos, la protección del interés público y la vigilancia de la conducta 
              oficial de quienes desempeñan funciones públicas.
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
                Defender y promover los Derechos Humanos, el interés público y el medio ambiente; ejercer la vigilancia sobre la conducta oficial de los servidores públicos del municipio de Ciudad/Municipio, fortaleciendo una cultura de participación ciudadana y los valores institucionales que permitan mediar y ser garantes de las peticiones de la población vulnerable con especial énfasis en la protección integral de las víctimas del conflicto armado.
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
                Para el 2024 ser una entidad líder en la coalición, concertación, protección y defensa de los derechos humanos, patrimonio público y medio ambiente; garantizando así los derechos fundamentales de los ciudadanos. Su propósito es una convivencia ciudadana en paz a través de cumplimiento de la Constitución y las leyes de la Republica.
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
              { icon: Shield, text: 'Defender los derechos humanos y garantizar su efectividad' },
              { icon: Eye, text: 'Vigilar la conducta oficial de quienes desempeñan funciones públicas' },
              { icon: Scale, text: 'Ejercer el control disciplinario interno' },
              { icon: FileText, text: 'Tramitar derechos de petición y acciones de tutela' },
              { icon: Users, text: 'Promover y divulgar los derechos humanos' },
              { icon: Shield, text: 'Atender quejas y denuncias ciudadanas' },
              { icon: FileText, text: 'Defender el patrimonio público' },
              { icon: Users, text: 'Promover la participación ciudadana' },
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
                  'Constitución Política de Colombia - Artículo 178',
                  'Ley 136 de 1994 - Modernización de municipios',
                  'Ley 1437 de 2011 - Código de Procedimiento Administrativo',
                  'Ley 1755 de 2015 - Derecho de Petición',
                  'Ley 1952 de 2019 - Código Disciplinario Único',
                ].map((item, index) => (
                  <li key={index} style={{ 
                    padding: 'var(--spacing-md)', 
                    borderBottom: index < 4 ? '1px solid var(--color-border)' : 'none',
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
