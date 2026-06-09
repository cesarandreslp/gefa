'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { HEARING_TYPE_LABELS } from '@/domain/catalogs/familyLabels';

/* eslint-disable @typescript-eslint/no-explicit-any */

const card: React.CSSProperties = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem' };

function fmtDateKey(d: Date) { return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }); }

export default function AgendaPage() {
  const router = useRouter();
  const [hearings, setHearings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/family/agenda?mine=${mine}`);
      if (res.ok) setHearings((await res.json()).data ?? []);
    } catch (e) {
      console.error('Error cargando agenda:', e);
    } finally {
      setLoading(false);
    }
  }, [mine]);

  useEffect(() => { load(); }, [load]);

  // Agrupar por día
  const groups: Record<string, any[]> = {};
  for (const h of hearings) {
    const key = fmtDateKey(new Date(h.scheduledAt));
    (groups[key] ??= []).push(h);
  }

  return (
    <div style={{ maxWidth: '850px' }}>
      <button onClick={() => router.push('/admin/family')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Volver a casos
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontSize: '1.6rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={22} /> Agenda de audiencias
        </h1>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Solo las que presido
        </label>
      </div>
      <p style={{ color: '#6b7280', marginTop: '-0.5rem', marginBottom: '1.25rem', fontSize: '0.88rem' }}>Próximos 30 días</p>

      {loading ? <p style={{ color: '#6b7280' }}>Cargando…</p> : hearings.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: '#6b7280' }}>
          <Calendar size={32} style={{ opacity: 0.4 }} />
          <p>No hay audiencias programadas en el periodo.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {Object.entries(groups).map(([day, items]) => (
            <div key={day}>
              <h3 style={{ fontSize: '0.95rem', color: '#374151', textTransform: 'capitalize', marginBottom: '0.6rem' }}>{day}</h3>
              <div style={{ ...card, padding: '0.5rem' }}>
                {items.map((h) => (
                  <div key={h.id} onClick={() => router.push(`/admin/family/${h.case.id}`)} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.7rem 0.85rem', borderRadius: '8px', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary, #2563eb)', minWidth: '64px' }}>
                      {new Date(h.scheduledAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div><b>{HEARING_TYPE_LABELS[h.hearingType] ?? h.hearingType}</b> <span style={{ color: '#9ca3af', fontSize: '0.82rem', fontFamily: 'monospace' }}>{h.case.filingNumber}</span></div>
                      <div style={{ color: '#6b7280', fontSize: '0.84rem' }}>{h.case.subject}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ background: h.wasHeld ? '#dcfce7' : '#fef3c7', color: h.wasHeld ? '#166534' : '#92400e', borderRadius: '999px', padding: '0.1rem 0.55rem', fontSize: '0.74rem', fontWeight: 600 }}>{h.wasHeld ? 'Celebrada' : 'Programada'}</span>
                      {h.presidedBy?.fullName && <div style={{ fontSize: '0.76rem', color: '#9ca3af', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'flex-end' }}><User size={11} /> {h.presidedBy.fullName}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
