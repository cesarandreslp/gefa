/**
 * Formulario de Solicitud General - Ventanilla Única
 * 
 * Permite al personal de Ventanilla Única registrar solicitudes presenciales
 * Las solicitudes se envían a la IA para análisis y asignación automática
 * 
 * Validaciones en cliente y servidor
 * Cumplimiento Ley 1581/2012 (Habeas Data)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, User, Mail, Phone, MapPin, AlertCircle, CheckCircle, Shield, Search, Info } from 'lucide-react';

export default function VentanillaUnicaNewCase() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    documentType: 'CC',
    documentNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    neighborhood: '',
    city: '',
    department: '',
    subject: '',
    description: '',
    dataConsent: false,
    isAnonymous: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; filingNumber?: string; assignedTo?: string; isAnonymous?: boolean } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Limpiar error del campo
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamaño (máximo 25MB)
      if (file.size > 25 * 1024 * 1024) {
        alert('El archivo no debe superar 25MB');
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.isAnonymous) {
      if (!formData.documentNumber || formData.documentNumber.length < 6) {
        newErrors.documentNumber = 'Número de documento inválido';
      }

      if (!formData.firstName || formData.firstName.length < 2) {
        newErrors.firstName = 'Nombre requerido (mínimo 2 caracteres)';
      }

      if (!formData.lastName || formData.lastName.length < 2) {
        newErrors.lastName = 'Apellido requerido (mínimo 2 caracteres)';
      }

      if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Email válido requerido';
      }

      if (!formData.dataConsent) {
        newErrors.dataConsent = 'Debe aceptar el tratamiento de datos personales';
      }

      if (!formData.phone || formData.phone.length < 7) {
        newErrors.phone = 'Teléfono requerido (mínimo 7 dígitos)';
      }

      if (!formData.address || formData.address.length < 5) {
        newErrors.address = 'Dirección requerida';
      }

      if (!formData.neighborhood || formData.neighborhood.length < 2) {
        newErrors.neighborhood = 'Barrio requerido';
      }

      if (!formData.city || formData.city.length < 2) {
        newErrors.city = 'Municipio requerido';
      }
      if (!formData.department || formData.department.length < 2) {
        newErrors.department = 'Departamento requerido';
      }
    }

    if (!formData.subject || formData.subject.length < 10) {
      newErrors.subject = 'Asunto requerido (mínimo 10 caracteres)';
    }

    if (!formData.description || formData.description.length < 20) {
      newErrors.description = 'Descripción requerida (mínimo 20 caracteres)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Scroll suave hacia la parte superior
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (!validateForm()) {
      return;
    }

    // Pequeño delay para que se vea el scroll antes del loading
    setTimeout(() => {
      setIsSubmitting(true);
    }, 300);

    setResult(null);

    try {
      // Enviar a la API de IA para análisis y asignación automática
      const response = await fetch('/api/v1/ai/analyze-and-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isAnonymous: formData.isAnonymous,
          citizen: formData.isAnonymous ? undefined : {
            documentType: formData.documentType,
            documentNumber: formData.documentNumber,
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            address: formData.address || undefined,
            neighborhood: formData.neighborhood || undefined,
            city: formData.city || undefined,
            department: formData.department || undefined,
            dataConsent: formData.dataConsent,
          },
          subject: formData.subject,
          description: formData.description,
        }),
      });

      const data = await response.json();

      if (data.success || response.ok) {
        const caseId = data.data?.case?.id;

        // Si hay archivo adjunto y se creó el caso exitosamente, subirlo
        if (selectedFile && caseId) {
          try {
            console.log('📎 Subiendo archivo adjunto...');
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('documentType', 'PETITION');
            formData.append('description', 'Documento adjunto inicial');

            const uploadResponse = await fetch(`/api/v1/cases/${caseId}/documents`, {
              method: 'POST',
              body: formData,
            });

            if (uploadResponse.ok) {
              console.log('✅ Archivo subido exitosamente');
            } else {
              console.error('❌ Error subiendo archivo');
            }
          } catch (uploadError) {
            console.error('Error subiendo archivo:', uploadError);
            // No fallar la operación si falla la subida del archivo
          }
        }

        setResult({
          success: true,
          message: data.message || 'Caso creado y asignado exitosamente',
          filingNumber: data.data?.case?.filingNumber || data.data?.filingNumber,
          assignedTo: data.data?.assignment?.assignedToRole || data.data?.recommendedUserType,
          isAnonymous: formData.isAnonymous,
        });

        // Limpiar formulario
        setFormData({
          documentType: 'CC',
          documentNumber: '',
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: '',
          neighborhood: '',
          city: '',
          department: '',
          subject: '',
          description: '',
          dataConsent: false,
          isAnonymous: false,
        });
        setSelectedFile(null);
      } else {
        setResult({
          success: false,
          message: data.error?.message || data.message || 'Error al enviar la solicitud',
        });
      }
    } catch (error) {
      console.error('Error submitting case:', error);
      setResult({
        success: false,
        message: 'Error de conexión. Por favor intente nuevamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Overlay de carga */}
      {isSubmitting && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '2.5rem 3rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1.5rem'
            }} />
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '0.5rem'
            }}>
              Enviando solicitud...
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              margin: 0
            }}>
              Por favor espere mientras procesamos su solicitud
            </p>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .hero-section {
          background: linear-gradient(135deg, #003d7a 0%, #0056b3 100%);
          padding: 2rem 1.5rem;
          color: white;
        }
        .hero-icon-container {
          display: flex;
          justify-content: center;
          margin-bottom: 1rem;
        }
        .hero-icon {
          width: 40px;
          height: 40px;
        }
        .hero-title {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          text-align: center;
          color: white;
          margin-top: 0;
        }
        .hero-desc {
          font-size: 0.95rem;
          opacity: 0.95;
          line-height: 1.5;
          text-align: center;
          margin: 0;
        }
        .hero-back-btn {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        @media (max-width: 768px) {
          .hero-section {
            padding: 1rem 1rem !important;
          }
          .hero-icon-container {
            display: none !important; /* Hide icon on mobile to save vertical space */
          }
          .hero-title {
            font-size: 1.25rem !important;
            margin-bottom: 0.25rem !important;
          }
          .hero-desc {
            font-size: 0.8rem !important;
            line-height: 1.3 !important;
          }
          .hero-back-btn {
            margin-bottom: 0.5rem !important;
          }
        }
      `}} />

      {/* Hero Section */}
      <div className="hero-section">
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="hero-back-btn">
            <button
              onClick={() => router.back()}
              style={{
                padding: 'var(--spacing-xs) var(--spacing-sm)',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 'var(--border-radius-md)',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              ← Volver
            </button>
          </div>
          <div className="hero-icon-container">
            <FileText className="hero-icon" strokeWidth={1.5} />
          </div>
          <h1 className="hero-title">
            Registro de Solicitud Presencial
          </h1>
          <p className="hero-desc">
            Complete el formulario con los datos del ciudadano. El sistema asignará automáticamente la solicitud al funcionario correspondiente.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: 'var(--spacing-2xl) var(--spacing-xl)'
      }}>
        {result && (
          <div
            role="alert"
            aria-live="polite"
            style={{
              padding: 'var(--spacing-xl)',
              marginBottom: 'var(--spacing-xl)',
              borderRadius: 'var(--border-radius-lg)',
              backgroundColor: result.success ? '#d4edda' : '#f8d7da',
              color: result.success ? '#155724' : '#721c24',
              border: `2px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
              display: 'flex',
              gap: 'var(--spacing-md)',
              alignItems: 'flex-start'
            }}
          >
            {result.success ? (
              <CheckCircle size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
            ) : (
              <AlertCircle size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
            )}
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '1.125rem', display: 'block', marginBottom: 'var(--spacing-sm)' }}>
                {result.success ? '✓ Solicitud Registrada y Asignada' : '✗ Error al Enviar'}
              </strong>
              <p style={{ marginBottom: result.filingNumber ? 'var(--spacing-sm)' : 0 }}>{result.message}</p>
              {result.filingNumber && (
                <div style={{
                  padding: 'var(--spacing-md)',
                  backgroundColor: 'white',
                  borderRadius: 'var(--border-radius-md)',
                  marginTop: 'var(--spacing-md)'
                }}>
                  <strong style={{ color: '#155724', fontSize: '1.25rem', display: 'block', marginBottom: 'var(--spacing-xs)' }}>
                    Número de Radicación: {result.filingNumber}
                  </strong>
                  {result.assignedTo && (
                    <p style={{ margin: 0, color: '#155724' }}>
                      Asignado a: <strong>{result.assignedTo}</strong>
                    </p>
                  )}
                </div>
              )}
              {result.success && result.isAnonymous && (
                <div style={{
                  marginTop: 'var(--spacing-md)',
                  padding: 'var(--spacing-md)',
                  backgroundColor: '#fef9c3', // Light yellow background
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid #fde047', // Yellow border
                  color: '#854d0e', // Dark yellow text
                  lineHeight: '1.6'
                }}>
                  <h4 style={{ margin: '0 0 var(--spacing-sm) 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 'bold' }}>
                    <Search size={20} /> Seguimiento de su solicitud
                  </h4>
                  <p style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '0.95rem' }}>
                    La solicitud fue registrada correctamente de manera <strong>anónima</strong>, por lo cual no se enviarán notificaciones por correo electrónico ni se solicitaron datos personales adicionales.
                  </p>
                  <p style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '0.95rem' }}>
                    Para realizar seguimiento al estado de la solicitud, el ciudadano deberá ingresar al siguiente enlace:<br />
                    <Link href="/atencion-ciudadano/consultar" style={{ fontWeight: 'bold', color: '#1d4ed8', textDecoration: 'underline', display: 'inline-block', marginTop: '4px' }}>
                      Consultar estado de solicitud
                    </Link>
                  </p>
                  <p style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '0.95rem' }}>
                    Allí deberá ingresar el número de radicado para consultar el estado, las respuestas del funcionario y las actualizaciones del caso.
                  </p>
                  <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold' }}>
                    ⚠️ Importante: Instruya al ciudadano que el número de radicado es el único medio para consultar su solicitud. Debe guardarlo en un lugar seguro.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{
          backgroundColor: 'white',
          padding: 'var(--spacing-2xl)',
          borderRadius: 'var(--border-radius-lg)',
          boxShadow: 'var(--shadow-md)'
        }}>
          {/* Sección: Datos del Ciudadano */}
          <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)', paddingBottom: 'var(--spacing-md)', borderBottom: '2px solid var(--color-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                <User size={28} style={{ color: 'var(--color-primary)' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: '600', margin: 0, color: 'var(--color-primary)' }}>
                  Datos del Ciudadano
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="isAnonymous"
                  name="isAnonymous"
                  checked={formData.isAnonymous}
                  onChange={handleChange}
                  style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    cursor: 'pointer'
                  }}
                />
                <label htmlFor="isAnonymous" style={{ fontWeight: '600', color: '#166534', cursor: 'pointer' }}>
                  Radicación anónima
                </label>
              </div>
            </div>

            {formData.isAnonymous && (
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 'var(--border-radius-md)',
                padding: 'var(--spacing-lg)',
                marginBottom: 'var(--spacing-xl)',
                display: 'flex',
                gap: 'var(--spacing-md)',
                alignItems: 'flex-start'
              }}>
                <Info size={24} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h3 style={{ margin: '0 0 var(--spacing-xs) 0', color: '#166534', fontSize: '1.1rem', fontWeight: '600' }}>
                    Petición Anónima
                  </h3>
                  <p style={{ margin: '0 0 var(--spacing-sm) 0', color: '#15803d', lineHeight: '1.5' }}>
                    La solicitud será enviada de manera anónima y no se solicitarán datos personales para su radicación.
                  </p>
                  <p style={{ margin: '0 0 var(--spacing-xs) 0', color: '#15803d', fontWeight: '500' }}>
                    Es obligatorio diligenciar únicamente:
                  </p>
                  <ul style={{ margin: '0 0 var(--spacing-sm) 0', paddingLeft: 'var(--spacing-xl)', color: '#15803d', lineHeight: '1.5' }}>
                    <li>El asunto de la solicitud.</li>
                    <li>La descripción detallada del caso.</li>
                  </ul>
                  <p style={{ margin: 0, color: '#15803d', lineHeight: '1.5' }}>
                    De manera opcional, puede adjuntar archivos como soporte si el ciudadano lo considera necesario.
                  </p>
                </div>
              </div>
            )}

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-lg)',
              opacity: formData.isAnonymous ? 0.5 : 1,
              pointerEvents: formData.isAnonymous ? 'none' : 'auto',
              transition: 'all 0.3s ease'
            }}>
              <div>
                <label htmlFor="documentType" style={{ display: 'block', fontWeight: '500', marginBottom: 'var(--spacing-sm)', color: '#333' }}>
                  Tipo de Documento *
                </label>
                <select
                  id="documentType"
                  name="documentType"
                  value={formData.documentType}
                  onChange={handleChange}
                  required={!formData.isAnonymous}
                  disabled={formData.isAnonymous}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    border: '1px solid #ced4da',
                    borderRadius: 'var(--border-radius-md)',
                    fontSize: '1rem'
                  }}
                >
                  <option value="CC">Cédula de Ciudadanía</option>
                  <option value="TI">Tarjeta de Identidad</option>
                  <option value="CE">Cédula de Extranjería</option>
                  <option value="PA">Pasaporte</option>
                  <option value="RC">Registro Civil</option>
                </select>
              </div>

              <div>
                <label htmlFor="documentNumber" style={{ display: 'block', fontWeight: '500', marginBottom: 'var(--spacing-sm)', color: '#333' }}>
                  Número de Documento *
                </label>
                <input
                  type="text"
                  id="documentNumber"
                  name="documentNumber"
                  value={formData.documentNumber}
                  onChange={handleChange}
                  required={!formData.isAnonymous}
                  disabled={formData.isAnonymous}
                  placeholder="Ej: 1234567890"
                  aria-invalid={!!errors.documentNumber}
                  aria-describedby={errors.documentNumber ? "documentNumber-error" : undefined}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    border: `1px solid ${errors.documentNumber ? '#dc3545' : '#ced4da'}`,
                    borderRadius: 'var(--border-radius-md)',
                    fontSize: '1rem'
                  }}
                />
                {errors.documentNumber && (
                  <span id="documentNumber-error" role="alert" style={{ color: '#dc3545', display: 'block', marginTop: 'var(--spacing-xs)', fontSize: '0.875rem' }}>
                    {errors.documentNumber}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="firstName" style={{ display: 'block', fontWeight: '500', marginBottom: 'var(--spacing-sm)', color: '#333' }}>
                  Nombre *
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required={!formData.isAnonymous}
                  disabled={formData.isAnonymous}
                  placeholder="Nombre completo"
                  aria-invalid={!!errors.firstName}
                  aria-describedby={errors.firstName ? "firstName-error" : undefined}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    border: `1px solid ${errors.firstName ? '#dc3545' : '#ced4da'}`,
                    borderRadius: 'var(--border-radius-md)',
                    fontSize: '1rem'
                  }}
                />
                {errors.firstName && (
                  <span id="firstName-error" role="alert" style={{ color: '#dc3545', display: 'block', marginTop: 'var(--spacing-xs)', fontSize: '0.875rem' }}>
                    {errors.firstName}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="lastName" style={{ display: 'block', fontWeight: '500', marginBottom: 'var(--spacing-sm)', color: '#333' }}>
                  Apellido *
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required={!formData.isAnonymous}
                  disabled={formData.isAnonymous}
                  placeholder="Apellidos completos"
                  aria-invalid={!!errors.lastName}
                  aria-describedby={errors.lastName ? "lastName-error" : undefined}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    border: `1px solid ${errors.lastName ? '#dc3545' : '#ced4da'}`,
                    borderRadius: 'var(--border-radius-md)',
                    fontSize: '1rem'
                  }}
                />
                {errors.lastName && (
                  <span id="lastName-error" role="alert" style={{ color: '#dc3545', display: 'block', marginTop: 'var(--spacing-xs)', fontSize: '0.875rem' }}>
                    {errors.lastName}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="email" style={{ display: 'block', fontWeight: '500', marginBottom: 'var(--spacing-sm)', color: '#333' }}>
                  <Mail size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={formData.isAnonymous}
                  required={!formData.isAnonymous}
                  placeholder="correo@ejemplo.com"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    border: `1px solid ${errors.email ? '#dc3545' : '#ced4da'}`,
                    borderRadius: 'var(--border-radius-md)',
                    fontSize: '1rem'
                  }}
                />
                {errors.email && (
                  <span id="email-error" role="alert" style={{ color: '#dc3545', display: 'block', marginTop: 'var(--spacing-xs)', fontSize: '0.875rem' }}>
                    {errors.email}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="phone" style={{ display: 'block', fontWeight: '500', marginBottom: 'var(--spacing-sm)', color: '#333' }}>
                  <Phone size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                  Teléfono *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={formData.isAnonymous}
                  required={!formData.isAnonymous}
                  placeholder="3001234567"
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    border: `1px solid ${errors.phone ? '#dc3545' : '#ced4da'}`,
                    borderRadius: 'var(--border-radius-md)',
                    fontSize: '1rem'
                  }}
                />
                {errors.phone && (
                  <span id="phone-error" role="alert" style={{ color: '#dc3545', display: 'block', marginTop: 'var(--spacing-xs)', fontSize: '0.875rem' }}>
                    {errors.phone}
                  </span>
                )}
              </div>

              <div style={{ gridColumn: 'auto' }}>
                <label htmlFor="address" style={{ display: 'block', fontWeight: '500', marginBottom: 'var(--spacing-sm)', color: '#333' }}>
                  <MapPin size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                  Dirección *
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={formData.isAnonymous}
                  required={!formData.isAnonymous}
                  placeholder="Calle 10 #10-10"
                  aria-invalid={!!errors.address}
                  aria-describedby={errors.address ? "address-error" : undefined}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    border: `1px solid ${errors.address ? '#dc3545' : '#ced4da'}`,
                    borderRadius: 'var(--border-radius-md)',
                    fontSize: '1rem'
                  }}
                />
                {errors.address && (
                  <span id="address-error" role="alert" style={{ color: '#dc3545', display: 'block', marginTop: 'var(--spacing-xs)', fontSize: '0.875rem' }}>
                    {errors.address}
                  </span>
                )}
              </div>

              <div style={{ gridColumn: 'auto' }}>
                <label htmlFor="neighborhood" style={{ display: 'block', fontWeight: '500', marginBottom: 'var(--spacing-sm)', color: '#333' }}>
                  Barrio *
                </label>
                <input
                  type="text"
                  id="neighborhood"
                  name="neighborhood"
                  value={formData.neighborhood}
                  onChange={handleChange}
                  disabled={formData.isAnonymous}
                  required={!formData.isAnonymous}
                  placeholder="Ej: El Centro"
                  aria-invalid={!!errors.neighborhood}
                  aria-describedby={errors.neighborhood ? "neighborhood-error" : undefined}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    border: `1px solid ${errors.neighborhood ? '#dc3545' : '#ced4da'}`,
                    borderRadius: 'var(--border-radius-md)',
                    fontSize: '1rem'
                  }}
                />
                {errors.neighborhood && (
                  <span id="neighborhood-error" role="alert" style={{ color: '#dc3545', display: 'block', marginTop: 'var(--spacing-xs)', fontSize: '0.875rem' }}>
                    {errors.neighborhood}
                  </span>
                )}
              </div>

              <div style={{ gridColumn: 'auto' }}>
                <label htmlFor="city" style={{ display: 'block', fontWeight: '500', marginBottom: 'var(--spacing-sm)', color: '#333' }}>
                  Municipio *
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  disabled={formData.isAnonymous}
                  required={!formData.isAnonymous}
                  placeholder="Ej: Ciudad/Municipio"
                  aria-invalid={!!errors.city}
                  aria-describedby={errors.city ? "city-error" : undefined}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    border: `1px solid ${errors.city ? '#dc3545' : '#ced4da'}`,
                    borderRadius: 'var(--border-radius-md)',
                    fontSize: '1rem'
                  }}
                />
                {errors.city && (
                  <span id="city-error" role="alert" style={{ color: '#dc3545', display: 'block', marginTop: 'var(--spacing-xs)', fontSize: '0.875rem' }}>
                    {errors.city}
                  </span>
                )}
              </div>

              <div style={{ gridColumn: 'auto' }}>
                <label htmlFor="department" style={{ display: 'block', fontWeight: '500', marginBottom: 'var(--spacing-sm)', color: '#333' }}>
                  Departamento *
                </label>
                <input
                  type="text"
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  disabled={formData.isAnonymous}
                  required={!formData.isAnonymous}
                  placeholder="Ej: Valle del Cauca"
                  aria-invalid={!!errors.department}
                  aria-describedby={errors.department ? "department-error" : undefined}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    border: `1px solid ${errors.department ? '#dc3545' : '#ced4da'}`,
                    borderRadius: 'var(--border-radius-md)',
                    fontSize: '1rem'
                  }}
                />
                {errors.department && (
                  <span id="department-error" role="alert" style={{ color: '#dc3545', display: 'block', marginTop: 'var(--spacing-xs)', fontSize: '0.875rem' }}>
                    {errors.department}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sección: Datos de la Solicitud */}
          <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-xl)',
              paddingBottom: 'var(--spacing-md)',
              borderBottom: '2px solid var(--color-primary)'
            }}>
              <FileText size={28} style={{ color: 'var(--color-primary)' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', margin: 0, color: 'var(--color-primary)' }}>
                Datos de la Solicitud
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
              <div>
                <label htmlFor="subject" style={{ display: 'block', fontWeight: '500', marginBottom: 'var(--spacing-sm)', color: '#333' }}>
                  Asunto *
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="Breve descripción del asunto (mínimo 10 caracteres)"
                  maxLength={200}
                  aria-invalid={!!errors.subject}
                  aria-describedby={errors.subject ? "subject-error subject-counter" : "subject-counter"}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    border: `1px solid ${errors.subject ? '#dc3545' : '#ced4da'}`,
                    borderRadius: 'var(--border-radius-md)',
                    fontSize: '1rem'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--spacing-xs)' }}>
                  {errors.subject && (
                    <span id="subject-error" role="alert" style={{ color: '#dc3545', fontSize: '0.875rem' }}>
                      {errors.subject}
                    </span>
                  )}
                  <small id="subject-counter" aria-live="polite" style={{ color: '#6c757d', fontSize: '0.875rem', marginLeft: 'auto' }}>
                    {formData.subject.length}/200 caracteres
                  </small>
                </div>
              </div>

              <div>
                <label htmlFor="description" style={{ display: 'block', fontWeight: '500', marginBottom: 'var(--spacing-sm)', color: '#333' }}>
                  Descripción Detallada *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  placeholder="Describa detalladamente su solicitud (mínimo 20 caracteres)"
                  rows={8}
                  maxLength={2000}
                  aria-invalid={!!errors.description}
                  aria-describedby={errors.description ? "description-error description-counter" : "description-counter"}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    border: `1px solid ${errors.description ? '#dc3545' : '#ced4da'}`,
                    borderRadius: 'var(--border-radius-md)',
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--spacing-xs)' }}>
                  {errors.description && (
                    <span id="description-error" role="alert" style={{ color: '#dc3545', fontSize: '0.875rem' }}>
                      {errors.description}
                    </span>
                  )}
                  <small id="description-counter" aria-live="polite" style={{ color: '#6c757d', fontSize: '0.875rem', marginLeft: 'auto' }}>
                    {formData.description.length}/2000 caracteres
                  </small>
                </div>
              </div>

              <div>
                <label htmlFor="file" style={{ display: 'block', fontWeight: '500', marginBottom: 'var(--spacing-sm)', color: '#333' }}>
                  Adjuntar Archivo (Opcional)
                </label>
                <input
                  type="file"
                  id="file"
                  name="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp3,.mp4"
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    border: '1px solid #ced4da',
                    borderRadius: 'var(--border-radius-md)',
                    fontSize: '1rem'
                  }}
                />
                <small style={{ color: '#6c757d', fontSize: '0.875rem', display: 'block', marginTop: 'var(--spacing-xs)' }}>
                  Formatos permitidos: PDF, Word, JPG, PNG, MP3, MP4. Tamaño máximo: 25MB
                </small>
                {selectedFile && (
                  <div style={{ marginTop: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', backgroundColor: '#e7f3ff', borderRadius: 'var(--border-radius-md)' }}>
                    <small style={{ color: 'var(--color-primary-light)' }}>✓ Archivo seleccionado: {selectedFile.name}</small>
                  </div>
                )}
              </div>
            </div>
          </div>



          {/* Sección: Autorización de Datos */}
          <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-xl)',
              paddingBottom: 'var(--spacing-md)',
              borderBottom: '2px solid var(--color-primary)'
            }}>
              <Shield size={28} style={{ color: 'var(--color-primary)' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', margin: 0, color: 'var(--color-primary)' }}>
                Autorización de Datos Personales
              </h2>
            </div>

            <div style={{
              padding: 'var(--spacing-xl)',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: 'var(--border-radius-md)',
              marginBottom: 'var(--spacing-lg)'
            }}>
              <p style={{ fontSize: '1rem', fontWeight: '600', marginBottom: 'var(--spacing-md)' }}>
                Ley 1581 de 2012 - Protección de Datos Personales
              </p>
              <p style={{ fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: 'var(--spacing-md)' }}>
                La Entidad Institucional, en cumplimiento de la Ley 1581 de 2012,
                solicita su autorización para recolectar, almacenar y procesar sus datos personales con el
                fin de tramitar su solicitud y mantener comunicación sobre el estado de la misma.
              </p>
              <p style={{ fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: 0 }}>
                Sus datos serán tratados de manera confidencial y no serán compartidos con terceros sin su
                consentimiento, excepto cuando la ley lo requiera.
              </p>
            </div>

            <div style={{
              padding: 'var(--spacing-lg)',
              backgroundColor: errors.dataConsent ? '#f8d7da' : '#e7f3ff',
              border: `2px solid ${errors.dataConsent ? '#dc3545' : 'var(--color-primary-light)'}`,
              borderRadius: 'var(--border-radius-md)'
            }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-md)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="dataConsent"
                  id="dataConsent"
                  checked={formData.dataConsent}
                  onChange={handleChange}
                  required
                  aria-invalid={!!errors.dataConsent}
                  aria-describedby={errors.dataConsent ? "dataConsent-error" : undefined}
                  style={{ marginTop: '4px', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '1rem', fontWeight: '500' }}>
                  Autorizo el tratamiento de mis datos personales conforme a la Ley 1581 de 2012 *
                </span>
              </label>
              {errors.dataConsent && (
                <span id="dataConsent-error" role="alert" style={{ color: '#dc3545', display: 'block', marginTop: 'var(--spacing-sm)', fontSize: '0.875rem', marginLeft: '34px' }}>
                  {errors.dataConsent}
                </span>
              )}
            </div>
          </div>

          {/* Botón de Envío */}
          <div style={{ textAlign: 'center' }}>
            <button
              type="submit"
              disabled={isSubmitting || !formData.dataConsent}
              style={{
                padding: 'var(--spacing-lg) var(--spacing-2xl)',
                backgroundColor: isSubmitting || !formData.dataConsent ? '#6c757d' : 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--border-radius-md)',
                fontSize: '1.125rem',
                fontWeight: '600',
                cursor: isSubmitting || !formData.dataConsent ? 'not-allowed' : 'pointer',
                boxShadow: isSubmitting || !formData.dataConsent ? 'none' : 'var(--shadow-md)',
                transition: 'all 0.3s ease',
                minWidth: '250px',
                opacity: !formData.dataConsent ? 0.6 : 1
              }}
              title={!formData.dataConsent ? 'Debe aceptar el tratamiento de datos personales para continuar' : ''}
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </div>
        </form>
      </div>

      {/* Animación del spinner */}
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
