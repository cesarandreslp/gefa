'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, User, XCircle, Paperclip, FileText, Image, File } from 'lucide-react';

interface Documento {
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    fileSize: number;
    uploadedAt: string;
    isInternal: boolean;
}

interface Solicitud {
    id: string;
    codigo: string;
    tipo: string;
    asunto: string;
    ciudadano: {
        nombre: string;
    };
    fechaCreacion: string;
    estado: string;
    conversacion?: {
        id: string;
        mensaje: string;
        rol: string;
        fecha: string;
    }[];
    metadata?: Record<string, unknown>;
    documentos?: Documento[];
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocIcon({ mimeType }: { mimeType: string }) {
    if (mimeType === 'application/pdf') return <FileText size={16} color="#dc2626" />;
    if (mimeType.startsWith('image/')) return <Image size={16} color="#2563eb" />;
    return <File size={16} color="#6b7280" />;
}

export default function CierreCasosPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
    const [rechazandoId, setRechazandoId] = useState<string | null>(null);
    const [motivoRechazo, setMotivoRechazo] = useState('');
    const [loadingRechazo, setLoadingRechazo] = useState(false);

    useEffect(() => {
        const isAuthenticated = localStorage.getItem('isAuthenticated');
        if (!isAuthenticated || isAuthenticated !== 'true') {
            router.push('/');
            return;
        }
        loadSolicitudes();
    }, [router]);

    const loadSolicitudes = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            // Fetch specifically from the cierreCasos tab in the API
            const response = await fetch('/api/v1/solicitudes/bandeja-entrada?tab=cierreCasos', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSolicitudes(Array.isArray(data) ? data : (data.data || []));
            }
        } catch (error) {
            console.error('Error cargando solicitudes de cierre:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEnviarRechazo = async (solicitudId: string) => {
        if (!motivoRechazo.trim()) return;
        try {
            setLoadingRechazo(true);
            const res = await fetch(`/api/v1/solicitudes/${solicitudId}/rechazar-cierre`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ motivo: motivoRechazo.trim() })
            });
            if (res.ok) {
                setRechazandoId(null);
                setMotivoRechazo('');
                loadSolicitudes();
            } else {
                alert('Error al rechazar la solicitud');
            }
        } catch {
            alert('Error al rechazar la solicitud');
        } finally {
            setLoadingRechazo(false);
        }
    };

    const handleAprobarCierre = async (solicitud: Solicitud, motivoCierre: string) => {
        if (!confirm('¿Está seguro de APROBAR el cierre de este caso? El caso será cerrado definitivamente.')) return;
        try {
            const res = await fetch(`/api/v1/solicitudes/${solicitud.id}/responder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    respuesta: motivoCierre || 'Caso cerrado por disposición del Revisor.',
                    tipoRespuesta: 'CIERRE'
                })
            });
            if (res.ok) {
                await fetch(`/api/v1/solicitudes/${solicitud.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        metadata: { pendienteCierre: false, cierreAprobado: true, fechaAprobacionCierre: new Date().toISOString() }
                    })
                });
                alert('Caso cerrado exitosamente.');
                loadSolicitudes();
            }
        } catch {
            alert('Error al aprobar el cierre');
        }
    };

    return (
        <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '2rem' }}>
            {/* Header de Página */}
            <div style={{
                backgroundColor: 'white',
                borderBottom: '1px solid #e5e7eb',
                padding: '1.5rem 2rem',
                margin: '-2rem -2rem 2rem -2rem'
            }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                    <button
                        onClick={() => router.push('/home')}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f3f4f6';
                            e.currentTarget.style.borderColor = '#9ca3af';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'white';
                            e.currentTarget.style.borderColor = '#d1d5db';
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            backgroundColor: 'white',
                            border: '1px solid #d1d5db',
                            color: '#374151',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            marginBottom: '1rem',
                            padding: '0.625rem 1rem',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <ArrowLeft size={16} />
                        Volver al Dashboard
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            backgroundColor: '#fee2e2',
                            borderRadius: '12px',
                            padding: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <CheckCircle size={32} color="#dc2626" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                                Cierre de Casos
                            </h1>
                            <p style={{ color: '#6b7280', marginTop: '0.25rem', fontSize: '0.875rem' }}>
                                Aprobación de solicitudes de cierre enviadas por los funcionarios
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido */}
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {loading ? (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '400px'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                border: '4px solid #e5e7eb',
                                borderTop: '4px solid #dc2626',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                margin: '0 auto 1rem'
                            }} />
                            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Cargando solicitudes de cierre...</p>
                        </div>
                    </div>
                ) : solicitudes.length === 0 ? (
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '4rem 2rem',
                        textAlign: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <CheckCircle size={64} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                            No hay solicitudes de cierre pendientes
                        </h3>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                            Las solicitudes de cierre de los funcionarios aparecerán aquí
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {solicitudes.map((solicitud) => {
                            const metadata = (solicitud.metadata as Record<string, unknown>) || {};
                            const motivoCierreResult = (metadata.motivoCierre as string) || 'Sin motivo especificado';
                            return (
                                <div
                                    key={solicitud.id}
                                    style={{
                                        backgroundColor: 'white',
                                        borderRadius: '12px',
                                        padding: '1.5rem',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                        border: '2px solid #fecaca',
                                        position: 'relative'
                                    }}
                                >
                                    {/* Header del caso */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                                <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#dc2626' }}>
                                                    {solicitud.codigo}
                                                </span>
                                                <span style={{
                                                    padding: '0.2rem 0.6rem',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: '700',
                                                    backgroundColor: '#fef2f2',
                                                    color: '#dc2626'
                                                }}>
                                                    ⚠️ Pendiente de Aprobación
                                                </span>
                                            </div>
                                            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: '0 0 0.25rem 0' }}>
                                                {solicitud.asunto}
                                            </h3>
                                            <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>
                                                <User size={12} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                                                {solicitud.ciudadano.nombre} &mdash; {solicitud.tipo}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Motivo del cierre */}
                                    <div style={{
                                        backgroundColor: '#fef2f2',
                                        border: '1px solid #fecaca',
                                        borderRadius: '8px',
                                        padding: '1rem',
                                        marginBottom: '1rem'
                                    }}>
                                        <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: '#991b1b', margin: '0 0 0.5rem 0' }}>
                                            Motivo del cierre solicitado:
                                        </h4>
                                        <p style={{ fontSize: '0.875rem', color: '#1f2937', margin: 0, whiteSpace: 'pre-wrap' }}>
                                            {motivoCierreResult}
                                        </p>
                                    </div>

                                    {/* Conversación del caso (preview) */}
                                    {solicitud.conversacion && solicitud.conversacion.length > 0 && (
                                        <div style={{
                                            backgroundColor: '#f9fafb',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            padding: '1rem',
                                            marginBottom: '1rem',
                                            maxHeight: '200px',
                                            overflowY: 'auto'
                                        }}>
                                            <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: '#374151', margin: '0 0 0.75rem 0' }}>
                                                Historial de conversación ({solicitud.conversacion.length} mensajes):
                                            </h4>
                                            {solicitud.conversacion.map((msg) => (
                                                <div key={msg.id} style={{
                                                    padding: '0.5rem 0.75rem',
                                                    marginBottom: '0.5rem',
                                                    borderRadius: '6px',
                                                    backgroundColor: msg.rol === 'FUNCIONARIO' ? '#eff6ff' : '#f0fdf4',
                                                    borderLeft: `3px solid ${msg.rol === 'FUNCIONARIO' ? 'var(--color-primary)' : '#22c55e'}`,
                                                    fontSize: '0.8rem'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                        <strong style={{ color: msg.rol === 'FUNCIONARIO' ? '#1d4ed8' : '#16a34a' }}>
                                                            {msg.rol === 'FUNCIONARIO' ? 'Funcionario' : 'Ciudadano'}
                                                        </strong>
                                                        <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                                                            {new Date(msg.fecha).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p style={{ margin: 0, color: '#374151' }}>{msg.mensaje}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Archivos adjuntos */}
                                    {solicitud.documentos && solicitud.documentos.length > 0 && (
                                        <div style={{
                                            backgroundColor: '#f9fafb',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            padding: '1rem',
                                            marginBottom: '1rem'
                                        }}>
                                            <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: '#374151', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Paperclip size={14} />
                                                Archivos adjuntos ({solicitud.documentos.length})
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {solicitud.documentos.map((doc) => (
                                                    <a
                                                        key={doc.id}
                                                        href={doc.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.625rem',
                                                            padding: '0.5rem 0.75rem',
                                                            backgroundColor: 'white',
                                                            border: `1px solid ${doc.isInternal ? '#fde68a' : '#e5e7eb'}`,
                                                            borderRadius: '6px',
                                                            textDecoration: 'none',
                                                            color: '#111827',
                                                            fontSize: '0.8rem',
                                                            transition: 'background-color 0.15s'
                                                        }}
                                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                                                    >
                                                        <DocIcon mimeType={doc.mimeType} />
                                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {doc.fileName}
                                                        </span>
                                                        <span style={{ fontSize: '0.7rem', color: '#9ca3af', flexShrink: 0 }}>
                                                            {formatBytes(doc.fileSize)}
                                                        </span>
                                                        {doc.isInternal && (
                                                            <span style={{
                                                                fontSize: '0.65rem',
                                                                fontWeight: '700',
                                                                backgroundColor: '#fef3c7',
                                                                color: '#92400e',
                                                                padding: '0.1rem 0.4rem',
                                                                borderRadius: '4px',
                                                                flexShrink: 0
                                                            }}>
                                                                Interno
                                                            </span>
                                                        )}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Formulario de rechazo inline */}
                                    {rechazandoId === solicitud.id && (
                                        <div style={{ marginTop: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem' }}>
                                            <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#991b1b', margin: '0 0 0.5rem 0' }}>
                                                Motivo del rechazo (se enviará al funcionario):
                                            </p>
                                            <textarea
                                                value={motivoRechazo}
                                                onChange={(e) => setMotivoRechazo(e.target.value)}
                                                placeholder="Explique al funcionario por qué se rechaza la solicitud de cierre..."
                                                rows={3}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.625rem',
                                                    borderRadius: '6px',
                                                    border: '1px solid #fca5a5',
                                                    fontSize: '0.875rem',
                                                    resize: 'vertical',
                                                    boxSizing: 'border-box',
                                                    outline: 'none',
                                                    fontFamily: 'inherit'
                                                }}
                                            />
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                                                <button
                                                    onClick={() => { setRechazandoId(null); setMotivoRechazo(''); }}
                                                    disabled={loadingRechazo}
                                                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', backgroundColor: 'white', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={() => handleEnviarRechazo(solicitud.id)}
                                                    disabled={loadingRechazo || !motivoRechazo.trim()}
                                                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: '600', backgroundColor: motivoRechazo.trim() ? '#dc2626' : '#fca5a5', color: 'white', border: 'none', borderRadius: '6px', cursor: motivoRechazo.trim() ? 'pointer' : 'not-allowed' }}
                                                >
                                                    {loadingRechazo ? 'Enviando...' : 'Enviar rechazo'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Botones de acción */}
                                    {rechazandoId !== solicitud.id && (
                                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => { setRechazandoId(solicitud.id); setMotivoRechazo(''); }}
                                                style={{
                                                    padding: '0.625rem 1.25rem',
                                                    fontSize: '0.875rem',
                                                    fontWeight: '600',
                                                    backgroundColor: '#fef2f2',
                                                    color: '#dc2626',
                                                    border: '1px solid #fecaca',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem'
                                                }}
                                            >
                                                <XCircle size={16} />
                                                Rechazar Cierre
                                            </button>
                                            <button
                                                onClick={() => handleAprobarCierre(solicitud, motivoCierreResult)}
                                                style={{
                                                    padding: '0.625rem 1.25rem',
                                                    fontSize: '0.875rem',
                                                    fontWeight: '600',
                                                    backgroundColor: '#059669',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem'
                                                }}
                                            >
                                                <CheckCircle size={16} />
                                                Aprobar Cierre
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
