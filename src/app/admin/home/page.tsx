/**
 * DASHBOARD ADMINISTRATIVO - HOME
 * 
 * Panel de control principal para funcionarios de la Entidad Institucional
 * 
 * @route /admin/home
 * @access ADMIN, SUPERVISOR, FUNCIONARIO
 */

export default function AdminHomePage() {
  return (
    <main id="main-content" style={{ padding: 'var(--spacing-xl)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
          Panel de Administración
        </h1>
        <p style={{ fontSize: '1rem', color: '#6b7280' }}>
          Bienvenido al sistema de gestión de la Entidad Institucional
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Card 1 */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Casos Pendientes
          </h3>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-primary)' }}>
            0
          </p>
        </div>

        {/* Card 2 */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Casos en Gestión
          </h3>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: '#059669' }}>
            0
          </p>
        </div>

        {/* Card 3 */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Casos Vencidos
          </h3>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: '#dc2626' }}>
            0
          </p>
        </div>
      </div>
    </main>
  );
}
