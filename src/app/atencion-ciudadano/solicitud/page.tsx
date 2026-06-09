import ComisariaPortal from '../../comisaria-en-linea/ComisariaPortal';

export const dynamic = 'force-dynamic';

// Radicación ciudadana de la comisaría (denuncia / solicitud). Reutiliza el
// portal unificado; no es un flujo PQRS de personería.
export default function RadicarSolicitudPage() {
  return <ComisariaPortal initialTab="radicar" />;
}
