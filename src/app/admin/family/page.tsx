'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Users, FileText, AlertTriangle, Calendar, BarChart3, X } from 'lucide-react';
import { CASE_MODALITY_LABELS } from '@/domain/catalogs/familyLabels';
import { FAMILY_CASE_STATES } from '@/domain/catalogs/familyCaseStates';

interface FamilyCaseRow {
  id: string;
  filingNumber: string;
  subject: string;
  filedAt: string;
  caseModality: string | null;
  priority: number;
  caseType: { code: string; name: string } | null;
  state: { code: string; name: string; color: string | null } | null;
  comisaria: { id: string; code: string; name: string } | null;
  caseParties: { id: string; person: { firstName: string; firstLastName: string; isMinor: boolean } }[];
}

interface ComisariaOpt { id: string; code: string; name: string; isActive?: boolean }

const selStyle: React.CSSProperties = { padding: '0.5rem 0.6rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.88rem', background: 'white', color: '#374151' };

export default function FamilyCasesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<FamilyCaseRow[]>([]);
  const [total, setTotal] = useState(0);

  // Filtros
  const [search, setSearch] = useState('');
  const [comisariaId, setComisariaId] = useState('');
  const [modality, setModality] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [comisarias, setComisarias] = useState<ComisariaOpt[]>([]);
  const [role, setRole] = useState('');
  const isAdmin = role === 'ADMIN';

  useEffect(() => {
    fetch('/api/v1/comisarias').then((r) => (r.ok ? r.json() : null)).then((d) => setComisarias(d?.comisarias ?? [])).catch(() => {});
    fetch('/api/v1/auth/me', { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).then((d) => setRole(d?.data?.user?.role?.code ?? '')).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (comisariaId) params.set('comisariaId', comisariaId);
      if (modality) params.set('modality', modality);
      if (stateCode) params.set('stateCode', stateCode);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
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
  }, [search, comisariaId, modality, stateCode, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const hasFilters = !!(search || comisariaId || modality || stateCode || from || to);
  const clearFilters = () => { setSearch(''); setComisariaId(''); setModality(''); setStateCode(''); setFrom(''); setTo(''); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Casos de Familia</h1>
          <p style={{ color: '#6b7280', margin: '0.25rem 0 0' }}>{total} caso(s){hasFilters ? ' (filtrados)' : ' radicado(s)'}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/admin/family/stats')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.6rem 1.1rem', fontWeight: 600, cursor: 'pointer' }}>
            <BarChart3 size={18} /> Estadísticas
          </button>
          <button onClick={() => router.push('/admin/family/agenda')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.6rem 1.1rem', fontWeight: 600, cursor: 'pointer' }}>
            <Calendar size={18} /> Agenda
          </button>
          <button onClick={() => router.push('/admin/family/vencimientos')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'white', color: '#b45309', border: '1px solid #fcd34d', borderRadius: '8px', padding: '0.6rem 1.1rem', fontWeight: 600, cursor: 'pointer' }}>
            <AlertTriangle size={18} /> Vencimientos
          </button>
          {/* El ADMIN no radica casos */}
          {!isAdmin && (
            <button onClick={() => router.push('/admin/family/nuevo')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-primary, #2563eb)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.6rem 1.1rem', fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={18} /> Radicar caso
            </button>
          )}
        </div>
      </div>

      {/* Barra de filtros */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '0.9rem 1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <Search size={16} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por radicado o asunto…" style={{ width: '100%', padding: '0.5rem 0.6rem 0.5rem 2rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.88rem' }} />
        </div>

        <select value={comisariaId} onChange={(e) => setComisariaId(e.target.value)} style={selStyle} aria-label="Filtrar por comisaría">
          <option value="">Todas las comisarías</option>
          {comisarias.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select value={modality} onChange={(e) => setModality(e.target.value)} style={selStyle} aria-label="Filtrar por tipo de caso">
          <option value="">Todos los tipos</option>
          {Object.entries(CASE_MODALITY_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>

        <select value={stateCode} onChange={(e) => setStateCode(e.target.value)} style={selStyle} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {FAMILY_CASE_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#6b7280' }}>
          Desde <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={selStyle} aria-label="Fecha desde" />
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#6b7280' }}>
          Hasta <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={selStyle} aria-label="Fecha hasta" />
        </label>

        {hasFilters && (
          <button onClick={clearFilters} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.5rem 0.8rem', fontSize: '0.85rem', cursor: 'pointer' }}>
            <X size={14} /> Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ color: '#6b7280' }}>Cargando…</p>
      ) : cases.length === 0 ? (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
          <FileText size={36} style={{ opacity: 0.4 }} />
          <p>{hasFilters ? 'No hay casos que coincidan con los filtros.' : 'No hay casos de familia radicados todavía.'}</p>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', textAlign: 'left', color: '#374151' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Radicado</th>
                <th style={{ padding: '0.75rem 1rem' }}>Asunto</th>
                <th style={{ padding: '0.75rem 1rem' }}>Tipo</th>
                <th style={{ padding: '0.75rem 1rem' }}>Comisaría</th>
                <th style={{ padding: '0.75rem 1rem' }}>Partes</th>
                <th style={{ padding: '0.75rem 1rem' }}>Estado</th>
                <th style={{ padding: '0.75rem 1rem' }}>Radicado el</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} onClick={() => router.push(`/admin/family/${c.id}`)} style={{ borderTop: '1px solid #f3f4f6', cursor: 'pointer' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, fontFamily: 'monospace' }}>{c.filingNumber}</td>
                  <td style={{ padding: '0.75rem 1rem', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.subject}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{c.caseModality ? (CASE_MODALITY_LABELS[c.caseModality] ?? c.caseModality) : '—'}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: c.comisaria ? '#374151' : '#9ca3af' }}>{c.comisaria ? c.comisaria.code : '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#6b7280' }}>
                      <Users size={14} /> {c.caseParties.length}
                      {c.caseParties.some((p) => p.person.isMinor) && (
                        <span title="Incluye NNA" style={{ marginLeft: '0.3rem', background: '#fef3c7', color: '#b45309', borderRadius: '6px', padding: '0.05rem 0.4rem', fontSize: '0.7rem', fontWeight: 700 }}>NNA</span>
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
