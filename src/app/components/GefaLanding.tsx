import Link from 'next/link';
import {
  ShieldCheck, FileText, Scale, Baby, Users, Bell, History,
  ArrowRight, LogIn, Building2,
} from 'lucide-react';

// Landing informativa del PRODUCTO GEFA. Se muestra en el dominio raíz del SaaS,
// que no pertenece a ninguna comisaría (resolveTenantByHost devuelve null).
// Cada comisaría tiene su propio dominio, donde se muestra su landing de entidad.

const FEATURES = [
  { icon: FileText, title: 'Expediente digital', text: 'Reemplaza el expediente en papel. Radicación, partes, documentos e historial de cada caso de familia en un solo lugar.' },
  { icon: Scale, title: 'Medidas de protección', text: 'Emisión, vigencia y seguimiento de medidas (Ley 294/1996, Ley 1257/2008) con notificación a la autoridad policial.' },
  { icon: Baby, title: 'Restablecimiento de derechos', text: 'Procesos PARD para NNA conforme a la Ley 1098/2006, con etapas, valoraciones y seguimiento.' },
  { icon: Users, title: 'Equipo interdisciplinario', text: 'Asignación de psicología, trabajo social y jurídica, agenda de audiencias y valoraciones psicosociales.' },
  { icon: Bell, title: 'Notificaciones y analítica', text: 'Alertas de vencimiento de términos legales, recordatorios y tableros con indicadores agregados y anonimizados.' },
  { icon: History, title: 'Trazabilidad y auditoría', text: 'Registro inmutable encadenado de cada acción, con control de acceso a datos sensibles (Ley 1581/2012).' },
];

export default function GefaLanding() {
  const wrap: React.CSSProperties = { maxWidth: 1080, margin: '0 auto', padding: '0 20px' };
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b', fontFamily: 'system-ui, sans-serif' }}>
      {/* Barra superior */}
      <header style={{ borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
        <div style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 18 }}>
            <span style={{ background: '#1a5fb4', color: '#fff', borderRadius: 9, padding: 7, display: 'flex' }}><ShieldCheck size={20} /></span>
            GEFA <span style={{ color: '#94a3b8', fontWeight: 500 }}>— Gestión Familiar</span>
          </div>
          <Link href="/acceso" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#475569', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            <LogIn size={16} /> Acceso institucional
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: 'linear-gradient(180deg, #e8eef7 0%, #f8fafc 100%)', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ ...wrap, padding: '72px 20px', textAlign: 'center' }}>
          <span style={{ display: 'inline-block', background: '#cfe0f4', color: '#003d7a', borderRadius: 999, padding: '5px 14px', fontSize: 13, fontWeight: 600, marginBottom: 18 }}>
            Plataforma SaaS para comisarías de familia
          </span>
          <h1 style={{ fontSize: 44, lineHeight: 1.1, margin: '0 0 16px', fontWeight: 800, color: '#1e293b' }}>
            Gestión integral del expediente<br />de la comisaría de familia
          </h1>
          <p style={{ fontSize: 19, color: '#475569', maxWidth: 680, margin: '0 auto 32px', lineHeight: 1.5 }}>
            GEFA digitaliza la atención de casos de violencia intrafamiliar, medidas de protección,
            restablecimiento de derechos de NNA y valoraciones psicosociales — con trazabilidad y
            cumplimiento normativo de extremo a extremo.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/registro-entidad" style={primaryCta}>
              <Building2 size={18} /> Registrar entidad
            </Link>
            <Link href="/acceso" style={secondaryCta}>
              Acceso institucional <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Características */}
      <section style={{ ...wrap, padding: '64px 20px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 30, fontWeight: 800, margin: '0 0 8px' }}>Todo el proceso, en un solo sistema</h2>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: 16, margin: '0 0 40px' }}>
          Del registro de la denuncia al seguimiento de la medida.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24 }}>
              <div style={{ background: '#e8eef7', color: '#1a5fb4', width: 46, height: 46, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <f.icon size={24} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px' }}>{f.title}</h3>
              <p style={{ fontSize: 14.5, color: '#64748b', margin: 0, lineHeight: 1.55 }}>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cierre / marco normativo */}
      <section style={{ background: '#0a2540', color: '#e0e7ff' }}>
        <div style={{ ...wrap, padding: '56px 20px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 12px', color: '#fff' }}>Construido sobre el marco legal colombiano</h2>
          <p style={{ fontSize: 16, color: '#c7d2fe', maxWidth: 720, margin: '0 auto 28px', lineHeight: 1.6 }}>
            Ley 1098 de 2006 (Infancia y Adolescencia), Ley 294/1996 y Ley 1257/2008 (violencia intrafamiliar),
            Ley 2126 de 2021 (comisarías de familia) y Ley 1581 de 2012 (protección de datos personales).
          </p>
          <Link href="/registro-entidad" style={{ ...primaryCta, background: '#fff', color: '#002855' }}>
            <Building2 size={18} /> Solicitar mi comisaría
          </Link>
        </div>
      </section>

      {/* Footer con acceso discreto */}
      <footer style={{ borderTop: '1px solid #e2e8f0', background: '#fff' }}>
        <div style={{ ...wrap, padding: '24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ color: '#94a3b8', fontSize: 14 }}>GEFA — Gestión Familiar · Plataforma para comisarías de familia</span>
          <Link href="/acceso" style={{ color: '#1a5fb4', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <LogIn size={15} /> Acceso institucional
          </Link>
        </div>
      </footer>
    </div>
  );
}

const primaryCta: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1a5fb4', color: '#fff', textDecoration: 'none', padding: '12px 22px', borderRadius: 10, fontSize: 15, fontWeight: 700 };
const secondaryCta: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#003d7a', textDecoration: 'none', padding: '12px 22px', borderRadius: 10, fontSize: 15, fontWeight: 700, border: '1px solid #cfe0f4' };
