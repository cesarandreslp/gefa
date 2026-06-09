/**
 * Detalle de un expediente - /admin/cases/[id]
 */

import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { authService } from '@/services/AuthService';
import ChangeStateForm from './ChangeStateForm';
import UploadDocumentForm from './UploadDocumentForm';
import AssignmentSection from './AssignmentSection';

export default async function CaseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Obtener rol del usuario actual
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token');
  let userRole = '';
  
  if (token) {
    try {
      const payload = await authService.verifyToken(token.value);
      userRole = payload.roleCode;
    } catch {
      userRole = '';
    }
  }

  const caseData = await prisma.case.findUnique({
    where: { id: params.id },
    include: {
      citizen: true,
      state: true,
      caseType: true,
    },
  });

  if (!caseData) {
    notFound();
  }

  // Obtener historial de estados
  const stateHistory = await prisma.caseStateHistory.findMany({
    where: { caseId: params.id },
    include: {
      fromState: true,
      toState: true,
      changedByUser: {
        select: {
          email: true,
          fullName: true,
        },
      },
    },
    orderBy: { timestamp: 'desc' },
  });

  // Obtener documentos
  const documents = await prisma.document.findMany({
    where: { caseId: params.id },
    orderBy: { uploadedAt: 'desc' },
  });

  // Obtener todos los estados para el formulario
  const allStates = await prisma.caseState.findMany({
    orderBy: { displayOrder: 'asc' },
  });

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/admin/cases" style={{ color: '#007bff', textDecoration: 'none' }}>
          ← Volver al listado
        </Link>
      </div>

      <h1 style={{ marginBottom: '0.5rem', fontSize: '1.75rem' }}>
        Expediente {caseData.filingNumber}
      </h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Radicado: {new Date(caseData.filedAt).toLocaleString('es-CO')}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Columna izquierda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Datos del caso */}
          <div style={{ 
            backgroundColor: 'white', 
            padding: '1.5rem', 
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>
              Información del Caso
            </h2>
            <dl style={{ margin: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <dt style={{ fontWeight: 600 }}>Ciudadano:</dt>
                <dd style={{ margin: 0 }}>
                  {caseData.citizen.firstName} {caseData.citizen.secondName} {caseData.citizen.firstLastName} {caseData.citizen.secondLastName}
                </dd>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <dt style={{ fontWeight: 600 }}>Documento:</dt>
                <dd style={{ margin: 0 }}>
                  {caseData.citizen.documentType} {caseData.citizen.documentNumber}
                </dd>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <dt style={{ fontWeight: 600 }}>Tipo de caso:</dt>
                <dd style={{ margin: 0 }}>{caseData.caseType.name}</dd>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <dt style={{ fontWeight: 600 }}>Estado actual:</dt>
                <dd style={{ margin: 0 }}>
                  <span style={{ 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '12px', 
                    backgroundColor: caseData.state.color || '#6c757d',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}>
                    {caseData.state.name}
                  </span>
                </dd>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem' }}>
                <dt style={{ fontWeight: 600 }}>Descripción:</dt>
                <dd style={{ margin: 0 }}>{caseData.description}</dd>
              </div>
            </dl>
          </div>

          {/* Historial de estados */}
          <div style={{ 
            backgroundColor: 'white', 
            padding: '1.5rem', 
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>
              Historial de Estados
            </h2>
            {stateHistory.length === 0 ? (
              <p style={{ color: '#666' }}>No hay cambios de estado registrados</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {stateHistory.map((history) => (
                  <div 
                    key={history.id} 
                    style={{ 
                      padding: '1rem', 
                      borderLeft: '3px solid #007bff',
                      backgroundColor: '#f8f9fa'
                    }}
                  >
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>
                        {history.fromState?.name || 'Inicial'} → {history.toState.name}
                      </strong>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      {new Date(history.timestamp).toLocaleString('es-CO')} por{' '}
                      {history.changedByUser ? history.changedByUser.fullName : 'Sistema'}
                    </div>
                    {history.comment && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                        💬 {history.comment}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documentos */}
          <div style={{ 
            backgroundColor: 'white', 
            padding: '1.5rem', 
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>
              Documentos
            </h2>
            {documents.length === 0 ? (
              <p style={{ color: '#666' }}>No hay documentos adjuntos</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {documents.map((doc) => (
                  <li 
                    key={doc.id} 
                    style={{ 
                      padding: '0.75rem', 
                      borderBottom: '1px solid #dee2e6',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{doc.fileName}</div>
                      <div style={{ fontSize: '0.875rem', color: '#666' }}>
                        {(doc.fileSize / 1024).toFixed(0)} KB - {new Date(doc.uploadedAt).toLocaleDateString('es-CO')}
                      </div>
                    </div>
                    <a 
                      href={doc.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        color: '#007bff', 
                        textDecoration: 'none',
                        fontWeight: 500
                      }}
                    >
                      Descargar
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Columna derecha - Acciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <ChangeStateForm 
            caseId={params.id} 
            currentStateCode={caseData.state.code}
            allStates={allStates}
          />
          
          <UploadDocumentForm caseId={params.id} />
        </div>
      </div>

      {/* Sección de asignación - FASE 3 MÓDULO 2 */}
      <AssignmentSection caseId={params.id} userRole={userRole} />
    </div>
  );
}
