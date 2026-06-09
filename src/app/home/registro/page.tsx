'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Search, Filter, Download, X, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';

// Definición de las columnas que coinciden con el modelo
const columnsMap: Record<string, string> = {
    'FECHA': 'fecha',
    'NOMBRE COMPLETO': 'nombreCompleto',
    'TIPO DE DOCUMENTO': 'tipoDocumento',
    'NÚMERO DE DOCUMENTO': 'numeroDocumento',
    'EDAD': 'edad',
    'TELÉFONO': 'telefono',
    'GÉNERO': 'genero',
    'DISCAPACIDAD': 'discapacidad',
    'ETNIA': 'etnia',
    'ESCOLARIDAD': 'escolaridad',
    'BARRIO': 'barrio',
    'DEPENDENCIA': 'dependencia',
    'ASUNTO': 'asunto',
    'DESCRIPCIÓN': 'descripcion',
    'EPS': 'eps',
    'RESPONSABLE DEL CASO': 'responsableCaso'
};

const columns = Object.keys(columnsMap);

type AttendanceRecord = Record<string, string>;

export default function RegistroPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [migrating, setMigrating] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [appliedStartDate, setAppliedStartDate] = useState('');
    const [appliedEndDate, setAppliedEndDate] = useState('');
    
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [downloadStartDate, setDownloadStartDate] = useState('');
    const [downloadEndDate, setDownloadEndDate] = useState('');

    const [gridData, setGridData] = useState<AttendanceRecord[]>([]);
    const pendingUpdates = useRef<Record<string, Record<string, unknown>>>({});
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [userRole, setUserRole] = useState<string>('');
    const [isMobile, setIsMobile] = useState(false);

    // Track mobile viewport
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const loadDataFromApi = async () => {
        try {
            const res = await fetch('/api/v1/attendance-records');
            if (res.ok) {
                const json = await res.json();
                
                // Mapear datos de BD a formato de grilla
                const formattedData = json.data.map((record: Record<string, unknown>) => {
                    const row: Record<string, string> = { _id: record.id as string };
                    Object.entries(columnsMap).forEach(([colHeader, dbField]) => {
                        row[colHeader] = (record[dbField] as string) || '';
                    });
                    return row;
                });
                
                setGridData(formattedData);
            }
        } catch (error) {
            console.error('Error fetching records:', error);
        }
    };

    const migrateLocalStorageData = async () => {
        const savedData = localStorage.getItem('registroAtenciones');
        if (!savedData) return false;
        
        try {
            const parsedData = JSON.parse(savedData);
            if (!Array.isArray(parsedData) || parsedData.length === 0) return false;
            
            setMigrating(true);
            const res = await fetch('/api/v1/attendance-records/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ records: parsedData })
            });
            
            if (res.ok) {
                localStorage.removeItem('registroAtenciones'); // Limpiar despues de migrar
                return true;
            }
        } catch (e) {
            console.error('Error migrating local storage data', e);
        } finally {
            setMigrating(false);
        }
        return false;
    };

    useEffect(() => {
        const isAuthenticated = localStorage.getItem('isAuthenticated');
        if (!isAuthenticated || isAuthenticated !== 'true') {
            router.push('/');
            return;
        }

        const init = async () => {
            try {
                // 1. Check Role
                const resAuth = await fetch('/api/v1/auth/me', {
                    headers: { 'Content-Type': 'application/json' }
                });
                if (resAuth.ok) {
                    const data = await resAuth.json();
                    const userRoleCode = data.data?.user?.role?.code;
                    setUserRole(userRoleCode || '');
                    
                    if (userRoleCode !== 'AUXILIAR_ATENCION_USUARIO' && userRoleCode !== 'VENTANILLA_UNICA') {
                        router.push('/home');
                        return;
                    }
                }

                // 2. Migrate old data if exists
                await migrateLocalStorageData();
                
                // 3. Load DB records
                await loadDataFromApi();
                
            } catch (error) {
                console.error('Error initialization:', error);
            } finally {
                setLoading(false);
            }
        };

        init();
        
        return () => {
            if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        };
    }, [router]);

    const getReturnUrl = () => {
        return userRole === 'VENTANILLA_UNICA' ? '/home/ventanilla-unica' : '/home/atencion-usuario';
    };

    const handleDownloadExcel = () => {
        // Filtrar datos por rango de fechas de descarga (ignoramos prop ocultas como _id)
        const dataToExport = gridData.filter(row => {
            const rowDate = row['FECHA'];
            if (!rowDate) return false;
            if (downloadStartDate && rowDate < downloadStartDate) return false;
            if (downloadEndDate && rowDate > downloadEndDate) return false;
            return true;
        }).map(row => {
            const cleanRow: Record<string, string> = {};
            columns.forEach(col => { cleanRow[col] = row[col]; });
            return cleanRow;
        }).sort((a, b) => {
            const dateA = a['FECHA'] || '';
            const dateB = b['FECHA'] || '';
            return dateA.localeCompare(dateB);
        });

        if (dataToExport.length === 0) {
            alert('No hay registros en el rango de fechas seleccionado.');
            return;
        }

        const ws = XLSX.utils.json_to_sheet(dataToExport, { header: columns });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Registro de Atenciones');

        const fromLabel = downloadStartDate || 'inicio';
        const toLabel = downloadEndDate || 'fin';
        const fileName = `Registro_Atenciones_${fromLabel}_a_${toLabel}.xlsx`;

        XLSX.writeFile(wb, fileName);
        setShowDownloadModal(false);
        setDownloadStartDate('');
        setDownloadEndDate('');
    };

    // Mobile: download filtered data directly using applied filter dates
    const handleMobileDownload = () => {
        const dataToExport = filteredData.map(row => {
            const cleanRow: Record<string, string> = {};
            columns.forEach(col => { cleanRow[col] = row[col]; });
            return cleanRow;
        }).sort((a, b) => {
            const dateA = a['FECHA'] || '';
            const dateB = b['FECHA'] || '';
            return dateA.localeCompare(dateB);
        });

        if (dataToExport.length === 0) {
            alert('No hay registros en el rango de fechas seleccionado.');
            return;
        }

        const ws = XLSX.utils.json_to_sheet(dataToExport, { header: columns });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Registro de Atenciones');

        const fromLabel = appliedStartDate || 'inicio';
        const toLabel = appliedEndDate || 'fin';
        const fileName = `Registro_Atenciones_${fromLabel}_a_${toLabel}.xlsx`;

        XLSX.writeFile(wb, fileName);
    };

    const flushUpdatesToApi = async () => {
        const updates = { ...pendingUpdates.current };
        pendingUpdates.current = {}; // Limpiar cola inmediatamente

        for (const id of Object.keys(updates)) {
            try {
                await fetch(`/api/v1/attendance-records/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates[id])
                });
            } catch (err) {
                console.error('Error auto-saving record', id, err);
            }
        }
    };

    const handleCellChange = (recordId: string, column: string, value: string) => {
        // Actualizar UI instantaneamente
        setGridData(prev => prev.map(row => {
            if (row._id === recordId) {
                return { ...row, [column]: value };
            }
            return row;
        }));

        const dbField = columnsMap[column];
        if (!dbField || !recordId) return;

        // Encolar actualización para la API
        if (!pendingUpdates.current[recordId]) {
            pendingUpdates.current[recordId] = {};
        }
        pendingUpdates.current[recordId][dbField] = value;

        // Debounce de 1 segundo
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }
        updateTimeoutRef.current = setTimeout(() => {
            flushUpdatesToApi();
        }, 1000);
    };

    // Auto-actualizar desde API al volver a la pestaña
    useEffect(() => {
        const handleFocus = () => {
            if (!loading) loadDataFromApi();
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [loading]);

    if (loading || migrating) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: 'white',
                fontFamily: "'Inter', 'Segoe UI', sans-serif"
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid rgba(255,255,255,0.2)',
                        borderTop: '4px solid #3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px'
                    }} />
                    <p style={{ fontSize: '1rem', opacity: 0.7 }}>
                        {migrating ? 'Migrando registros existentes a la base de datos...' : 'Cargando...'}
                    </p>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const filteredData = gridData
        .filter((row) => {
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                const matchesSearch = columns.some(col =>
                    String(row[col] || '').toLowerCase().includes(searchLower)
                );
                if (!matchesSearch) return false;
            }

            if (appliedStartDate || appliedEndDate) {
                const rowDate = row['FECHA'];
                if (!rowDate) return false;

                if (appliedStartDate && rowDate < appliedStartDate) return false;
                if (appliedEndDate && rowDate > appliedEndDate) return false;
            }

            return true;
        });

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            color: '#e2e8f0'
        }}>
            <style>{`
                .registro-header {
                    margin-bottom: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 16px;
                }
                .date-filters {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    flex-wrap: wrap;
                    width: 100%;
                }
                .date-input-group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .search-wrapper {
                    position: relative;
                    width: 320px;
                    max-width: 100%;
                    margin-left: auto;
                }
                .download-container {
                    display: flex;
                    gap: 12px;
                }
                .info-footer {
                    margin-top: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    background: rgba(30, 41, 59, 0.4);
                    border-radius: 8px;
                    font-size: 0.8rem;
                    color: #64748b;
                }
                @media (max-width: 768px) {
                    .registro-header {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 12px;
                    }
                    /* Title row spans full width */
                    .registro-header > div:first-child {
                        grid-column: 1 / -1;
                    }
                    /* Flatten wrappers so children become grid items */
                    .download-container {
                        display: contents;
                    }
                    .date-filters {
                        display: contents;
                    }
                    /* Order: Desde(1) Hasta(2) on row1, Filtrar(3) Descargar(4) on row2 */
                    .date-input-group:nth-of-type(1) { order: 1; }
                    .date-input-group:nth-of-type(2) { order: 2; }
                    .date-filters > button { order: 3; }
                    .download-container > button { order: 4; }
                    /* Compact date groups */
                    .date-input-group {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 4px;
                    }
                    .date-input-group label {
                        font-size: 0.8rem;
                    }
                    .date-input-group input {
                        width: 100%;
                        padding: 8px 10px;
                        font-size: 0.85rem;
                    }
                    /* Compact buttons */
                    .date-filters > button,
                    .download-container > button {
                        padding: 10px 16px;
                        font-size: 0.85rem;
                        justify-content: center;
                    }
                    .info-footer {
                        flex-direction: column;
                        align-items: center;
                        gap: 8px;
                    }
                }
            `}</style>
            
            <main style={{ padding: '32px' }}>
                <div className="registro-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            onClick={() => router.push(getReturnUrl())}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: '40px',
                                height: '40px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '10px',
                                color: 'white',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            }}
                            title="Volver al panel"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <ClipboardList size={28} color="var(--color-primary)" style={{ minWidth: '28px' }} />
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>
                                Registro de Atenciones
                            </h2>
                        </div>
                    </div>

                    <div className="download-container">
                        <button
                            onClick={() => isMobile ? handleMobileDownload() : setShowDownloadModal(true)}
                            disabled={isMobile && !appliedStartDate && !appliedEndDate}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '10px 20px',
                                background: (isMobile && !appliedStartDate && !appliedEndDate)
                                    ? 'rgba(100, 116, 139, 0.15)'
                                    : 'rgba(16, 185, 129, 0.15)',
                                border: (isMobile && !appliedStartDate && !appliedEndDate)
                                    ? '1px solid rgba(100, 116, 139, 0.3)'
                                    : '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: '10px',
                                color: (isMobile && !appliedStartDate && !appliedEndDate)
                                    ? '#64748b'
                                    : '#34d399',
                                cursor: (isMobile && !appliedStartDate && !appliedEndDate)
                                    ? 'not-allowed'
                                    : 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: 500,
                                transition: 'all 0.2s',
                                fontFamily: 'inherit',
                                width: '100%',
                                opacity: (isMobile && !appliedStartDate && !appliedEndDate) ? 0.5 : 1
                            }}
                            onMouseOver={(e) => {
                                if (!(isMobile && !appliedStartDate && !appliedEndDate))
                                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)';
                            }}
                            onMouseOut={(e) => {
                                if (!(isMobile && !appliedStartDate && !appliedEndDate))
                                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
                            }}
                        >
                            <Download size={18} />
                            Descargar Excel
                        </button>
                    </div>

                    <div className="date-filters">
                        <div className="date-input-group">
                            <label style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Desde:</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                style={{
                                    padding: '10px 12px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '10px',
                                    color: 'white',
                                    fontSize: '0.875rem',
                                    outline: 'none',
                                    colorScheme: 'dark',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        <div className="date-input-group">
                            <label style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Hasta:</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                style={{
                                    padding: '10px 12px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '10px',
                                    color: 'white',
                                    fontSize: '0.875rem',
                                    outline: 'none',
                                    colorScheme: 'dark',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        <button
                            onClick={() => {
                                setAppliedStartDate(startDate);
                                setAppliedEndDate(endDate);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 16px',
                                background: 'rgba(59, 130, 246, 0.15)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: '10px',
                                color: '#60a5fa',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                transition: 'all 0.2s',
                                fontFamily: 'inherit'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'; }}
                        >
                            <Filter size={16} />
                            Filtrar
                        </button>

                        <div className="search-wrapper desktop-only">
                            <Search
                                size={18}
                                color="#94a3b8"
                                style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}
                            />
                            <input
                                type="text"
                                placeholder="Buscar en todos los campos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px 12px 42px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    transition: 'all 0.2s',
                                    fontFamily: 'inherit'
                                }}
                                onFocus={(e) => {
                                    e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                                    e.target.style.borderColor = 'var(--color-primary)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* === MOBILE: Card List View === */}
                {isMobile && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                        {filteredData.length === 0 ? (
                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px dashed rgba(255,255,255,0.2)',
                                borderRadius: '16px',
                                padding: '48px 24px',
                                textAlign: 'center',
                                color: '#94a3b8'
                            }}>
                                <ClipboardList size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                                <h3 style={{ margin: '0 0 6px', color: 'white', fontSize: '1rem' }}>Sin registros</h3>
                                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                                    {appliedStartDate || appliedEndDate
                                        ? 'No hay registros en el rango de fechas seleccionado.'
                                        : 'Aplica un filtro de fechas para ver los registros.'}
                                </p>
                            </div>
                        ) : (
                            <>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px 4px'
                                }}>
                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                        📋 {filteredData.length} registro{filteredData.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                {filteredData.map((row, idx) => (
                                    <div key={row._id || idx} style={{
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '14px',
                                        padding: '16px',
                                        transition: 'all 0.2s'
                                    }}>
                                        {/* Header: Fecha + Dependencia */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '10px'
                                        }}>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                color: '#60a5fa',
                                                background: 'rgba(59, 130, 246, 0.15)',
                                                padding: '3px 10px',
                                                borderRadius: '6px'
                                            }}>
                                                📅 {row['FECHA'] || 'Sin fecha'}
                                            </span>
                                            {row['DEPENDENCIA'] && (
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    fontWeight: 500,
                                                    color: '#a78bfa',
                                                    background: 'rgba(167, 139, 250, 0.12)',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    maxWidth: '45%',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {row['DEPENDENCIA']}
                                                </span>
                                            )}
                                        </div>

                                        {/* Nombre */}
                                        <h4 style={{
                                            margin: '0 0 6px',
                                            fontSize: '0.95rem',
                                            fontWeight: 600,
                                            color: 'white',
                                            lineHeight: 1.3
                                        }}>
                                            {row['NOMBRE COMPLETO'] || 'Sin nombre'}
                                        </h4>

                                        {/* Asunto */}
                                        {row['ASUNTO'] && (
                                            <p style={{
                                                margin: '0 0 10px',
                                                fontSize: '0.8rem',
                                                color: '#cbd5e1',
                                                lineHeight: 1.4,
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical' as const,
                                                overflow: 'hidden'
                                            }}>
                                                {row['ASUNTO']}
                                            </p>
                                        )}

                                        {/* Footer: Doc + Responsable */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            borderTop: '1px solid rgba(255,255,255,0.08)',
                                            paddingTop: '10px',
                                            marginTop: '4px'
                                        }}>
                                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                                {row['TIPO DE DOCUMENTO'] ? `${row['TIPO DE DOCUMENTO']} ${row['NÚMERO DE DOCUMENTO'] || ''}` : ''}
                                            </span>
                                            {row['RESPONSABLE DEL CASO'] && (
                                                <span style={{
                                                    fontSize: '0.72rem',
                                                    color: '#34d399',
                                                    fontWeight: 500,
                                                    maxWidth: '50%',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    👤 {row['RESPONSABLE DEL CASO']}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}

                <div className="desktop-only">
                    {gridData.length === 0 ? (
                        <div style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px dashed rgba(255,255,255,0.2)',
                            borderRadius: '16px',
                            padding: '64px',
                            textAlign: 'center',
                            color: '#94a3b8'
                        }}>
                            <ClipboardList size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                            <h3 style={{ margin: '0 0 8px', color: 'white', fontSize: '1.25rem' }}>No hay registros de atenciones</h3>
                            <p style={{ margin: '0 0 24px' }}>Los registros de casos se mostrarán aquí una vez creados.</p>
                        </div>
                    ) : (
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            overflow: 'hidden',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
                        }}>
                            <div style={{ overflowX: 'auto', maxHeight: '65vh' }}>
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    minWidth: '2000px',
                                    color: '#1e293b'
                                }}>
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                        <tr>
                                            {columns.map((col, index) => (
                                                <th
                                                    key={index}
                                                    style={{
                                                        padding: '14px 16px',
                                                        textAlign: 'center',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        color: '#334155',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.8px',
                                                        background: '#f8fafc',
                                                        border: '1px solid #e2e8f0',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredData.map((row) => (
                                            <tr key={row._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                {columns.map((col, colIndex) => (
                                                    <td key={colIndex} style={{ padding: 0, minWidth: '130px', position: 'relative', borderRight: '1px solid #e2e8f0', borderLeft: '1px solid #e2e8f0' }}>
                                                        <div style={{ display: 'grid' }}>
                                                            <span style={{
                                                                visibility: 'hidden',
                                                                whiteSpace: 'pre',
                                                                padding: '12px 16px',
                                                                fontSize: '0.875rem',
                                                                fontFamily: 'inherit',
                                                                gridArea: '1 / 1'
                                                            }}>
                                                                {row[col] || ' '}
                                                            </span>
                                                            <input
                                                                type="text"
                                                                value={row[col] || ''}
                                                                onChange={(e) => handleCellChange(row._id, col, e.target.value)}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '12px 16px',
                                                                    background: 'transparent',
                                                                    border: 'none',
                                                                    color: '#1e293b',
                                                                    fontSize: '0.875rem',
                                                                    outline: 'none',
                                                                    boxSizing: 'border-box',
                                                                    transition: 'background-color 0.2s',
                                                                    fontFamily: 'inherit',
                                                                    gridArea: '1 / 1',
                                                                    textAlign: col === 'NÚMERO DE ATENCIÓN' ? 'center' : 'left'
                                                                }}
                                                                onFocus={(e) => {
                                                                    e.target.style.background = '#f1f5f9';
                                                                }}
                                                                onBlur={(e) => {
                                                                    e.target.style.background = 'transparent';
                                                                }}
                                                            />
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Info Footer */}
                    <div className="info-footer">
                        <span>Mostrando {filteredData.length} de {gridData.length} registros (Guardado automático en servidores Cloud)</span>
                        <span>Auxiliar de Atención al Usuario</span>
                    </div>
                </div>
            </main>

            {/* Modal de Descarga */}
            {showDownloadModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.6)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '32px',
                        width: '420px',
                        maxWidth: '90vw',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        color: '#1e293b'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                                Descargar Excel
                            </h3>
                            <button
                                onClick={() => { setShowDownloadModal(false); setDownloadStartDate(''); setDownloadEndDate(''); }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    padding: '4px'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: '#64748b' }}>
                            Seleccione el rango de fechas para la descarga:
                        </p>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                                Desde:
                            </label>
                            <input
                                type="date"
                                value={downloadStartDate}
                                onChange={(e) => setDownloadStartDate(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    fontFamily: 'inherit',
                                    color: '#1e293b'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                                Hasta:
                            </label>
                            <input
                                type="date"
                                value={downloadEndDate}
                                onChange={(e) => setDownloadEndDate(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    fontFamily: 'inherit',
                                    color: '#1e293b'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                onClick={() => { setShowDownloadModal(false); setDownloadStartDate(''); setDownloadEndDate(''); }}
                                style={{
                                    padding: '10px 20px',
                                    background: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    fontFamily: 'inherit'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDownloadExcel}
                                disabled={!downloadStartDate || !downloadEndDate}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '10px 20px',
                                    background: (!downloadStartDate || !downloadEndDate)
                                        ? '#94a3b8'
                                        : 'linear-gradient(135deg, #10b981, #059669)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: 'white',
                                    cursor: (!downloadStartDate || !downloadEndDate) ? 'not-allowed' : 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    fontFamily: 'inherit',
                                    opacity: (!downloadStartDate || !downloadEndDate) ? 0.6 : 1
                                }}
                            >
                                <Download size={16} />
                                Descargar .xlsx
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
