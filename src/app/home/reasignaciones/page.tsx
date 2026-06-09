'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Calendar, FileText, User, AlertCircle } from 'lucide-react';


interface SolicitudReasignacion {
  id: string;
  codigo: string;
  tipo: string;
  asunto: string;
  ciudadano: {
    nombre: string;
    documento: string;
  };
  estado: string;
  estadoReasignacion?: 'PENDIENTE' | 'PROPUESTA' | 'APROBADA' | 'RECHAZADA';
  fechaSolicitud: string;
  solicitadoPor: {
    nombre: string;
    rol: string;
    usuarioId: string;
  };
  motivo: string;
  asignadoActualmente: {
    nombre: string;
    rol: string;
  } | null;
  documentos?: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    fileSize: number;
    uploadedAt: string;
  }>;
}

interface Funcionario {
  id: string;
  fullName: string;
  email: string;
  role: {
    code: string;
    name: string;
    level: number;
  };
}

export default function ReasignacionesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [solicitudes, setSolicitudes] = useState<SolicitudReasignacion[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudReasignacion | null>(null);
  const [funcionarioSeleccionado, setFuncionarioSeleccionado] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'sin-reasignar' | 'reasignados'>('sin-reasignar');

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
      
      const response = await fetch('/api/v1/reasignaciones/pendientes');
      if (response.ok) {
        const data = await response.json();
        console.log('Solicitudes:', data);
        setSolicitudes(data);
        
        // Cargar funcionarios para cada solicitud
        if (data.length > 0) {
          const funcionariosResponse = await fetch('/api/v1/funcionarios/disponibles');
          console.log('Response funcionarios:', funcionariosResponse.status);
          if (funcionariosResponse.ok) {
            const funcionariosData = await funcionariosResponse.json();
            console.log('Funcionarios cargados:', funcionariosData);
            setFuncionarios(funcionariosData);
          }
        }
      }
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFuncionariosDisponibles = (solicitud: SolicitudReasignacion) => {
    // Filtrar funcionarios excluyendo al que solicitó la reasignación
    const disponibles = funcionarios.filter(f => f.id !== solicitud.solicitadoPor.usuarioId);
    console.log('Funcionarios disponibles para', solicitud.codigo, ':', disponibles);
    console.log('Excluir usuario ID:', solicitud.solicitadoPor.usuarioId);
    return disponibles;
  };

  const handleAbrirModal = (solicitud: SolicitudReasignacion) => {
    setSolicitudSeleccionada(solicitud);
    setFuncionarioSeleccionado('');
    setIsModalOpen(true);
  };

  const handleCerrarModal = () => {
    setIsModalOpen(false);
    setSolicitudSeleccionada(null);
    setFuncionarioSeleccionado('');
  };

  const handleConfirmarReasignacion = async () => {
    if (!funcionarioSeleccionado || !solicitudSeleccionada) return;

    try {
      const response = await fetch(`/api/v1/casos/${solicitudSeleccionada.id}/proponer-reasignacion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          funcionarioId: funcionarioSeleccionado
        })
      });

      if (response.ok) {
        alert('Propuesta de reasignación enviada al Revisor exitosamente');
        handleCerrarModal();
        // Recargar las solicitudes
        loadSolicitudes();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'No se pudo enviar la propuesta'}`);
      }
    } catch (error) {
      console.error('Error enviando propuesta:', error);
      alert('Error al enviar la propuesta de reasignación');
    }
  };

  // Filtrar solicitudes según la pestaña activa
  const solicitudesFiltradas = solicitudes.filter(solicitud => {
    if (activeTab === 'sin-reasignar') {
      return !solicitud.estadoReasignacion || solicitud.estadoReasignacion === 'PENDIENTE';
    } else {
      return solicitud.estadoReasignacion === 'PROPUESTA' || solicitud.estadoReasignacion === 'APROBADA' || solicitud.estadoReasignacion === 'RECHAZADA';
    }
  });

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
              backgroundColor: '#fef3c7',
              borderRadius: '12px',
              padding: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={32} color="#f59e0b" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                Solicitudes de Reasignación
              </h1>
              <p style={{ color: '#6b7280', marginTop: '0.25rem', fontSize: '0.875rem' }}>
                Casos pendientes de reasignación solicitados por funcionarios
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {/* Pestañas */}
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '0.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          gap: '0.5rem'
        }}>
          <button
            onClick={() => setActiveTab('sin-reasignar')}
            style={{
              flex: 1,
              padding: '0.75rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              backgroundColor: activeTab === 'sin-reasignar' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'sin-reasignar' ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Casos sin reasignar
          </button>
          <button
            onClick={() => setActiveTab('reasignados')}
            style={{
              flex: 1,
              padding: '0.75rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              backgroundColor: activeTab === 'reasignados' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'reasignados' ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Casos reasignados
          </button>
        </div>

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
            <p style={{ color: '#6b7280', marginTop: '1rem' }}>Cargando solicitudes...</p>
          </div>
        ) : solicitudesFiltradas.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '3rem',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <AlertCircle size={48} color="#9ca3af" style={{ margin: '0 auto' }} />
            <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginTop: '1rem' }}>
              {activeTab === 'sin-reasignar' ? 'No hay casos sin reasignar' : 'No hay casos reasignados'}
            </p>
            <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
              {activeTab === 'sin-reasignar' 
                ? 'No hay casos solicitados para reasignación pendientes en este momento' 
                : 'No hay casos que hayan sido reasignados aún'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {solicitudesFiltradas.map((solicitud) => (
              <div
                key={solicitud.id}
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
                        {solicitud.codigo}
                      </span>

                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: '#f3f4f6',
                        color: '#6b7280'
                      }}>
                        {solicitud.tipo}
                      </span>

                      {solicitud.estadoReasignacion === 'APROBADA' && (
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: '#d1fae5',
                          color: '#065f46'
                        }}>
                          ✓ Aprobada
                        </span>
                      )}

                      {solicitud.estadoReasignacion === 'RECHAZADA' && (
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: '#fee2e2',
                          color: '#991b1b'
                        }}>
                          ✗ Rechazada
                        </span>
                      )}

                      {solicitud.estadoReasignacion === 'PROPUESTA' && (
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: '#fef3c7',
                          color: '#92400e'
                        }}>
                          ⏳ Propuesta Enviada
                        </span>
                      )}
                    </div>

                    <h3 style={{ 
                      fontSize: '1.125rem', 
                      fontWeight: '600', 
                      color: '#111827',
                      marginBottom: '1rem'
                    }}>
                      {solicitud.asunto}
                    </h3>

                    {/* Información del caso */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                      gap: '1rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={16} color="#6b7280" />
                        <div>
                          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Ciudadano</p>
                          <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: 0 }}>
                            {solicitud.ciudadano.nombre}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={16} color="#6b7280" />
                        <div>
                          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Solicitado el</p>
                          <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: 0 }}>
                            {new Date(solicitud.fechaSolicitud).toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={16} color="#6b7280" />
                        <div>
                          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Solicitado por</p>
                          <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: 0 }}>
                            {solicitud.solicitadoPor.nombre}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Asignación actual */}
                    {solicitud.asignadoActualmente && (
                      <div style={{
                        backgroundColor: '#f3f4f6',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        marginBottom: '1rem'
                      }}>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
                          Asignado actualmente a:
                        </p>
                        <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: 0 }}>
                          {solicitud.asignadoActualmente.nombre} ({solicitud.asignadoActualmente.rol})
                        </p>
                      </div>
                    )}

                    {/* Motivo */}
                    <div style={{
                      backgroundColor: '#fef3c7',
                      border: '1px solid #fde68a',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      marginBottom: '1rem'
                    }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#78350f', margin: '0 0 0.25rem 0' }}>
                        Motivo de reasignación:
                      </p>
                      <p style={{ fontSize: '0.875rem', color: '#78350f', margin: 0 }}>
                        {solicitud.motivo}
                      </p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        setSolicitudSeleccionada(solicitud);
                        setIsViewModalOpen(true);
                      }}
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

                    {activeTab === 'sin-reasignar' && (
                      <button
                        onClick={() => handleAbrirModal(solicitud)}
                        style={{
                          padding: '0.75rem 1.25rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Reasignar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Reasignación */}
      {isModalOpen && solicitudSeleccionada && (
        <div
          style={{
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
          }}
          onClick={handleCerrarModal}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: '0 0 0.5rem 0' }}>
                Reasignar Caso
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                {solicitudSeleccionada.codigo} - {solicitudSeleccionada.asunto}
              </p>
            </div>

            {/* Lista de funcionarios */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem' }}>
                Selecciona un funcionario:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                {getFuncionariosDisponibles(solicitudSeleccionada).map(funcionario => (
                  <label
                    key={funcionario.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: funcionarioSeleccionado === funcionario.id ? '#dbeafe' : '#f9fafb',
                      border: funcionarioSeleccionado === funcionario.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                      transition: 'all 0.2s'
                    }}
                  >
                    <input
                      type="radio"
                      name="funcionario-modal"
                      value={funcionario.id}
                      checked={funcionarioSeleccionado === funcionario.id}
                      onChange={(e) => setFuncionarioSeleccionado(e.target.value)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: 0 }}>
                        {funcionario.fullName}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                        {funcionario.role.name}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Botones de acción */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCerrarModal}
                style={{
                  padding: '0.625rem 1.25rem',
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
                onClick={handleConfirmarReasignacion}
                disabled={!funcionarioSeleccionado}
                style={{
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  backgroundColor: funcionarioSeleccionado ? '#10b981' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: funcionarioSeleccionado ? 'pointer' : 'not-allowed',
                  opacity: funcionarioSeleccionado ? 1 : 0.6
                }}
              >
                Confirmar Reasignación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Vista de Caso */}
      {isViewModalOpen && solicitudSeleccionada && (
        <div
          style={{
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
          }}
          onClick={() => setIsViewModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
                Detalles de la Solicitud
              </h2>
              <button
                onClick={() => setIsViewModalOpen(false)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* Contenido del Modal */}
            <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
              {/* Información General */}
              <div style={{
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
                      {solicitudSeleccionada.codigo}
                    </h3>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {solicitudSeleccionada.tipo}
                    </p>
                  </div>
                  <span style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    borderRadius: '9999px'
                  }}>
                    {solicitudSeleccionada.estado.toUpperCase()}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                  <Calendar size={16} />
                  <span>
                    Solicitado el {new Date(solicitudSeleccionada.fechaSolicitud).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Detalles de la Solicitud */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={18} />
                  Información de la Solicitud
                </h4>
                
                <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '1.25rem' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                      Asunto
                    </label>
                    <p style={{ fontSize: '0.875rem', color: '#111827' }}>
                      {solicitudSeleccionada.asunto}
                    </p>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                      Motivo de Reasignación
                    </label>
                    <p style={{ fontSize: '0.875rem', color: '#374151', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                      {solicitudSeleccionada.motivo}
                    </p>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                      Solicitado por
                    </label>
                    <p style={{ fontSize: '0.875rem', color: '#111827' }}>
                      {solicitudSeleccionada.solicitadoPor.nombre}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {solicitudSeleccionada.solicitadoPor.rol}
                    </p>
                  </div>
                </div>
              </div>

              {/* Información del Ciudadano */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={18} />
                  Información del Ciudadano
                </h4>
                
                <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                        Nombre Completo
                      </label>
                      <p style={{ fontSize: '0.875rem', color: '#111827' }}>
                        {solicitudSeleccionada.ciudadano.nombre}
                      </p>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                        Documento
                      </label>
                      <p style={{ fontSize: '0.875rem', color: '#111827' }}>
                        {solicitudSeleccionada.ciudadano.documento}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Asignación Actual */}
              {solicitudSeleccionada.asignadoActualmente && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={18} />
                    Asignado Actualmente
                  </h4>
                  
                  <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '1.25rem' }}>
                    <p style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '600' }}>
                      {solicitudSeleccionada.asignadoActualmente.nombre}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {solicitudSeleccionada.asignadoActualmente.rol}
                    </p>
                  </div>
                </div>
              )}

              {/* Documentos Adjuntos */}
              {solicitudSeleccionada.documentos && solicitudSeleccionada.documentos.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={18} />
                    Documentos Adjuntos
                  </h4>
                  
                  <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '1.25rem' }}>
                    {solicitudSeleccionada.documentos.map((doc, index) => (
                      <div key={doc.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        marginBottom: index < solicitudSeleccionada.documentos!.length - 1 ? '0.5rem' : '0'
                      }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '500', marginBottom: '0.25rem' }}>
                            {doc.fileName}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {(doc.fileSize / 1024).toFixed(2)} KB
                          </p>
                        </div>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: 'var(--color-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            textDecoration: 'none'
                          }}
                        >
                          Ver archivo
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                onClick={() => setIsViewModalOpen(false)}
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
                Cerrar
              </button>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleAbrirModal(solicitudSeleccionada);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Users size={16} />
                Proponer Reasignación
              </button>
            </div>
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
