'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Calendar, User, Mail, Phone, FileText, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface Solicitud {
  id: string;
  codigo: string;
  tipo: string;
  asunto: string;
  descripcion?: string;
  ciudadano: {
    nombre: string;
    email: string;
    documento: string;
    telefono: string;
  };
  fechaCreacion: string;
  estado: string;
  prioridad: string;
}

export default function SolicitudDetallePage() {
  const router = useRouter();
  const params = useParams();
  const solicitudId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);

  const loadSolicitud = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/v1/solicitudes/${solicitudId}`);
      if (response.ok) {
        const data = await response.json();
        setSolicitud(data);
      }
    } catch (error) {
      console.error('Error cargando solicitud:', error);
    } finally {
      setLoading(false);
    }
  }, [solicitudId]);

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    
    if (!isAuthenticated || isAuthenticated !== 'true') {
      router.push('/');
      return;
    }

    loadSolicitud();
  }, [router, loadSolicitud]);

  const getEstadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'nueva':
      case 'radicado':
      case 'recibido':
        return 'var(--color-primary)';
      case 'en_proceso':
      case 'asignado':
        return '#f59e0b';
      case 'en_revision':
        return '#8b5cf6';
      case 'resuelta':
      case 'cerrada':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad.toLowerCase()) {
      case 'alta':
        return '#ef4444';
      case 'media':
        return '#f59e0b';
      case 'baja':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
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
              borderTop: '4px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Cargando solicitud...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!solicitud) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <button
            onClick={() => router.push('/admin/inbox')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              backgroundColor: 'white',
              color: 'var(--color-primary)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: '2rem'
            }}
          >
            <ArrowLeft size={16} />
            Volver a Bandeja de Entrada
          </button>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '4rem 2rem',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <AlertCircle size={64} style={{ margin: '0 auto 1rem', color: '#ef4444' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
              Solicitud no encontrada
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              No se pudo cargar la información de esta solicitud
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e5e7eb',
        padding: '1.5rem 2rem'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <button
            onClick={() => router.push('/admin/inbox')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              backgroundColor: 'transparent',
              color: 'var(--color-primary)',
              border: 'none',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            <ArrowLeft size={16} />
            Volver a Bandeja de Entrada
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
                {solicitud.codigo}
              </h1>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                {solicitud.tipo}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <span style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                backgroundColor: getEstadoColor(solicitud.estado) + '20',
                color: getEstadoColor(solicitud.estado),
                borderRadius: '9999px'
              }}>
                {solicitud.estado.replace('_', ' ').toUpperCase()}
              </span>
              
              <span style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                backgroundColor: getPrioridadColor(solicitud.prioridad) + '20',
                color: getPrioridadColor(solicitud.prioridad),
                borderRadius: '9999px'
              }}>
                Prioridad {solicitud.prioridad.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          {/* Columna principal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Detalles de la solicitud */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
                Detalles de la Solicitud
              </h2>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Asunto
                </label>
                <p style={{ fontSize: '1rem', color: '#111827' }}>
                  {solicitud.asunto}
                </p>
              </div>

              {solicitud.descripcion && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                    Descripción
                  </label>
                  <p style={{ fontSize: '0.875rem', color: '#374151', lineHeight: '1.6' }}>
                    {solicitud.descripcion}
                  </p>
                </div>
              )}
            </div>

            {/* Información del ciudadano */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
                Información del Ciudadano
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <User size={18} color="#6b7280" />
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Nombre</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                      {solicitud.ciudadano.nombre}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <FileText size={18} color="#6b7280" />
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Documento</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                      {solicitud.ciudadano.documento}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Mail size={18} color="#6b7280" />
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Email</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                      {solicitud.ciudadano.email}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Phone size={18} color="#6b7280" />
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Teléfono</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                      {solicitud.ciudadano.telefono}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Columna lateral */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Información adicional */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
                Información Adicional
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <Calendar size={16} color="#6b7280" />
                    <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Fecha de Creación</p>
                  </div>
                  <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                    {new Date(solicitud.fechaCreacion).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <Clock size={16} color="#6b7280" />
                    <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Tiempo Transcurrido</p>
                  </div>
                  <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                    {Math.floor((Date.now() - new Date(solicitud.fechaCreacion).getTime()) / (1000 * 60 * 60 * 24))} días
                  </p>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
                Acciones
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <CheckCircle size={16} />
                  Marcar como Procesada
                </button>

                <button
                  style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Asignar a Funcionario
                </button>

                <button
                  style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    backgroundColor: 'white',
                    color: '#6b7280',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Cambiar Estado
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
