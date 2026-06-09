/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, Calendar, FileText, User, RefreshCw } from 'lucide-react';

interface Peticion {
  id: string;
  casoId: string;
  codigo: string;
  tipo: string;
  asunto: string;
  ciudadano: {
    nombre: string;
    documento: string;
  } | null;
  estado: string;
  estadoReasignacion?: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  fechaPeticion: string;
  propuestoPor: {
    nombre: string;
    rol: string;
  };
  funcionarioPropuesto: {
    id?: string;
    nombre?: string;
    rol?: string;
  } | null;
  origen?: 'FUNCIONARIO' | 'VENTANILLA_UNICA';
  motivoReasignacion?: string | null;
  asignadoActualmente: {
    nombre: string;
    rol: string;
  } | null;
  reasignadoA?: {
    nombre: string;
    rol?: string;
  } | null;
  fechaReasignacion?: string;
}

interface Funcionario {
  id: string;
  fullName: string;
  role: {
    name: string;
  };
}

export default function PeticionesReasignacionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [peticiones, setPeticiones] = useState<Peticion[]>([]);
  const [activeTab, setActiveTab] = useState<'por-aceptar' | 'aceptadas' | 'asignaciones-cambiadas'>('por-aceptar');
  const [procesando, setProcesando] = useState<string | null>(null);
  const [modalCambioAsignacion, setModalCambioAsignacion] = useState<{
    isOpen: boolean;
    peticionId: string | null;
    casoId: string | null;
  }>({
    isOpen: false,
    peticionId: null,
    casoId: null
  });
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [funcionarioSeleccionado, setFuncionarioSeleccionado] = useState<string>('');
  const [loadingFuncionarios, setLoadingFuncionarios] = useState(false);

  // Estado para modal de detalle del caso
  const [casoDetalle, setCasoDetalle] = useState<any>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');

    if (!isAuthenticated || isAuthenticated !== 'true') {
      router.push('/');
      return;
    }

    loadPeticiones();

    // Configurar auto-refresh cada 30 segundos
    const intervalId = setInterval(() => {
      loadPeticiones(false); // Pasar false para no mostrar el spinner de carga completa
    }, 30000);

    return () => clearInterval(intervalId);
  }, [router]);

  const loadPeticiones = async (showLoadingObj = true) => {
    try {
      if (showLoadingObj) setLoading(true);

      const response = await fetch('/api/v1/peticiones-reasignacion');
      if (response.ok) {
        const data = await response.json();
        setPeticiones(data);
      }
    } catch (error) {
      console.error('Error cargando peticiones:', error);
    } finally {
      setLoading(false);
    }
  };

  const _handleAprobar = async (peticionId: string) => {
    if (!confirm('¿Está seguro de aprobar esta reasignación?')) return;

    setProcesando(peticionId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/peticiones-reasignacion/${peticionId}/aprobar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error al aprobar');

      alert('Reasignación aprobada exitosamente');
      await loadPeticiones(); // Recargar las peticiones
    } catch (error) {
      console.error('Error:', error);
      alert('Error al aprobar la reasignación');
    } finally {
      setProcesando(null);
    }
  };

  const handleRechazar = async (peticionId: string, casoId: string) => {
    setModalCambioAsignacion({ isOpen: true, peticionId, casoId });
    setFuncionarioSeleccionado('');
    loadFuncionarios();
  };

  const loadFuncionarios = async () => {
    setLoadingFuncionarios(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/users/all-funcionarios', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Funcionarios recibidos:', data); // Debug
        setFuncionarios(data.funcionarios || []);
      } else {
        console.error('Error en respuesta:', response.status);
      }
    } catch (error) {
      console.error('Error cargando funcionarios:', error);
    } finally {
      setLoadingFuncionarios(false);
    }
  };

  const confirmarRechazo = async () => {
    if (!funcionarioSeleccionado) {
      alert('Por favor seleccione un funcionario');
      return;
    }

    const { peticionId, casoId } = modalCambioAsignacion;
    if (!peticionId || !casoId) return;

    setProcesando(peticionId);
    setModalCambioAsignacion({ isOpen: false, peticionId: null, casoId: null });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/peticiones-reasignacion/${peticionId}/cambiar-asignacion`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          funcionarioId: funcionarioSeleccionado,
          casoId
        })
      });

      if (!response.ok) throw new Error('Error al cambiar asignación');

      alert('Asignación cambiada exitosamente');
      await loadPeticiones();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cambiar la asignación');
    } finally {
      setProcesando(null);
      setFuncionarioSeleccionado('');
    }
  };

  const cancelarRechazo = () => {
    setModalCambioAsignacion({ isOpen: false, peticionId: null, casoId: null });
    setFuncionarioSeleccionado('');
  };

  const handleVerCaso = async (casoId: string) => {
    setModalDetalleOpen(true);
    setLoadingDetalle(true);
    setCasoDetalle(null);
    try {
      const response = await fetch(`/api/v1/solicitudes/${casoId}`);
      if (response.ok) {
        const data = await response.json();
        setCasoDetalle(data);
      }
    } catch (error) {
      console.error('Error cargando detalle del caso:', error);
    } finally {
      setLoadingDetalle(false);
    }
  };

  // Filtrar peticiones según la pestaña activa
  const peticionesFiltradas = peticiones.filter(peticion => {
    if (activeTab === 'por-aceptar') {
      return !peticion.estadoReasignacion || peticion.estadoReasignacion === 'PENDIENTE';
    } else {
      // Cualquier caso que no sea PENDIENTE entra a Asignaciones Cambiadas
      return peticion.estadoReasignacion === 'APROBADA' || peticion.estadoReasignacion === 'RECHAZADA';
    }
  });

  return (
    <div className="reasignacion-page-container" style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '2rem' }}>
      {/* Header de Página */}
      <div className="reasignacion-header-container" style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1.5rem 2rem',
        margin: '-2rem -2rem 2rem -2rem'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <button
            className="reasignacion-back-btn"
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

          <div className="reasignacion-title-container" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              backgroundColor: '#fef3c7',
              borderRadius: '12px',
              padding: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={32} color="#f59e0b" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                Peticiones de Reasignación
              </h1>
              <p style={{ color: '#6b7280', marginTop: '0.25rem', fontSize: '0.875rem' }}>
                Solicitudes de reasignación de Funcionarios y Ventanilla Única
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="reasignacion-content-wrapper" style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {/* Pestañas */}
        <div className="reasignacion-tabs-container" style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '0.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          gap: '0.5rem'
        }}>
          <button
            onClick={() => setActiveTab('por-aceptar')}
            style={{
              flex: 1,
              padding: '0.75rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              backgroundColor: activeTab === 'por-aceptar' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'por-aceptar' ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Peticiones por aceptar
          </button>
          <button
            onClick={() => setActiveTab('asignaciones-cambiadas')}
            style={{
              flex: 1,
              padding: '0.75rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              backgroundColor: activeTab === 'asignaciones-cambiadas' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'asignaciones-cambiadas' ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Asignaciones cambiadas
          </button>

          <div style={{ paddingLeft: '0.5rem', borderLeft: '1px solid #e5e7eb', display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => loadPeticiones(true)}
              title="Actualizar peticiones"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.color = '#111827';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <RefreshCw size={18} className={loading && peticiones.length > 0 ? 'animate-spin' : ''} />
              <span style={{ display: 'none' }}>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Estilos ultra-compactos para celular */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media (max-width: 768px) {
            .reasignacion-page-container {
              padding: 1rem !important;
            }
            .reasignacion-header-container {
              padding: 1rem !important;
              margin: -1rem -1rem 1rem -1rem !important;
            }
            .reasignacion-back-btn {
              padding: 0.4rem 0.75rem !important;
              font-size: 0.8rem !important;
              margin-bottom: 0.75rem !important;
            }
            .reasignacion-title-container {
              gap: 0.5rem !important;
            }
            .reasignacion-title-container > div:first-child {
              padding: 0.5rem !important;
            }
            .reasignacion-title-container svg {
              width: 24px !important;
              height: 24px !important;
            }
            .reasignacion-title-container h1 {
              font-size: 1.25rem !important;
            }
            .reasignacion-title-container p {
              font-size: 0.8rem !important;
              margin-top: 0 !important;
            }
            .reasignacion-content-wrapper {
              padding: 0 !important;
            }
            .reasignacion-tabs-container {
              flex-direction: column !important;
              gap: 0.25rem !important;
              padding: 0.25rem !important;
              margin-bottom: 1rem !important;
            }
            .reasignacion-tabs-container > button {
              padding: 0.6rem !important;
              font-size: 0.85rem !important;
            }
            .reasignacion-tabs-container > div {
              padding-left: 0 !important;
              border-left: none !important;
              border-top: 1px solid #e5e7eb !important;
              justify-content: center !important;
              padding-top: 0.25rem !important;
            }

            /* Estilos de la tarjeta en sí (ultra compactos) */
            .reasignacion-card {
              padding: 0.75rem !important;
            }
            .reasignacion-card > div[style*="display: flex"] {
              flex-direction: column !important;
              gap: 0.5rem !important;
            }
            .reasignacion-card > div[style*="display: flex"] > div:first-child > div:first-child {
              gap: 0.35rem !important;
              margin-bottom: 0.5rem !important;
            }
            .reasignacion-card > div[style*="display: flex"] > div:last-child {
              flex-direction: column !important;
              width: 100% !important;
              gap: 0.35rem !important;
              margin-top: 0.25rem !important;
            }
            .reasignacion-card button {
              padding: 0.5rem 0.75rem !important;
              font-size: 0.85rem !important;
              width: 100% !important;
              justify-content: center !important;
              margin-bottom: 0.25rem !important;
            }
            .reasignacion-card h3 {
              font-size: 0.95rem !important;
              margin-bottom: 0.5rem !important;
              line-height: 1.2 !important;
            }
            .reasignacion-card p {
              font-size: 0.8rem !important;
              line-height: 1.2 !important;
              margin-bottom: 0 !important;
            }
            .reasignacion-card span {
              font-size: 0.7rem !important;
              padding: 0.15rem 0.4rem !important;
            }
            .reasignacion-card [style*="display: grid"] {
              gap: 0.5rem !important;
              margin-bottom: 0.5rem !important;
            }
            .reasignacion-card svg {
               width: 14px !important;
               height: 14px !important;
            }
          }
        `}} />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid #e5e7eb',
              borderTopColor: 'var(--color-primary)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto'
            }} />
            <p style={{ color: '#6b7280', marginTop: '1rem' }}>Cargando peticiones...</p>
          </div>
        ) : peticionesFiltradas.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '3rem',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <AlertTriangle size={48} color="#9ca3af" style={{ margin: '0 auto' }} />
            <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginTop: '1rem' }}>
              {activeTab === 'por-aceptar' ? 'No hay peticiones por aceptar' : 'No hay asignaciones cambiadas'}
            </p>
            <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
              {activeTab === 'por-aceptar'
                ? 'No hay propuestas de reasignación pendientes en este momento'
                : 'No hay reasignaciones resueltas recientemente'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {peticionesFiltradas.map((peticion) => (
              <div
                key={peticion.id}
                className="reasignacion-card"
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                  <div style={{ flex: 1 }}>
                    {/* Encabezado */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af'
                      }}>
                        {peticion.codigo}
                      </span>

                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: '#f3f4f6',
                        color: '#6b7280'
                      }}>
                        {peticion.tipo}
                      </span>

                      {peticion.estadoReasignacion !== 'PENDIENTE' && (
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: '#d1fae5',
                          color: '#065f46'
                        }}>
                          ✓ Resuelto
                        </span>
                      )}
                    </div>

                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '1rem'
                    }}>
                      {peticion.asunto}
                    </h3>

                    {/* Información del caso */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                      gap: '1rem',
                      marginBottom: '1rem'
                    }}>
                      {peticion.ciudadano && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <User size={16} color="#6b7280" />
                          <div>
                            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Ciudadano</p>
                            <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: 0 }}>
                              {peticion.ciudadano.nombre}
                            </p>
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={16} color="#6b7280" />
                        <div>
                          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Fecha de petición</p>
                          <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: 0 }}>
                            {new Date(peticion.fechaPeticion).toLocaleString('es-CO', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>

                      {peticion.fechaReasignacion && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Calendar size={16} color="var(--color-primary)" />
                          <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-primary)', margin: 0, fontWeight: '600' }}>Fecha de resolución</p>
                            <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: 0 }}>
                              {new Date(peticion.fechaReasignacion).toLocaleString('es-CO', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={16} color="#6b7280" />
                        <div>
                          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                            {peticion.estadoReasignacion === 'PENDIENTE' ? 'Asignado actualmente a' : 'Asignado anteriormente a'}
                          </p>
                          <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: 0 }}>
                            {peticion.propuestoPor?.nombre || 'Desconocido'}
                          </p>
                        </div>
                      </div>

                      {peticion.estadoReasignacion !== 'PENDIENTE' && peticion.reasignadoA && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <User size={16} color="var(--color-primary)" />
                          <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-primary)', margin: 0, fontWeight: '600' }}>Reasignado a</p>
                            <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: 0 }}>
                              {peticion.reasignadoA.nombre}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Motivo de reasignación (solo para peticiones de funcionarios) */}
                    {peticion.origen === 'FUNCIONARIO' && peticion.motivoReasignacion && (
                      <div style={{
                        backgroundColor: '#fefce8',
                        border: '1px solid #fde68a',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        marginBottom: '0.75rem'
                      }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#92400e', margin: '0 0 0.25rem 0' }}>
                          Motivo de reasignación:
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#92400e', margin: 0 }}>
                          {peticion.motivoReasignacion}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleVerCaso(peticion.casoId)}
                      style={{
                        padding: '0.75rem 1.25rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Ver Caso
                    </button>

                    {activeTab === 'por-aceptar' && (
                      <button
                        onClick={() => handleRechazar(peticion.id, peticion.casoId)}
                        disabled={procesando === peticion.id}
                        style={{
                          padding: '0.75rem 1.25rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          backgroundColor: procesando === peticion.id ? '#d1d5db' : '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: procesando === peticion.id ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {procesando === peticion.id ? 'Procesando...' : 'Asignar'}
                      </button>
                    )}

                    {activeTab === 'asignaciones-cambiadas' && (
                      <button
                        onClick={() => handleRechazar(peticion.id, peticion.casoId)}
                        disabled={procesando === peticion.id}
                        style={{
                          padding: '0.75rem 1.25rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          backgroundColor: procesando === peticion.id ? '#dce0e8' : '#eab308',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: procesando === peticion.id ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {procesando === peticion.id ? 'Procesando...' : 'Nueva asignación'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Cambio de Asignación */}
      {modalCambioAsignacion.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '90vh',
            minHeight: '500px',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '1.5rem',
              margin: 0
            }}>
              Cambiar asignación
            </h2>

            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '1.5rem'
            }}>
              Seleccione el funcionario al que desea reasignar este caso
            </p>

            {loadingFuncionarios ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{
                  display: 'inline-block',
                  width: '40px',
                  height: '40px',
                  border: '4px solid #f3f4f6',
                  borderTopColor: 'var(--color-primary)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                maxHeight: '450px',
                overflowY: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '0.5rem'
              }}>
                {funcionarios.map((funcionario) => (
                  <label
                    key={funcionario.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: funcionarioSeleccionado === funcionario.id ? '#eff6ff' : 'transparent',
                      border: funcionarioSeleccionado === funcionario.id ? '2px solid #3b82f6' : '2px solid transparent',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (funcionarioSeleccionado !== funcionario.id) {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (funcionarioSeleccionado !== funcionario.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <input
                      type="radio"
                      name="funcionario"
                      value={funcionario.id}
                      checked={funcionarioSeleccionado === funcionario.id}
                      onChange={(e) => setFuncionarioSeleccionado(e.target.value)}
                      style={{
                        marginRight: '0.75rem',
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#111827'
                      }}>
                        {funcionario.fullName}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280'
                      }}>
                        {funcionario.role.name}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={cancelarRechazo}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRechazo}
                disabled={!funcionarioSeleccionado || loadingFuncionarios}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  backgroundColor: funcionarioSeleccionado && !loadingFuncionarios ? '#f59e0b' : '#d1d5db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: funcionarioSeleccionado && !loadingFuncionarios ? 'pointer' : 'not-allowed'
                }}
              >
                Cambiar asignación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalle del Caso */}
      {modalDetalleOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '85vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Header del modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                Detalle del Caso
              </h2>
              <button
                onClick={() => { setModalDetalleOpen(false); setCasoDetalle(null); }}
                style={{
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151'
                }}
              >
                ✕ Cerrar
              </button>
            </div>

            {loadingDetalle ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  border: '4px solid #e5e7eb',
                  borderTopColor: 'var(--color-primary)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto'
                }} />
                <p style={{ color: '#6b7280', marginTop: '1rem' }}>Cargando detalle...</p>
              </div>
            ) : casoDetalle ? (
              <div>
                {/* Badges */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: '#dbeafe', color: '#1e40af' }}>
                    {casoDetalle.codigo}
                  </span>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '500', backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                    {casoDetalle.tipo}
                  </span>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: '#fef3c7', color: '#92400e' }}>
                    {casoDetalle.estado?.toUpperCase()}
                  </span>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: '#fee2e2', color: '#991b1b' }}>
                    {casoDetalle.prioridad?.toUpperCase()}
                  </span>
                </div>

                {/* Fecha */}
                <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1rem' }}>
                  📅 Radicado el {new Date(casoDetalle.fechaCreacion).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>

                {/* Asunto */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Asunto</h4>
                  <p style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0 }}>{casoDetalle.asunto}</p>
                </div>

                {/* Descripción */}
                {casoDetalle.descripcion && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Descripción</h4>
                    <p style={{ fontSize: '0.875rem', color: '#374151', lineHeight: '1.6', margin: 0, backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                      {casoDetalle.descripcion}
                    </p>
                  </div>
                )}

                {/* Ciudadano */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>👤 Información del Ciudadano</h4>
                  <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '1rem', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>Nombre</label>
                        <p style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '600', margin: 0 }}>{casoDetalle.ciudadano?.nombre}</p>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>Documento</label>
                        <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>{casoDetalle.ciudadano?.documento}</p>
                      </div>
                      {casoDetalle.ciudadano?.email && casoDetalle.ciudadano.email !== 'N/A' && (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>Email</label>
                          <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>{casoDetalle.ciudadano.email}</p>
                        </div>
                      )}
                      {casoDetalle.ciudadano?.telefono && casoDetalle.ciudadano.telefono !== 'N/A' && (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>Teléfono</label>
                          <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>{casoDetalle.ciudadano.telefono}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Funcionario Asignado */}
                {casoDetalle.funcionarioAsignado && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>⚖️ Funcionario Asignado</h4>
                    <div style={{ backgroundColor: '#eff6ff', borderRadius: '12px', padding: '1rem', border: '1px solid #bfdbfe' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>Nombre</label>
                          <p style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '600', margin: 0 }}>{casoDetalle.funcionarioAsignado.nombre}</p>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>Fecha de Asignación</label>
                          <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>
                            {new Date(casoDetalle.funcionarioAsignado.fechaAsignacion).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Documentos */}
                {casoDetalle.documentos && casoDetalle.documentos.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>📎 Documentos Adjuntos</h4>
                    {casoDetalle.documentos.map((doc: { name?: string; fileName?: string; fileUrl?: string }, index: number) => (
                      <a
                        key={index}
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'block',
                          padding: '0.5rem 0.75rem',
                          backgroundColor: '#f9fafb',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          marginBottom: '0.5rem',
                          fontSize: '0.875rem',
                          textDecoration: 'none',
                          color: '#1d4ed8',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#eff6ff')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                      >
                        📄 {doc.name || doc.fileName || `Documento ${index + 1}`}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: '#6b7280' }}>No se pudo cargar el detalle del caso.</p>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
