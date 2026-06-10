'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, Clock, Baby } from 'lucide-react';
import { PROTECTION_MEASURE_TYPE_LABELS } from '@/domain/catalogs/familyLabels';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Data {
  measuresOverdue: any[];
  measuresUpcoming: any[];
  pardOverdue: any[];
  counts: { measuresOverdue: number; measuresUpcoming: number; pardOverdue: number };
}

const card: React.CSSProperties = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' };
const empty: React.CSSProperties = { color: '#9ca3af', fontSize: '0.88rem', margin: 0 };

function CaseLink({ c, router }: { c: any; router: any }) {
  return (
    <button onClick={() => router.push(`/admin/family/${c.id}`)} style={{ background: 'none', border: 'none', color: 'var(--color-primary, #2563eb)', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 600, padding: 0 }}>
      {c.filingNumber}
    </button>
  );
}

export default function VencimientosPage() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/v1/family/vencimientos');
        if (res.ok) setData(await res.json());
      } catch (e) {
        console.error('Error cargando vencimientos:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ maxWidth: '900px' }}>
      <button onClick={() => router.push('/admin/family')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Volver a casos
      </button>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '1.25rem' }}>Control de términos y vencimientos</h1>

      {loading ? <p style={{ color: '#6b7280' }}>Cargando…</p> : !data ? <p style={{ color: '#6b7280' }}>No se pudo cargar.</p> : (
        <>
          {/* Medidas vencidas */}
          <div style={{ ...card, borderColor: '#fecaca' }}>
            <h2 style={{ fontSize: '1.05rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#b91c1c' }}>
              <AlertTriangle size={18} /> Medidas vencidas ({data.counts.measuresOverdue})
            </h2>
            {data.measuresOverdue.length === 0 ? <p style={empty}>Sin medidas vencidas pendientes.</p> : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {data.measuresOverdue.map((m) => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #fee2e2', borderRadius: '8px', padding: '0.55rem 0.8rem' }}>
                    <div>
                      <b>{PROTECTION_MEASURE_TYPE_LABELS[m.measureType] ?? m.measureType}</b>
                      <span style={{ color: '#6b7280', marginLeft: '0.5rem', fontSize: '0.85rem' }}>· <CaseLink c={m.case} router={router} /></span>
                    </div>
                    <span style={{ color: '#b91c1c', fontSize: '0.82rem', fontWeight: 600 }}>venció {new Date(m.expiresAt).toLocaleDateString('es-CO')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Medidas por vencer */}
          <div style={{ ...card, borderColor: '#fde68a' }}>
            <h2 style={{ fontSize: '1.05rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#b45309' }}>
              <Clock size={18} /> Medidas próximas a vencer ({data.counts.measuresUpcoming})
            </h2>
            {data.measuresUpcoming.length === 0 ? <p style={empty}>Sin medidas próximas a vencer.</p> : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {data.measuresUpcoming.map((m) => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #fef3c7', borderRadius: '8px', padding: '0.55rem 0.8rem' }}>
                    <div>
                      <b>{PROTECTION_MEASURE_TYPE_LABELS[m.measureType] ?? m.measureType}</b>
                      <span style={{ color: '#6b7280', marginLeft: '0.5rem', fontSize: '0.85rem' }}>· <CaseLink c={m.case} router={router} /></span>
                    </div>
                    <span style={{ color: '#b45309', fontSize: '0.82rem', fontWeight: 600 }}>vence {new Date(m.expiresAt).toLocaleDateString('es-CO')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PARD atrasados */}
          <div style={{ ...card, borderColor: '#cfe0f4' }}>
            <h2 style={{ fontSize: '1.05rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#003d7a' }}>
              <Baby size={18} /> PARD con término atrasado ({data.counts.pardOverdue})
            </h2>
            {data.pardOverdue.length === 0 ? <p style={empty}>Sin procesos PARD atrasados.</p> : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {data.pardOverdue.map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e8eef7', borderRadius: '8px', padding: '0.55rem 0.8rem' }}>
                    <div>
                      <b>NNA: {p.child?.firstName} {p.child?.firstLastName}</b>
                      <span style={{ color: '#6b7280', marginLeft: '0.5rem', fontSize: '0.85rem' }}>· <CaseLink c={p.case} router={router} /></span>
                    </div>
                    <span style={{ color: '#003d7a', fontSize: '0.82rem', fontWeight: 600 }}>abierto {new Date(p.openedAt).toLocaleDateString('es-CO')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
