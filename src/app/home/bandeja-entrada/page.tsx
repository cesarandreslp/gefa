/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Inbox, Calendar, User, FileText, Eye, X, Mail, Phone, ArrowLeftRight, AlertCircle, AlertTriangle, Paperclip, CheckCircle, MessageSquare, RefreshCw, Search, XCircle } from 'lucide-react';

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
  isFinalAssignment?: boolean; // Indica si es una asignación final que no se puede reasignar
  expiresAt?: string | null; // Tiempo de expiración para casos rechazados
  ciudadanoRespondio?: boolean; // Indica si el ciudadano ya respondió
  respuestaCiudadano?: string | null; // Texto de la respuesta del ciudadano
  fechaRechazo?: string | null; // Fecha y hora del rechazo
  fechaRespuestaCiudadano?: string | null; // Fecha y hora de la respuesta del ciudadano
  fechaAsignacion?: string | null; // Fecha y hora de asignación
  fechaEnGestion?: string | null; // Fecha y hora de entrada en gestión
  fechaCierre?: string | null; // Fecha y hora de cierre
  documentos?: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    fileSize: number;
    uploadedAt: string;
    isInternal?: boolean;
  }>;
  funcionarioAsignado?: {
    nombre: string;
    fechaAsignacion: string;
  } | null;
  fechaAsignacionFuncionario?: string | null; // Timestamp exacto de la asignación al funcionario
  reassignmentDeadline?: string | null; // Deadline exacto calculado en días hábiles
  conversacion?: Array<{
    id: string;
    autor: string;
    rol: 'FUNCIONARIO' | 'CIUDADANO';
    mensaje: string;
    fecha: string;
  }>;
  readBy?: string[]; // IDs de usuarios que han visto este caso
  metadata?: any;
  // Semáforo de término legal
  semaforoTermino?: 'verde' | 'amarillo' | 'rojo' | 'respondido';
  fechaVencimiento?: string;
  respondedAt?: string | null;
  respondidoDentroDelTermino?: boolean | null;
}

export default function BandejaEntradaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [activeTab, setActiveTab] = useState<'nuevos' | 'enProceso' | 'rechazados' | 'finalizado' | 'seguimientoGeneral' | 'invitaciones' | 'leidos' | 'seguimientosLeidos' | 'invitacionesLeidas'>('nuevos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const initialTabSet = useRef(false);

  // Estados para nuevo modal de chat (Continuar caso)
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  // Estado para contar respuestas pendientes en rechazados
  const [respuestasPendientes, setRespuestasPendientes] = useState(0);

  // Estado para contar notificaciones de respuestas ciudadanas en En Gestión
  const [enGestionNotifCount, setEnGestionNotifCount] = useState(0);
  const [enGestionNotifIds, setEnGestionNotifIds] = useState<Set<string>>(new Set());
  const [notasDirIds, setNotasDirIds] = useState<Set<string>>(new Set());
  const [entidadRespIds, setEntidadRespIds] = useState<Set<string>>(new Set());
  const [cierreRechazadoIds, setCierreRechazadoIds] = useState<Set<string>>(new Set());

  // Conteos para pestañas del Director
  const [directorNuevosCount, setDirectorNuevosCount] = useState(0);
  const [directorSeguimientoCount, setDirectorSeguimientoCount] = useState(0);
  const [directorInvitacionesCount, setDirectorInvitacionesCount] = useState(0);

  // Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const itemsPerPage = isMobile ? 5 : 10;

  // Estado para barra de búsqueda (desktop)
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para modal de reasignación
  const [isReasignarModalOpen, setIsReasignarModalOpen] = useState(false);
  const [casoReasignar, setCasoReasignar] = useState<string | null>(null);
  const [motivoReasignacion, setMotivoReasignacion] = useState('');
  const [loadingReasignar, setLoadingReasignar] = useState(false);

  // Estados para modal de responder
  const [isResponderModalOpen, setIsResponderModalOpen] = useState(false);
  const [respuesta, setRespuesta] = useState('');
  const [tipoRespuesta, setTipoRespuesta] = useState<'SOLICITAR_INFO' | 'ESCALAR' | 'RECHAZAR' | 'CIERRE' | 'NO_REQUIERE' | ''>('');
  const [ciudadanoPuedeResponder, setCiudadanoPuedeResponder] = useState(true);
  const [loadingResponder, setLoadingResponder] = useState(false);
  const [respuestaFiles, setRespuestaFiles] = useState<File[]>([]);
  const [escalationReason, setEscalationReason] = useState<string>('');

  // Estados para buscador de correos (Dependencia/Entidad)
  const [emailSearch, setEmailSearch] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);
  const [soloEntidad, setSoloEntidad] = useState(false);
  const [requiereDias, setRequiereDias] = useState(false);
  const [diasRespuesta, setDiasRespuesta] = useState('');
  const emailSearchRef = useRef<HTMLDivElement>(null);
  
  // Directorio de correos desde la base de datos
  const [directorioCorreos, setDirectorioCorreos] = useState<string[]>([]);
  const [editingEmailIndex, setEditingEmailIndex] = useState<number | null>(null);
  const [editingEmailValue, setEditingEmailValue] = useState('');

  // Cargar directorio de correos desde la BD
  useEffect(() => {
    const loadEmailDirectory = async () => {
      try {
        const res = await fetch('/api/v1/email-directory');
        if (res.ok) {
          const data = await res.json();
          setDirectorioCorreos(data.emails.map((e: any) => e.email));
        }
      } catch (err) {
        console.error('Error cargando directorio de correos:', err);
      }
    };
    loadEmailDirectory();
  }, []);

  // Detección de pantalla móvil para paginación y cards compactas
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filteredEmails = directorioCorreos.filter(email =>
    email.toLowerCase().includes(emailSearch.toLowerCase()) &&
    !selectedEmails.includes(email)
  );

  // Estados para temporizadores de casos rechazados
  const [timers, setTimers] = useState<Record<string, number>>({});

  // Temporizadores para el botón de reasignación (ventana de 2 minutos)
  const [reassignTimers, setReassignTimers] = useState<Record<string, number>>({});

  // Estados para Notas Internas
  const [notasInternas, setNotasInternas] = useState<any[]>([]);
  const [loadingNotas, setLoadingNotas] = useState(false);
  const [isNotaModalOpen, setIsNotaModalOpen] = useState(false);
  const [notaText, setNotaText] = useState('');
  const [loadingNotaSubmit, setLoadingNotaSubmit] = useState(false);

  const loadNotasInternas = async (solicitudId: string) => {
    try {
      setLoadingNotas(true);
      const res = await fetch(`/api/v1/cases/${solicitudId}/notes`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.notes) {
          setNotasInternas(data.data.notes);
        }
      }
    } catch (error) {
      console.error('Error cargando notas internas:', error);
    } finally {
      setLoadingNotas(false);
    }
  };

  const handleGuardarNota = async () => {
    if (!selectedSolicitud || !notaText.trim()) return;
    try {
      setLoadingNotaSubmit(true);
      const res = await fetch(`/api/v1/cases/${selectedSolicitud.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: notaText.trim() })
      });
      if (res.ok) {
        setNotaText('');
        setIsNotaModalOpen(false);
        alert('Nota guardada exitosamente');
        await loadNotasInternas(selectedSolicitud.id);
      } else {
        const err = await res.json();
        alert(err.error?.message || 'Error guardando nota');
      }
    } catch (error) {
      console.error('Error guardando nota:', error);
      alert('Error de conexión guardando ruta');
    } finally {
      setLoadingNotaSubmit(false);
    }
  };

  const handleVerDetalle = async (solicitudId: string) => {
    try {
      setLoadingDetalle(true);
      setIsModalOpen(true);

      const response = await fetch(`/api/v1/solicitudes/${solicitudId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedSolicitud(data);

        // Marcar el caso como leído por este usuario
        if (userId) {
          try {
            const currentReadBy = data.readBy || [];
            if (!currentReadBy.includes(userId)) {
              await fetch(`/api/v1/solicitudes/${solicitudId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  metadata: { readBy: [...currentReadBy, userId] }
                })
              });
              // Actualizar localmente para reflejar el cambio
              setSolicitudes(prev => prev.map(s =>
                s.id === solicitudId
                  ? { ...s, readBy: [...(s.readBy || []), userId] }
                  : s
              ));
            }
          } catch (err) {
            console.error('Error marcando caso como leído:', err);
          }
        }

        // Auto-cambio: Si el caso está RADICADO, cambiarlo automáticamente a EN_ESTUDIO
        if (data.estado === 'RADICADO') {
          try {
            const cambioResponse = await fetch(`/api/v1/solicitudes/${solicitudId}/auto-en-estudio`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json'
              }
            });

            if (cambioResponse.ok) {
              // Actualizar el estado local sin recargar
              setSelectedSolicitud({ ...data, estado: 'EN_ESTUDIO' });
              console.log('✅ Caso cambiado automáticamente de RADICADO a EN_ESTUDIO');
            }
          } catch (error) {
            console.error('Error en auto-cambio de estado:', error);
            // No bloqueamos la visualización del caso si falla el cambio de estado
          }
        }

        // Cargar notas internas del caso de forma paralela/independiente
        loadNotasInternas(solicitudId);
      }
    } catch (error) {
      console.error('Error cargando detalle:', error);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const handleAbrirChatModal = async (solicitudId: string) => {
    try {
      setLoadingDetalle(true);
      setIsChatModalOpen(true);
      setRequiereDias(false);
      setDiasRespuesta('');

      const response = await fetch(`/api/v1/solicitudes/${solicitudId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedSolicitud(data);

        // Auto-cambio: Si el caso está RADICADO, cambiarlo automáticamente a EN_ESTUDIO
        if (data.estado === 'RADICADO') {
          try {
            const cambioResponse = await fetch(`/api/v1/solicitudes/${solicitudId}/auto-en-estudio`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json'
              }
            });

            if (cambioResponse.ok) {
              setSelectedSolicitud({ ...data, estado: 'EN_ESTUDIO' });
            }
          } catch (error) {
            console.error('Error en auto-cambio de estado:', error);
          }
        }

        // Cargar notas internas del caso de forma paralela/independiente
        loadNotasInternas(solicitudId);

        // Limpiar badges de nota del director, entidad y cierre rechazado al abrir el caso
        if (notasDirIds.has(solicitudId) || entidadRespIds.has(solicitudId) || cierreRechazadoIds.has(solicitudId)) {
          // Persistir que el funcionario leyó las notificaciones (fire-and-forget)
          fetch(`/api/v1/solicitudes/${solicitudId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metadata: { notasLeidas: true, entidadRespLeida: true, cierreRechazadoLeido: true } })
          }).catch(() => {});

          if (notasDirIds.has(solicitudId)) {
            setNotasDirIds(prev => {
              const next = new Set(prev);
              next.delete(solicitudId);
              return next;
            });
          }
          if (entidadRespIds.has(solicitudId)) {
            setEntidadRespIds(prev => {
              const next = new Set(prev);
              next.delete(solicitudId);
              return next;
            });
          }
          if (cierreRechazadoIds.has(solicitudId)) {
            setCierreRechazadoIds(prev => {
              const next = new Set(prev);
              next.delete(solicitudId);
              return next;
            });
          }
        }

        // Si el ciudadano había respondido, limpiamos la notificación
        // Usamos enGestionNotifIds (estado local) porque el endpoint GET individual no retorna ciudadanoRespondio
        if (enGestionNotifIds.has(solicitudId)) {
          try {
            await fetch(`/api/v1/solicitudes/${solicitudId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                ciudadanoRespondio: false,
                fechaRespuestaCiudadano: null
              })
            });

            // Actualizar estado local para remover el badge inmediatamente
            setSolicitudes(prev => prev.map(s =>
              s.id === solicitudId
                ? { ...s, ciudadanoRespondio: false, fechaRespuestaCiudadano: null }
                : s
            ));

            // Actualizar los IDs de notificaciones en gestión
            setEnGestionNotifIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(solicitudId);
              return newSet;
            });

            // Actualizar el conteo de notificaciones
            setEnGestionNotifCount(prev => Math.max(0, prev - 1));

            // Refrescar directamente desde el backend para evitar desincronizaciones
            if (typeof loadEnGestionNotifications === 'function') {
              loadEnGestionNotifications();
            }
          } catch (error) {
            console.error('Error limpiando notificación de respuesta ciudadana:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error cargando detalle para chat:', error);
      setIsChatModalOpen(false);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const toggleDocumentInternal = async (docId: string, currentIsInternal: boolean) => {
    try {
      const res = await fetch(`/api/v1/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isInternal: !currentIsInternal }),
      });
      if (res.ok) {
        setSelectedSolicitud(prev => prev ? {
          ...prev,
          documentos: prev.documentos?.map(d =>
            d.id === docId ? { ...d, isInternal: !currentIsInternal } : d
          )
        } : prev);
      }
    } catch (err) {
      console.error('Error al actualizar visibilidad del documento:', err);
    }
  };

  const handleAbrirReasignar = (solicitudId: string) => {
    setCasoReasignar(solicitudId);
    setMotivoReasignacion('');
    setIsReasignarModalOpen(true);
  };

  const handleCerrarReasignar = () => {
    setIsReasignarModalOpen(false);
    setCasoReasignar(null);
    setMotivoReasignacion('');
  };

  const handleAbrirResponder = () => {
    setIsResponderModalOpen(true);
    setRespuesta('');
    setRespuestaFiles([]);
  };

  const handleCerrarResponder = () => {
    setIsResponderModalOpen(false);
    setRespuesta('');
    setTipoRespuesta('');
    setRespuestaFiles([]);
    setEscalationReason('');
  };

  const handleSubmitRespuesta = async () => {
    if (!selectedSolicitud) {
      alert('No se ha seleccionado ninguna solicitud');
      return;
    }

    if (tipoRespuesta !== 'NO_REQUIERE' && tipoRespuesta !== 'CIERRE' && !respuesta.trim()) {
      alert('Por favor escribe una respuesta antes de enviar');
      return;
    }

    if (tipoRespuesta === 'CIERRE' && !respuesta.trim()) {
      alert('Por favor escribe el motivo del cierre');
      return;
    }

    if (!tipoRespuesta) {
      alert('Por favor selecciona el tipo de respuesta');
      return;
    }

    if (tipoRespuesta === 'ESCALAR' && soloEntidad && !escalationReason) {
      alert('Por favor selecciona la causal legal de reserva para escalar');
      return;
    }

    if (tipoRespuesta === 'ESCALAR' && selectedEmails.length === 0) {
      alert('Por favor agrega al menos un correo de destino');
      return;
    }

    try {
      setLoadingResponder(true);

      // Si es CIERRE, enviar a aprobación del Revisor (no al ciudadano)
      if (tipoRespuesta === 'CIERRE') {
        const response = await fetch(`/api/v1/solicitudes/${selectedSolicitud.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              pendienteCierre: true,
              motivoCierre: respuesta.trim(),
              fechaSolicitudCierre: new Date().toISOString(),
              solicitadoPor: userId
            }
          })
        });

        if (response.ok) {
          alert('La solicitud de cierre ha sido enviada al Revisor para su aprobación.');
          handleCerrarResponder();
          setIsModalOpen(false);
          setSelectedSolicitud(null);
          loadSolicitudes();
        } else {
          alert('Error al enviar la solicitud de cierre');
        }
        return;
      }

      // Enviar respuesta y cambiar estado automáticamente (para otros tipos)
      
      // Si hay archivos, subirlos primero al endpoint correcto
      const tieneAdjunto = (tipoRespuesta === 'SOLICITAR_INFO' || tipoRespuesta === 'ESCALAR') && respuestaFiles.length > 0;
      if (tieneAdjunto) {
        const esInterno = tipoRespuesta === 'ESCALAR' && soloEntidad;
        for (const file of respuestaFiles) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('documentType', tipoRespuesta === 'SOLICITAR_INFO' ? 'SUPPORTING_DOC' : 'OFFICIAL_RESPONSE');
          formData.append('isInternal', String(esInterno));
          try {
            await fetch(`/api/v1/cases/${selectedSolicitud.id}/documents`, {
              method: 'POST',
              body: formData,
            });
          } catch (err) {
            console.error('Error al subir archivo:', err);
          }
        }
      }

      const response = await fetch(`/api/v1/solicitudes/${selectedSolicitud.id}/responder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          respuesta: respuesta.trim(),
          tipoRespuesta: tipoRespuesta,
          soloEntidad: tipoRespuesta === 'ESCALAR' ? soloEntidad : false,
          selectedEmails: tipoRespuesta === 'ESCALAR' ? selectedEmails : [],
          requiereDias: (tipoRespuesta === 'SOLICITAR_INFO' || tipoRespuesta === 'ESCALAR') ? requiereDias : false,
          diasRespuesta: (tipoRespuesta === 'SOLICITAR_INFO' || tipoRespuesta === 'ESCALAR') && requiereDias && diasRespuesta ? parseInt(diasRespuesta, 10) : null,
          escalationReason: tipoRespuesta === 'ESCALAR' ? escalationReason : undefined,
          ciudadanoPuedeResponder: tipoRespuesta === 'SOLICITAR_INFO' ? ciudadanoPuedeResponder : undefined,
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.emailSent) {
          alert('La respuesta ha sido enviada exitosamente y el estado del caso ha sido actualizado.');
        } else {
          alert('El caso ha sido actualizado, pero no se pudo enviar el email de notificación.');
        }
        handleCerrarResponder();
        setIsModalOpen(false);
        setSelectedSolicitud(null);
        loadSolicitudes();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || 'Error al enviar la respuesta. Intente de nuevo.');
      }
    } catch (error) {
      console.error('Error enviando respuesta:', error);
      alert('Error de conexión al enviar la respuesta');
    } finally {
      setLoadingResponder(false);
    }
  };


  const handleSubmitReasignar = async () => {
    if (!motivoReasignacion.trim()) {
      alert('Por favor ingresa el motivo de la reasignación');
      return;
    }

    try {
      setLoadingReasignar(true);

      // TODO: Llamar al API de reasignación
      const response = await fetch(`/api/v1/casos/${casoReasignar}/reasignar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          motivo: motivoReasignacion
        })
      });

      if (response.ok) {
        alert('Caso enviado para reasignación exitosamente');
        handleCerrarReasignar();
        loadSolicitudes(); // Recargar la bandeja
      } else {
        alert('Error al solicitar reasignación');
      }
    } catch (error) {
      console.error('Error solicitando reasignación:', error);
      alert('Error al solicitar reasignación');
    } finally {
      setLoadingReasignar(false);
    }
  };

  const loadSolicitudes = useCallback(async (showLoadingObj = true) => {
    try {
      if (showLoadingObj) setLoading(true);

      const response = await fetch(`/api/v1/solicitudes/bandeja-entrada?tab=${activeTab}`);
      if (response.ok) {
        const data = await response.json();
        setSolicitudes(data);
        setNotasDirIds(new Set(data.filter((s: any) => s.tieneNotas).map((s: any) => s.id)));
        setEntidadRespIds(new Set(data.filter((s: any) => s.tieneRespuestaEntidad).map((s: any) => s.id)));
        setCierreRechazadoIds(new Set(data.filter((s: any) => s.cierreRechazado).map((s: any) => s.id)));

        // Si estamos en rechazados, actualizar el contador
        if (activeTab === 'rechazados') {
          const count = data.filter((s: Solicitud) => s.ciudadanoRespondio).length;
          setRespuestasPendientes(count);
        }
      }
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Cargar contador de respuestas pendientes independientemente del tab activo
  const loadRespuestasPendientes = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/solicitudes/bandeja-entrada?tab=rechazados');
      if (response.ok) {
        const data = await response.json();
        const count = data.filter((s: Solicitud) => s.ciudadanoRespondio).length;
        setRespuestasPendientes(count);
      }
    } catch (error) {
      console.error('Error cargando respuestas pendientes:', error);
    }
  }, []);

  // Cargar notificaciones de respuestas ciudadanas en la pestaña En Gestión
  const loadEnGestionNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/solicitudes/bandeja-entrada?tab=enProceso');
      if (response.ok) {
        const data = await response.json();
        const casosConRespuesta = data.filter((s: Solicitud) => s.ciudadanoRespondio);
        setEnGestionNotifCount(casosConRespuesta.length);
        setEnGestionNotifIds(new Set(casosConRespuesta.map((s: Solicitud) => s.id)));
      }
    } catch (error) {
      console.error('Error cargando notificaciones En Gestión:', error);
    }
  }, []);

  // Cargar conteos de las pestañas del Director
  const loadDirectorTabCounts = useCallback(async () => {
    try {
      const [nuevosRes, seguimientoRes, invitacionesRes] = await Promise.all([
        fetch('/api/v1/solicitudes/bandeja-entrada?tab=nuevos'),
        fetch('/api/v1/solicitudes/bandeja-entrada?tab=seguimientoGeneral'),
        fetch('/api/v1/solicitudes/bandeja-entrada?tab=invitaciones'),
      ]);
      if (nuevosRes.ok) setDirectorNuevosCount((await nuevosRes.json()).length);
      if (seguimientoRes.ok) setDirectorSeguimientoCount((await seguimientoRes.json()).length);
      if (invitacionesRes.ok) setDirectorInvitacionesCount((await invitacionesRes.json()).length);
    } catch (error) {
      console.error('Error cargando conteos Director:', error);
    }
  }, []);

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');

    if (!isAuthenticated || isAuthenticated !== 'true') {
      router.push('/');
      return;
    }

    // Obtener rol del usuario
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/v1/auth/me');
        if (response.ok) {
          const result = await response.json();
          const roleCode = result.data?.user?.role?.code || null;
          const uid = result.data?.user?.id || null;
          
          // Normalizar código de rol (quitar sufijo tenant y mapear legacy)
          const getBaseRoleCode = (code: string): string => {
            const legacyMap: Record<string, string> = {
              DIRECTOR_ENCARGADO: 'DIRECTOR', PERSONERO_MUNICIPAL: 'DIRECTOR', REVISOR: 'DIRECTOR',
            };
            if (legacyMap[code]) return legacyMap[code];
            const baseCodes = [
              'AUXILIAR_ATENCION_USUARIO', 'ASIGNACION_DE_CASOS', 'DIRECTOR',
              'VENTANILLA_UNICA', 'FUNCIONARIO', 'ADMIN',
            ];
            for (const base of baseCodes) {
              if (code === base || code.startsWith(base + '_')) return base;
            }
            return code;
          };
          
          const normalizedRole = roleCode ? getBaseRoleCode(roleCode) : null;
          console.log('🔐 Rol del usuario cargado:', roleCode, '-> normalizado:', normalizedRole, 'ID:', uid);
          setUserRole(normalizedRole);
          setUserId(uid);
          // Si es Director, mostrar Seguimiento General por defecto (solo la primera vez)
          if (normalizedRole === 'DIRECTOR' && !initialTabSet.current) {
            initialTabSet.current = true;
            setActiveTab('seguimientoGeneral');
            loadDirectorTabCounts();
          }
        }
      } catch (error) {
        console.error('Error obteniendo rol del usuario:', error);
      }
    };

    fetchUserRole();
    loadSolicitudes();
    // Cargar contador al inicio
    loadRespuestasPendientes();
    loadEnGestionNotifications();
  }, [router, loadSolicitudes, loadRespuestasPendientes, loadEnGestionNotifications]);

  // Recargar solicitudes cuando cambia la pestaña activa y configurar auto-refresh
  useEffect(() => {
    setCurrentPage(1); // Resetear a página 1 al cambiar de pestaña
    loadSolicitudes();

    const intervalId = setInterval(() => {
      loadSolicitudes(false);
      loadRespuestasPendientes();
      loadEnGestionNotifications();
      if (userRole === 'DIRECTOR') loadDirectorTabCounts();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [activeTab, loadSolicitudes, loadDirectorTabCounts, loadRespuestasPendientes, loadEnGestionNotifications, userRole]);

  // Sistema de auto-expiración y temporizadores para casos rechazados
  useEffect(() => {
    // Polling para ejecutar auto-expiración cada 30 segundos cuando estamos en tab Rechazados
    let intervalPolling: NodeJS.Timeout | null = null;

    if (activeTab === 'rechazados') {
      const checkExpiredCases = async () => {
        try {
          const response = await fetch('/api/v1/solicitudes/expire-rejected', {
            method: 'POST'
          });
          if (response.ok) {
            const result = await response.json();
            if (result.closedCases && result.closedCases.length > 0) {
              console.log(`✅ ${result.closedCases.length} caso(s) cerrado(s) por expiración`);
              loadSolicitudes(); // Recargar para actualizar la UI
              loadRespuestasPendientes(); // Actualizar contador
            }
          }
        } catch (error) {
          console.error('Error verificando casos expirados:', error);
        }
      };

      // Ejecutar inmediatamente
      checkExpiredCases();

      // Polling cada 30 segundos
      intervalPolling = setInterval(checkExpiredCases, 30000);
    }

    return () => {
      if (intervalPolling) clearInterval(intervalPolling);
    };
  }, [activeTab, loadSolicitudes, loadRespuestasPendientes]);

  // Polling global cada 30 segundos para actualizar el contador de respuestas pendientes
  useEffect(() => {
    const interval = setInterval(() => {
      loadRespuestasPendientes();
      loadEnGestionNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadRespuestasPendientes, loadEnGestionNotifications]);

  // Actualizar temporizadores cada segundo
  useEffect(() => {
    const intervalTimer = setInterval(() => {
      if (activeTab === 'rechazados' && solicitudes.length > 0) {
        const newTimers: Record<string, number> = {};

        solicitudes.forEach((sol: Solicitud) => {
          if (sol.expiresAt) {
            const expirationTime = new Date(sol.expiresAt).getTime();
            const now = Date.now();
            const timeRemaining = Math.max(0, expirationTime - now);
            newTimers[sol.id] = timeRemaining;
          }
        });

        setTimers(newTimers);
      }
    }, 1000);

    return () => clearInterval(intervalTimer);
  }, [activeTab, solicitudes]);

  // Temporizador para la ventana de reasignación (calculado en backend en base a días hábiles)
  useEffect(() => {
    const calculateTimers = () => {
      if (solicitudes.length > 0) {
        const newReassignTimers: Record<string, number> = {};

        solicitudes.forEach((sol: Solicitud) => {
          if (sol.reassignmentDeadline) {
            const deadline = new Date(sol.reassignmentDeadline).getTime();
            const now = Date.now();
            const timeRemaining = Math.max(0, deadline - now);
            newReassignTimers[sol.id] = timeRemaining;
          }
        });

        setReassignTimers(newReassignTimers);
      }
    };

    // Calcular inmediatamente para evitar parpadeo
    calculateTimers();

    const intervalReassign = setInterval(calculateTimers, 1000);

    return () => clearInterval(intervalReassign);
  }, [solicitudes]);

  // Auto-abrir caso desde URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const casoId = searchParams.get('caso');
      if (casoId) {
        // Limpiamos la URL para evitar reabrir al recargar
        window.history.replaceState({}, '', window.location.pathname);
        // Pequeño delay para asegurar que el componente está listo
        setTimeout(() => {
          handleVerDetalle(casoId);
        }, 500);
      }
    }
  }, []);

  // Función para formatear tiempo restante
  const formatTimeRemaining = (milliseconds: number): string => {
    if (milliseconds <= 0) return 'Expirado';

    const totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ');
  };

  const getEstadoColor = (estado: string) => {
    const colores: Record<string, { bg: string; text: string }> = {
      NUEVA: { bg: '#dbeafe', text: '#1e40af' },
      PENDIENTE: { bg: '#fef3c7', text: '#92400e' },
      EN_PROCESO: { bg: '#e0e7ff', text: '#4338ca' },
      ASIGNADA: { bg: '#d1fae5', text: '#065f46' }
    };
    return colores[estado] || { bg: '#f3f4f6', text: '#374151' };
  };

  const getPrioridadColor = (prioridad: string) => {
    const colores: Record<string, { bg: string; text: string }> = {
      ALTA: { bg: '#fecaca', text: '#991b1b' },
      MEDIA: { bg: '#fed7aa', text: '#9a3412' },
      BAJA: { bg: '#bfdbfe', text: '#1e40af' }
    };
    return colores[prioridad] || { bg: '#f3f4f6', text: '#374151' };
  };

  // Función para clasificar caso (Seguimiento o Invitación)
  const handleClasificarCaso = async (tipo: 'SEGUIMIENTO' | 'INVITACION') => {
    if (!selectedSolicitud) return;

    try {
      // Build metadata: always send revisorClassification, add vuClassification for VU
      const metadataPayload: any = {
        revisorClassification: tipo
      };

      if (userRole === 'VENTANILLA_UNICA') {
        metadataPayload.vuClassification = tipo;
        // Marcar como leído en el mismo PATCH para evitar race condition
        const currentReadBy = selectedSolicitud.readBy || [];
        if (userId && !currentReadBy.includes(userId)) {
          metadataPayload.readBy = [...currentReadBy, userId];
        }
      }

      const response = await fetch(`/api/v1/solicitudes/${selectedSolicitud.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata: metadataPayload
        }),
      });

      if (response.ok) {
        if (userRole === 'VENTANILLA_UNICA') {
          alert(`Caso movido a ${tipo === 'SEGUIMIENTO' ? 'Seguimientos Leídos' : 'Invitaciones Leídas'} exitosamente.`);
          // Remove the case from current list so it disappears from Nuevos
          setSolicitudes(prev => prev.filter(s => s.id !== selectedSolicitud.id));
        } else {
          alert(`Caso marcado como ${tipo === 'SEGUIMIENTO' ? 'Seguimiento' : 'Invitación'} exitosamente para el Revisor.`);
        }
        setIsModalOpen(false);
      } else {
        alert('Error al clasificar el caso');
      }
    } catch (error) {
      console.error('Error al clasificar:', error);
      alert('Error de conexión al clasificar el caso');
    }
  };

  // Función para marcar como leído (Revisor)
  const handleMarcarLeido = async () => {
    if (!selectedSolicitud) return;

    try {
      const response = await fetch(`/api/v1/solicitudes/${selectedSolicitud.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata: {
            revisorClassification: 'LEIDO'
          }
        }),
      });

      if (response.ok) {
        alert('Caso marcado como leído y archivado de esta lista.');
        setIsModalOpen(false);
        loadSolicitudes(); // Recargar para actualizar la lista
      } else {
        alert('Error al marcar caso');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión');
    }
  };

  // Filtrar solicitudes por término de búsqueda (solo desktop)
  const filteredSolicitudes = useMemo(() => {
    if (!searchTerm.trim()) return solicitudes;
    const term = searchTerm.toLowerCase().trim();
    return solicitudes.filter(s => {
      return (
        s.codigo?.toLowerCase().includes(term) ||
        s.asunto?.toLowerCase().includes(term) ||
        s.ciudadano?.nombre?.toLowerCase().includes(term) ||
        s.ciudadano?.documento?.toLowerCase().includes(term) ||
        s.ciudadano?.email?.toLowerCase().includes(term) ||
        s.tipo?.toLowerCase().includes(term) ||
        s.estado?.toLowerCase().includes(term) ||
        s.descripcion?.toLowerCase().includes(term) ||
        s.funcionarioAsignado?.nombre?.toLowerCase().includes(term)
      );
    });
  }, [solicitudes, searchTerm]);

  // Cálculos de Paginación
  const totalPages = Math.ceil(filteredSolicitudes.length / itemsPerPage);
  const paginatedSolicitudes = filteredSolicitudes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Ajustar página si los elementos cambian (ej. al responder o reasignar un caso que era el único en la última página)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
        <button
          onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          disabled={currentPage === 1}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
            color: currentPage === 1 ? '#9ca3af' : '#374151',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            fontWeight: '500'
          }}
        >
          Anterior
        </button>
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Página <span style={{ fontWeight: '600', color: '#111827' }}>{currentPage}</span> de <span style={{ fontWeight: '600', color: '#111827' }}>{totalPages}</span>
        </span>
        <button
          onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          disabled={currentPage === totalPages}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: currentPage === totalPages ? '#f3f4f6' : 'white',
            color: currentPage === totalPages ? '#9ca3af' : '#374151',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            fontWeight: '500'
          }}
        >
          Siguiente
        </button>
      </div>
    );
  };

  const getReasignarTexto = (solimitId: string) => {
    if (userRole === 'FUNCIONARIO') return 'Reasignar';
    const time = reassignTimers[solimitId];
    if (time === undefined || time <= 0) return 'Reasignar';
    const totalHours = Math.floor(time / 3600000);
    const days = Math.floor(totalHours / 24);
    if (days >= 1) return `Reasignar (${days}d)`;
    const hours = String(totalHours).padStart(2, '0');
    const mins = String(Math.floor((time % 3600000) / 60000)).padStart(2, '0');
    return `Reasignar (${hours}:${mins})`;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1.5rem 2rem'
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                backgroundColor: '#dbeafe',
                borderRadius: '12px',
                padding: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Inbox size={32} color="var(--color-primary)" />
              </div>
              <div>
                <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                  Bandeja de Entrada
                </h1>
                <p style={{ color: '#6b7280', marginTop: '0.25rem', fontSize: '0.875rem' }}>
                  Gestiona todas las solicitudes generales recibidas
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {/* === MOBILE: Dropdown Select (visible ≤768px) === */}
        <div className="bandeja-tabs-mobile" style={{
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as typeof activeTab)}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              backgroundColor: 'white',
              color: '#111827',
              border: '2px solid #3b82f6',
              borderRadius: '10px',
              cursor: 'pointer',
              appearance: 'none' as const,
              WebkitAppearance: 'none' as const,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              backgroundSize: '16px',
              paddingRight: '2.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            {userRole === 'DIRECTOR' && <option value="seguimientoGeneral">📋 Seguimiento General{directorSeguimientoCount > 0 ? ` (${directorSeguimientoCount})` : ''}</option>}
            {userRole === 'DIRECTOR' && <option value="invitaciones">📨 Invitaciones{directorInvitacionesCount > 0 ? ` (${directorInvitacionesCount})` : ''}</option>}
            <option value="nuevos">🆕 Nuevos{userRole === 'DIRECTOR' && directorNuevosCount > 0 ? ` (${directorNuevosCount})` : ''}</option>
            {userRole === 'VENTANILLA_UNICA' && <option value="seguimientosLeidos">📖 Seguimientos Leídos</option>}
            {userRole === 'VENTANILLA_UNICA' && <option value="invitacionesLeidas">📬 Invitaciones Leídas</option>}
            {userRole !== 'VENTANILLA_UNICA' && <option value="enProceso">⚙️ En Gestión{enGestionNotifCount > 0 ? ` (${enGestionNotifCount})` : ''}</option>}
            {userRole !== 'VENTANILLA_UNICA' && <option value="rechazados">↩️ Remitidos{respuestasPendientes > 0 ? ` (${respuestasPendientes})` : ''}</option>}
            {userRole !== 'VENTANILLA_UNICA' && <option value="finalizado">✅ Trámite Finalizado</option>}
            {userRole === 'DIRECTOR' && <option value="leidos">👁️ Leídos</option>}
          </select>
          <button
            onClick={() => loadSolicitudes(true)}
            title="Actualizar bandeja"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.75rem',
              backgroundColor: 'white',
              color: 'var(--color-primary)',
              border: '2px solid #3b82f6',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={18} className={loading && solicitudes.length > 0 ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* === DESKTOP: Tab Buttons (visible >768px) === */}
        <div className="bandeja-tabs-desktop" style={{
          backgroundColor: '#f3f4f6',
          padding: '0.5rem',
          borderRadius: '8px',
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          maxWidth: '100%'
        }}>
          {/* Pestaña Seguimiento General - Solo visible para DIRECTOR */}
          {userRole === 'DIRECTOR' && (
            <button
              onClick={() => setActiveTab('seguimientoGeneral')}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: activeTab === 'seguimientoGeneral' ? 'var(--color-primary)' : 'transparent',
                color: activeTab === 'seguimientoGeneral' ? 'white' : '#6b7280',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              Seguimiento General
              {directorSeguimientoCount > 0 && (
                <span style={{
                  backgroundColor: activeTab === 'seguimientoGeneral' ? 'rgba(255,255,255,0.3)' : '#3b82f6',
                  color: 'white',
                  borderRadius: '9999px',
                  padding: '0.1rem 0.45rem',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  lineHeight: '1.25rem',
                  minWidth: '1.25rem',
                  textAlign: 'center'
                }}>
                  {directorSeguimientoCount}
                </span>
              )}
            </button>
          )}
          {/* Pestaña Invitaciones - Solo visible para DIRECTOR */}
          {userRole === 'DIRECTOR' && (
            <button
              onClick={() => setActiveTab('invitaciones')}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: activeTab === 'invitaciones' ? 'var(--color-primary)' : 'transparent',
                color: activeTab === 'invitaciones' ? 'white' : '#6b7280',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              Invitaciones
              {directorInvitacionesCount > 0 && (
                <span style={{
                  backgroundColor: activeTab === 'invitaciones' ? 'rgba(255,255,255,0.3)' : '#8b5cf6',
                  color: 'white',
                  borderRadius: '9999px',
                  padding: '0.1rem 0.45rem',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  lineHeight: '1.25rem',
                  minWidth: '1.25rem',
                  textAlign: 'center'
                }}>
                  {directorInvitacionesCount}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setActiveTab('nuevos')}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: activeTab === 'nuevos' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'nuevos' ? 'white' : '#6b7280',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            Nuevos
            {userRole === 'DIRECTOR' && directorNuevosCount > 0 && (
              <span style={{
                backgroundColor: activeTab === 'nuevos' ? 'rgba(255,255,255,0.3)' : '#ef4444',
                color: 'white',
                borderRadius: '9999px',
                padding: '0.1rem 0.45rem',
                fontSize: '0.7rem',
                fontWeight: '700',
                lineHeight: '1.25rem',
                minWidth: '1.25rem',
                textAlign: 'center'
              }}>
                {directorNuevosCount}
              </span>
            )}
          </button>

          {/* Pestañas exclusivas para VENTANILLA_UNICA */}
          {userRole === 'VENTANILLA_UNICA' && (
            <>
              <button
                onClick={() => setActiveTab('seguimientosLeidos')}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'seguimientosLeidos' ? 'var(--color-primary)' : 'transparent',
                  color: activeTab === 'seguimientosLeidos' ? 'white' : '#6b7280'
                }}
              >
                Seguimientos Leídos
              </button>
              <button
                onClick={() => setActiveTab('invitacionesLeidas')}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'invitacionesLeidas' ? 'var(--color-primary)' : 'transparent',
                  color: activeTab === 'invitacionesLeidas' ? 'white' : '#6b7280'
                }}
              >
                Invitaciones Leídas
              </button>
            </>
          )}

          {/* Pestañas estándar - Ocultas para VENTANILLA_UNICA */}
          {userRole !== 'VENTANILLA_UNICA' && (
            <>
              <button
                onClick={() => setActiveTab('enProceso')}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'enProceso' ? 'var(--color-primary)' : 'transparent',
                  color: activeTab === 'enProceso' ? 'white' : '#6b7280'
                }}
              >
                En Gestión
                {enGestionNotifCount > 0 && (
                  <span style={{
                    marginLeft: '0.5rem',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    borderRadius: '9999px',
                    padding: '0.125rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    minWidth: '1.25rem',
                    textAlign: 'center' as const,
                    display: 'inline-block',
                    lineHeight: '1.25rem',
                    animation: 'pulse 2s ease-in-out infinite'
                  }}>
                    {enGestionNotifCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('rechazados')}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'rechazados' ? 'var(--color-primary)' : 'transparent',
                  color: activeTab === 'rechazados' ? 'white' : '#6b7280',
                  position: 'relative'
                }}
              >
                Remitidos por Competencia
                {respuestasPendientes > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    fontSize: '0.625rem',
                    fontWeight: '700',
                    padding: '2px 6px',
                    borderRadius: '9999px',
                    minWidth: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    boxShadow: '0 0 0 3px rgba(220, 38, 38, 0.2)'
                  }}>
                    {respuestasPendientes}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('finalizado')}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'finalizado' ? 'var(--color-primary)' : 'transparent',
                  color: activeTab === 'finalizado' ? 'white' : '#6b7280'
                }}
              >
                Trámite Finalizado
              </button>
            </>
          )}

          {/* Pestaña Leídos - Solo Visible para REVISOR_MUNICIPAL */}
          {userRole === 'DIRECTOR' && (
            <button
              onClick={() => setActiveTab('leidos')}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: activeTab === 'leidos' ? 'var(--color-primary)' : 'transparent',
                color: activeTab === 'leidos' ? 'white' : '#6b7280'
              }}
            >
              Leídos
            </button>
          )}

          <div style={{ paddingLeft: '0.5rem', borderLeft: '1px solid #d1d5db', display: 'flex', alignItems: 'center', marginLeft: '0.5rem' }}>
            <button
              onClick={() => loadSolicitudes(true)}
              title="Actualizar bandeja"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
                e.currentTarget.style.color = '#111827';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <RefreshCw size={18} className={loading && solicitudes.length > 0 ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* === DESKTOP: Barra de Búsqueda === */}
        <div className="bandeja-tabs-desktop" style={{
          marginBottom: '1rem',
          position: 'relative',
          maxWidth: '480px'
        }}>
          <Search
            size={18}
            color="#9ca3af"
            style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <input
            type="text"
            placeholder="Buscar por radicado, nombre, documento, asunto..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.5rem',
              fontSize: '0.875rem',
              backgroundColor: 'white',
              border: '2px solid #e5e7eb',
              borderRadius: '10px',
              outline: 'none',
              color: '#111827',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; }}
          />
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9ca3af',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* CSS: Toggle mobile dropdown vs desktop tabs + compact cards */}
        <style dangerouslySetInnerHTML={{ __html: `
          .bandeja-tabs-mobile { display: flex !important; }
          .bandeja-tabs-desktop { display: none !important; }
          @media (min-width: 769px) {
            .bandeja-tabs-mobile { display: none !important; }
            .bandeja-tabs-desktop { display: flex !important; }
          }
          @media (max-width: 768px) {
            /* Contenedor principal de la tarjeta: Reducir padding drásticamente y alinear al borde */
            .bandeja-caso-card {
              padding: 0.75rem !important;
            }
            
            /* El flex que envuelve todo el contenido de la tarjeta -> Hacerlo columna */
            .bandeja-caso-card > div[style*="display: flex"] {
              flex-direction: column !important;
              gap: 0.5rem !important;
            }
            
            /* Fila de metadatos (Radicado, Estado, Prioridad) -> Mantener row pero más ajustado */
            .bandeja-caso-card > div[style*="display: flex"] > div:first-child > div[style*="display: flex"] {
              gap: 0.35rem !important;
              margin-bottom: 0.5rem !important;
            }
            
            /* Contenedor de botones de acción -> Hacerlo columna y ancho completo */
            .bandeja-caso-card > div[style*="display: flex"] > div:last-child {
              flex-direction: column !important;
              width: 100% !important;
              gap: 0.35rem !important;
              margin-top: 0.25rem !important;
            }

            /* Forzar botones a 100% ancho y centro */
            .bandeja-caso-card button,
            .bandeja-caso-card a {
              padding: 0.4rem 0.5rem !important;
              font-size: 0.75rem !important;
              width: 100% !important;
              justify-content: center !important;
              margin: 0 !important;
            }

            /* Textos y Badges */
            .bandeja-caso-card h3 {
              font-size: 0.9rem !important;
              margin-bottom: 0.25rem !important;
              line-height: 1.2 !important;
            }
            .bandeja-caso-card p {
              font-size: 0.75rem !important;
              margin-bottom: 0.25rem !important;
              line-height: 1.2 !important;
            }
            .bandeja-caso-card span {
              font-size: 0.7rem !important;
              padding: 0.15rem 0.4rem !important;
            }
            
            /* Grilla de metadatos (Cédula, Nombres, Fecha) -> Quitar margins y achicar iconos */
            .bandeja-caso-card .grid, 
            .bandeja-caso-card [style*="display: grid"] {
              gap: 0.25rem !important;
              margin-bottom: 0.25rem !important;
            }
            .bandeja-caso-card svg {
               width: 14px !important;
               height: 14px !important;
            }
          }
        `}} />

        {activeTab === 'nuevos' || activeTab === 'seguimientoGeneral' || activeTab === 'invitaciones' || activeTab === 'leidos' || activeTab === 'seguimientosLeidos' || activeTab === 'invitacionesLeidas' ? (
          <>
            {/* Contenido de En Trámite */}
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
                    borderTop: '4px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 1rem'
                  }} />
                  <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    {activeTab === 'seguimientoGeneral' ? 'Cargando casos en seguimiento...' :
                      activeTab === 'invitaciones' ? 'Cargando invitaciones...' :
                        activeTab === 'leidos' ? 'Cargando casos leídos...' :
                          'Cargando solicitudes nuevas...'}
                  </p>
                </div>
              </div>
            ) : filteredSolicitudes.length === 0 ? (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '4rem 2rem',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                {searchTerm ? (
                  <>
                    <Search size={64} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                      No se encontraron resultados
                    </h3>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      No hay casos que coincidan con &quot;{searchTerm}&quot; en esta pestaña.
                    </p>
                  </>
                ) : (
                  <>
                    <Inbox size={64} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                      {activeTab === 'seguimientoGeneral' ? 'No hay casos en seguimiento' :
                        activeTab === 'invitaciones' ? 'No hay invitaciones' :
                          activeTab === 'leidos' ? 'No hay casos leídos' :
                            'No hay solicitudes nuevas'}
                    </h3>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {activeTab === 'leidos' ? 'Los casos que marques como leídos aparecerán aquí' :
                        'Las nuevas solicitudes aparecerán aquí'}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {paginatedSolicitudes.map((solicitud) => {
                    const estadoColor = getEstadoColor(solicitud.estado);
                    const prioridadColor = getPrioridadColor(solicitud.prioridad);

                    return (
                      <div
                        className="bandeja-caso-card"
                        key={solicitud.id}
                        style={{
                          backgroundColor: (userId && !(solicitud.readBy || []).includes(userId) && activeTab !== 'seguimientosLeidos' && activeTab !== 'invitacionesLeidas') ? '#f0f7ff' : 'white',
                          borderRadius: '12px',
                          padding: '1.5rem',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s',
                          cursor: 'pointer',
                          borderTop: '2px solid transparent',
                          borderRight: '2px solid transparent',
                          borderBottom: '2px solid transparent',
                          borderLeft: (userId && !(solicitud.readBy || []).includes(userId) && activeTab !== 'seguimientosLeidos' && activeTab !== 'invitacionesLeidas') ? '4px solid #3b82f6' : '2px solid transparent',
                          position: 'relative' as const
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-primary)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'transparent';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                        }}
                      >
                        {/* Indicador de no leído — nunca en pestañas ya procesadas por VU */}
                        {userId && !(solicitud.readBy || []).includes(userId) && activeTab !== 'seguimientosLeidos' && activeTab !== 'invitacionesLeidas' && (
                          <div style={{
                            position: 'absolute',
                            top: '0.75rem',
                            right: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            backgroundColor: '#dbeafe',
                            color: '#1d4ed8',
                            borderRadius: '9999px',
                            padding: '0.2rem 0.6rem',
                            fontSize: '0.7rem',
                            fontWeight: '700'
                          }}>
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--color-primary)',
                              display: 'inline-block'
                            }} />
                            Nuevo
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                          {/* Información principal */}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                              <span style={{
                                fontSize: '0.875rem',
                                fontWeight: '700',
                                color: 'var(--color-primary)'
                              }}>
                                {solicitud.codigo}
                              </span>

                              <span style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                backgroundColor: estadoColor.bg,
                                color: estadoColor.text
                              }}>
                                {solicitud.estado}
                              </span>

                              <span style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                backgroundColor: prioridadColor.bg,
                                color: prioridadColor.text
                              }}>
                                {solicitud.prioridad}
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

                              {/* Semáforo de Término Legal */}
                              {solicitud.semaforoTermino && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.7rem',
                                  fontWeight: '700',
                                  backgroundColor:
                                    solicitud.semaforoTermino === 'rojo' ? '#fee2e2' :
                                    solicitud.semaforoTermino === 'amarillo' ? '#fef3c7' :
                                    solicitud.semaforoTermino === 'respondido' ? '#d1fae5' :
                                    '#dcfce7',
                                  color:
                                    solicitud.semaforoTermino === 'rojo' ? '#dc2626' :
                                    solicitud.semaforoTermino === 'amarillo' ? '#d97706' :
                                    solicitud.semaforoTermino === 'respondido' ? '#059669' :
                                    '#16a34a',
                                }}>
                                  <span style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor:
                                      solicitud.semaforoTermino === 'rojo' ? '#dc2626' :
                                      solicitud.semaforoTermino === 'amarillo' ? '#f59e0b' :
                                      solicitud.semaforoTermino === 'respondido' ? '#10b981' :
                                      '#22c55e',
                                    display: 'inline-block',
                                    boxShadow:
                                      solicitud.semaforoTermino === 'rojo' ? '0 0 6px #dc2626' :
                                      solicitud.semaforoTermino === 'amarillo' ? '0 0 6px #f59e0b' :
                                      '0 0 4px #22c55e',
                                  }} />
                                  {solicitud.semaforoTermino === 'rojo' ? 'Vencido' :
                                   solicitud.semaforoTermino === 'amarillo' ? 'Próximo a vencer' :
                                   solicitud.semaforoTermino === 'respondido' ? (solicitud.respondidoDentroDelTermino ? 'Respondido en término' : 'Respondido fuera de término') :
                                   'En término'}
                                </span>
                              )}
                            </div>

                            <h3 style={{
                              fontSize: '1.125rem',
                              fontWeight: '600',
                              color: '#111827',
                              marginBottom: '0.75rem',
                              lineHeight: '1.5'
                            }}>
                              {solicitud.asunto}
                            </h3>

                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                              gap: '1rem',
                              marginTop: '1rem'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <User size={16} color="#6b7280" />
                                <div>
                                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Ciudadano</p>
                                  <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: 0 }}>
                                    {solicitud.ciudadano?.nombre}
                                  </p>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileText size={16} color="#6b7280" />
                                <div>
                                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Documento</p>
                                  <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: 0 }}>
                                    {solicitud.ciudadano?.documento}
                                  </p>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Calendar size={16} color="#6b7280" />
                                <div>
                                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Fecha de radicado</p>
                                  <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: 0 }}>
                                    {solicitud.fechaCreacion ? new Date(solicitud.fechaCreacion).toLocaleString('es-ES', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : 'Sin Fecha'}
                                  </p>
                                </div>
                              </div>

                              {solicitud.fechaAsignacion && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <Calendar size={16} color="#f59e0b" />
                                  <div>
                                    <p style={{ fontSize: '0.75rem', color: '#f59e0b', margin: 0 }}>Asignado el</p>
                                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#d97706', margin: 0 }}>
                                      {new Date(solicitud.fechaAsignacion).toLocaleString('es-ES', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Acciones */}
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                            {/* Botón Archivo Adjunto - Solo si tiene documentos */}
                            {solicitud.documentos && solicitud.documentos.length > 0 && (
                              <a
                                href={solicitud.documentos[0].fileUrl}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  padding: '0.75rem 1.25rem',
                                  fontSize: '0.875rem',
                                  fontWeight: '500',
                                  backgroundColor: '#475569',
                                  color: 'white',
                                  border: '1px solid #334155',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  textDecoration: 'none'
                                }}
                              >
                                <FileText size={16} />
                                Archivo
                              </a>
                            )}

                            <button
                              onClick={() => handleVerDetalle(solicitud.id)}
                              style={{
                                padding: '0.75rem 1.25rem',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                backgroundColor: '#1e40af',
                                color: 'white',
                                border: '1px solid #1e3a8a',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}
                            >
                              <Eye size={16} />
                              Ver Detalles
                            </button>

                            {/* Botón Generar Radicado - Solo VU, Solo Desktop */}
                            {userRole === 'VENTANILLA_UNICA' && (
                              <button
                                className="desktop-only"
                                onClick={() => router.push(`/home/imprimir-radicado?radicado=${solicitud.codigo}`)}
                                style={{
                                  padding: '0.75rem 1.25rem',
                                  fontSize: '0.875rem',
                                  fontWeight: '500',
                                  backgroundColor: '#059669',
                                  color: 'white',
                                  border: '1px solid #047857',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem'
                                }}
                              >
                                <FileText size={16} />
                                Imprimir Radicado
                              </button>
                            )}
                            {/* Solo mostrar botón de reasignar si NO es una asignación final Y el usuario NO es VENTANILLA_UNICA Y NO estamos en pestañas de solo lectura del Revisor Y aún hay tiempo dentro de la ventana de 2 minutos */}
                            {!solicitud.isFinalAssignment &&
                              userRole &&
                              userRole !== 'VENTANILLA_UNICA' &&
                              !(userRole === 'DIRECTOR' && (activeTab === 'seguimientoGeneral' || activeTab === 'invitaciones' || activeTab === 'leidos')) &&
                              (reassignTimers[solicitud.id] === undefined || reassignTimers[solicitud.id] > 0) && (
                                <button
                                  onClick={() => handleAbrirReasignar(solicitud.id)}
                                  style={{
                                    padding: '0.75rem 1.25rem',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    backgroundColor: 'white',
                                    color: '#334155',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                  }}
                                >
                                  <ArrowLeftRight size={16} />
                                  {getReasignarTexto(solicitud.id)}
                                </button>
                              )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {renderPagination()}
              </>
            )}
          </>
        ) : activeTab === 'enProceso' ? (
          /* Pestaña En Gestión */
          <>
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
                    borderTop: '4px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 1rem'
                  }} />
                  <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Cargando solicitudes en gestión...</p>
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
                <Inbox size={64} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                  No hay solicitudes en gestión
                </h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  Las solicitudes que estés gestionando aparecerán aquí
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {paginatedSolicitudes.map((solicitud) => {
                    const estadoColor = getEstadoColor(solicitud.estado);
                    const prioridadColor = getPrioridadColor(solicitud.prioridad);

                    return (
                      <div
                        className="bandeja-caso-card"
                        key={solicitud.id}
                        onClick={() => handleAbrirChatModal(solicitud.id)}
                        style={{
                          backgroundColor: 'white',
                          borderRadius: '12px',
                          padding: '1.5rem',
                          boxShadow: enGestionNotifIds.has(solicitud.id) ? '0 0 0 2px #ef4444, 0 4px 12px rgba(239, 68, 68, 0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s',
                          cursor: 'pointer',
                          border: enGestionNotifIds.has(solicitud.id) ? '2px solid #ef4444' : '2px solid transparent',
                          position: 'relative' as const
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-primary)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'transparent';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                        }}
                      >
                        {/* Badge de notificación en la tarjeta */}
                        {enGestionNotifIds.has(solicitud.id) && (
                          <div style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            borderRadius: '9999px',
                            padding: '0.25rem 0.75rem',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            animation: 'pulse 2s ease-in-out infinite',
                            zIndex: 10
                          }}>
                            <MessageSquare size={12} />
                            Ciudadano respondió
                          </div>
                        )}
                        {notasDirIds.has(solicitud.id) && userRole === 'FUNCIONARIO' && (
                          <div style={{
                            position: 'absolute',
                            top: '-8px',
                            left: '-8px',
                            backgroundColor: '#d97706',
                            color: 'white',
                            borderRadius: '9999px',
                            padding: '0.25rem 0.75rem',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            boxShadow: '0 2px 8px rgba(217, 119, 6, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            zIndex: 10
                          }}>
                            <MessageSquare size={12} />
                            Nota del Director
                          </div>
                        )}
                        {entidadRespIds.has(solicitud.id) && (
                          <div style={{
                            position: 'absolute',
                            bottom: '-8px',
                            right: '-8px',
                            backgroundColor: '#ea580c',
                            color: 'white',
                            borderRadius: '9999px',
                            padding: '0.25rem 0.75rem',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            boxShadow: '0 2px 8px rgba(234, 88, 12, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            zIndex: 10
                          }}>
                            <MessageSquare size={12} />
                            Entidad respondió
                          </div>
                        )}
                        {cierreRechazadoIds.has(solicitud.id) && userRole === 'FUNCIONARIO' && (
                          <div style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            borderRadius: '9999px',
                            padding: '0.25rem 0.75rem',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            zIndex: 10,
                            animation: 'pulse 2s ease-in-out infinite'
                          }}>
                            <XCircle size={12} />
                            Cierre rechazado
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                          {/* Información principal */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                              <span style={{
                                fontSize: '0.875rem',
                                fontWeight: '700',
                                color: 'var(--color-primary)'
                              }}>
                                {solicitud.codigo}
                              </span>

                              <span style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                backgroundColor: estadoColor.bg,
                                color: estadoColor.text
                              }}>
                                {solicitud.estado}
                              </span>

                              <span style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                backgroundColor: prioridadColor.bg,
                                color: prioridadColor.text
                              }}>
                                {solicitud.prioridad}
                              </span>

                              {solicitud.metadata?.pendienteCierre && (
                                <span style={{
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  backgroundColor: '#fef2f2',
                                  color: '#dc2626',
                                  border: '1px solid #fecaca',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}>
                                  <AlertTriangle size={12} />
                                  En Aprobación
                                </span>
                              )}
                            </div>

                            <h3 style={{
                              fontSize: '1.125rem',
                              fontWeight: '600',
                              color: '#111827',
                              marginBottom: '0.5rem',
                              lineHeight: '1.5'
                            }}>
                              {solicitud.asunto}
                            </h3>

                            <p style={{
                              fontSize: '0.875rem',
                              color: '#6b7280',
                              marginBottom: '1rem',
                              lineHeight: '1.5'
                            }}>
                              {solicitud.descripcion || 'Sin descripción'}
                            </p>

                            {/* Metadatos */}
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                              gap: '1rem',
                              padding: '1rem',
                              backgroundColor: '#f9fafb',
                              borderRadius: '8px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <User size={16} color="#6b7280" />
                                <div>
                                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Ciudadano</p>
                                  <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: 0 }}>
                                    {solicitud.ciudadano?.nombre}
                                  </p>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileText size={16} color="#6b7280" />
                                <div>
                                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Documento</p>
                                  <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: 0 }}>
                                    {solicitud.ciudadano?.documento}
                                  </p>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Calendar size={16} color="#6b7280" />
                                <div>
                                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Fecha de radicado</p>
                                  <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: 0 }}>
                                    {new Date(solicitud.fechaCreacion).toLocaleString('es-ES', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>

                              {solicitud.fechaEnGestion && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <Calendar size={16} color="var(--color-primary)" />
                                  <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-primary)', margin: 0 }}>En gestión desde</p>
                                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1e40af', margin: 0 }}>
                                      {new Date(solicitud.fechaEnGestion).toLocaleString('es-ES', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Acciones */}
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                            {/* Botón Archivo Adjunto - Solo si tiene documentos */}
                            {solicitud.documentos && solicitud.documentos.length > 0 && (
                              <a
                                href={solicitud.documentos[0].fileUrl}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  padding: '0.75rem 1.25rem',
                                  fontSize: '0.875rem',
                                  fontWeight: '500',
                                  backgroundColor: '#475569',
                                  color: 'white',
                                  border: '1px solid #334155',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  textDecoration: 'none'
                                }}
                              >
                                <FileText size={16} />
                                Archivo
                              </a>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAbrirChatModal(solicitud.id);
                              }}
                              style={{
                                padding: '0.75rem 1.25rem',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                backgroundColor: '#10b981', // green for chat action
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}
                            >
                              <MessageSquare size={16} />
                              Continuar caso
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {renderPagination()}
              </>
            )}
          </>
        ) : activeTab === 'rechazados' ? (
          /* Pestaña Remitidos por Competencia */
          <>
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
                    borderTop: '4px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 1rem'
                  }} />
                  <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Cargando solicitudes rechazadas...</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {solicitudes.length === 0 ? (
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '4rem 2rem',
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}>
                    <Inbox size={64} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                      No hay solicitudes rechazadas por improcedencia
                    </h3>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      Las solicitudes rechazadas aparecerán aquí
                    </p>
                  </div>
                ) : paginatedSolicitudes.map((solicitud) => {
                  return (
                    <div
                      className="bandeja-caso-card"
                      key={solicitud.id}
                      style={{
                        backgroundColor: 'white',
                        border: solicitud.ciudadanoRespondio ? '2px solid #86efac' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        position: 'relative',
                        boxShadow: solicitud.ciudadanoRespondio ? '0 0 0 3px rgba(220, 252, 231, 0.5)' : 'none'
                      }}
                    >
                      {/* Badge de notificación "NUEVA RESPUESTA" */}
                      {solicitud.ciudadanoRespondio && (
                        <div style={{
                          position: 'absolute',
                          top: '-10px',
                          right: '20px',
                          backgroundColor: '#dc2626',
                          color: 'white',
                          fontSize: '0.625rem',
                          fontWeight: '700',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                        }}>
                          NUEVA RESPUESTA
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              color: '#475569',
                              backgroundColor: '#f1f5f9',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px'
                            }}>
                              {solicitud.codigo}
                            </span>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              color: '#dc2626',
                              backgroundColor: '#fee2e2',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px'
                            }}>
                              {solicitud.estado}
                            </span>
                          </div>
                          <h3 style={{
                            fontSize: '1.125rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginBottom: '0.5rem'
                          }}>
                            {solicitud.asunto}
                          </h3>
                          <p style={{
                            fontSize: '0.875rem',
                            color: '#64748b',
                            marginBottom: '0.75rem',
                            lineHeight: '1.5'
                          }}>
                            {solicitud.descripcion && solicitud.descripcion.length > 150
                              ? `${solicitud.descripcion.substring(0, 150)}...`
                              : solicitud.descripcion || 'Sin descripción'
                            }
                          </p>
                          <div style={{
                            display: 'flex',
                            gap: '1.5rem',
                            fontSize: '0.875rem',
                            color: '#64748b',
                            flexWrap: 'wrap'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <User size={16} />
                              <span>{solicitud.ciudadano?.nombre}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Calendar size={16} />
                              <span style={{ fontWeight: '500' }}>Radicado:</span>
                              <span>{new Date(solicitud.fechaCreacion).toLocaleString('es-ES', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <FileText size={16} />
                              <span>{solicitud.tipo}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{
                        borderTop: '1px solid #e5e7eb',
                        paddingTop: '1rem'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <AlertCircle size={16} color="#dc2626" />
                              <span style={{ fontSize: '0.875rem', color: '#dc2626', fontWeight: '500' }}>
                                Remitido por competencia
                              </span>
                            </div>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!solicitud.ciudadanoRespondio) return;

                                if (confirm('¿Está seguro de cerrar este caso? Esta acción no se puede deshacer.')) {
                                  try {
                                    const response = await fetch(`/api/v1/solicitudes/${solicitud.id}/cerrar-rechazado`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' }
                                    });

                                    if (response.ok) {
                                      alert('Caso cerrado exitosamente');
                                      loadSolicitudes();
                                      loadRespuestasPendientes();
                                    } else {
                                      alert('Error al cerrar el caso');
                                    }
                                  } catch (error) {
                                    console.error('Error:', error);
                                    alert('Error al cerrar el caso');
                                  }
                                }
                              }}
                              disabled={!solicitud.ciudadanoRespondio}
                              style={{
                                padding: '0.375rem 0.75rem',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: solicitud.ciudadanoRespondio ? 'pointer' : 'not-allowed',
                                backgroundColor: solicitud.ciudadanoRespondio ? '#059669' : '#d1d5db',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                transition: 'all 0.2s',
                                opacity: solicitud.ciudadanoRespondio ? 1 : 0.5
                              }}
                              onMouseEnter={(e) => {
                                if (solicitud.ciudadanoRespondio) {
                                  e.currentTarget.style.backgroundColor = '#047857';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (solicitud.ciudadanoRespondio) {
                                  e.currentTarget.style.backgroundColor = '#059669';
                                }
                              }}
                            >
                              <CheckCircle size={14} />
                              Cerrar Caso
                            </button>
                          </div>

                          {/* Fechas del rechazo */}
                          {solicitud.fechaRechazo && (
                            <div style={{
                              backgroundColor: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: '6px',
                              padding: '0.75rem',
                              fontSize: '0.8rem'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b' }}>
                                <Calendar size={14} />
                                <span style={{ fontWeight: '600' }}>Remitido el:</span>
                                <span>{new Date(solicitud.fechaRechazo).toLocaleString('es-ES', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}</span>
                              </div>
                            </div>
                          )}

                          {/* Respuesta del ciudadano si existe */}
                          {solicitud.ciudadanoRespondio && solicitud.respuestaCiudadano && (
                            <div style={{
                              backgroundColor: '#dcfce7',
                              border: '1px solid #86efac',
                              borderRadius: '8px',
                              padding: '1rem',
                              marginTop: '0.5rem'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '0.875rem', color: '#065f46', fontWeight: '600' }}>
                                  ✅ Ciudadano respondió
                                </span>
                                {solicitud.fechaRespuestaCiudadano && (
                                  <span style={{ fontSize: '0.75rem', color: '#047857' }}>
                                    el {new Date(solicitud.fechaRespuestaCiudadano).toLocaleString('es-ES', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                )}
                              </div>
                              <div style={{
                                backgroundColor: 'white',
                                padding: '0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                color: '#374151',
                                lineHeight: '1.6',
                                maxHeight: '150px',
                                overflowY: 'auto'
                              }}>
                                {solicitud.respuestaCiudadano}
                              </div>
                            </div>
                          )}

                          {/* Temporizador de expiración */}
                          {!solicitud.ciudadanoRespondio && solicitud.expiresAt && timers[solicitud.id] !== undefined && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              paddingLeft: '1.5rem'
                            }}>
                              <span style={{
                                fontSize: '0.75rem',
                                color: timers[solicitud.id] <= 0 ? '#dc2626' : '#f59e0b',
                                fontWeight: '600'
                              }}>
                                {timers[solicitud.id] <= 0 ? '⏰ Expirado' : `⏱️ ${formatTimeRemaining(timers[solicitud.id])}`}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {timers[solicitud.id] <= 0
                                  ? '(El caso será cerrado automáticamente)'
                                  : '(Tiempo para respuesta del ciudadano)'
                                }
                              </span>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                          {solicitud.documentos && solicitud.documentos.length > 0 && (
                            <a
                              href={solicitud.documentos[0].fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '0.75rem 1.25rem',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                backgroundColor: 'white',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}
                            >
                              <Paperclip size={16} />
                              Archivo
                            </a>
                          )}

                          <button
                            onClick={() => handleVerDetalle(solicitud.id)}
                            style={{
                              padding: '0.75rem 1.25rem',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              backgroundColor: 'var(--color-primary)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            <Eye size={16} />
                            Ver Detalle
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* Pestaña Trámite Finalizado */
          <>
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
                    borderTop: '4px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 1rem'
                  }} />
                  <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Cargando solicitudes finalizadas...</p>
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
                <Inbox size={64} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                  No hay solicitudes finalizadas
                </h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  Los casos que finalices aparecerán aquí
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {paginatedSolicitudes.map((solicitud) => (
                    <div
                      key={solicitud.id}
                      style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        border: '2px solid transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#10b981';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                            <span style={{
                              fontSize: '0.875rem',
                              fontWeight: '700',
                              color: '#10b981'
                            }}>
                              {solicitud.codigo}
                            </span>

                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              backgroundColor: '#d1fae5',
                              color: '#065f46'
                            }}>
                              FINALIZADO
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
                          </div>

                          <h3 style={{
                            fontSize: '1.125rem',
                            fontWeight: '600',
                            color: '#111827',
                            marginBottom: '0.75rem',
                            lineHeight: '1.5'
                          }}>
                            {solicitud.asunto}
                          </h3>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1rem',
                            marginTop: '1rem'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <User size={16} color="#6b7280" />
                              <div>
                                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Ciudadano</p>
                                <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: 0 }}>
                                  {solicitud.ciudadano?.nombre}
                                </p>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <FileText size={16} color="#6b7280" />
                              <div>
                                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Documento</p>
                                <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: 0 }}>
                                  {solicitud.ciudadano?.documento}
                                </p>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Calendar size={16} color="#6b7280" />
                              <div>
                                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Fecha de radicado</p>
                                <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: 0 }}>
                                  {new Date(solicitud.fechaCreacion).toLocaleString('es-ES', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>

                            {solicitud.fechaCierre && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Calendar size={16} color="#10b981" />
                                <div>
                                  <p style={{ fontSize: '0.75rem', color: '#10b981', margin: 0 }}>Finalizado el</p>
                                  <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#047857', margin: 0 }}>
                                    {new Date(solicitud.fechaCierre).toLocaleString('es-ES', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                          <button
                            onClick={() => handleVerDetalle(solicitud.id)}
                            style={{
                              padding: '0.75rem 1.25rem',
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
                            <Eye size={16} />
                            Ver Detalles
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {renderPagination()}
              </>
            )}
          </>
        )}
      </div>

      {/* Modal de Detalles */}
      {
        isModalOpen && (
          <div
            className="detail-modal-overlay"
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
              zIndex: 3000,
              padding: '1rem'
            }}
          >
            <div
              className="detail-modal-panel"
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                maxWidth: '900px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del Modal */}
              <div className="detail-modal-header" style={{
                padding: '1.5rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2 className="detail-modal-title" style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
                  {loadingDetalle ? 'Cargando...' : 'Detalles de la Solicitud'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
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
                  <X size={20} color="#6b7280" />
                </button>
              </div>

              {/* Contenido del Modal */}
              {loadingDetalle ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid #e5e7eb',
                    borderTop: '4px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto'
                  }} />
                </div>
              ) : selectedSolicitud ? (
                <div className="detail-modal-body" style={{ padding: '1.5rem' }}>
                  {/* Información General */}
                  <div style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div className="detail-info-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
                          {selectedSolicitud.codigo}
                        </h3>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                          {selectedSolicitud.tipo}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{
                          padding: '0.5rem 1rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: getEstadoColor(selectedSolicitud.estado).bg,
                          color: getEstadoColor(selectedSolicitud.estado).text,
                          borderRadius: '9999px'
                        }}>
                          {selectedSolicitud.estado.toUpperCase()}
                        </span>
                        <span style={{
                          padding: '0.5rem 1rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: getPrioridadColor(selectedSolicitud.prioridad).bg,
                          color: getPrioridadColor(selectedSolicitud.prioridad).text,
                          borderRadius: '9999px'
                        }}>
                          {selectedSolicitud.prioridad.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                      <Calendar size={16} />
                      <span style={{ fontWeight: '500' }}>Radicado:</span>
                      <span>
                        {selectedSolicitud.fechaCreacion ? new Date(selectedSolicitud.fechaCreacion).toLocaleString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Sin Fecha'}
                      </span>
                    </div>
                  </div>

                  {/* ═══ Control de Términos Legales (Semáforo) ═══ */}
                  <div style={{
                    marginBottom: '1.5rem',
                    border: `2px solid ${
                      selectedSolicitud.semaforoTermino === 'rojo' ? '#fca5a5' :
                      selectedSolicitud.semaforoTermino === 'amarillo' ? '#fcd34d' :
                      selectedSolicitud.semaforoTermino === 'respondido' ? '#86efac' :
                      '#86efac'
                    }`,
                    borderRadius: '12px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      backgroundColor:
                        selectedSolicitud.semaforoTermino === 'rojo' ? '#fef2f2' :
                        selectedSolicitud.semaforoTermino === 'amarillo' ? '#fffbeb' :
                        selectedSolicitud.semaforoTermino === 'respondido' ? '#f0fdf4' :
                        '#f0fdf4',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          backgroundColor:
                            selectedSolicitud.semaforoTermino === 'rojo' ? '#dc2626' :
                            selectedSolicitud.semaforoTermino === 'amarillo' ? '#f59e0b' :
                            selectedSolicitud.semaforoTermino === 'respondido' ? '#10b981' :
                            '#22c55e',
                          display: 'inline-block',
                          boxShadow:
                            selectedSolicitud.semaforoTermino === 'rojo' ? '0 0 8px #dc2626' :
                            selectedSolicitud.semaforoTermino === 'amarillo' ? '0 0 8px #f59e0b' :
                            '0 0 6px #22c55e',
                        }} />
                        <span style={{
                          fontWeight: '700',
                          fontSize: '0.95rem',
                          color:
                            selectedSolicitud.semaforoTermino === 'rojo' ? '#991b1b' :
                            selectedSolicitud.semaforoTermino === 'amarillo' ? '#92400e' :
                            '#065f46'
                        }}>
                          {selectedSolicitud.semaforoTermino === 'rojo' ? '🔴 CASO VENCIDO' :
                           selectedSolicitud.semaforoTermino === 'amarillo' ? '🟡 PRÓXIMO A VENCER' :
                           selectedSolicitud.semaforoTermino === 'respondido'
                             ? (selectedSolicitud.respondidoDentroDelTermino ? '✅ RESPONDIDO DENTRO DEL TÉRMINO' : '⚠️ RESPONDIDO FUERA DE TÉRMINO')
                             : '🟢 EN TÉRMINO'}
                        </span>
                      </div>
                    </div>

                    <div style={{ padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', backgroundColor: 'white' }}>
                      {/* Fecha de Radicación */}
                      <div>
                        <p style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fecha de Radicación</p>
                        <p style={{ fontSize: '0.85rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                          {selectedSolicitud.fechaCreacion ? new Date(selectedSolicitud.fechaCreacion).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                        </p>
                      </div>
                      {/* Fecha Límite de Respuesta */}
                      <div>
                        <p style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fecha Límite</p>
                        <p style={{
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          color:
                            selectedSolicitud.semaforoTermino === 'rojo' ? '#dc2626' :
                            selectedSolicitud.semaforoTermino === 'amarillo' ? '#d97706' :
                            '#111827',
                          margin: 0
                        }}>
                          {selectedSolicitud.fechaVencimiento
                            ? new Date(selectedSolicitud.fechaVencimiento).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'N/A'}
                        </p>
                      </div>
                      {/* Fecha de Respuesta */}
                      <div>
                        <p style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fecha de Respuesta</p>
                        <p style={{ fontSize: '0.85rem', fontWeight: '600', color: selectedSolicitud.respondedAt ? '#059669' : '#9ca3af', margin: 0 }}>
                          {selectedSolicitud.respondedAt
                            ? new Date(selectedSolicitud.respondedAt).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'Pendiente'}
                        </p>
                      </div>
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
                          {selectedSolicitud.asunto}
                        </p>
                      </div>

                      {selectedSolicitud.descripcion && (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                            Descripción
                          </label>
                          <p style={{ fontSize: '0.875rem', color: '#374151', lineHeight: '1.6' }}>
                            {selectedSolicitud.descripcion}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hilo de Conversación (si existe) */}
                  {selectedSolicitud.conversacion && selectedSolicitud.conversacion.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MessageSquare size={18} />
                        Historial de Conversación
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {selectedSolicitud.conversacion.map((msg: any) => {
                          const isFuncionario = msg.rol === 'FUNCIONARIO';
                          const isEntidad = msg.rol === 'ENTIDAD_EXTERNA';
                          const bgColor = isFuncionario ? '#eff6ff' : isEntidad ? '#fff7ed' : '#f0fdf4';
                          const borderColor = isFuncionario ? '#bfdbfe' : isEntidad ? '#fed7aa' : '#bbf7d0';
                          const labelColor = isFuncionario ? '#1e40af' : isEntidad ? '#92400e' : '#166534';
                          const label = isFuncionario ? '🏛️ Funcionario Asignado' : isEntidad ? '🏢 Entidad / Institución' : `👤 ${selectedSolicitud.ciudadano?.nombre || 'Ciudadano'}`;
                          return (
                            <div key={msg.id} style={{
                              display: 'flex',
                              justifyContent: isFuncionario ? 'flex-start' : 'flex-end',
                              width: '100%'
                            }}>
                              <div style={{
                                backgroundColor: bgColor,
                                border: `1px solid ${borderColor}`,
                                borderRadius: '12px',
                                borderTopLeftRadius: isFuncionario ? '4px' : '12px',
                                borderTopRightRadius: isFuncionario ? '12px' : '4px',
                                padding: '1rem',
                                maxWidth: '85%'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', gap: '1rem' }}>
                                  <span style={{ fontWeight: '600', fontSize: '0.875rem', color: labelColor }}>
                                    {label}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', color: labelColor }}>
                                    {new Date(msg.fecha).toLocaleString('es-CO')}
                                  </span>
                                </div>
                                <p style={{ fontSize: '0.875rem', color: '#374151', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                                  {msg.mensaje}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Información del Ciudadano */}
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <User size={18} />
                      Información del Ciudadano
                    </h4>

                    <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '1.25rem' }}>
                      <div className="detail-citizen-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                            Nombre Completo
                          </label>
                          <p style={{ fontSize: '0.875rem', color: '#111827' }}>
                            {selectedSolicitud.ciudadano?.nombre}
                          </p>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                            Documento
                          </label>
                          <p style={{ fontSize: '0.875rem', color: '#111827' }}>
                            {selectedSolicitud.ciudadano?.documento}
                          </p>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Mail size={14} />
                            Email
                          </label>
                          <p style={{ fontSize: '0.875rem', color: '#111827' }}>
                            {selectedSolicitud.ciudadano?.email}
                          </p>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Phone size={14} />
                            Teléfono
                          </label>
                          <p style={{ fontSize: '0.875rem', color: '#111827' }}>
                            {selectedSolicitud.ciudadano?.telefono}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Funcionario Asignado - Solo para VU y Revisor */}
                  {(userRole === 'VENTANILLA_UNICA' || userRole === 'DIRECTOR') && selectedSolicitud.funcionarioAsignado && (
                    <div style={{ marginTop: '1.5rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={18} />
                        Funcionario Asignado
                      </h4>

                      <div style={{ backgroundColor: '#eff6ff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #bfdbfe' }}>
                        <div className="detail-citizen-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                              Nombre
                            </label>
                            <p style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '600' }}>
                              {selectedSolicitud.funcionarioAsignado.nombre}
                            </p>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                              Fecha de Asignación
                            </label>
                            <p style={{ fontSize: '0.875rem', color: '#111827' }}>
                              {new Date(selectedSolicitud.funcionarioAsignado.fechaAsignacion).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notas Internas - Solo visibles para Revisor, Supervisor y Funcionario */}
                  {['DIRECTOR', 'SUPERVISOR', 'FUNCIONARIO'].includes(userRole || '') && (
                    <div style={{ marginTop: '1.5rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MessageSquare size={18} />
                        Notas Internas
                      </h4>
                      <div style={{ backgroundColor: '#fffbeb', borderRadius: '12px', padding: '1.25rem', border: '1px solid #fde68a' }}>
                        {loadingNotas ? (
                          <div style={{ textAlign: 'center', padding: '1rem', color: '#b45309' }}>Cargando notas...</div>
                        ) : notasInternas.length === 0 ? (
                          <p style={{ fontSize: '0.875rem', color: '#92400e', textAlign: 'center', margin: 0 }}>No hay notas internas registradas en este caso.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {notasInternas.map((nota) => (
                              <div key={nota.id} style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                  <span style={{ fontWeight: '600', fontSize: '0.875rem', color: '#92400e' }}>
                                    {nota.author.name}
                                    <span style={{ fontWeight: '400', fontSize: '0.75rem', marginLeft: '0.5rem', opacity: 0.8 }}>({nota.author.role})</span>
                                  </span>
                                  <span style={{ fontSize: '0.75rem', color: '#b45309' }}>
                                    {new Date(nota.timestamp).toLocaleString('es-CO')}
                                  </span>
                                </div>
                                <p style={{ fontSize: '0.875rem', color: '#374151', margin: 0, whiteSpace: 'pre-wrap' }}>
                                  {nota.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Documentos Adjuntos */}
                  {selectedSolicitud.documentos && selectedSolicitud.documentos.length > 0 && (
                    <div style={{ marginTop: '1.5rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={18} />
                        Documentos Adjuntos
                      </h4>

                      <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '1.25rem' }}>
                        {selectedSolicitud.documentos.map((doc, index) => (
                          <div key={doc.id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.75rem',
                            backgroundColor: doc.isInternal ? '#fef2f2' : 'white',
                            borderRadius: '8px',
                            marginBottom: index < selectedSolicitud.documentos!.length - 1 ? '0.5rem' : '0',
                            border: doc.isInternal ? '1px solid #fecaca' : '1px solid transparent',
                          }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '500', marginBottom: '0.25rem' }}>
                                {doc.fileName}
                              </p>
                              <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                {(doc.fileSize / 1024).toFixed(2)} KB
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <button
                                onClick={() => toggleDocumentInternal(doc.id, doc.isInternal ?? false)}
                                title={doc.isInternal ? 'La entidad NO puede ver este archivo. Clic para hacerlo visible.' : 'La entidad SÍ puede ver este archivo. Clic para marcarlo como interno.'}
                                style={{
                                  padding: '0.4rem 0.65rem',
                                  fontSize: '0.7rem',
                                  fontWeight: '600',
                                  backgroundColor: doc.isInternal ? '#dc2626' : '#16a34a',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {doc.isInternal ? '🔒 Interno' : '🌐 Visible'}
                              </button>
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
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <p style={{ color: '#6b7280' }}>No se pudo cargar la información</p>
                </div>
              )}

              {/* Footer del Modal */}
              <div className="detail-modal-footer" style={{
                padding: '1.5rem',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                {/* Fila superior: Botones Seguimiento e Invitación - Solo para VENTANILLA_UNICA o ADMIN */}
                {(userRole === 'VENTANILLA_UNICA' || userRole === 'ADMIN') && (
                  <div style={{
                    display: 'flex',
                    gap: '0.75rem'
                  }}>
                    <button
                      onClick={() => handleClasificarCaso('SEGUIMIENTO')}
                      style={{
                        flex: 1,
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <FileText size={18} />
                      Seguimiento
                    </button>
                    <button
                      onClick={() => handleClasificarCaso('INVITACION')}
                      style={{
                        flex: 1,
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        backgroundColor: '#8b5cf6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <Mail size={18} />
                      Invitación
                    </button>
                    {/* Botón Imprimir Radicado - Solo VU, Solo Desktop */}
                    {userRole === 'VENTANILLA_UNICA' && (
                      <button
                        className="desktop-only"
                        onClick={() => {
                          if (selectedSolicitud) {
                            router.push(`/home/imprimir-radicado?radicado=${selectedSolicitud.codigo}`);
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '0.75rem 1.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          backgroundColor: '#059669',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <FileText size={18} />
                        Imprimir Radicado
                      </button>
                    )}
                  </div>
                )}

                {/* Fila inferior: Botones de acción */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '0.75rem'
                }}>
                  {/* Botón Responder - Solo visible para roles que pueden responder (no VENTANILLA_UNICA), y NO visible para Revisor en pestañas de seguimiento/invitación */}
                  {userRole && userRole !== 'VENTANILLA_UNICA' && !(userRole === 'DIRECTOR' && (activeTab === 'seguimientoGeneral' || activeTab === 'invitaciones')) && (
                    <button
                      onClick={handleAbrirResponder}
                      style={{
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        backgroundColor: '#047857',
                        color: 'white',
                        border: '1px solid #065f46',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <Mail size={16} />
                      {selectedSolicitud?.ciudadanoRespondio ? 'Continuar Conversación' : 'Responder'}
                    </button>
                  )}

                  {/* Botón Marcar como Leído - Solo para Revisor en Seguimiento/Invitación */}
                  {userRole === 'DIRECTOR' && (activeTab === 'seguimientoGeneral' || activeTab === 'invitaciones') && (
                    <button
                      onClick={handleMarcarLeido}
                      style={{
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        backgroundColor: '#047857',
                        color: 'white',
                        border: '1px solid #065f46',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <CheckCircle size={16} />
                      Marcar como leído
                    </button>
                  )}
                  {/* Botón Hacer Nota - Exclusivo para el Revisor */}
                  {userRole === 'DIRECTOR' && (
                    <button
                      onClick={() => setIsNotaModalOpen(true)}
                      style={{
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        backgroundColor: '#ca8a04',
                        color: 'white',
                        border: '1px solid #a16207',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <MessageSquare size={16} />
                      Hacer Nota
                    </button>
                  )}

                  <button
                    onClick={() => setIsModalOpen(false)}
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
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal de Reasignación */}
      {
        isReasignarModalOpen && (
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
              zIndex: 3500
            }}
            onClick={handleCerrarReasignar}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '90vh',
                overflow: 'hidden',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del Modal */}
              <div style={{
                padding: '1.5rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    backgroundColor: '#fef3c7',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ArrowLeftRight size={24} color="#f59e0b" />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                    Solicitar Reasignación
                  </h2>
                </div>
                <button
                  onClick={handleCerrarReasignar}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6b7280',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={24} />
                </button>
              </div>

              {/* Contenido del Modal */}
              <div style={{ padding: '1.5rem' }}>
                <div style={{
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <p style={{ fontSize: '0.875rem', color: '#1e40af', margin: 0 }}>
                    Esta solicitud será enviada al Revisor para su revisión y aprobación.
                  </p>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Motivo de la reasignación <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <textarea
                    value={motivoReasignacion}
                    onChange={(e) => setMotivoReasignacion(e.target.value)}
                    placeholder="Explica por qué este caso debe ser reasignado..."
                    required
                    style={{
                      width: '100%',
                      minHeight: '150px',
                      padding: '0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginTop: '0.5rem',
                    marginBottom: 0
                  }}>
                    Describe claramente las razones por las que solicitas la reasignación de este caso.
                  </p>
                </div>
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
                  onClick={handleCerrarReasignar}
                  disabled={loadingReasignar}
                  style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loadingReasignar ? 'not-allowed' : 'pointer',
                    opacity: loadingReasignar ? 0.6 : 1
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitReasignar}
                  disabled={loadingReasignar || !motivoReasignacion.trim()}
                  style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    backgroundColor: loadingReasignar || !motivoReasignacion.trim() ? '#d1d5db' : '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loadingReasignar || !motivoReasignacion.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {loadingReasignar ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #ffffff',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.6s linear infinite'
                      }} />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight size={16} />
                      Solicitar Reasignación
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal de Responder */}
      {
        isResponderModalOpen && (
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
              zIndex: 3500,
              overflow: 'auto',
              padding: '1rem'
            }}
            onClick={handleCerrarResponder}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                maxWidth: '700px',
                width: '100%',
                maxHeight: '95vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                margin: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del Modal */}
              <div style={{
                padding: '1.5rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    backgroundColor: '#d1fae5',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Mail size={24} color="#10b981" />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                    {selectedSolicitud?.ciudadanoRespondio ? 'Continuar Conversación' : 'Responder Solicitud'}
                  </h2>
                </div>
                <button
                  onClick={handleCerrarResponder}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6b7280',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={24} />
                </button>
              </div>

              {/* Contenido del Modal */}
              <div style={{
                padding: '1.5rem',
                overflowY: 'auto',
                flexGrow: 1,
                flexShrink: 1
              }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Correo del ciudadano
                  </label>
                  <input
                    type="email"
                    value={selectedSolicitud?.ciudadano.email || ''}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      backgroundColor: '#f9fafb',
                      color: '#6b7280',
                      cursor: 'not-allowed',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Asunto
                  </label>
                  <input
                    type="text"
                    value={`Petición ciudadana radicada ante la Entidad Institucional con el número ${selectedSolicitud?.codigo || ''}`}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      backgroundColor: '#f9fafb',
                      color: '#6b7280',
                      cursor: 'not-allowed',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Tipo de Respuesta <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    value={tipoRespuesta}
                    onChange={(e) => {
                      setTipoRespuesta(e.target.value as 'SOLICITAR_INFO' | 'ESCALAR' | 'RECHAZAR' | 'CIERRE' | 'NO_REQUIERE' | '');
                      setSelectedEmails([]);
                      setEmailSearch('');
                      setShowEmailDropdown(false);
                      setSoloEntidad(false);
                      setRequiereDias(false);
                      setDiasRespuesta('');
                      setEscalationReason('');
                      setCiudadanoPuedeResponder(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '0.875rem',
                      border: tipoRespuesta ? '1px solid #d1d5db' : '2px solid #f59e0b',
                      borderRadius: '8px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      backgroundColor: tipoRespuesta ? 'white' : '#fffbeb'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={(e) => e.target.style.borderColor = tipoRespuesta ? '#d1d5db' : '#f59e0b'}
                  >
                    <option value="">⚠️ Seleccionar tipo de respuesta...</option>
                    <option value="SOLICITAR_INFO">
                      {selectedSolicitud?.ciudadanoRespondio ? 'Responder a Ciudadano (continúa el hilo)' : 'Responder a Ciudadano'}
                    </option>
                    <option value="ESCALAR">Comunicar con Dependencia / Entidad Externa</option>
                    <option value="RECHAZAR">Remitir por Competencia</option>
                    <option value="CIERRE">Cerrar el caso</option>
                    <option value="NO_REQUIERE">No requiere respuesta</option>
                  </select>
                  {!tipoRespuesta && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.75rem',
                      backgroundColor: '#fef3c7',
                      border: '1px solid #fbbf24',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      color: '#92400e',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{ fontSize: '1rem' }}>⚠️</span>
                      <strong>Debe seleccionar un tipo de respuesta para poder enviar</strong>
                    </div>
                  )}
                </div>

                {/* Checkbox: permitir respuesta del ciudadano — solo para Responder a Ciudadano */}
                {tipoRespuesta === 'SOLICITAR_INFO' && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      padding: '0.875rem 1rem',
                      backgroundColor: ciudadanoPuedeResponder ? '#f0fdf4' : '#fff7ed',
                      border: `1px solid ${ciudadanoPuedeResponder ? '#bbf7d0' : '#fed7aa'}`,
                      borderRadius: '8px',
                      transition: 'all 0.2s',
                    }}>
                      <input
                        type="checkbox"
                        checked={ciudadanoPuedeResponder}
                        onChange={(e) => setCiudadanoPuedeResponder(e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: '#16a34a', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <div>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: ciudadanoPuedeResponder ? '#15803d' : '#9a3412' }}>
                          {ciudadanoPuedeResponder ? '✅ El ciudadano puede responder este mensaje' : '🔒 El ciudadano NO podrá responder este mensaje'}
                        </span>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                          {ciudadanoPuedeResponder
                            ? 'El ciudadano verá un campo de texto para contestar.'
                            : 'El ciudadano solo verá el mensaje, sin opción de responder.'}
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {/* Causal legal de reserva - Solo para ESCALAR + soloEntidad */}
                {tipoRespuesta === 'ESCALAR' && soloEntidad && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Causal legal de reserva <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      value={escalationReason}
                      onChange={(e) => setEscalationReason(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '0.875rem',
                        border: escalationReason ? '1px solid #d1d5db' : '2px solid #f59e0b',
                        borderRadius: '8px',
                        fontFamily: 'inherit',
                        outline: 'none',
                        backgroundColor: escalationReason ? 'white' : '#fffbeb'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                      onBlur={(e) => e.target.style.borderColor = escalationReason ? '#d1d5db' : '#f59e0b'}
                    >
                      <option value="">⚠️ Seleccionar causal...</option>
                      <option value="PROCESO_DISCIPLINARIO">Proceso disciplinario — reserva de la etapa de instrucción (Art. 115 Ley 1952/2019)</option>
                      <option value="ANALISIS_PRUEBAS">Análisis de pruebas — recaudo y valoración de material probatorio</option>
                      <option value="COMPETENCIA_EXTERNA">Competencia externa — traslado a autoridad competente para su definición</option>
                    </select>
                    {escalationReason && (
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        color: '#1e40af'
                      }}>
                        {escalationReason === 'PROCESO_DISCIPLINARIO' && '📋 La naturaleza reservada de la etapa de instrucción en materia disciplinaria (Art. 115 Ley 1952 de 2019).'}
                        {escalationReason === 'ANALISIS_PRUEBAS' && '🔍 La necesidad de recaudar y valorar material probatorio indispensable para la decisión de fondo.'}
                        {escalationReason === 'COMPETENCIA_EXTERNA' && '🏛️ El traslado por competencia a una autoridad externa para su definición.'}
                      </div>
                    )}
                  </div>
                )}

                {/* Buscador de correos - Solo para ESCALAR */}
                {tipoRespuesta === 'ESCALAR' && (
                  <div ref={emailSearchRef} style={{ position: 'relative' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      <Mail size={14} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                      Correo de la Dependencia / Entidad <span style={{ color: '#dc2626' }}>*</span>
                    </label>

                    {selectedEmails.length > 0 && (
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        marginBottom: '0.5rem'
                      }}>
                        {selectedEmails.map((email, idx) => (
                          <span key={email + idx} style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.25rem 0.75rem',
                            backgroundColor: editingEmailIndex === idx ? '#fef3c7' : '#eff6ff',
                            color: editingEmailIndex === idx ? '#92400e' : '#1e40af',
                            borderRadius: '9999px',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            border: editingEmailIndex === idx ? '2px solid #f59e0b' : '1px solid #bfdbfe'
                          }}>
                            <Mail size={12} />
                            {editingEmailIndex === idx ? (
                              <input
                                type="text"
                                value={editingEmailValue}
                                onChange={(e) => setEditingEmailValue(e.target.value)}
                                autoFocus
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  outline: 'none',
                                  fontSize: '0.8rem',
                                  width: '220px',
                                  color: '#92400e',
                                  fontWeight: '500'
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const newVal = editingEmailValue.trim().toLowerCase();
                                    if (newVal && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newVal)) {
                                      setSelectedEmails(prev => prev.map((em, i) => i === idx ? newVal : em));
                                      setEditingEmailIndex(null);
                                      setEditingEmailValue('');
                                    }
                                  }
                                  if (e.key === 'Escape') {
                                    setEditingEmailIndex(null);
                                    setEditingEmailValue('');
                                  }
                                }}
                              />
                            ) : (
                              <span>{email}</span>
                            )}
                            {editingEmailIndex === idx ? (
                              <button
                                onClick={() => {
                                  const newVal = editingEmailValue.trim().toLowerCase();
                                  if (newVal && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newVal)) {
                                    setSelectedEmails(prev => prev.map((em, i) => i === idx ? newVal : em));
                                    setEditingEmailIndex(null);
                                    setEditingEmailValue('');
                                  } else {
                                    alert('Formato de correo inválido');
                                  }
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#16a34a',
                                  cursor: 'pointer',
                                  padding: '0 0.125rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Guardar cambio"
                              >
                                ✓
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingEmailIndex(idx);
                                  setEditingEmailValue(email);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#f59e0b',
                                  cursor: 'pointer',
                                  padding: '0 0.125rem',
                                  fontSize: '0.75rem',
                                  lineHeight: 1,
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Editar correo"
                              >
                                ✏️
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedEmails(prev => prev.filter((_, i) => i !== idx));
                                if (editingEmailIndex === idx) {
                                  setEditingEmailIndex(null);
                                  setEditingEmailValue('');
                                }
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-primary)',
                                cursor: 'pointer',
                                padding: '0 0.125rem',
                                fontSize: '1rem',
                                lineHeight: 1,
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="Quitar correo"
                            >
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Campo de búsqueda */}
                    <input
                      type="text"
                      value={emailSearch}
                      onChange={(e) => {
                        setEmailSearch(e.target.value);
                        setShowEmailDropdown(true);
                      }}
                      onFocus={() => setShowEmailDropdown(true)}
                      placeholder="Buscar correo electrónico..."
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '0.875rem',
                        border: selectedEmails.length > 0 ? '1px solid #d1d5db' : '2px solid #f59e0b',
                        borderRadius: '8px',
                        fontFamily: 'inherit',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        backgroundColor: selectedEmails.length > 0 ? 'white' : '#fffbeb'
                      }}
                    />

                    {/* Dropdown de resultados */}
                    {showEmailDropdown && emailSearch.trim() !== '' && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        backgroundColor: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 50,
                        marginTop: '0.25rem'
                      }}>
                        {filteredEmails.length > 0 ? (
                          filteredEmails.slice(0, 10).map(email => (
                            <div
                              key={email}
                              onClick={() => {
                                setSelectedEmails(prev => [...prev, email]);
                                setEmailSearch('');
                                setShowEmailDropdown(false);
                              }}
                              style={{
                                padding: '0.75rem 1rem',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                borderBottom: '1px solid #f3f4f6',
                                transition: 'background-color 0.15s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                            >
                              <Mail size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
                              <span style={{ color: '#111827' }}>{email}</span>
                            </div>
                          ))
                        ) : emailSearch.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailSearch.trim()) ? (
                          <>
                            <div
                              onClick={() => {
                                setSelectedEmails(prev => [...prev, emailSearch.trim().toLowerCase()]);
                                setEmailSearch('');
                                setShowEmailDropdown(false);
                              }}
                              style={{
                                padding: '0.75rem 1rem',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                borderBottom: '1px solid #f3f4f6',
                                transition: 'background-color 0.15s',
                                backgroundColor: 'white'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                            >
                              <Mail size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
                              <span style={{ color: '#374151' }}>Usar solo esta vez:</span>
                              <span style={{ color: '#111827', fontWeight: '500' }}>{emailSearch.trim()}</span>
                            </div>
                            <div
                              onClick={async () => {
                                const newEmail = emailSearch.trim().toLowerCase();
                                setSelectedEmails(prev => [...prev, newEmail]);
                                setEmailSearch('');
                                setShowEmailDropdown(false);
                                try {
                                  const res = await fetch('/api/v1/email-directory', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ email: newEmail })
                                  });
                                  if (res.ok) {
                                    setDirectorioCorreos(prev => [...prev, newEmail].sort());
                                  }
                                } catch (err) {
                                  console.error('Error guardando nuevo correo:', err);
                                }
                              }}
                              style={{
                                padding: '0.75rem 1rem',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                borderBottom: '1px solid #f3f4f6',
                                transition: 'background-color 0.15s',
                                backgroundColor: '#f0fdf4'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dcfce7'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f0fdf4'}
                            >
                              <span style={{ color: '#16a34a', fontWeight: '600' }}>+ Guardar y usar:</span>
                              <span style={{ color: '#111827' }}>{emailSearch.trim()}</span>
                            </div>
                          </>
                        ) : (
                          <div style={{
                            padding: '0.75rem 1rem',
                            fontSize: '0.85rem',
                            color: '#9ca3af',
                            textAlign: 'center'
                          }}>
                            {emailSearch.trim() ? 'Formato de correo inválido' : 'No se encontraron correos'}
                          </div>
                        )}
                      </div>
                    )}

                    {selectedEmails.length === 0 && (
                      <p style={{
                        fontSize: '0.75rem',
                        color: '#92400e',
                        marginTop: '0.5rem',
                        marginBottom: 0
                      }}>
                        ⚠️ Debe seleccionar al menos un correo de destino
                      </p>
                    )}
                  </div>
                )}

                {/* Checkbox - Solo enviar a la dependencia/entidad */}
                {tipoRespuesta === 'ESCALAR' && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    backgroundColor: soloEntidad ? '#eff6ff' : '#f9fafb',
                    border: `1px solid ${soloEntidad ? '#bfdbfe' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                    onClick={() => { setSoloEntidad(!soloEntidad); if (soloEntidad) setEscalationReason(''); }}
                  >
                    <input
                      type="checkbox"
                      checked={soloEntidad}
                      onChange={(e) => { setSoloEntidad(e.target.checked); if (!e.target.checked) setEscalationReason(''); }}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer',
                        accentColor: 'var(--color-primary)'
                      }}
                    />
                    <div>
                      <span style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: soloEntidad ? '#1e40af' : '#374151'
                      }}>
                        Enviar solo a la dependencia / entidad
                      </span>
                      <p style={{
                        fontSize: '0.75rem',
                        color: soloEntidad ? 'var(--color-primary)' : '#6b7280',
                        margin: 0
                      }}>
                        {soloEntidad
                          ? '✓ El ciudadano NO será notificado. Solo se enviará a la dependencia / entidad seleccionada.'
                          : 'El ciudadano podrá ver esta comunicación en el portal de seguimiento, sin poder responder.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Checkbox y días de respuesta */}
                {(tipoRespuesta === 'SOLICITAR_INFO' || tipoRespuesta === 'ESCALAR') && (
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: requiereDias ? '#f0fdf4' : '#f9fafb',
                    border: `1px solid ${requiereDias ? '#86efac' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    transition: 'all 0.2s'
                  }}>
                    <div 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setRequiereDias(!requiereDias);
                        if (requiereDias) setDiasRespuesta('');
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={requiereDias}
                        onChange={(e) => {
                          setRequiereDias(e.target.checked);
                          if (!e.target.checked) setDiasRespuesta('');
                        }}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: '#16a34a'
                        }}
                      />
                      <div>
                        <span style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: requiereDias ? '#166534' : '#374151'
                        }}>
                          Requiere días para respuesta
                        </span>
                        <p style={{
                          fontSize: '0.75rem',
                          color: requiereDias ? '#15803d' : '#6b7280',
                          margin: 0
                        }}>
                          Activa esta opción si esperas una respuesta en un plazo determinado (días calendario).
                        </p>
                      </div>
                    </div>

                    {requiereDias && (
                      <div style={{ marginTop: '0.75rem', marginLeft: '1.75rem' }}>
                        <label style={{
                          display: 'block',
                          fontSize: '0.8rem',
                          fontWeight: '500',
                          color: '#166534',
                          marginBottom: '0.25rem'
                        }}>
                          Cantidad de días (calendario) <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={diasRespuesta}
                          onChange={(e) => setDiasRespuesta(e.target.value)}
                          placeholder="Ej: 15"
                          style={{
                            width: '120px',
                            padding: '0.5rem',
                            fontSize: '0.875rem',
                            border: diasRespuesta ? '1px solid #86efac' : '2px solid #f59e0b',
                            borderRadius: '6px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {(tipoRespuesta === 'SOLICITAR_INFO' || tipoRespuesta === 'ESCALAR') && (
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                      <Paperclip size={14} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                      Cargar Archivo (Opcional){tipoRespuesta === 'ESCALAR' && soloEntidad ? ' — se guardará como documento interno' : ''}
                    </label>
                    <input
                      type="file"
                      id="respuesta-file-upload"
                      multiple
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const newFiles = Array.from(e.target.files);
                          setRespuestaFiles(prev => [...prev, ...newFiles]);
                          e.target.value = '';
                        }
                      }}
                    />
                    {respuestaFiles.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.5rem' }}>
                        {respuestaFiles.map((file, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#e0e7ff', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#3730a3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85%' }}>
                              {file.name}
                            </span>
                            <button onClick={() => setRespuestaFiles(prev => prev.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', flexShrink: 0 }}>
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label htmlFor="respuesta-file-upload" style={{ display: 'block', textAlign: 'center', padding: '0.75rem', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', color: '#4b5563', transition: 'border-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'} onMouseOut={(e) => e.currentTarget.style.borderColor = '#d1d5db'}>
                      {respuestaFiles.length > 0 ? 'Agregar más archivos' : 'Haz clic aquí para seleccionar archivos'}
                    </label>
                  </div>
                )}

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    {tipoRespuesta === 'CIERRE' ? 'Motivo' : 'Respuesta'} <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <textarea
                    value={respuesta}
                    onChange={(e) => setRespuesta(e.target.value)}
                    disabled={tipoRespuesta === 'NO_REQUIERE'}
                    placeholder={
                      tipoRespuesta === 'NO_REQUIERE'
                        ? "El caso se finalizará sin enviar respuesta."
                        : tipoRespuesta === 'CIERRE'
                          ? "Escribe el motivo del cierre del caso... (OBLIGATORIO)"
                          : "Escribe tu respuesta aquí... (OBLIGATORIO)"
                    }
                    style={{
                      width: '100%',
                      minHeight: '200px',
                      padding: '0.75rem',
                      fontSize: '0.875rem',
                      border: (tipoRespuesta === 'NO_REQUIERE' || respuesta.trim()) ? '1px solid #d1d5db' : '2px solid #f59e0b',
                      borderRadius: '8px',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      backgroundColor: tipoRespuesta === 'NO_REQUIERE' ? '#f3f4f6' : (respuesta.trim() ? 'white' : '#fffbeb'),
                      color: tipoRespuesta === 'NO_REQUIERE' ? '#9ca3af' : 'inherit'
                    }}
                    onFocus={(e) => {
                      if (tipoRespuesta !== 'NO_REQUIERE') e.target.style.borderColor = 'var(--color-primary)';
                    }}
                    onBlur={(e) => {
                      if (tipoRespuesta !== 'NO_REQUIERE') {
                        e.target.style.borderColor = respuesta.trim() ? '#d1d5db' : '#f59e0b';
                      }
                    }}
                  />
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginTop: '0.5rem',
                    marginBottom: 0
                  }}>
                    {tipoRespuesta === 'NO_REQUIERE'
                      ? 'No se contactará al ciudadano y el caso pasará a la pestaña "Leídos".'
                      : tipoRespuesta === 'CIERRE'
                        ? 'El motivo del cierre será enviado para aprobación.'
                        : 'Esta respuesta será enviada al correo electrónico del ciudadano.'}
                  </p>
                  {tipoRespuesta === 'CIERRE' && !respuesta.trim() && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fca5a5',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      color: '#991b1b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{ fontSize: '1rem' }}>🚫</span>
                      <strong>Debe escribir el motivo del cierre para enviar a aprobación</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer del Modal */}
              <div style={{
                padding: '1.5rem',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                flexShrink: 0,
                backgroundColor: 'white'
              }}>
                {/* Mensaje de validación */}
                {(!tipoRespuesta || (tipoRespuesta !== 'NO_REQUIERE' && !respuesta.trim())) && (
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    color: '#92400e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontSize: '1rem' }}>⚠️</span>
                    <span>
                      {!tipoRespuesta && 'Debe seleccionar un tipo de respuesta para continuar'}
                      {tipoRespuesta && (tipoRespuesta as string) !== 'NO_REQUIERE' && !respuesta.trim() && (
                        tipoRespuesta === 'CIERRE'
                          ? 'Debe escribir el motivo del cierre para enviar a aprobación'
                          : 'Debe escribir una respuesta para el ciudadano'
                      )}
                    </span>
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem'
                }}>
                  <button
                    onClick={handleCerrarResponder}
                    disabled={loadingResponder}
                    style={{
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: loadingResponder ? 'not-allowed' : 'pointer',
                      opacity: loadingResponder ? 0.6 : 1
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmitRespuesta}
                    disabled={loadingResponder || !tipoRespuesta || (tipoRespuesta !== 'NO_REQUIERE' && !respuesta.trim())}
                    style={{
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      backgroundColor: (loadingResponder || !tipoRespuesta || (tipoRespuesta !== 'NO_REQUIERE' && !respuesta.trim())) ? '#d1d5db' : (tipoRespuesta === 'NO_REQUIERE' ? '#ca8a04' : '#10b981'),
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: (loadingResponder || !tipoRespuesta || (tipoRespuesta !== 'NO_REQUIERE' && !respuesta.trim())) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    title={
                      !tipoRespuesta
                        ? 'Seleccione un tipo de respuesta'
                        : tipoRespuesta === 'NO_REQUIERE'
                          ? 'Finalizar caso sin enviar respuesta al ciudadano'
                          : tipoRespuesta === 'CIERRE'
                            ? !respuesta.trim()
                              ? 'Escriba el motivo del cierre para enviar a aprobación'
                              : 'Enviar cierre a aprobación'
                            : !respuesta.trim()
                              ? 'Complete todos los campos obligatorios para enviar'
                              : 'Enviar respuesta al ciudadano'
                    }
                  >
                    {loadingResponder ? (
                      <>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid #ffffff',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          animation: 'spin 0.6s linear infinite'
                        }} />
                        Procesando...
                      </>
                    ) : (
                      <>
                        {tipoRespuesta === 'NO_REQUIERE' ? <CheckCircle size={16} /> : <Mail size={16} />}
                        {tipoRespuesta === 'NO_REQUIERE' ? 'Finalizar' : tipoRespuesta === 'CIERRE' ? 'Enviar a Aprobación' : 'Enviar Respuesta'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal Hacer Nota */}
      {
        isNotaModalOpen && (
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
              zIndex: 3500
            }}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '2rem',
                width: '100%',
                maxWidth: '500px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                  Hacer Nota Interna
                </h3>
                <button
                  onClick={() => { setIsNotaModalOpen(false); setNotaText(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    padding: '0.5rem'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
                Esta nota será visible para usted y el funcionario a cargo del caso. Los ciudadanos NO tienen acceso a estas notas.
              </p>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Contenido de la nota *
                </label>
                <textarea
                  value={notaText}
                  onChange={(e) => setNotaText(e.target.value)}
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.875rem',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  placeholder="Escriba sus observaciones o instrucciones aquí..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button
                  onClick={() => { setIsNotaModalOpen(false); setNotaText(''); }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    backgroundColor: 'white',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarNota}
                  disabled={loadingNotaSubmit || !notaText.trim()}
                  style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    backgroundColor: loadingNotaSubmit ? '#9ca3af' : '#ca8a04',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loadingNotaSubmit ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {loadingNotaSubmit ? 'Guardando...' : 'Guardar Nota'}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Chat Modal para Continuar Caso */}
      {isChatModalOpen && selectedSolicitud && (
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
          zIndex: 3500, /* Alto Z-index para asegurar que se superponga */
          padding: '1rem'
        }}>
          <div
            style={{
              backgroundColor: '#f9fafb',
              borderRadius: '12px',
              maxWidth: '800px',
              width: '100%',
              height: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Chat Modal */}
            <div style={{
              padding: '1.5rem',
              backgroundColor: 'white',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  backgroundColor: '#d1fae5',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MessageSquare size={24} color="#059669" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                    Continuar Caso: {selectedSolicitud.codigo}
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                    {selectedSolicitud.ciudadano?.nombre}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsChatModalOpen(false);
                  setSelectedSolicitud(null);
                  setSelectedEmails([]);
                  setEmailSearch('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={24} />
              </button>
            </div>

            {/* Chat History Area */}
            <div style={{
              flexGrow: 1,
              padding: '1.5rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {/* Info del caso */}
              <div style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '0.5rem',
                fontSize: '0.8rem',
                color: '#1e40af',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <FileText size={14} />
                <strong>Asunto:</strong> {selectedSolicitud.asunto}
              </div>

              {/* Mensajes del Hilo */}
              {selectedSolicitud.conversacion && selectedSolicitud.conversacion.length > 0 ? (
                selectedSolicitud.conversacion.map((msg: any) => {
                  const isFuncionario = msg.rol === 'FUNCIONARIO';
                  const isEntidad = msg.rol === 'ENTIDAD_EXTERNA';
                  const isCiudadano = msg.rol === 'CIUDADANO';

                  const align = isFuncionario ? 'flex-end' : 'flex-start';
                  const bubbleBg = isFuncionario ? 'var(--color-primary)' : isEntidad ? '#fff7ed' : '#f0fdf4';
                  const bubbleColor = isFuncionario ? 'white' : '#1f2937';
                  const bubbleBorder = isFuncionario ? 'none' : isEntidad ? '1px solid #fed7aa' : '1px solid #bbf7d0';
                  const radiusBR = isFuncionario ? '4px' : '16px';
                  const radiusBL = isFuncionario ? '16px' : '4px';
                  const labelColor = isFuncionario ? '#3b5fc0' : isEntidad ? '#92400e' : '#166534';
                  const senderLabel = isFuncionario ? 'Tú (Funcionario)' : isEntidad ? '🏢 Entidad / Institución' : `👤 ${selectedSolicitud.ciudadano?.nombre || 'Ciudadano'}`;

                  return (
                    <div key={msg.id} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: align,
                      width: '100%'
                    }}>
                      <div style={{
                        maxWidth: '85%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: align
                      }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: labelColor,
                          marginBottom: '0.25rem',
                          padding: '0 0.25rem'
                        }}>
                          {senderLabel} • {new Date(msg.fecha).toLocaleString('es-CO')}
                        </span>
                        <div style={{
                          backgroundColor: bubbleBg,
                          color: bubbleColor,
                          border: bubbleBorder,
                          borderRadius: '16px',
                          borderBottomRightRadius: radiusBR,
                          borderBottomLeftRadius: radiusBL,
                          padding: '1rem',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}>
                          <p style={{ fontSize: '0.875rem', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                            {msg.mensaje}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                  Aún no hay mensajes en esta conversación. Escribe abajo para pedir más información.
                </div>
              )}

              {/* Documentos adjuntos por el ciudadano */}
              {selectedSolicitud.documentos && selectedSolicitud.documentos.length > 0 && (
                <div style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginTop: '0.5rem'
                }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#15803d', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Paperclip size={14} />
                    Documentos adjuntos por el ciudadano
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedSolicitud.documentos.map((doc: any) => (
                      <div key={doc.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: doc.isInternal ? '#fef2f2' : 'white',
                        borderRadius: '8px',
                        padding: '0.6rem 0.75rem',
                        border: doc.isInternal ? '1px solid #fecaca' : '1px solid #dcfce7',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.8rem', color: '#111827', fontWeight: '500', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.fileName}</p>
                          <p style={{ fontSize: '0.7rem', color: '#6b7280', margin: 0 }}>{(doc.fileSize / 1024).toFixed(1)} KB</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0, marginLeft: '0.5rem' }}>
                          <button
                            onClick={() => toggleDocumentInternal(doc.id, doc.isInternal ?? false)}
                            title={doc.isInternal ? 'La entidad NO puede ver este archivo. Clic para hacerlo visible.' : 'La entidad SÍ puede ver este archivo. Clic para marcarlo como interno.'}
                            style={{
                              padding: '0.3rem 0.5rem',
                              fontSize: '0.65rem',
                              fontWeight: '600',
                              backgroundColor: doc.isInternal ? '#dc2626' : '#16a34a',
                              color: 'white',
                              border: 'none',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {doc.isInternal ? '🔒 Interno' : '🌐 Visible'}
                          </button>
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '0.4rem 0.75rem',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              backgroundColor: '#16a34a',
                              color: 'white',
                              borderRadius: '6px',
                              textDecoration: 'none',
                            }}
                          >
                            Ver
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Aviso de cierre rechazado — solo visible para el funcionario */}
              {userRole === 'FUNCIONARIO' && (selectedSolicitud.metadata as any)?.cierreRechazado && (selectedSolicitud.metadata as any)?.motivoRechazo && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginTop: '0.5rem'
                }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#991b1b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0 0 0.5rem 0' }}>
                    <XCircle size={14} />
                    El Director rechazó la solicitud de cierre
                  </p>
                  <p style={{ fontSize: '0.85rem', color: '#374151', margin: 0, whiteSpace: 'pre-wrap', backgroundColor: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
                    {(selectedSolicitud.metadata as any).motivoRechazo}
                  </p>
                </div>
              )}

              {/* Notas internas del director — solo visibles para el funcionario */}
              {userRole === 'FUNCIONARIO' && notasInternas.length > 0 && (
                <div style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginTop: '0.5rem'
                }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#92400e', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0 0 0.75rem 0' }}>
                    <MessageSquare size={14} />
                    Notas del Director
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {notasInternas.map((nota: any) => (
                      <div key={nota.id} style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <span style={{ fontWeight: '600', fontSize: '0.75rem', color: '#92400e' }}>{nota.author.name}</span>
                          <span style={{ fontSize: '0.7rem', color: '#b45309' }}>{new Date(nota.timestamp).toLocaleString('es-CO')}</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#374151', margin: 0, whiteSpace: 'pre-wrap' }}>{nota.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div style={{
              padding: '1.5rem',
              backgroundColor: 'white',
              borderTop: '1px solid #e5e7eb',
              flexShrink: 0
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                paddingTop: '0.5rem'
              }}>
                <button
                  onClick={() => {
                    setIsChatModalOpen(false);
                    setTipoRespuesta('CIERRE');
                    setRespuesta('');
                    setIsResponderModalOpen(true);
                  }}
                  style={{
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                >
                  <CheckCircle size={16} /> Cerrar Caso
                </button>

                <button
                  onClick={() => {
                    setIsChatModalOpen(false);
                    setTipoRespuesta('');
                    setRespuesta('');
                    setIsResponderModalOpen(true);
                  }}
                  style={{
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                >
                  <MessageSquare size={16} /> Responder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div >
  );
}