import { redirect } from 'next/navigation';

// La radicación ciudadana se realiza en el portal de la comisaría
// (/comisaria-en-linea). El formulario PQRS heredado de Ventanilla Única se
// retira; esta ruta redirige para no romper enlaces antiguos.
export default function SolicitudRedirectPage() {
  redirect('/comisaria-en-linea');
}
