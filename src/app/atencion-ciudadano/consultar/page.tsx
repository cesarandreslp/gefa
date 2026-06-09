import ComisariaPortal from '../../comisaria-en-linea/ComisariaPortal';

export const dynamic = 'force-dynamic';

// Consulta del estado del caso de la comisaría (radicado + documento del
// denunciante). Reutiliza el portal unificado en modo consulta.
export default function ConsultarCasoPage() {
  return <ComisariaPortal initialTab="consultar" />;
}
