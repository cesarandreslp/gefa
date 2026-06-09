/**
 * Formulario de Contacto Simple
 * 
 * Para consultas generales que no requieren trámite formal
 * Más simple que el formulario de solicitud
 */

'use client';

import { useState } from 'react';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.length < 3) {
      newErrors.name = 'Nombre requerido (mínimo 3 caracteres)';
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email válido requerido';
    }

    if (!formData.subject || formData.subject.length < 5) {
      newErrors.subject = 'Asunto requerido (mínimo 5 caracteres)';
    }

    if (!formData.message || formData.message.length < 10) {
      newErrors.message = 'Mensaje requerido (mínimo 10 caracteres)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/api/v1/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: data.data.message,
        });

        // Limpiar formulario
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: '',
        });
      } else {
        setResult({
          success: false,
          message: data.error?.message || 'Error al enviar el mensaje',
        });
      }
    } catch (error) {
      console.error('Error submitting contact form:', error);
      setResult({
        success: false,
        message: 'Error de conexión. Por favor intente nuevamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h1>Formulario de Contacto</h1>
      
      <p>
        Si tiene consultas generales, comentarios o sugerencias, puede contactarnos a través de este formulario.
      </p>

      <p style={{ padding: '1rem', backgroundColor: '#fff3cd', border: '1px solid #ffc107', marginBottom: '1.5rem' }}>
        <strong>Nota:</strong> Si necesita presentar una solicitud formal, petición, queja o reclamo que requiera 
        número de radicación y seguimiento oficial, por favor use el{' '}
        <a href="/atencion-ciudadano/solicitud" style={{ color: 'var(--color-primary-light)' }}>
          <strong>Formulario de Solicitud General</strong>
        </a>.
      </p>

      {result && (
        <div 
          role="alert"
          aria-live="polite"
          style={{
          padding: '1rem',
          marginBottom: '1rem',
          borderRadius: '4px',
          backgroundColor: result.success ? '#d4edda' : '#f8d7da',
          color: result.success ? '#155724' : '#721c24',
          border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
        }}>
          <strong>{result.success ? '✓ Éxito' : '✗ Error'}</strong>
          <p>{result.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Nombre Completo *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Su nombre completo"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && (
            <span id="name-error" role="alert" style={{ color: '#c00', fontWeight: 600 }}>
              {errors.name}
            </span>
          )}
        </div>

        <div>
          <label htmlFor="email">Email *</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="correo@ejemplo.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <span id="email-error" role="alert" style={{ color: '#c00', fontWeight: 600 }}>
              {errors.email}
            </span>
          )}
        </div>

        <div>
          <label htmlFor="phone">Teléfono (opcional)</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="3001234567"
          />
        </div>

        <div>
          <label htmlFor="subject">Asunto *</label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            required
            placeholder="Breve descripción del asunto"
            maxLength={200}
            aria-invalid={!!errors.subject}
            aria-describedby={errors.subject ? 'subject-error' : 'subject-hint'}
          />
          {errors.subject && (
            <span id="subject-error" role="alert" style={{ color: '#c00', fontWeight: 600 }}>
              {errors.subject}
            </span>
          )}
          <small id="subject-hint">{formData.subject.length}/200 caracteres</small>
        </div>

        <div>
          <label htmlFor="message">Mensaje *</label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            placeholder="Escriba su mensaje aquí"
            rows={8}
            maxLength={1000}
            aria-invalid={!!errors.message}
            aria-describedby={errors.message ? 'message-error' : 'message-hint'}
          />
          {errors.message && (
            <span id="message-error" role="alert" style={{ color: '#c00', fontWeight: 600 }}>
              {errors.message}
            </span>
          )}
          <small id="message-hint">{formData.message.length}/1000 caracteres</small>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: isSubmitting ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar Mensaje'}
          </button>
        </div>
      </form>

      <div style={{ marginTop: '2rem' }}>
        <h2>Otros Canales de Contacto</h2>
        <p><strong>Teléfono:</strong> (602) 228-0000</p>
        <p><strong>Email:</strong> contacto@entidadciudad.gov.co</p>
        <p><strong>Dirección:</strong> Carrera 10 #10-10, Ciudad/Municipio</p>
        <p><strong>Horario:</strong> Lunes a Viernes, 8:00 AM - 12:00 PM y 2:00 PM - 6:00 PM</p>
      </div>
    </div>
  );
}
