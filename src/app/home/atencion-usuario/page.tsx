'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Save, RotateCcw, Settings, Plus, Trash2, X } from 'lucide-react';

export default function AtencionUsuarioPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);


    const getTodayDate = () => {
        const today = new Date();
        const offset = today.getTimezoneOffset();
        today.setMinutes(today.getMinutes() - offset);
        return today.toISOString().split('T')[0];
    };

    const initialFormData: Record<string, string> = {
        'FECHA': getTodayDate(),
        'NOMBRE COMPLETO': '',
        'TIPO DE DOCUMENTO': '',
        'NÚMERO DE DOCUMENTO': '',
        'EDAD': '',
        'TELÉFONO': '',
        'GÉNERO': '',
        'DISCAPACIDAD': '',
        'ETNIA': '',
        'ESCOLARIDAD': '',
        'BARRIO': '',
        'DEPENDENCIA': '',
        'ASUNTO': '',
        'DESCRIPCIÓN': '',
        'EPS': '',
        'RESPONSABLE DEL CASO': ''
    };

    const [formData, setFormData] = useState<Record<string, string>>({ ...initialFormData });
    const [dropdownOptions, setDropdownOptions] = useState<Record<string, string[]>>({});
    const [rawDropdowns, setRawDropdowns] = useState<{ id: string; category: string; value: string }[]>([]); // for delete logic
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [activeConfigTab, setActiveConfigTab] = useState('RESPONSABLE DEL CASO');
    const [newOptionValue, setNewOptionValue] = useState('');
    const [isSavingOption, setIsSavingOption] = useState(false);

    const loadDropdowns = async () => {
        try {
            const res = await fetch('/api/v1/dropdown-options');
            if (res.ok) {
                const json = await res.json();
                if (json.success) {
                    setDropdownOptions(json.data);
                    setRawDropdowns(json.rawData);
                }
            }
        } catch (e) {
            console.error('Error fetching dropdowns:', e);
        }
    };

    useEffect(() => {
        const isAuthenticated = localStorage.getItem('isAuthenticated');
        if (!isAuthenticated || isAuthenticated !== 'true') {
            router.push('/');
            return;
        }

        const fetchRole = async () => {
            try {
                const res = await fetch('/api/v1/auth/me', {
                    headers: { 'Content-Type': 'application/json' }
                });
                if (res.ok) {
                    const data = await res.json();
                    const userRoleCode = data.data?.user?.role?.code;
                    // Permitir a VENTANILLA_UNICA o AUXILIAR, aunque el requisito original era de Auxiliar, aseguramos acceso administrativo
                    if (userRoleCode !== 'AUXILIAR_ATENCION_USUARIO' && userRoleCode !== 'VENTANILLA_UNICA' && userRoleCode !== 'ADMIN') {
                        router.push('/home');
                        return;
                    }
                    
                    // User load successful, load dropdown options
                    await loadDropdowns();
                }
            } catch (error) {
                console.error('Error cargando datos:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRole();
    }, [router]);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleReset = () => {
        setFormData({ ...initialFormData, 'FECHA': getTodayDate() });
    };

    // Validar que todos los campos estén llenos
    const isFormComplete = Object.values(formData).every(val => val.trim() !== '');

    const handleSubmit = () => {
        if (!isFormComplete) return;

        // Leer registros existentes del localStorage
        const existingData = localStorage.getItem('registroAtenciones');
        const registros: Record<string, string>[] = existingData ? JSON.parse(existingData) : [];

        // Agregar el nuevo registro
        registros.push({ ...formData });

        // Guardar en localStorage
        localStorage.setItem('registroAtenciones', JSON.stringify(registros));

        alert('Registro guardado exitosamente. Puede verlo en la tabla de Registros.');
        handleReset();
    };

    const handleAddOption = async () => {
        if (!newOptionValue.trim()) return;
        setIsSavingOption(true);
        try {
            const res = await fetch('/api/v1/dropdown-options', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: activeConfigTab, value: newOptionValue })
            });
            const data = await res.json();
            if (data.success) {
                setNewOptionValue('');
                await loadDropdowns();
            } else {
                alert(data.message || 'Error al añadir opción');
            }
        } catch (error) {
            console.error(error);
            alert('Error al añadir opción');
        } finally {
            setIsSavingOption(false);
        }
    };

    const handleDeleteOption = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta opción?')) return;
        try {
            const res = await fetch(`/api/v1/dropdown-options/${id}`, { method: 'DELETE' });
            if (res.ok) {
                await loadDropdowns();
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) {
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
                    <p style={{ fontSize: '1rem', opacity: 0.7 }}>Cargando...</p>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    // Estilos reutilizables
    const labelStyle: React.CSSProperties = {
        display: 'block',
        fontSize: '0.8rem',
        fontWeight: 600,
        color: '#475569',
        marginBottom: '6px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px 16px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        color: '#1e293b',
        fontSize: '0.925rem',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'all 0.2s',
        fontFamily: 'inherit'
    };

    const selectStyle: React.CSSProperties = {
        ...inputStyle,
        appearance: 'auto' as never,
        cursor: 'pointer'
    };

    const textareaStyle: React.CSSProperties = {
        ...inputStyle,
        minHeight: '100px',
        resize: 'vertical' as never
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            color: '#e2e8f0'
        }}>
            {/* Content */}
            <main style={{ padding: 'clamp(16px, 4vw, 32px)', maxWidth: '960px', margin: '0 auto' }}>
                {/* Title */}
                <div style={{
                    marginBottom: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                        }}>
                            <ClipboardList size={24} color="white" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
                                Nuevo Registro de Atención
                            </h2>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                                Complete los datos del ciudadano atendido
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form Card */}
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    padding: 'clamp(16px, 4vw, 32px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                    color: '#1e293b'
                }}>
                    {/* Fila 1: Fecha */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={labelStyle}>Fecha</label>
                        <input
                            type="date"
                            value={formData['FECHA']}
                            onChange={(e) => handleChange('FECHA', e.target.value)}
                            style={{ ...inputStyle, maxWidth: '220px' }}
                            onFocus={(e) => { e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
                        />
                    </div>

                    {/* Fila 2: Nombre Completo */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={labelStyle}>Nombre Completo</label>
                        <input
                            type="text"
                            value={formData['NOMBRE COMPLETO']}
                            onChange={(e) => handleChange('NOMBRE COMPLETO', e.target.value)}
                            style={inputStyle}
                            onFocus={(e) => { e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
                        />
                    </div>

                    {/* Fila 3: Tipo de Documento + Número de Documento */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                        <div>
                            <label style={labelStyle}>Tipo de Documento</label>
                            <select
                                value={formData['TIPO DE DOCUMENTO']}
                                onChange={(e) => handleChange('TIPO DE DOCUMENTO', e.target.value)}
                                style={selectStyle}
                                onFocus={(e) => { e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
                            >
                                <option value="">Seleccionar...</option>
                                <option value="Cédula de ciudadanía (CC)">Cédula de ciudadanía (CC)</option>
                                <option value="Cédula de extranjería (CE)">Cédula de extranjería (CE)</option>
                                <option value="Permiso especial de permanencia (PEP)">Permiso especial de permanencia (PEP)</option>
                                <option value="Tarjeta de identidad (TI)">Tarjeta de identidad (TI)</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Número de Documento</label>
                            <input
                                type="text"
                                value={formData['NÚMERO DE DOCUMENTO']}
                                onChange={(e) => handleChange('NÚMERO DE DOCUMENTO', e.target.value)}
                                style={inputStyle}
                                onFocus={(e) => { e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
                            />
                        </div>
                    </div>

                    {/* Fila 4: Edad + Teléfono + Género */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                        <div>
                            <label style={labelStyle}>Edad</label>
                            <input
                                type="number"
                                min="0"
                                max="150"
                                value={formData['EDAD']}
                                onChange={(e) => handleChange('EDAD', e.target.value)}
                                style={inputStyle}
                                onFocus={(e) => { e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Teléfono</label>
                            <input
                                type="tel"
                                value={formData['TELÉFONO']}
                                onChange={(e) => handleChange('TELÉFONO', e.target.value)}
                                style={inputStyle}
                                onFocus={(e) => { e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Género</label>
                            <select
                                value={formData['GÉNERO']}
                                onChange={(e) => handleChange('GÉNERO', e.target.value)}
                                style={selectStyle}
                                onFocus={(e) => { e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
                            >
                                <option value="">Seleccionar...</option>
                                <option value="Hombre">Hombre</option>
                                <option value="Mujer">Mujer</option>
                                <option value="LGBTIQ+">LGBTIQ+</option>
                            </select>
                        </div>
                    </div>

                    {/* Fila 5: Discapacidad + Etnia */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                        <div>
                            <label style={labelStyle}>Discapacidad</label>
                            <select
                                value={formData['DISCAPACIDAD']}
                                onChange={(e) => handleChange('DISCAPACIDAD', e.target.value)}
                                style={selectStyle}
                                onFocus={(e) => { e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
                            >
                                <option value="">Seleccionar...</option>
                                {dropdownOptions['DISCAPACIDAD']?.map((opt, idx) => (
                                    <option key={idx} value={opt}>{opt}</option>
                                )) || <option disabled>Cargando...</option>}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Etnia</label>
                            <select
                                value={formData['ETNIA']}
                                onChange={(e) => handleChange('ETNIA', e.target.value)}
                                style={selectStyle}
                                onFocus={(e) => { e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
                            >
                                <option value="">Seleccionar...</option>
                                {dropdownOptions['ETNIA']?.map((opt, idx) => (
                                    <option key={idx} value={opt}>{opt}</option>
                                )) || <option disabled>Cargando...</option>}
                            </select>
                        </div>
                    </div>

                    {/* Fila 6: Escolaridad + EPS */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                        <div>
                            <label style={labelStyle}>Escolaridad</label>
                            <select
                                value={formData['ESCOLARIDAD']}
                                onChange={(e) => handleChange('ESCOLARIDAD', e.target.value)}
                                style={selectStyle}
                                onFocus={(e) => { e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
                            >
                                <option value="">Seleccionar...</option>
                                <option value="Primaria">Primaria</option>
                                <option value="Secundaria">Secundaria</option>
                                <option value="Técnico">Técnico</option>
                                <option value="Tecnólogo">Tecnólogo</option>
                                <option value="Profesional">Profesional</option>
                                <option value="Sin Estudios">Sin Estudios</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>EPS</label>
                            <select
                                value={formData['EPS']}
                                onChange={(e) => handleChange('EPS', e.target.value)}
                                style={selectStyle}
                                onFocus={(e) => { e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
                            >
                                <option value="">Seleccionar...</option>
                                {dropdownOptions['EPS']?.map((opt, idx) => (
                                    <option key={idx} value={opt}>{opt}</option>
                                )) || <option disabled>Cargando...</option>}
                            </select>
                        </div>
                    </div>

                    {/* Fila 7: Barrio */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={labelStyle}>Barrio</label>
                        <input
                            type="text"
                            value={formData['BARRIO']}
                            onChange={(e) => handleChange('BARRIO', e.target.value)}
                            style={inputStyle}
                            onFocus={(e) => { e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                        />
                    </div>

                    {/* Fila 8: Dependencia + Atendido Por */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                        <div>
                            <label style={labelStyle}>Dependencia</label>
                            <select
                                value={formData['DEPENDENCIA']}
                                onChange={(e) => handleChange('DEPENDENCIA', e.target.value)}
                                style={selectStyle}
                                onFocus={(e) => { e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
                            >
                                <option value="">Seleccionar...</option>
                                {dropdownOptions['DEPENDENCIA']?.map((opt, idx) => (
                                    <option key={idx} value={opt}>{opt}</option>
                                )) || <option disabled>Cargando...</option>}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Responsable del Caso</label>
                            <select
                                value={formData['RESPONSABLE DEL CASO']}
                                onChange={(e) => handleChange('RESPONSABLE DEL CASO', e.target.value)}
                                style={selectStyle}
                                onFocus={(e) => { e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
                            >
                                <option value="">Seleccionar...</option>
                                {dropdownOptions['RESPONSABLE DEL CASO']?.map((opt, idx) => (
                                    <option key={idx} value={opt}>{opt}</option>
                                )) || <option disabled>Cargando...</option>}
                            </select>
                        </div>
                    </div>

                    {/* Fila 9: Asunto */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={labelStyle}>Asunto</label>
                        <select
                            value={formData['ASUNTO']}
                            onChange={(e) => handleChange('ASUNTO', e.target.value)}
                            style={selectStyle}
                            onFocus={(e) => { e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
                        >
                            <option value="">Seleccionar...</option>
                            {dropdownOptions['ASUNTO']?.map((opt, idx) => (
                                <option key={idx} value={opt}>{opt}</option>
                            )) || <option disabled>Cargando...</option>}
                        </select>
                    </div>

                    {/* Fila 10: Descripción */}
                    <div style={{ marginBottom: '32px' }}>
                        <label style={labelStyle}>Descripción</label>
                        <textarea
                            value={formData['DESCRIPCIÓN']}
                            onChange={(e) => handleChange('DESCRIPCIÓN', e.target.value)}
                            style={textareaStyle}
                            onFocus={(e) => { e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                        />
                    </div>

                    {/* Botones */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            <button
                                onClick={() => router.push('/home/registro')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 24px',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    color: '#10b981',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: 500,
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; }}
                            >
                                <ClipboardList size={16} />
                                Ver Registros
                            </button>
                            <button
                                onClick={() => setShowConfigModal(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 24px',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    color: 'var(--color-primary)',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: 500,
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; }}
                            >
                                <Settings size={16} />
                                Configurar Listas
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            <button
                                onClick={handleReset}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 24px',
                                    background: 'rgba(100, 116, 139, 0.15)',
                                    border: '1px solid rgba(100, 116, 139, 0.3)',
                                    color: '#94a3b8',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: 500,
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(100, 116, 139, 0.25)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(100, 116, 139, 0.15)'; }}
                            >
                                <RotateCcw size={16} />
                                Limpiar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!isFormComplete}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 32px',
                                    background: isFormComplete
                                        ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                                        : '#94a3b8',
                                    border: 'none',
                                    color: 'white',
                                    borderRadius: '10px',
                                    cursor: isFormComplete ? 'pointer' : 'not-allowed',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    transition: 'all 0.2s',
                                    boxShadow: isFormComplete
                                        ? '0 4px 16px rgba(59, 130, 246, 0.3)'
                                        : 'none',
                                    opacity: isFormComplete ? 1 : 0.6
                                }}
                                onMouseOver={(e) => { if (isFormComplete) e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.45)'; }}
                                onMouseOut={(e) => { if (isFormComplete) e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.3)'; }}
                            >
                                <Save size={16} />
                                Guardar Registro
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Config Modal */}
            {showConfigModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    color: '#1e293b'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '24px',
                        width: 'calc(100% - 32px)',
                        margin: '0 16px',
                        maxWidth: '600px',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        {/* Header */}
                        <div style={{ padding: 'clamp(16px, 4vw, 24px)', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '40px', height: '40px',
                                    borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Settings size={20} color="var(--color-primary)" />
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Configurar Listas</h3>
                            </div>
                            <button onClick={() => setShowConfigModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        {/* Body */}
                        <div style={{ padding: 'clamp(16px, 4vw, 24px)', overflowY: 'auto' }}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={labelStyle}>Seleccionar Categoría a Editar</label>
                                <select 
                                    style={selectStyle} 
                                    value={activeConfigTab} 
                                    onChange={(e) => setActiveConfigTab(e.target.value)}
                                >
                                    <option value="RESPONSABLE DEL CASO">Responsable del Caso</option>
                                    <option value="DEPENDENCIA">Dependencia</option>
                                    <option value="ASUNTO">Asunto</option>
                                    <option value="DISCAPACIDAD">Discapacidad</option>
                                    <option value="ETNIA">Etnia</option>
                                    <option value="EPS">EPS</option>
                                </select>
                            </div>

                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                                <h4 style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Opciones Actuales
                                </h4>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {dropdownOptions[activeConfigTab]?.map((opt, idx) => {
                                        const rawItem = rawDropdowns.find(r => r.category === activeConfigTab && r.value === opt);
                                        return (
                                            <li key={idx} style={{ 
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                                background: 'white', padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' 
                                            }}>
                                                <span style={{ fontSize: '0.9rem' }}>{opt}</span>
                                                {rawItem && (
                                                    <button 
                                                        onClick={() => handleDeleteOption(rawItem.id)}
                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7, padding: '4px' }}
                                                        onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                                                        onMouseOut={(e) => e.currentTarget.style.opacity = '0.7'}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </li>
                                        );
                                    })}
                                    {(!dropdownOptions[activeConfigTab] || dropdownOptions[activeConfigTab].length === 0) && (
                                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0', fontSize: '0.9rem' }}>
                                            No hay opciones en esta categoría
                                        </div>
                                    )}
                                </ul>

                                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                                    <input 
                                        type="text" 
                                        placeholder="Nueva opción..." 
                                        style={inputStyle}
                                        value={newOptionValue}
                                        onChange={(e) => setNewOptionValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
                                    />
                                    <button 
                                        onClick={handleAddOption}
                                        disabled={isSavingOption || !newOptionValue.trim()}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px',
                                            background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '10px',
                                            cursor: (isSavingOption || !newOptionValue.trim()) ? 'not-allowed' : 'pointer',
                                            opacity: (isSavingOption || !newOptionValue.trim()) ? 0.6 : 1, fontWeight: 500
                                        }}
                                    >
                                        <Plus size={18} /> Añadir
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
