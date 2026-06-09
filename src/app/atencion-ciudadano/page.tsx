import { redirect } from 'next/navigation';

// Flujo ciudadano unificado en el portal de la comisaría (/comisaria-en-linea).
// Esta ruta heredada (PQRS de Ventanilla Única) se conserva solo para no romper
// enlaces antiguos y redirige al portal.
export default function AtencionCiudadanoPage() {
  redirect('/comisaria-en-linea');
}
