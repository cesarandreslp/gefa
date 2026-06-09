'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Clock,
  FileText,
  Users,
  Settings,
  Plus,
  AlertTriangle,
  Inbox,
  Printer,
  Search,
  CheckCircle,
  Building,
  Globe,
  Eye
} from 'lucide-react';

interface UserRoleData {
  code: string;
  name: string;
  level: number;
  canApprove: boolean;
  canReassign: boolean;
  canSign: boolean;
}

interface DashboardStats {
  casosNuevos: number;
  casosActivos: number;
  casosVencidos: number;
  casosProximosVencer: number;
  seguimiento?: number;
  invitaciones?: number;
  cierreCasos?: number;
}

interface CasoPrioritario {
  id: string;
  codigo: string;
  tipo: string;
  estado: string;
  prioridad: string;
  diasRestantes: number;
  semaforoTermino?: 'verde' | 'amarillo' | 'rojo' | 'respondido';
}

interface Alerta {
  id: string;
  tipo: 'warning' | 'info';
  mensaje: string;
}

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRoleData | null>(null);
  const [displayRoleName, setDisplayRoleName] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    casosNuevos: 0,
    casosActivos: 0,
    casosVencidos: 0,
    casosProximosVencer: 0
  });
  const [casosPrioritarios, setCasosPrioritarios] = useState<CasoPrioritario[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [solicitudesNuevas, setSolicitudesNuevas] = useState(0);
  const [peticionesPendientes, setPeticionesPendientes] = useState(0);

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');

    if (!isAuthenticated || isAuthenticated !== 'true') {
      router.push('/');
      return;
    }

    // Cargar datos reales del dashboard
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Normaliza el código de rol quitando el sufijo del tenant (ej: ADMIN_PMGUC -> ADMIN)
  const getBaseRoleCode = (code: string): string => {
    const legacyMap: Record<string, string> = {
      DIRECTOR_ENCARGADO: 'DIRECTOR',
      PERSONERO_MUNICIPAL: 'DIRECTOR',
      REVISOR: 'DIRECTOR',
    };
    if (legacyMap[code]) return legacyMap[code];
    const baseCodes = [
      'AUXILIAR_ATENCION_USUARIO', 'AUXILIAR', 'ASIGNACION_DE_CASOS',
      'DIRECTOR', 'VENTANILLA_UNICA', 'FUNCIONARIO', 'ADMIN',
    ];
    for (const base of baseCodes) {
      if (code === base || code.startsWith(base + '_')) return base;
    }
    return code;
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Obtener rol del usuario
      const roleResponse = await fetch('/api/v1/auth/me');
      if (roleResponse.ok) {
        const userData = await roleResponse.json();
        if (userData.success && userData.data?.user?.role) {
          const role = userData.data.user.role;
          const baseCode = getBaseRoleCode(role.code);
          console.log('🔍 Rol cargado:', role.code, '-> base:', baseCode, 'Nivel:', role.level);

          // Redirigir al Auxiliar de Atención al Usuario a su página dedicada
          if (baseCode === 'AUXILIAR_ATENCION_USUARIO') {
            router.push('/home/atencion-usuario');
            return;
          }

          // Redirigir al Funcionario directo a su bandeja de entrada
          if (baseCode === 'FUNCIONARIO') {
            router.push('/home/bandeja-entrada');
            return;
          }

          // Auxiliar de funcionario: usar el rol del supervisor para el dashboard
          const user = userData.data.user;
          const isAuxiliar = baseCode === 'AUXILIAR';
          const effectiveRole = (isAuxiliar && user.supervisorRole)
            ? user.supervisorRole
            : role;

          // El badge siempre muestra el rol real del usuario (no el del supervisor)
          setDisplayRoleName(role.name);

          setUserRole({
            code: getBaseRoleCode(effectiveRole.code),
            name: effectiveRole.name,
            level: effectiveRole.level || 0,
            canApprove: effectiveRole.canApprove || false,
            canReassign: effectiveRole.canReassign || false,
            canSign: effectiveRole.canSign || false,
          });
        } else {
          setUserRole({ code: 'ADMIN', name: 'Administrador', level: 100, canApprove: true, canReassign: true, canSign: true });
        }
      } else {
        setUserRole({ code: 'ADMIN', name: 'Administrador', level: 100, canApprove: true, canReassign: true, canSign: true });
      }

      // Obtener estadísticas
      const statsResponse = await fetch('/api/v1/dashboard/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Obtener casos prioritarios
      const casosResponse = await fetch('/api/v1/dashboard/casos-prioritarios');
      if (casosResponse.ok) {
        const casosData = await casosResponse.json();
        setCasosPrioritarios(casosData);
      }

      // Obtener alertas
      const alertasResponse = await fetch('/api/v1/dashboard/alertas');
      if (alertasResponse.ok) {
        const alertasData = await alertasResponse.json();
        setAlertas(alertasData);
      }

      // Obtener contador de solicitudes nuevas
      const solicitudesResponse = await fetch('/api/v1/solicitudes/nuevas/count');
      if (solicitudesResponse.ok) {
        const solicitudesData = await solicitudesResponse.json();
        setSolicitudesNuevas(solicitudesData.count || 0);
      }

      // Obtener contador de peticiones de reasignación pendientes
      const peticionesResponse = await fetch('/api/v1/peticiones-reasignacion/count');
      if (peticionesResponse.ok) {
        const peticionesData = await peticionesResponse.json();
        setPeticionesPendientes(peticionesData.count || 0);
      }

    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = () => {
    if (!userRole) return null;

    // Generate color based on role level
    let colorClass = '';
    if (userRole.level === 100) {
      colorClass = 'bg-purple-100 text-purple-800'; // Admin/Revisor
    } else if (userRole.level === 90) {
      colorClass = 'bg-green-100 text-green-800'; // IA Agent
    } else if (userRole.level === 85) {
      colorClass = 'bg-orange-100 text-orange-800'; // Delegados
    } else if (userRole.level === 80) {
      colorClass = 'bg-blue-100 text-blue-800'; // Ventanilla Única
    } else {
      colorClass = 'bg-gray-100 text-gray-800'; // Default
    }

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${colorClass}`}>
        {displayRoleName ?? userRole.name}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f3f4f6'
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
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      {/* Sección de Título */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1.5rem 2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#111827', margin: 0 }}>
              Dashboard Operativo
            </h1>
            <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>
              {userRole?.code === 'ADMIN' && 'Visión completa del sistema'}
              {userRole?.code === 'DIRECTOR' && 'Gestión y supervisión de casos'}
              {userRole?.code === 'VENTANILLA_UNICA' && 'Gestión de solicitudes ciudadanas'}
              {userRole?.code === 'ASIGNACION_DE_CASOS' && 'Asignación inteligente de casos'}
              {userRole?.level === 85 && userRole.code !== 'ASIGNACION_DE_CASOS' && `${displayRoleName ?? userRole.name} - Gestión de casos asignados`}
              {userRole && userRole.level < 85 && userRole.level !== 80 && `${displayRoleName ?? userRole.name}`}
            </p>
          </div>
          {getRoleBadge()}
        </div>
      </div>

      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Alertas Institucionales - Ocultas para Administradores de Nivel 100 */}
        {userRole?.code !== 'ADMIN' && userRole?.code !== 'VENTANILLA_UNICA' && alertas.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            {alertas.map(alerta => (
              <div
                key={alerta.id}
                style={{
                  backgroundColor: alerta.tipo === 'warning' ? '#fef3c7' : '#dbeafe',
                  border: `1px solid ${alerta.tipo === 'warning' ? '#fbbf24' : 'var(--color-primary)'}`,
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <AlertTriangle
                  size={20}
                  color={alerta.tipo === 'warning' ? '#f59e0b' : 'var(--color-primary)'}
                />
                <span style={{ color: '#1f2937', fontWeight: '500' }}>{alerta.mensaje}</span>
              </div>
            ))}
          </div>
        )}

        <style dangerouslySetInnerHTML={{ __html: `
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
          }
          .kpi-card {
            background-color: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .kpi-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .kpi-title {
            color: #6b7280;
            font-size: 0.875rem;
            margin-bottom: 0.5rem;
            line-height: 1.2;
          }
          .kpi-value {
            font-size: 2rem;
            font-weight: 700;
            margin: 0;
          }
          .kpi-icon {
            border-radius: 8px;
            padding: 0.75rem;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          @media (max-width: 768px) {
            .kpi-grid {
              grid-template-columns: repeat(2, 1fr);
              gap: 0.75rem;
              margin-bottom: 1.5rem;
            }
            .kpi-card {
              padding: 0.875rem !important;
              border-radius: 8px !important;
            }
            .kpi-title {
              font-size: 0.7rem !important;
              margin-bottom: 0.25rem !important;
            }
            .kpi-value {
              font-size: 1.5rem !important;
            }
            .kpi-icon {
              padding: 0.5rem !important;
              border-radius: 6px !important;
            }
            .kpi-icon svg {
              width: 18px !important;
              height: 18px !important;
            }
          }
        `}} />

        {/* KPIs - Ocultos para Administradores */}
        {userRole?.code !== 'ADMIN' && (
          <div className="kpi-grid">
            {userRole?.code === 'DIRECTOR' ? (
              /* Tarjetas Revisor movidas abajo para PC, en celular se conservan en flujo normal usando variables CSS */
              <div className="revisor-mobile-kpis mobile-only kpi-grid" style={{ width: '100%' }}>
                {/* 1. Seguimiento General */}
                <div className="kpi-card">
                  <div className="kpi-content">
                    <div>
                      <p className="kpi-title">Seguimiento General</p>
                      <p className="kpi-value" style={{ color: '#111827' }}>
                        {stats.seguimiento || 0}
                      </p>
                    </div>
                    <div className="kpi-icon" style={{ backgroundColor: '#e0e7ff' }}>
                      <FileText size={24} color="#4f46e5" />
                    </div>
                  </div>
                </div>

                {/* 2. Casos Nuevos */}
                <div className="kpi-card">
                  <div className="kpi-content">
                    <div>
                      <p className="kpi-title">Casos Nuevos</p>
                      <p className="kpi-value" style={{ color: '#111827' }}>
                        {stats.casosNuevos}
                      </p>
                    </div>
                    <div className="kpi-icon" style={{ backgroundColor: '#dbeafe' }}>
                      <Plus size={24} color="var(--color-primary)" />
                    </div>
                  </div>
                </div>

                {/* 3. Invitaciones */}
                <div className="kpi-card">
                  <div className="kpi-content">
                    <div>
                      <p className="kpi-title">Invitaciones</p>
                      <p className="kpi-value" style={{ color: '#111827' }}>
                        {stats.invitaciones || 0}
                      </p>
                    </div>
                    <div className="kpi-icon" style={{ backgroundColor: '#f3e8ff' }}>
                      <Users size={24} color="#9333ea" />
                    </div>
                  </div>
                </div>

                {/* 4. Próximos a Vencer */}
                <div className="kpi-card">
                  <div className="kpi-content">
                    <div>
                      <p className="kpi-title">Próximos a Vencer</p>
                      <p className="kpi-value" style={{ color: '#f59e0b' }}>
                        {stats.casosProximosVencer}
                      </p>
                    </div>
                    <div className="kpi-icon" style={{ backgroundColor: '#fef3c7' }}>
                      <Clock size={24} color="#f59e0b" />
                    </div>
                  </div>
                </div>
              </div>
            ) : userRole?.code === 'VENTANILLA_UNICA' ? (
              null
            ) : (
              /* Tarjetas Originales (Otros Roles) */
              <>
                <div className="kpi-card">
                  <div className="kpi-content">
                    <div>
                      <p className="kpi-title">Casos Nuevos</p>
                      <p className="kpi-value" style={{ color: '#111827' }}>
                        {stats.casosNuevos}
                      </p>
                    </div>
                    <div className="kpi-icon" style={{ backgroundColor: '#dbeafe' }}>
                      <Plus size={24} color="var(--color-primary)" />
                    </div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-content">
                    <div>
                      <p className="kpi-title">Casos Activos</p>
                      <p className="kpi-value" style={{ color: '#111827' }}>
                        {stats.casosActivos}
                      </p>
                    </div>
                    <div className="kpi-icon" style={{ backgroundColor: '#d1fae5' }}>
                      <FileText size={24} color="#10b981" />
                    </div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-content">
                    <div>
                      <p className="kpi-title">Casos Vencidos</p>
                      <p className="kpi-value" style={{ color: '#dc2626' }}>
                        {stats.casosVencidos}
                      </p>
                    </div>
                    <div className="kpi-icon" style={{ backgroundColor: '#fee2e2' }}>
                      <AlertCircle size={24} color="#dc2626" />
                    </div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-content">
                    <div>
                      <p className="kpi-title">Próximos a Vencer</p>
                      <p className="kpi-value" style={{ color: '#f59e0b' }}>
                        {stats.casosProximosVencer}
                      </p>
                    </div>
                    <div className="kpi-icon" style={{ backgroundColor: '#fef3c7' }}>
                      <Clock size={24} color="#f59e0b" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tarjetas exclusivas para Ventanilla Única */}
        {userRole?.code === 'VENTANILLA_UNICA' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Tarjeta: Bandeja de Entrada */}
            <button
              onClick={() => router.push('/home/bandeja-entrada')}
              style={{
                position: 'relative',
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '2rem 1.5rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: solicitudesNuevas > 0 ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(59,130,246,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
            >
              {solicitudesNuevas > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '9999px',
                  minWidth: '22px',
                  textAlign: 'center'
                }}>
                  {solicitudesNuevas}
                </span>
              )}
              <div style={{
                backgroundColor: '#dbeafe',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Inbox size={32} color="var(--color-primary)" />
              </div>
              <span style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                Bandeja de Entrada
              </span>
            </button>

            {/* Tarjeta: Imprimir Radicado */}
            <button
              className="desktop-only"
              onClick={() => router.push('/home/imprimir-radicado')}
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '2rem 1.5rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(59,130,246,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
            >
              <div style={{
                backgroundColor: '#ede9fe',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Printer size={32} color="#8b5cf6" />
              </div>
              <span style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                Imprimir Radicado
              </span>
            </button>

            {/* Tarjeta: Trazabilidad */}
            <button
              onClick={() => router.push('/home/registro')}
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '2rem 1.5rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(245,158,11,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
            >
              <div style={{
                backgroundColor: '#fef3c7',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Search size={32} color="#f59e0b" />
              </div>
              <span style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                Trazabilidad
              </span>
            </button>

            {/* Tarjeta: Subir Caso */}
            <button
              onClick={() => router.push('/home/casos/nuevo')}
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '2rem 1.5rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(16,185,129,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
            >
              <div style={{
                backgroundColor: '#d1fae5',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Plus size={32} color="#10b981" />
              </div>
              <span style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                Subir Caso
              </span>
            </button>
          </div>
        )}

        {/* Contenido Principal: Condicional según rol (oculto para VU) */}
        {userRole?.code !== 'VENTANILLA_UNICA' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
            {/* Columna Izquierda: Bandeja Prioritaria (oculta para ADMIN y VENTANILLA_UNICA) */}
            {userRole?.code !== 'ADMIN' && userRole?.code !== 'VENTANILLA_UNICA' && (
              <div style={{ flex: '2 1 600px', maxWidth: '100%' }}>
                {userRole?.code === 'DIRECTOR' ? (
                  /* Tarjetas Revisor en PC (En lugar de la tabla de Invitaciones) */
                  <div className="revisor-desktop-kpis desktop-only" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', height: '100%', paddingBottom: '2rem' }}>
                    {/* 1. Seguimiento General */}
                    <div className="kpi-card" style={{ height: '100%', padding: '2rem' }}>
                      <div className="kpi-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', textAlign: 'center' }}>
                        <div className="kpi-icon" style={{ backgroundColor: '#e0e7ff', width: '64px', height: '64px', borderRadius: '16px' }}>
                          <FileText size={32} color="#4f46e5" />
                        </div>
                        <div>
                          <p className="kpi-title" style={{ fontSize: '1.1rem' }}>Seguimiento General</p>
                          <p className="kpi-value" style={{ color: '#111827', fontSize: '3rem' }}>
                            {stats.seguimiento || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 2. Casos Nuevos */}
                    <div className="kpi-card" style={{ height: '100%', padding: '2rem' }}>
                      <div className="kpi-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', textAlign: 'center' }}>
                        <div className="kpi-icon" style={{ backgroundColor: '#dbeafe', width: '64px', height: '64px', borderRadius: '16px' }}>
                          <Plus size={32} color="var(--color-primary)" />
                        </div>
                        <div>
                          <p className="kpi-title" style={{ fontSize: '1.1rem' }}>Casos Nuevos</p>
                          <p className="kpi-value" style={{ color: '#111827', fontSize: '3rem' }}>
                            {stats.casosNuevos}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 3. Invitaciones */}
                    <div className="kpi-card" style={{ height: '100%', padding: '2rem' }}>
                      <div className="kpi-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', textAlign: 'center' }}>
                        <div className="kpi-icon" style={{ backgroundColor: '#f3e8ff', width: '64px', height: '64px', borderRadius: '16px' }}>
                          <Users size={32} color="#9333ea" />
                        </div>
                        <div>
                          <p className="kpi-title" style={{ fontSize: '1.1rem' }}>Invitaciones</p>
                          <p className="kpi-value" style={{ color: '#111827', fontSize: '3rem' }}>
                            {stats.invitaciones || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 4. Próximos a Vencer */}
                    <div className="kpi-card" style={{ height: '100%', padding: '2rem' }}>
                      <div className="kpi-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', textAlign: 'center' }}>
                        <div className="kpi-icon" style={{ backgroundColor: '#fef3c7', width: '64px', height: '64px', borderRadius: '16px' }}>
                          <Clock size={32} color="#f59e0b" />
                        </div>
                        <div>
                          <p className="kpi-title" style={{ fontSize: '1.1rem' }}>Próximos a Vencer</p>
                          <p className="kpi-value" style={{ color: '#f59e0b', fontSize: '3rem' }}>
                            {stats.casosProximosVencer}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
                    Casos Recientes
                  </h2>

                  {casosPrioritarios.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                      <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                      <p>No hay casos prioritarios en este momento</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                            <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>
                              Código
                            </th>
                            <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>
                              Tipo
                            </th>
                            <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>
                              Estado
                            </th>
                            <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>
                              Prioridad
                            </th>
                            <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>
                              Días
                            </th>
                            <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>
                              Término
                            </th>
                            <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>
                              Acción
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {casosPrioritarios.map(caso => (
                            <tr key={caso.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                              <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#111827', fontWeight: '500' }}>
                                {caso.codigo}
                              </td>
                              <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                                {caso.tipo}
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <span style={{
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  backgroundColor: caso.estado === 'VENCIDO' ? '#fee2e2' : caso.estado === 'SIN_ASIGNAR' ? '#fef3c7' : '#dbeafe',
                                  color: caso.estado === 'VENCIDO' ? '#dc2626' : caso.estado === 'SIN_ASIGNAR' ? '#f59e0b' : 'var(--color-primary)'
                                }}>
                                  {caso.estado.replace('_', ' ')}
                                </span>
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <span style={{
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  backgroundColor: caso.prioridad === 'URGENTE' ? '#fee2e2' : '#fef3c7',
                                  color: caso.prioridad === 'URGENTE' ? '#dc2626' : '#f59e0b'
                                }}>
                                  {caso.prioridad}
                                </span>
                              </td>
                              <td style={{
                                padding: '1rem',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: caso.diasRestantes < 0 ? '#dc2626' : caso.diasRestantes <= 2 ? '#f59e0b' : '#10b981'
                              }}>
                                {caso.diasRestantes < 0 ? `${Math.abs(caso.diasRestantes)} vencido` : `${caso.diasRestantes} días`}
                              </td>
                              <td style={{ padding: '1rem', textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.25rem 0.6rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.7rem',
                                  fontWeight: '700',
                                  backgroundColor:
                                    caso.semaforoTermino === 'rojo' ? '#fee2e2' :
                                    caso.semaforoTermino === 'amarillo' ? '#fef3c7' :
                                    caso.semaforoTermino === 'respondido' ? '#d1fae5' :
                                    '#dcfce7',
                                  color:
                                    caso.semaforoTermino === 'rojo' ? '#dc2626' :
                                    caso.semaforoTermino === 'amarillo' ? '#d97706' :
                                    caso.semaforoTermino === 'respondido' ? '#059669' :
                                    '#16a34a',
                                }}>
                                  <span style={{
                                    width: '7px',
                                    height: '7px',
                                    borderRadius: '50%',
                                    backgroundColor:
                                      caso.semaforoTermino === 'rojo' ? '#dc2626' :
                                      caso.semaforoTermino === 'amarillo' ? '#f59e0b' :
                                      caso.semaforoTermino === 'respondido' ? '#10b981' :
                                      '#22c55e',
                                    display: 'inline-block',
                                    boxShadow:
                                      caso.semaforoTermino === 'rojo' ? '0 0 6px #dc2626' :
                                      caso.semaforoTermino === 'amarillo' ? '0 0 6px #f59e0b' :
                                      '0 0 4px #22c55e',
                                  }} />
                                  {caso.semaforoTermino === 'rojo' ? 'Vencido' :
                                   caso.semaforoTermino === 'amarillo' ? 'Próximo' :
                                   caso.semaforoTermino === 'respondido' ? 'OK' :
                                   'En término'}
                                </span>
                              </td>
                              <td style={{ padding: '1rem', textAlign: 'center' }}>
                                <button
                                  onClick={() => router.push(`/admin/casos/${caso.id}`)}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    backgroundColor: 'var(--color-primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Gestionar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                )}
              </div>
            )}

            {/* Columna Derecha: Accesos Rápidos y Productividad */}
            <div style={{ flex: '1 1 300px', maxWidth: '100%' }}>
              {/* Accesos Rápidos */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: '2rem'
              }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
                  Accesos Rápidos
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Director Encargado - Tarjetas de acceso */}
                  {userRole?.level === 100 && userRole.code === 'DIRECTOR' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                      {/* Bandeja de Entrada */}
                      <button
                        onClick={() => router.push('/home/bandeja-entrada')}
                        style={{
                          position: 'relative',
                          backgroundColor: 'white',
                          borderRadius: '16px',
                          padding: '1.5rem 1rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          border: solicitudesNuevas > 0 ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.75rem',
                          transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(59,130,246,0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                      >
                        {solicitudesNuevas > 0 && (
                          <span style={{
                            position: 'absolute', top: '8px', right: '8px',
                            backgroundColor: '#ef4444', color: 'white', fontSize: '0.7rem', fontWeight: '700',
                            padding: '0.2rem 0.5rem', borderRadius: '9999px', minWidth: '20px', textAlign: 'center'
                          }}>{solicitudesNuevas}</span>
                        )}
                        <div style={{ backgroundColor: '#dbeafe', borderRadius: '12px', padding: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Inbox size={28} color="var(--color-primary)" />
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#111827', textAlign: 'center' }}>Bandeja de Entrada</span>
                      </button>

                      {/* Peticiones de Reasignación */}
                      <button
                        onClick={() => router.push('/home/peticiones-reasignacion')}
                        style={{
                          position: 'relative',
                          backgroundColor: 'white',
                          borderRadius: '16px',
                          padding: '1.5rem 1rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          border: peticionesPendientes > 0 ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.75rem',
                          transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(245,158,11,0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                      >
                        {peticionesPendientes > 0 && (
                          <span style={{
                            position: 'absolute', top: '8px', right: '8px',
                            backgroundColor: '#ef4444', color: 'white', fontSize: '0.7rem', fontWeight: '700',
                            padding: '0.2rem 0.5rem', borderRadius: '9999px', minWidth: '20px', textAlign: 'center'
                          }}>{peticionesPendientes}</span>
                        )}
                        <div style={{ backgroundColor: '#fef3c7', borderRadius: '12px', padding: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <AlertTriangle size={28} color="#f59e0b" />
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#111827', textAlign: 'center' }}>Reasignaciones</span>
                      </button>

                      {/* Subir Caso */}
                      <button
                        onClick={() => router.push('/home/casos/nuevo')}
                        style={{
                          backgroundColor: 'white',
                          borderRadius: '16px',
                          padding: '1.5rem 1rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          border: '1px solid #e5e7eb',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.75rem',
                          transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(16,185,129,0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                      >
                        <div style={{ backgroundColor: '#d1fae5', borderRadius: '12px', padding: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Plus size={28} color="#10b981" />
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#111827', textAlign: 'center' }}>Subir Caso</span>
                      </button>

                      {/* Administrar Auxiliares */}
                      <button
                        onClick={() => router.push('/home/auxiliares')}
                        style={{
                          backgroundColor: 'white',
                          borderRadius: '16px',
                          padding: '1.5rem 1rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          border: '1px solid #e5e7eb',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.75rem',
                          transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(59,130,246,0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                      >
                        <div style={{ backgroundColor: '#ede9fe', borderRadius: '12px', padding: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Users size={28} color="#8b5cf6" />
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#111827', textAlign: 'center' }}>Auxiliares</span>
                      </button>

                      {/* Cierre de Casos */}
                      <button
                        onClick={() => router.push('/home/cierre-casos')}
                        style={{
                          position: 'relative',
                          backgroundColor: 'white',
                          borderRadius: '16px',
                          padding: '1.5rem 1rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          border: stats.cierreCasos && stats.cierreCasos > 0 ? '2px solid #ef4444' : '1px solid #e5e7eb',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.75rem',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          gridColumn: 'span 2'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(239,68,68,0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                      >
                        {stats.cierreCasos && stats.cierreCasos > 0 && (
                          <span style={{
                            position: 'absolute', top: '8px', right: '8px',
                            backgroundColor: '#ef4444', color: 'white', fontSize: '0.7rem', fontWeight: '700',
                            padding: '0.2rem 0.5rem', borderRadius: '9999px', minWidth: '20px', textAlign: 'center'
                          }}>{stats.cierreCasos}</span>
                        )}
                        <div style={{ backgroundColor: '#fee2e2', borderRadius: '12px', padding: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CheckCircle size={28} color="#ef4444" />
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#111827', textAlign: 'center' }}>Cierre de Casos</span>
                      </button>
                    </div>
                  )}

                  {/* Admin - Gestión de usuarios y roles */}
                  {userRole?.code === 'ADMIN' && (
                    <>
                      <button
                        onClick={() => router.push('/home/usuarios')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '1rem',
                          backgroundColor: '#f3f4f6',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <Users size={20} color="#10b981" />
                        <span style={{ fontSize: '0.95rem', fontWeight: '500', color: '#111827' }}>
                          Gestión de Usuarios
                        </span>
                      </button>

                      <button
                        onClick={() => router.push('/home/cargos')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '1rem',
                          backgroundColor: '#f3f4f6',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <Settings size={20} color="#8b5cf6" />
                        <span style={{ fontSize: '0.95rem', fontWeight: '500', color: '#111827' }}>
                          Gestión de Cargos
                        </span>
                      </button>

                      <button
                        onClick={() => router.push('/home/configuracion-entidad')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '1rem',
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <Building size={20} color="#16a34a" />
                        <span style={{ fontSize: '0.95rem', fontWeight: '500', color: '#111827' }}>
                          Configurar Entidad
                        </span>
                      </button>

                      <button
                        onClick={() => router.push('/admin/transparencia')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '1rem',
                          backgroundColor: '#f0f9ff',
                          border: '1px solid #bae6fd',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <Eye size={20} color="#0284c7" />
                        <span style={{ fontSize: '0.95rem', fontWeight: '500', color: '#111827' }}>
                          Índice de Transparencia
                        </span>
                      </button>

                      <button
                        onClick={() => router.push('/home/editor-landing')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '1rem',
                          backgroundColor: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <Globe size={20} color="#2563eb" />
                        <span style={{ fontSize: '0.95rem', fontWeight: '500', color: '#111827' }}>
                          Landing Page
                        </span>
                      </button>
                    </>
                  )}



                  {/* Nivel 85: Funcionarios/Delegados - Bandeja de Entrada */}
                  {(userRole && userRole.level === 85) && (
                    <>
                      <button
                        onClick={() => router.push('/home/bandeja-entrada')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1rem',
                          backgroundColor: solicitudesNuevas > 0 ? '#dbeafe' : '#f3f4f6',
                          border: solicitudesNuevas > 0 ? '2px solid #3b82f6' : 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <Inbox size={20} color="var(--color-primary)" />
                          <span style={{ fontSize: '0.95rem', fontWeight: '500', color: '#111827' }}>
                            Bandeja de Entrada
                          </span>
                        </div>
                        {solicitudesNuevas > 0 && (
                          <span style={{
                            backgroundColor: '#ef4444',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '9999px',
                            minWidth: '20px',
                            textAlign: 'center'
                          }}>
                            {solicitudesNuevas}
                          </span>
                        )}
                      </button>

                      {/* Subir Caso para Funcionario */}
                      <button
                        onClick={() => router.push('/home/casos/nuevo')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '1rem',
                          backgroundColor: '#f3f4f6',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <Plus size={20} color="#10b981" />
                        <span style={{ fontSize: '0.95rem', fontWeight: '500', color: '#111827' }}>
                          Subir Caso
                        </span>
                      </button>

                      {/* Administrar Auxiliares para Funcionario */}
                      <button
                        onClick={() => router.push('/home/auxiliares')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '1rem',
                          backgroundColor: '#f3f4f6',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <Users size={20} color="var(--color-primary)" />
                        <span style={{ fontSize: '0.95rem', fontWeight: '500', color: '#111827' }}>
                          Administrar auxiliares
                        </span>
                      </button>
                    </>
                  )}


                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div >
  );
}
