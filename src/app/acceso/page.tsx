import SuperAdminLogin from '../components/SuperAdminLogin';

export const dynamic = 'force-dynamic';

// Acceso institucional al control plane (Super Admin del SaaS). Vive en una ruta
// propia para que la raíz del dominio pueda mostrar la landing del producto.
export default function AccesoPage() {
  return <SuperAdminLogin />;
}
