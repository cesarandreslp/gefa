'use client';

/**
 * Formulario para subir documentos a un caso
 * Usa POST /api/v1/cases/[id]/documents
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UploadDocumentFormProps {
  caseId: string;
}

// Catálogo de tipos de documento del expediente (comisaría de familia).
// Los `value` corresponden al enum DocumentType del schema.
const DOCUMENT_TYPES = [
  { value: 'DENUNCIA', label: 'Denuncia o solicitud inicial' },
  { value: 'ACTA', label: 'Acta de audiencia o conciliación' },
  { value: 'AUTO', label: 'Auto o resolución (medida, PARD)' },
  { value: 'VALORACION', label: 'Valoración del equipo interdisciplinario' },
  { value: 'OFICIO', label: 'Oficio' },
  { value: 'CITACION', label: 'Citación o notificación' },
  { value: 'EVIDENCE', label: 'Evidencia o soporte' },
  { value: 'OTHER', label: 'Otro' },
];

export default function UploadDocumentForm({ caseId }: UploadDocumentFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validar tamaño (25 MB)
    if (selectedFile.size > 25 * 1024 * 1024) {
      setError('El archivo no puede superar 25 MB');
      setFile(null);
      return;
    }

    // Validar tipo
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'audio/mpeg',
      'audio/mp3',
      'video/mp4',
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Solo se permiten archivos PDF, DOCX, JPG, PNG, MP3 o MP4');
      setFile(null);
      return;
    }

    setError('');
    setFile(selectedFile);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!file) {
      setError('Debe seleccionar un archivo');
      setLoading(false);
      return;
    }

    if (!documentType) {
      setError('Debe seleccionar el tipo de documento');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      if (description.trim()) {
        formData.append('description', description.trim());
      }

      const res = await fetch(`/api/v1/cases/${caseId}/documents`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al subir documento');
        setLoading(false);
        return;
      }

      setSuccess('Documento subido exitosamente');
      setFile(null);
      setDocumentType('');
      setDescription('');
      setLoading(false);

      // Limpiar input file
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Recargar la página para ver el nuevo documento
      setTimeout(() => {
        router.refresh();
        setSuccess('');
      }, 1500);
    } catch {
      setError('Error de conexión');
      setLoading(false);
    }
  }

  return (
    <div style={{ 
      backgroundColor: 'white', 
      padding: '1.5rem', 
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.125rem' }}>
        Subir Documento
      </h3>

      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ 
            padding: '0.75rem', 
            marginBottom: '1rem', 
            backgroundColor: '#fee', 
            color: '#c00',
            borderRadius: '4px',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ 
            padding: '0.75rem', 
            marginBottom: '1rem', 
            backgroundColor: '#d4edda', 
            color: '#155724',
            borderRadius: '4px',
            fontSize: '0.875rem'
          }}>
            {success}
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
            Archivo <span style={{ color: '#c00' }}>*</span>
          </label>
          <input
            id="file-input"
            type="file"
            onChange={handleFileChange}
            disabled={loading}
            accept=".pdf,.docx,.jpg,.jpeg,.png,.mp3,.mp4"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '0.875rem'
            }}
          />
          <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
            PDF, DOCX, JPG, PNG, MP3, MP4 - Máximo 25 MB
          </div>
          {file && (
            <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: '#28a745' }}>
              ✓ {file.name} ({(file.size / 1024).toFixed(0)} KB)
            </div>
          )}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
            Tipo de documento <span style={{ color: '#c00' }}>*</span>
          </label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '0.5rem', 
              border: '1px solid #ddd', 
              borderRadius: '4px'
            }}
          >
            <option value="">Seleccione...</option>
            {DOCUMENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
            Descripción (opcional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            rows={2}
            style={{ 
              width: '100%', 
              padding: '0.5rem', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
            placeholder="Breve descripción del documento..."
          />
        </div>

        <button
          type="submit"
          disabled={loading || !file}
          style={{ 
            width: '100%', 
            padding: '0.75rem', 
            backgroundColor: (loading || !file) ? '#ccc' : '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: (loading || !file) ? 'not-allowed' : 'pointer',
            fontWeight: 500
          }}
        >
          {loading ? 'Subiendo...' : 'Subir documento'}
        </button>
      </form>
    </div>
  );
}
