'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Users, FileText } from 'lucide-react';
import { CASE_MODALITY_LABELS } from '@/domain/catalogs/familyLabels';

interface FamilyCaseRow {
  id: string;
  filingNumber: string;
  subject: string;
  filedAt: string;
  caseModality: string | null;
  priority: number;
  caseType: { code: string; name: string } | null;
  state: { code: string; name: string; color: string | null } | null;
  caseParties: { id: string; person: { firstName: string; firstLastName: string; isMinor: boolean } }[];
}

export default function FamilyCasesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<FamilyCaseRow[]>([]);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/v1/family/cases?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCases(data.data ?? []);
        setTotal(data.pagination?.total ?? 0);
      }
    } catch (e) {
      console.error('Error cargando casos de familia:', e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Casos de Familia</h1>
          <p style={{ color: '#6b7280', margin: '0.25rem 0 0' }}>{total} caso(s) radicado(s)</p>
        </div>
        <button
          onClick={() => router.push('/admin/family/nuevo')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-primary, #2563eb)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.6rem 1.1rem', fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={18} /> Radicar caso
        </button>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); load(); }}
        style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', maxWidth: '420px' }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por radicado o asunto…"
            style={{ width: '100%', padding: '0.5rem 0.6rem 0.5rem 2rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem' }}
          />
        </div>
        <button type="submit" style={{ background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0 0.9rem', cursor: 'pointer' }}>Buscar</button>
      </form>

      {loading ? (
        <p style={{ color: '#6b7280' }}>Cargando…</p>
      ) : cases.length === 0 ? (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
          <FileText size={36} style={{ opacity: 0.4 }} />
          <p>No hay casos de familia radicados todavía.</p>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', textAlign: 'left', color: '#374151' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Radicado</th>
                <th style={{ padding: '0.75rem 1rem' }}>Asunto</th>
                <th style={{ padding: '0.75rem 1rem' }}>Modalidad</th>
                <th style={{ padding: '0.75rem 1rem' }}>Partes</th>
                <th style={{ padding: '0.75rem 1rem' }}>Estado</th>
                <th style={{ padding: '0.75rem 1rem' }}>Radicado el</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/admin/family/${c.id}`)}
                  style={{ borderTop: '1px solid #f3f4f6', cursor: 'pointer' }}
                >
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, fontFamily: 'monospace' }}>{c.filingNumber}</td>
                  <td style={{ padding: '0.75rem 1rem', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.subject}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{c.caseModality ? (CASE_MODALITY_LABELS[c.caseModality] ?? c.caseModality) : '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#6b7280' }}>
                      <Users size={14} /> {c.caseParties.length}
                      {c.caseParties.some((p) => p.person.isMinor) && (
                        <span title="Incluye NNA" style={{ marginLeft: '0.3rem', background: '#fce7f3', color: '#be185d', borderRadius: '6px', padding: '0.05rem 0.4rem', fontSize: '0.7rem', fontWeight: 700 }}>NNA</span>
                      )}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ background: (c.state?.color ?? '#6b7280') + '22', color: c.state?.color ?? '#374151', borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.78rem', fontWeight: 600 }}>
                      {c.state?.name ?? '—'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>{new Date(c.filedAt).toLocaleDateString('es-CO')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
