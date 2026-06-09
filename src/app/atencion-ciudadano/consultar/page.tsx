/**
 * Página de Consulta de Estado de Solicitud
 * 
 * Permite a los ciudadanos consultar el estado de sus solicitudes
 * usando el número de radicado (sin necesidad de login)
 * 
 * Etapa 2 - Prompt 1
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, FileText, AlertCircle, CheckCircle, Clock, ArrowLeft, ArrowUpRight, Send, XCircle } from 'lucide-react';
import Link from 'next/link';

interface CaseStatus {
  id: string;
  filingNumber: string;
  state: string;
  createdAt: string;
  filedAt?: string;
  assignedToDepartment?: string;
  assignedToOfficial?: string;
  subject?: string;
  casoEnGestion?: boolean;
  documents?: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
    description: string | null;
    uploadedBy?: string;
  }>;
  responseHistory?: Array<{
    id: string;
    date: string;
    message: string;
    state: string;
    stateName: string;
    authorType?: 'FUNCIONARIO' | 'CIUDADANO' | 'SISTEMA' | 'ENTIDAD';
    authorLabel?: string;
    expiresAt?: string;
    ciudadanoRespondio?: boolean;
    respuestaCiudadano?: string;
  }>;
}

export default function ConsultarEstadoPage() {
  const [filingNumber, setFilingNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<CaseStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const [responseSuccess, setResponseSuccess] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Auto-llenar el radicado si viene en la URL (ej: clic desde el correo)
  useEffect(() => {
    // Usamos window.location.search directamente en el cliente 
    // para evitar problemas con useSearchParams que requiere Suspense en App Router
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const radicadoFromUrl = params.get('radicado');
      if (radicadoFromUrl) {
        setFilingNumber(radicadoFromUrl);
      }
    }
  }, []);

  // Función de refresh silencioso (no borra resultados existentes)
  const silentRefresh = useCallback(async () => {
    if (!filingNumber.trim() || !result) return;
    try {
      const response = await fetch(`/api/v1/cases/public/status?filingNumber=${encodeURIComponent(filingNumber.trim())}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setResult(data.data);
      }
    } catch (err) {
      console.error('Silent refresh error:', err);
    }
  }, [filingNumber, result]);

  // Auto-refresh cada 30 segundos cuando hay un caso cargado
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (result) {
      refreshIntervalRef.current = setInterval(silentRefresh, 30000);
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [result, silentRefresh]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const MAX = 25 * 1024 * 1024;
    const oversized = newFiles.find(f => f.size > MAX);
    if (oversized) {
      alert(`"${oversized.name}" supera el límite de 25MB`);
      e.target.value = '';
      return;
    }
    setSelectedFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      return [...prev, ...newFiles.filter(f => !existingNames.has(f.name))];
    });
    e.target.value = '';
  };

  const validateFilingNumber = (value: string): boolean => {
    // Validación flexible: permitir cualquier formato que contenga letras, guiones y números
    const trimmed = value.trim();
    // Mínimo 5 caracteres y al menos un guion
    return trimmed.length >= 5 && trimmed.includes('-');
  };

  const getStateLabel = (state: string): string => {
    const stateLabels: Record<string, string> = {
      'NEW': 'Radicado',
      'IN_PROGRESS': 'En trámite',
      'ASSIGNED': 'Asignado',
      'PENDING': 'Pendiente',
      'RESPONDED': 'Respondido',
      'CLOSED': 'Cerrado',
      'REJECTED': 'Rechazado'
    };
    return stateLabels[state] || state;
  };

  const getStateColor = (state: string): string => {
    const stateColors: Record<string, string> = {
      'RADICADO': '#0ea5e9',
      'EN_ESTUDIO': '#f59e0b',
      'REQUIERE_INFORMACION': '#eab308',
      'ESCALADO_A_OTRA_DEPENDENCIA': '#9333ea',
      'REMITIDO_A_ENTIDAD_EXTERNA': '#0891b2',
      'REMITIDO_POR_COMPETENCIA': '#dc2626',
      'CERRADO': '#6b7280'
    };
    return stateColors[state] || '#6b7280';
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'RADICADO':
        return <FileText size={24} />;
      case 'EN_ESTUDIO':
        return <Clock size={24} />;
      case 'REQUIERE_INFORMACION':
        return <AlertCircle size={24} />;
      case 'ESCALADO_A_OTRA_DEPENDENCIA':
        return <ArrowUpRight size={24} />;
      case 'REMITIDO_A_ENTIDAD_EXTERNA':
        return <Send size={24} />;
      case 'REMITIDO_POR_COMPETENCIA':
        return <XCircle size={24} />;
      case 'CERRADO':
        return <CheckCircle size={24} />;
      default:
        return <FileText size={24} />;
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSearch();
  };

  const performSearch = async () => {
    setError(null);
    setResult(null);

    // Validar formato
    if (!filingNumber.trim()) {
      setError('Por favor ingrese un número de radicado');
      return;
    }

    if (!validateFilingNumber(filingNumber)) {
      setError('Por favor ingrese un número de radicado válido (debe contener al menos 5 caracteres y un guion)');
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(`/api/v1/cases/public/status?filingNumber=${encodeURIComponent(filingNumber.trim())}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data.data);
      } else {
        setError(data.error?.message || 'No se encontró ninguna solicitud con ese número de radicado.');
      }
    } catch (err) {
      console.error('Error searching case:', err);
      setError('Error de conexión. Por favor intente nuevamente.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setFilingNumber('');
    setResult(null);
    setError(null);
    setResponseText('');
    setResponseSuccess(false);
    setSelectedFiles([]);
  };

  const handleSubmitResponse = async (caseId: string) => {
    if (!responseText.trim()) {
      alert('Por favor escriba su respuesta');
      return;
    }

    if (responseText.trim().length < 10) {
      alert('La respuesta debe tener al menos 10 caracteres');
      return;
    }

    setIsSubmittingResponse(true);

    try {
      // 1. Si hay archivos, subirlos uno por uno
      for (const file of selectedFiles) {
        const fd = new FormData();
        fd.append('caseId', caseId);
        fd.append('file', file);
        fd.append('documentType', 'SUPPORTING_DOC');
        fd.append('description', 'Documento adjunto por el ciudadano en respuesta');
        if (result?.filingNumber) fd.append('filingNumber', result.filingNumber);

        const uploadRes = await fetch('/api/v1/documents/upload-public', {
          method: 'POST',
          body: fd,
        });

        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json();
          throw new Error(uploadData.error || 'Error al subir el archivo adjunto');
        }
      }

      // 2. Enviar el mensaje de respuesta
      const response = await fetch(`/api/v1/cases/${caseId}/citizen-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: responseText.trim(), filingNumber: result?.filingNumber }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResponseSuccess(true);
        setResponseText('');
        setSelectedFiles([]);
        // Recargar el caso para mostrar la respuesta
        await performSearch();
      } else {
        alert(data.error?.message || 'Error al enviar la respuesta');
      }
    } catch (err) {
      console.error('Error enviando respuesta:', err);
      alert(err instanceof Error ? err.message : 'Error de conexión. Por favor intente nuevamente.');
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #003d7a 0%, #0056b3 100%)',
        padding: 'clamp(1.5rem, 5vw, 3rem) 1rem',
        color: 'white',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'clamp(0.75rem, 3vw, 1.5rem)' }}>
            <Search size={48} strokeWidth={1.5} />
          </div>
          <h1 style={{
            fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
            fontWeight: '700',
            marginBottom: 'clamp(0.5rem, 2vw, 1rem)',
            lineHeight: '1.2',
            color: 'white'
          }}>
            Consultar Estado de Solicitud
          </h1>
          <p style={{
            fontSize: 'clamp(0.875rem, 3vw, 1.125rem)',
            opacity: 0.95,
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.5'
          }}>
            Ingrese su número de radicado para conocer el estado actual de su solicitud
          </p>
        </div>
      </div>

      {/* Contenido Principal */}
      <div
        className="mobile-container"
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: 'var(--spacing-2xl) var(--spacing-md)'
        }}
      >
        {/* Botón Volver */}
        <Link
          href="/atencion-ciudadano/solicitud"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--color-primary)',
            textDecoration: 'none',
            marginBottom: 'var(--spacing-xl)',
            fontSize: '0.95rem',
            fontWeight: '500',
            transition: 'opacity 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.7'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
        >
          <ArrowLeft size={18} />
          Volver a Atención al Ciudadano
        </Link>

        {/* Formulario de Búsqueda */}
        <div
          className="mobile-card"
          style={{
            backgroundColor: 'white',
            borderRadius: 'var(--border-radius-lg)',
            padding: 'var(--spacing-2xl)',
            boxShadow: 'var(--shadow-md)',
            marginBottom: 'var(--spacing-xl)'
          }}
        >
          <form onSubmit={handleSearch}>
            <label
              htmlFor="filingNumber"
              style={{
                display: 'block',
                fontWeight: '600',
                marginBottom: 'var(--spacing-sm)',
                color: 'var(--color-text-primary)',
                fontSize: '1.125rem'
              }}
            >
              Número de Radicado
            </label>
            <p style={{
              fontSize: '0.875rem',
              color: '#666',
              marginBottom: 'var(--spacing-md)'
            }}>
              Ingrese el número de radicado completo que aparece en su comprobante
            </p>

            <div style={{
              display: 'flex',
              gap: 'var(--spacing-md)',
              flexWrap: 'wrap'
            }}>
              <input
                id="filingNumber"
                type="text"
                value={filingNumber}
                onChange={(e) => setFilingNumber(e.target.value.toUpperCase())}
                placeholder="Ej: PER-2026-00001"
                className="mobile-input"
                style={{
                  flex: '1',
                  minWidth: '250px',
                  padding: 'var(--spacing-md)',
                  fontSize: '1rem',
                  border: '2px solid #ddd',
                  borderRadius: 'var(--border-radius-md)',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
              />

              <button
                type="submit"
                disabled={isSearching}
                className="mobile-button"
                style={{
                  padding: 'var(--spacing-md) var(--spacing-xl)',
                  backgroundColor: isSearching ? '#6c757d' : 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--border-radius-md)',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: isSearching ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  if (!isSearching) e.currentTarget.style.backgroundColor = '#004a99';
                }}
                onMouseOut={(e) => {
                  if (!isSearching) e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                }}
              >
                {isSearching ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
                      <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"></path>
                    </svg>
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    Consultar
                  </>
                )}
              </button>

              {(result || error) && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="mobile-button"
                  style={{
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    backgroundColor: 'white',
                    color: 'var(--color-primary)',
                    border: '2px solid var(--color-primary)',
                    borderRadius: 'var(--border-radius-md)',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f4f8';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  Nueva consulta
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '2px solid #fca5a5',
            borderRadius: 'var(--border-radius-lg)',
            padding: 'var(--spacing-xl)',
            display: 'flex',
            gap: 'var(--spacing-md)',
            alignItems: 'flex-start'
          }}>
            <AlertCircle size={24} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ color: '#dc2626', marginBottom: 'var(--spacing-xs)', fontSize: '1.125rem', fontWeight: '600' }}>
                No encontrado
              </h3>
              <p style={{ color: '#7f1d1d', margin: 0 }}>
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Resultado */}
        {result && (
          <div
            className="mobile-card"
            style={{
              backgroundColor: 'white',
              borderRadius: 'var(--border-radius-lg)',
              padding: 'var(--spacing-2xl)',
              boxShadow: 'var(--shadow-lg)',
              border: '2px solid #e5e7eb'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-xl)',
              paddingBottom: 'var(--spacing-lg)',
              borderBottom: '2px solid #e5e7eb',
              flexWrap: 'wrap'
            }}>
              <div style={{
                width: 'clamp(48px, 12vw, 60px)',
                height: 'clamp(48px, 12vw, 60px)',
                borderRadius: '12px',
                backgroundColor: `${getStateColor(result.state)}20`,
                color: getStateColor(result.state),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {getStateIcon(result.state)}
              </div>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <h2
                  className="mobile-heading"
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: 'var(--color-text-primary)',
                    margin: 0,
                    marginBottom: '4px',
                    wordBreak: 'break-word'
                  }}
                >
                  {result.filingNumber}
                </h2>
                <div style={{
                  display: 'inline-block',
                  padding: '6px 16px',
                  backgroundColor: getStateColor(result.state),
                  color: 'white',
                  borderRadius: '20px',
                  fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)',
                  fontWeight: '600'
                }}>
                  {getStateLabel(result.state)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
              {result.subject && (
                <div>
                  <p style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Asunto
                  </p>
                  <p style={{ fontSize: '1rem', color: 'var(--color-text-primary)', margin: 0 }}>
                    {result.subject}
                  </p>
                </div>
              )}

              <div>
                <p style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#6b7280',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Fecha de Radicación
                </p>
                <p style={{ fontSize: '1rem', color: 'var(--color-text-primary)', margin: 0 }}>
                  {new Date(result.createdAt).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {result.assignedToDepartment && (
                <div>
                  <p style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Dependencia Responsable
                  </p>
                  <p style={{ fontSize: '1rem', color: 'var(--color-text-primary)', margin: 0 }}>
                    {result.assignedToDepartment}
                  </p>
                  {result.assignedToOfficial && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-primary)', margin: '4px 0 0 0', fontWeight: '500' }}>
                      Funcionario: {result.assignedToOfficial}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Timeline de Respuestas del Funcionario */}
            {result.responseHistory && result.responseHistory.length > 0 && (
              <div style={{
                marginTop: 'var(--spacing-2xl)',
                paddingTop: 'var(--spacing-xl)',
                borderTop: '2px solid #e5e7eb'
              }}>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--spacing-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Clock size={24} color="#0ea5e9" />
                  Historial de Respuestas
                </h3>

                {/* Mensaje Informativo */}
                <div style={{
                  padding: 'var(--spacing-md)',
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: 'var(--border-radius-md)',
                  marginBottom: 'var(--spacing-xl)',
                  fontSize: '0.875rem',
                  color: '#0369a1',
                  lineHeight: 1.6
                }}>
                  📧 <strong>Importante:</strong> Cada respuesta que ve aquí también fue enviada a su correo electrónico.
                  Este historial es solo una copia para su consulta en línea.
                </div>

                {/* Timeline */}
                <div className="mobile-timeline" style={{ position: 'relative', paddingLeft: '2rem' }}>
                  {/* Línea vertical del timeline */}
                  <div style={{
                    position: 'absolute',
                    left: '0.625rem',
                    top: '0.5rem',
                    bottom: '0.5rem',
                    width: '2px',
                    backgroundColor: '#cbd5e1'
                  }} />

                  {result.responseHistory.map((response, index) => (
                    <div
                      key={response.id}
                      style={{
                        position: 'relative',
                        marginBottom: index < result.responseHistory!.length - 1 ? 'clamp(1rem, 3vw, 1.5rem)' : 0,
                        paddingBottom: index < result.responseHistory!.length - 1 ? 'clamp(1rem, 3vw, 1.5rem)' : 0
                      }}
                    >
                      {/* Punto del timeline */}
                      {(() => {
                        const dotColor = response.authorType === 'FUNCIONARIO' ? '#1e40af'
                          : response.authorType === 'CIUDADANO' ? '#16a34a'
                          : response.authorType === 'ENTIDAD' ? '#d97706'
                          : '#6b7280';
                        const bgColor = response.authorType === 'FUNCIONARIO' ? '#eff6ff'
                          : response.authorType === 'CIUDADANO' ? '#f0fdf4'
                          : response.authorType === 'ENTIDAD' ? '#fffbeb'
                          : '#f9fafb';
                        const borderColor = response.authorType === 'FUNCIONARIO' ? '#bfdbfe'
                          : response.authorType === 'CIUDADANO' ? '#bbf7d0'
                          : response.authorType === 'ENTIDAD' ? '#fde68a'
                          : '#e5e7eb';
                        const badgeIcon = response.authorType === 'FUNCIONARIO' ? '🏛️'
                          : response.authorType === 'CIUDADANO' ? '👤'
                          : response.authorType === 'ENTIDAD' ? '🏢'
                          : '⚙️';
                        const badgeLabel = response.authorLabel || (
                          response.authorType === 'FUNCIONARIO' ? 'Funcionario'
                          : response.authorType === 'CIUDADANO' ? 'Ciudadano'
                          : response.authorType === 'ENTIDAD' ? 'Entidad externa'
                          : 'Sistema'
                        );

                        return (
                          <>
                            <div
                              className="mobile-timeline-dot"
                              style={{
                                position: 'absolute',
                                left: '-1.375rem',
                                top: '0.5rem',
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                backgroundColor: dotColor,
                                border: '3px solid white',
                                boxShadow: `0 0 0 2px ${dotColor}`
                              }}
                            />

                            {/* Contenido de la respuesta */}
                            <div style={{
                              backgroundColor: bgColor,
                              border: `1px solid ${borderColor}`,
                              borderLeft: `4px solid ${dotColor}`,
                              borderRadius: 'var(--border-radius-md)',
                              padding: 'clamp(0.75rem, 3vw, 1.25rem)',
                              marginLeft: '0.5rem'
                            }}>
                              {/* Autor + Fecha + Estado */}
                              <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                gap: 'clamp(0.25rem, 2vw, 0.5rem)',
                                marginBottom: 'clamp(0.5rem, 2vw, 0.75rem)'
                              }}>
                                {/* Badge de autor */}
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 10px',
                                  backgroundColor: dotColor,
                                  color: 'white',
                                  borderRadius: '12px',
                                  fontSize: 'clamp(0.688rem, 2vw, 0.75rem)',
                                  fontWeight: '700',
                                  letterSpacing: '0.3px'
                                }}>
                                  {badgeIcon} {badgeLabel}
                                </span>
                                <span
                                  className="mobile-text-sm"
                                  style={{
                                    fontSize: '0.813rem',
                                    fontWeight: '500',
                                    color: '#6b7280'
                                  }}
                                >
                                  {new Date(response.date).toLocaleDateString('es-CO', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>

                              {/* Mensaje de la respuesta */}
                              <div
                                className="mobile-text-base"
                                style={{
                                  fontSize: '0.9375rem',
                                  color: 'var(--color-text-primary)',
                                  lineHeight: 1.6,
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word'
                                }}
                              >
                                {response.message}
                              </div>

                              {/* Respuesta del ciudadano embebida */}
                              {response.ciudadanoRespondio && response.respuestaCiudadano && response.authorType !== 'CIUDADANO' && (
                                <div style={{
                                  marginTop: '0.75rem',
                                  padding: '0.75rem 1rem',
                                  backgroundColor: '#f0fdf4',
                                  border: '1px solid #bbf7d0',
                                  borderLeft: '4px solid #16a34a',
                                  borderRadius: '6px'
                                }}>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    marginBottom: '0.375rem',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    color: '#16a34a'
                                  }}>
                                    👤 Respuesta del ciudadano
                                  </div>
                                  <div style={{
                                    fontSize: '0.875rem',
                                    color: '#1f2937',
                                    lineHeight: 1.6,
                                    whiteSpace: 'pre-wrap'
                                  }}>
                                    {response.respuestaCiudadano}
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documentos del caso */}
            {result.documents && result.documents.length > 0 && (
              <div style={{
                marginTop: 'var(--spacing-2xl)',
                paddingTop: 'var(--spacing-xl)',
                borderTop: '2px solid #e5e7eb'
              }}>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--spacing-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  📎 Documentos del caso
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {result.documents.map(doc => (
                    <a
                      key={doc.id}
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        color: '#0369a1',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e0f2fe')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#f0f9ff')}
                    >
                      <span style={{ fontSize: '1.25rem' }}>
                        {doc.mimeType?.includes('pdf') ? '📄' :
                         doc.mimeType?.includes('image') ? '🖼️' :
                         doc.mimeType?.includes('word') ? '📝' :
                         doc.mimeType?.includes('excel') || doc.mimeType?.includes('sheet') ? '📊' :
                         doc.mimeType?.includes('audio') ? '🎵' :
                         doc.mimeType?.includes('video') ? '🎬' : '📎'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.fileName}
                        </div>
                        {doc.description && (
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                            {doc.description}
                          </div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>
                          {doc.uploadedBy && (
                            <span style={{
                              display: 'inline-block',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '0.688rem',
                              fontWeight: '600',
                              marginRight: '6px',
                              backgroundColor: doc.uploadedBy === 'Ciudadano' ? '#dcfce7' : '#dbeafe',
                              color: doc.uploadedBy === 'Ciudadano' ? '#16a34a' : '#1e40af'
                            }}>
                              {doc.uploadedBy}
                            </span>
                          )}
                          {new Date(doc.uploadedAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
                          {doc.fileSize ? ` · ${(doc.fileSize / 1024).toFixed(0)} KB` : ''}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#0369a1', whiteSpace: 'nowrap' }}>⬇ Descargar</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Formulario de Respuesta del Ciudadano (solo para rechazos o solicitudes de información sin respuesta) */}
            {result.responseHistory && result.responseHistory.length > 0 && (() => {
              // Buscar el estado más reciente que requiera respuesta
              const ultimoPermiteRespuesta = result.responseHistory
                .filter(r => r.state === 'REQUIERE_INFORMACION')
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

              // Mostrar formulario solo si el estado actual del caso es REQUIERE_INFORMACION
              // (evita que un REQUIERE_INFORMACION antiguo active el textarea si el caso ya fue escalado/remitido)
              if (ultimoPermiteRespuesta && !ultimoPermiteRespuesta.ciudadanoRespondio && !result.casoEnGestion && result.state === 'REQUIERE_INFORMACION') {
                const now = new Date();
                const isExpired = ultimoPermiteRespuesta.expiresAt ? now > new Date(ultimoPermiteRespuesta.expiresAt) : false;

                if (!isExpired) {
                  // Calcular tiempo restante si aplica
                  let days = null;
                  let hours = null;
                  if (ultimoPermiteRespuesta.expiresAt) {
                    const expiresAt = new Date(ultimoPermiteRespuesta.expiresAt);
                    const timeRemaining = expiresAt.getTime() - now.getTime();
                    days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
                    hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                  }

                  return (
                    <div style={{
                      marginTop: 'var(--spacing-2xl)',
                      padding: 'clamp(1rem, 4vw, 1.5rem)',
                      backgroundColor: '#fef3c7',
                      border: '2px solid #f59e0b',
                      borderRadius: 'var(--border-radius-md)',
                    }}>
                      <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: '700',
                        color: '#92400e',
                        marginBottom: 'var(--spacing-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        📝 ¿Desea responder?
                      </h3>

                      <div style={{
                        backgroundColor: '#fffbeb',
                        padding: 'var(--spacing-md)',
                        borderRadius: 'var(--border-radius-sm)',
                        marginBottom: 'var(--spacing-md)',
                        fontSize: '0.875rem',
                        lineHeight: 1.6,
                        color: '#78350f'
                      }}>
                        <p style={{ margin: '0 0 0.5rem 0' }}>
                          {ultimoPermiteRespuesta.state === 'REQUIERE_INFORMACION'
                            ? <span><strong>Su respuesta es requerida</strong> para poder continuar con el análisis de su solicitud.</span>
                            : <span><strong>Su respuesta es opcional,</strong> pero nos ayuda a confirmar que comprendió el motivo del rechazo.</span>}
                        </p>
                        <p style={{ margin: '0' }}>
                          {ultimoPermiteRespuesta.state === 'REQUIERE_INFORMACION'
                            ? 'Por favor, proporcione la información o aclaración solicitada por el funcionario.'
                            : 'Si considera que hubo un error o desea hacer una aclaración, puede indicarlo aquí.'}
                        </p>
                        {ultimoPermiteRespuesta.expiresAt && (
                          <div style={{
                            marginTop: '0.75rem',
                            paddingTop: '0.75rem',
                            borderTop: '1px solid #fcd34d',
                            fontSize: '0.813rem',
                            color: '#92400e',
                            fontWeight: '600'
                          }}>
                            ⏰ Tiempo restante: {days} días y {hours} horas
                          </div>
                        )}
                      </div>

                      {responseSuccess && (
                        <div style={{
                          backgroundColor: '#dcfce7',
                          padding: 'var(--spacing-md)',
                          borderRadius: 'var(--border-radius-sm)',
                          marginBottom: 'var(--spacing-md)',
                          color: '#065f46',
                          fontSize: '0.875rem',
                          border: '1px solid #86efac'
                        }}>
                          ✅ Su respuesta ha sido registrada exitosamente. Gracias por su confirmación.
                        </div>
                      )}

                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Escriba aquí su respuesta (mínimo 10 caracteres)..."
                        disabled={isSubmittingResponse}
                        style={{
                          width: '100%',
                          minHeight: '120px',
                          padding: 'var(--spacing-md)',
                          border: '1px solid #d1d5db',
                          borderRadius: 'var(--border-radius-sm)',
                          fontSize: '0.9375rem',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          marginBottom: 'var(--spacing-md)',
                          backgroundColor: 'white'
                        }}
                      />

                      <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <label htmlFor={`file-${result.id}`} style={{ display: 'block', fontWeight: '500', marginBottom: 'var(--spacing-sm)', color: '#333', fontSize: '0.875rem' }}>
                          Adjuntar Archivo (Opcional)
                        </label>
                        <input
                          type="file"
                          id={`file-${result.id}`}
                          onChange={handleFileChange}
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp3,.mp4"
                          multiple
                          disabled={isSubmittingResponse}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: 'var(--border-radius-sm)',
                            fontSize: '0.875rem',
                            backgroundColor: 'white'
                          }}
                        />
                        <small style={{ color: '#6b7280', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                          Formatos permitidos: PDF, Word, JPG, PNG, MP3, MP4. Tamaño máximo: 25MB
                        </small>
                        {selectedFiles.length > 0 && (
                          <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#f0f9ff', borderRadius: 'var(--border-radius-sm)', border: '1px solid #bae6fd' }}>
                            {selectedFiles.map((f, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                                <small style={{ color: '#0369a1' }}>✓ {f.name}</small>
                                <button type="button" onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '1rem', lineHeight: 1, padding: '0 4px' }}>×</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleSubmitResponse(result.id)}
                        disabled={isSubmittingResponse || !responseText.trim()}
                        style={{
                          width: '100%',
                          padding: 'var(--spacing-md)',
                          backgroundColor: isSubmittingResponse || !responseText.trim() ? '#9ca3af' : '#0ea5e9',
                          color: 'white',
                          border: 'none',
                          borderRadius: 'var(--border-radius-sm)',
                          fontSize: '1rem',
                          fontWeight: '600',
                          cursor: isSubmittingResponse || !responseText.trim() ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <Send size={20} />
                        {isSubmittingResponse ? 'Enviando...' : 'Enviar Respuesta'}
                      </button>
                    </div>
                  );
                }
              }

              // Mostrar si ya respondió
              if (ultimoPermiteRespuesta && ultimoPermiteRespuesta.ciudadanoRespondio && ultimoPermiteRespuesta.respuestaCiudadano) {
                return (
                  <div style={{
                    marginTop: 'var(--spacing-2xl)',
                    padding: 'clamp(1rem, 4vw, 1.5rem)',
                    backgroundColor: '#dcfce7',
                    border: '2px solid #86efac',
                    borderRadius: 'var(--border-radius-md)',
                  }}>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: '700',
                      color: '#065f46',
                      marginBottom: 'var(--spacing-md)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      ✅ Su respuesta fue registrada
                    </h3>
                    <div style={{
                      backgroundColor: 'white',
                      padding: 'var(--spacing-md)',
                      borderRadius: 'var(--border-radius-sm)',
                      fontSize: '0.9375rem',
                      lineHeight: 1.6,
                      color: '#1f2937',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      {ultimoPermiteRespuesta.respuestaCiudadano}
                    </div>
                    <p style={{
                      fontSize: '0.813rem',
                      color: '#059669',
                      marginTop: 'var(--spacing-sm)',
                      margin: '0.75rem 0 0 0',
                      fontWeight: '600'
                    }}>
                      Gracias por confirmar la información.
                    </p>
                  </div>
                );
              }

              return null;
            })()}

            {/* Aviso de gestión interna: caso escalado o remitido a otra entidad */}
            {result.casoEnGestion && (
              <div style={{
                marginTop: 'var(--spacing-xl)',
                padding: 'var(--spacing-lg)',
                backgroundColor: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: 'var(--border-radius-md)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--spacing-md)'
              }}>
                <div style={{ fontSize: '1.25rem', flexShrink: 0 }}>⚙️</div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: '700', color: '#166534', margin: '0 0 0.25rem 0' }}>
                    Su solicitud está siendo gestionada internamente
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#166534', margin: 0, lineHeight: 1.6 }}>
                    Su caso fue escalado o remitido a otra dependencia o entidad competente para continuar el trámite.
                    Este proceso puede tomar algunos días hábiles. Le notificaremos por correo electrónico cuando haya novedades que pueda ver.
                  </p>
                </div>
              </div>
            )}

            {/* Mensaje cuando no hay respuestas */}
            {(!result.responseHistory || result.responseHistory.length === 0) && !result.casoEnGestion && (
              <div style={{
                marginTop: 'var(--spacing-xl)',
                padding: 'var(--spacing-xl)',
                backgroundColor: '#fffbeb',
                border: '1px solid #fcd34d',
                borderRadius: 'var(--border-radius-md)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--spacing-md)'
              }}>
                <Clock size={24} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#92400e', margin: 0, lineHeight: 1.6 }}>
                    <strong>Su solicitud fue radicada y está en proceso de revisión.</strong><br />
                    Aún no hay respuestas por parte de un funcionario. Si el funcionario requiere información adicional o emite una respuesta, aparecerá en esta página.
                  </p>
                </div>
              </div>
            )}

            <div style={{
              marginTop: 'var(--spacing-xl)',
              padding: 'var(--spacing-lg)',
              backgroundColor: '#f0f9ff',
              borderRadius: 'var(--border-radius-md)',
              borderLeft: '4px solid #0ea5e9'
            }}>
              <p style={{ fontSize: '0.875rem', color: '#0369a1', margin: 0, lineHeight: 1.6 }}>
                <strong>Información importante:</strong> Los correos electrónicos que recibe son únicamente para notificarle que hubo cambios en su caso.
                <br /><br />
                <strong>TODO EL SEGUIMIENTO O ENVÍO DE RESPUESTAS DEBE HACERSE EXCLUSIVAMENTE A TRAVÉS DE ESTA PÁGINA.</strong> No intente responder a los correos de notificación ya que no serán procesados.
              </p>
            </div>
          </div>
        )}

        {/* Información de Ayuda */}
        <div style={{
          marginTop: 'var(--spacing-2xl)',
          padding: 'var(--spacing-xl)',
          backgroundColor: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: 'var(--border-radius-lg)'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--color-primary)', marginBottom: 'var(--spacing-md)' }}>
            ℹ️ Información sobre estados
          </h3>
          <ul style={{ margin: 0, paddingLeft: 'var(--spacing-xl)', lineHeight: 1.8, color: '#0369a1' }}>
            <li><strong>Radicado:</strong> Su solicitud ha sido recibida y está pendiente de asignación</li>
            <li><strong>En Estudio:</strong> Su solicitud está siendo analizada por un funcionario</li>
            <li><strong>Requiere Información:</strong> Necesitamos información adicional de su parte</li>
            <li><strong>Escalado:</strong> Su solicitud fue remitida a otra dependencia para mejor atención</li>
            <li><strong>Remitido:</strong> Su solicitud fue enviada a una entidad externa competente</li>
            <li><strong>Cerrado:</strong> Su solicitud ha sido finalizada</li>
          </ul>
        </div>
      </div>

      {/* Animación spinner */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        /* Estilos móviles optimizados */
        @media (max-width: 768px) {
          body {
            font-size: 14px;
          }
          
          /* Ajustar padding general en móvil */
          .mobile-container {
            padding: 1rem !important;
          }
          
          /* Botones más grandes para tocar */
          .mobile-button {
            min-height: 44px !important;
            font-size: 0.9rem !important;
            padding: 0.75rem 1rem !important;
          }
          
          /* Inputs más accesibles */
          .mobile-input {
            min-height: 44px !important;
            font-size: 16px !important; /* Evita zoom en iOS */
            padding: 0.75rem !important;
          }
          
          /* Cards con menos padding */
          .mobile-card {
            padding: 1rem !important;
            border-radius: 8px !important;
          }
          
          /* Timeline más compacto */
          .mobile-timeline {
            padding-left: 1.5rem !important;
          }
          
          .mobile-timeline-dot {
            left: -1rem !important;
          }
          
          /* Textos más legibles */
          .mobile-text-sm {
            font-size: 0.813rem !important;
          }
          
          .mobile-text-base {
            font-size: 0.938rem !important;
          }
          
          .mobile-heading {
            font-size: 1.25rem !important;
          }
        }
      `}} />
    </div>
  );
}
