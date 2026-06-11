/**
 * /admin/localizar — Localizador de Procesos (Auxiliar de Atención al Usuario)
 *
 * Pantalla de SOLO consulta. El auxiliar busca por radicado/proceso, cédula o
 * nombre y ve en qué comisaría(s) del tenant tiene proceso(s) el ciudadano, para
 * remitirlo a la sede correcta sin que vaya de comisaría en comisaría. No expone
 * el contenido del expediente. Estilo inline (el proyecto no usa Tailwind).
 */

'use client';

import { useState } from 'react';
import { MapPin, Search, Building2, Calendar, FileText, AlertCircle, Baby } from 'lucide-react';
import AdminPageHeader from '../AdminPageHeader';

interface Person {
  name: string;
  documentType: string;
  documentNumber: string;
  role: string;
  isMinor: boolean;
}

interface LocateResult {
  caseId: string;
  filingNumber: string;
  filedAt: string;
  caseType: string | null;
  state: { name: string; color: string } | null;
  comisaria: { name: string; code: string; phone: string | null; address: string | null } | null;
  people: Person[];
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' };
const label: React.CSSProperties = { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 5 };

const ROLE_LABELS: Record<string, string> = {
  VICTIMA: 'Víctima',
  AGRESOR: 'Presunto agresor',
  DENUNCIANTE: 'Denunciante',
  NNA: 'NNA',
  TESTIGO: 'Testigo',
  INTERVINIENTE: 'Interviniente',
  RADICANTE: 'Radicante',
};

export default function LocalizarProcesoPage() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<LocateResult[]>([]);
  const [sedes, setSedes] = useState<string[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (term.length < 3) {
      setError('Ingrese al menos 3 caracteres (radicado, cédula o nombre).');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/v1/family/locate?q=${encodeURIComponent(term)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error en la consulta');
      setResults(json.data || []);
      setSedes(json.sedes || []);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en la consulta');
      setResults([]);
      setSedes([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Localizar Proceso"
        subtitle="Consulte en qué comisaría de la entidad tiene proceso un ciudadano, para remitirlo a la sede correcta."
        icon={<MapPin size={24} />}
      />

      {/* Buscador */}
      <div style={{ ...card, marginBottom: '1.25rem' }}>
        <form onSubmit={handleSearch}>
          <label style={label} htmlFor="locate-q">Número de radicado / proceso, cédula o nombre</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              id="locate-q"
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ej: 1234567890, PER-2026-00045 o Juan Pérez"
              autoFocus
              style={{ flex: '1 1 280px', padding: '0.7rem 0.8rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.92rem', boxSizing: 'border-box' }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: loading ? '#9ca3af' : 'var(--color-primary, #2563eb)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem 1.4rem', fontWeight: 600, fontSize: '0.92rem', cursor: loading ? 'wait' : 'pointer' }}
            >
              <Search size={17} /> {loading ? 'Buscando…' : 'Buscar'}
            </button>
          </div>
          {error && (
            <div style={{ marginTop: '0.9rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.7rem 0.9rem', borderRadius: 8, fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </form>
      </div>

      {/* Nota de uso */}
      {!searched && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '1rem 1.25rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e40af', margin: '0 0 0.5rem' }}>Cómo usar esta consulta</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#1e3a8a', fontSize: '0.84rem', lineHeight: 1.7 }}>
            <li>Busca en todas las comisarías de la entidad, por radicado, cédula o nombre.</li>
            <li>Le indica la <strong>sede</strong> donde reposa el proceso para remitir al ciudadano sin que recorra todas las comisarías.</li>
            <li>Es solo de localización: no muestra el contenido del expediente.</li>
            <li>Cada consulta queda registrada en auditoría (Ley 1581 de 2012).</li>
          </ul>
        </div>
      )}

      {/* Resumen de sedes */}
      {searched && results.length > 0 && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', color: '#166534', fontWeight: 600 }}>
            Se encontraron {results.length} proceso(s) en {sedes.length} sede(s):
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {sedes.map((s) => (
              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #bbf7d0', borderRadius: 999, padding: '0.35rem 0.75rem', fontSize: '0.82rem', color: '#15803d', fontWeight: 600 }}>
                <Building2 size={14} /> {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sin resultados */}
      {searched && results.length === 0 && !error && (
        <div style={{ ...card, textAlign: 'center', color: '#64748b' }}>
          <p style={{ margin: '0 0 0.35rem', fontWeight: 600, color: '#334155' }}>No se encontraron procesos para «{q.trim()}».</p>
          <p style={{ margin: 0, fontSize: '0.86rem' }}>Verifique el dato ingresado. Si la persona nunca ha radicado, no tendrá proceso en la entidad.</p>
        </div>
      )}

      {/* Resultados */}
      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {results.map((r) => (
            <div key={r.caseId} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                {/* Sede — lo más importante para el mostrador */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'color-mix(in srgb, var(--color-primary, #2563eb) 12%, white)', color: 'var(--color-primary, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Building2 size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
                      {r.comisaria ? r.comisaria.name : 'Sin comisaría asignada'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {r.comisaria
                        ? [r.comisaria.code, r.comisaria.phone].filter(Boolean).join(' · ')
                        : 'Consulte con la coordinación para asignar sede'}
                    </div>
                  </div>
                </div>
                {r.state && (
                  <span style={{ background: `${r.state.color}1a`, color: r.state.color, border: `1px solid ${r.state.color}55`, borderRadius: 999, padding: '0.3rem 0.7rem', fontSize: '0.76rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {r.state.name}
                  </span>
                )}
              </div>

              {/* Dirección física de la sede — dato clave para remitir al ciudadano */}
              {r.comisaria && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.6rem 0.8rem', marginBottom: 12 }}>
                  <MapPin size={16} color="var(--color-primary, #2563eb)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: '0.86rem', color: '#1e3a8a' }}>
                    <span style={{ fontWeight: 600 }}>Dirección: </span>
                    {r.comisaria.address || 'No registrada — verifíquela en la configuración de comisarías.'}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, paddingTop: 12, borderTop: '1px solid #f1f5f9', fontSize: '0.85rem', color: '#374151' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={15} color="#94a3b8" /> <strong style={{ fontFamily: 'monospace' }}>{r.filingNumber}</strong>
                </span>
                {r.caseType && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{r.caseType}</span>
                )}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={15} color="#94a3b8" /> {new Date(r.filedAt).toLocaleDateString('es-CO')}
                </span>
              </div>

              {r.people.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {r.people.map((p, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.35rem 0.65rem', fontSize: '0.8rem', color: '#475569' }}>
                      {p.isMinor && <Baby size={13} color="#c2410c" />}
                      <strong style={{ color: '#334155' }}>{p.name}</strong>
                      <span style={{ color: '#94a3b8' }}>· {p.documentType} {p.documentNumber}</span>
                      <span style={{ color: 'var(--color-primary, #2563eb)', fontWeight: 600 }}>· {ROLE_LABELS[p.role] ?? p.role}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
