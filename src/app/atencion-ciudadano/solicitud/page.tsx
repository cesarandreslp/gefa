/**
 * Formulario de Solicitud General
 * 
 * Permite a los ciudadanos presentar solicitudes formales
 * que se registran en el sistema con número de radicación
 * 
 * Validaciones en cliente y servidor
 * Cumplimiento Ley 1581/2012 (Habeas Data)
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, User, Mail, Phone, MapPin, AlertCircle, CheckCircle, Shield, Search, Info } from 'lucide-react';

export default function GeneralRequestForm() {
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
  const [result, setResult] = useState<{ success: boolean; message: string; filingNumber?: string; isAnonymous?: boolean; assignedTo?: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comprobante de Radicación</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #003d7a; }
            .content { border: 2px solid #003d7a; padding: 30px; border-radius: 8px; }
            .filing-number { font-size: 28px; color: #003d7a; font-weight: bold; text-align: center; margin: 20px 0; }
            .info { margin: 15px 0; }
            .label { font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Entidad Institucional</div>
            <p>Comprobante de Radicación de Solicitud</p>
          </div>
          <div class="content">
            <div class="filing-number">${result?.filingNumber}</div>
            <div class="info">
              <span class="label">Fecha de radicación:</span> ${new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div class="info">
              <span class="label">Hora:</span> ${new Date().toLocaleTimeString('es-CO')}
            </div>
            <div class="info">
              <span class="label">Ciudadano:</span> ${formData.firstName} ${formData.lastName}
            </div>
            <div class="info">
              <span class="label">Documento:</span> ${formData.documentType} ${formData.documentNumber}
            </div>
            <div class="info">
              <span class="label">Asunto:</span> ${formData.subject}
            </div>
          </div>
          <div class="footer">
            <p>Conserve este comprobante para hacer seguimiento a su solicitud</p>
            <p>Valle del Cauca, Colombia</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDownload = () => {
    const content = `
Entidad Institucional
COMPROBANTE DE RADICACIÓN

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NÚMERO DE RADICACIÓN: ${result?.filingNumber}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fecha: ${new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
Hora: ${new Date().toLocaleTimeString('es-CO')}

Ciudadano: ${formData.firstName} ${formData.lastName}
Documento: ${formData.documentType} ${formData.documentNumber}
Asunto: ${formData.subject}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Conserve este comprobante para hacer seguimiento
a su solicitud.

Valle del Cauca, Colombia
    `;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Comprobante-${result?.filingNumber}.txt`;
    link.click();
    URL.revokeObjectURL(url);
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

      if (!formData.phone || formData.phone.length < 7) {
        newErrors.phone = 'Teléfono requerido (mínimo 7 dígitos)';
      }

      if (!formData.address || formData.address.length < 5) {
        newErrors.address = 'Dirección requerida';
      }

      if (!formData.neighborhood || formData.neighborhood.length < 2) {
        newErrors.neighborhood = 'Barrio requerido';
      }

      if (!formData.dataConsent) {
        newErrors.dataConsent = 'Debe aceptar el tratamiento de datos personales';
      }
    }

    if (!formData.subject || formData.subject.length < 10) {
      newErrors.subject = 'Asunto requerido (mínimo 10 caracteres)';
    }

    if (!formData.description || formData.description.length < 20) {
      newErrors.description = 'Descripción requerida (mínimo 20 caracteres)';
    }

    if (!formData.isAnonymous) {
      if (!formData.city || formData.city.length < 2) {
        newErrors.city = 'Municipio requerido';
      }
      if (!formData.department || formData.department.length < 2) {
        newErrors.department = 'Departamento requerido';
      }
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

    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/api/v1/cases/general-request', {
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

      if (data.success) {
        const caseId = data.data?.caseId;

        // Subir archivos adjuntos uno por uno
        if (selectedFiles.length > 0 && caseId) {
          for (const file of selectedFiles) {
            try {
              const fd = new FormData();
              fd.append('file', file);
              fd.append('caseId', caseId);
              fd.append('documentType', 'PETITION');
              fd.append('description', 'Documento adjunto inicial');
              const uploadResponse = await fetch('/api/v1/documents/upload-public', {
                method: 'POST',
                body: fd,
              });
              if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json();
                console.error('❌ Error subiendo archivo:', errorData.error || 'Error desconocido');
              }
            } catch (uploadError) {
              console.error('Error subiendo archivo:', uploadError);
            }
          }
        }

        setResult({
          success: true,
          message: data.data.message,
          filingNumber: data.data.filingNumber,
          isAnonymous: formData.isAnonymous,
          assignedTo: data.data.assignedTo,
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
        setSelectedFiles([]);
      } else {
        setResult({
          success: false,
          message: data.error?.message || 'Error al enviar la solicitud',
        });
      }
    } catch (error) {
      console.error('Error submitting general request:', error);
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
      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #003d7a 0%, #0056b3 100%)',
        padding: 'var(--spacing-lg) var(--spacing-md)',
        color: 'white',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-sm)' }}>
            <FileText size={40} strokeWidth={1.5} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: 'var(--spacing-xs)', color: 'white' }}>
            Presentar Solicitud General
          </h1>
          <p style={{ fontSize: '0.95rem', opacity: 0.95, lineHeight: 1.5, marginBottom: 'var(--spacing-md)' }}>
            Complete el siguiente formulario para presentar una solicitud, petición, queja, reclamo o sugerencia.
            Su solicitud será radicada y recibirá un número de radicación para hacer seguimiento.
          </p>

          {/* Botón Consultar Estado */}
          <div style={{ marginTop: 'var(--spacing-lg)' }}>
            <Link
              href="/atencion-ciudadano/consultar"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 24px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                fontSize: '0.95rem',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Search size={18} />
              ¿Ya tienes un radicado? Consulta tu estado aquí
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: 'var(--spacing-2xl) var(--spacing-xl)'
      }}>
        {/* Indicador de Carga Global */}
        {isSubmitting && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)'
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '40px 60px',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              textAlign: 'center',
              maxWidth: '90%'
            }}>
              <svg
                width="60"
                height="60"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2"
                className="spinner-icon"
                style={{ marginBottom: '20px' }}
              >
                <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
                <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"></path>
              </svg>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#333',
                marginBottom: '12px'
              }}>
                Radicando su solicitud...
              </h3>
              <p style={{
                color: '#666',
                fontSize: '1rem',
                lineHeight: 1.5
              }}>
                Por favor espere mientras procesamos su información.<br />
                No cierre esta ventana.
              </p>
            </div>
          </div>
        )}

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
                {result.success ? '✓ Solicitud Enviada Exitosamente' : '✗ Error al Enviar'}
              </strong>
              <p style={{ marginBottom: result.filingNumber ? 'var(--spacing-sm)' : 0 }}>{result.message}</p>
              {result.filingNumber && (
                <div style={{
                  padding: 'var(--spacing-md)',
                  backgroundColor: 'white',
                  borderRadius: 'var(--border-radius-md)',
                  marginTop: 'var(--spacing-md)'
                }}>
                  <strong style={{ color: '#155724', fontSize: '1.25rem', display: 'block', marginBottom: result.assignedTo ? 'var(--spacing-xs)' : 0 }}>
                    Número de Radicación: {result.filingNumber}
                  </strong>
                  {result.assignedTo && (
                    <p style={{ margin: 0, color: '#155724', fontSize: '1.05rem' }}>
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
                    Su solicitud fue registrada correctamente de manera <strong>anónima</strong>, por lo cual no recibirá notificaciones por correo electrónico ni se solicitarán datos personales adicionales.
                  </p>
                  <p style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '0.95rem' }}>
                    Para realizar seguimiento al estado de su solicitud, deberá ingresar al siguiente enlace:<br />
                    <Link href="/atencion-ciudadano/consultar" style={{ fontWeight: 'bold', color: '#1d4ed8', textDecoration: 'underline', display: 'inline-block', marginTop: '4px' }}>
                      Consultar estado de solicitud
                    </Link>
                  </p>
                  <p style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '0.95rem' }}>
                    Allí deberá ingresar su número de radicado para consultar el estado, las respuestas del funcionario y las actualizaciones del caso.
                  </p>
                  <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold' }}>
                    ⚠️ Importante: El número de radicado es el único medio para consultar su solicitud. Guárdelo en un lugar seguro.
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
                  Enviar petición anónima
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
                    Su solicitud será enviada de manera anónima y no se solicitarán datos personales para su radicación.
                  </p>
                  <p style={{ margin: '0 0 var(--spacing-xs) 0', color: '#15803d', fontWeight: '500' }}>
                    Es obligatorio diligenciar únicamente:
                  </p>
                  <ul style={{ margin: '0 0 var(--spacing-sm) 0', paddingLeft: 'var(--spacing-xl)', color: '#15803d', lineHeight: '1.5' }}>
                    <li>El asunto de la solicitud.</li>
                    <li>La descripción detallada del caso.</li>
                  </ul>
                  <p style={{ margin: 0, color: '#15803d', lineHeight: '1.5' }}>
                    De manera opcional, puede adjuntar archivos como soporte si lo considera necesario.
                  </p>
                </div>
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 'var(--spacing-lg)',
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
                  multiple
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
                {selectedFiles.length > 0 && (
                  <div style={{ marginTop: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', backgroundColor: '#e7f3ff', borderRadius: 'var(--border-radius-md)' }}>
                    {selectedFiles.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <small style={{ color: 'var(--color-primary-light)' }}>✓ {f.name}</small>
                        <button type="button" onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '1rem', lineHeight: 1, padding: '0 4px' }}>×</button>
                      </div>
                    ))}
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
              className="submit-button"
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
                opacity: !formData.dataConsent ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                margin: '0 auto'
              }}
              title={!formData.dataConsent ? 'Debe aceptar el tratamiento de datos personales para continuar' : ''}
            >
              {isSubmitting && (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="spinner-icon"
                >
                  <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
                  <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"></path>
                </svg>
              )}
              {isSubmitting ? 'Enviando solicitud...' : 'Enviar Solicitud'}
            </button>
            {isSubmitting && (
              <p style={{
                marginTop: '15px',
                color: '#666',
                fontSize: '0.95rem',
                fontStyle: 'italic'
              }}>
                Por favor espere, estamos procesando su solicitud...
              </p>
            )}
          </div>
        </form>

        {/* Estilos para animación */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spinner-icon {
            animation: spin 1s linear infinite;
          }
        `}} />

        {/* Información Importante */}
        <div style={{
          marginTop: 'var(--spacing-2xl)',
          padding: 'var(--spacing-xl)',
          backgroundColor: '#e7f3ff',
          border: '1px solid #b3d7ff',
          borderRadius: 'var(--border-radius-lg)'
        }}>
          <p style={{ fontWeight: '600', fontSize: '1.125rem', marginBottom: 'var(--spacing-md)', color: 'var(--color-primary)' }}>
            📋 Información importante:
          </p>
          <ul style={{ margin: 0, paddingLeft: 'var(--spacing-xl)', lineHeight: 1.8 }}>
            <li>Recibirá un número de radicación único al enviar su solicitud</li>
            <li>Podrá consultar el estado con ese número de radicación</li>
            <li>El término de respuesta es de 15 días hábiles</li>
            <li>Los campos marcados con * son obligatorios</li>
          </ul>
        </div>
      </div>


    </div>
  );
}
