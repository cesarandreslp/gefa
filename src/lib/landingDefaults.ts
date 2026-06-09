/**
 * Catálogo maestro de servicios para la Landing Page.
 * Contiene TODOS los servicios disponibles para cualquier tipo de entidad.
 * Por defecto TODOS están desactivados. El admin activa los que necesite
 * desde el Editor de Landing Page.
 */

export interface LandingService {
  id: string;
  title: string;
  description: string;
  icon: string;       // Nombre del ícono de Lucide
  linkUrl: string;
  linkText: string;
  enabled: boolean;
  category: string;   // Categoría para agrupar en el editor
}

export interface LandingConfig {
  heroSubtitle: string;
  ctaText: string;
  services: LandingService[];
}

// Íconos disponibles para el selector del admin
export const AVAILABLE_ICONS = [
  'FileText', 'Scale', 'Users', 'Shield', 'Baby', 'BarChart3',
  'ClipboardList', 'Building2', 'Map', 'Heart', 'Briefcase',
  'Gavel', 'Landmark', 'Phone', 'Globe', 'BookOpen', 'Stethoscope',
  'Leaf', 'Handshake', 'AlertTriangle', 'Plus', 'Search',
  'Eye', 'AlertCircle', 'DollarSign', 'GraduationCap', 'Droplets',
] as const;

// Etiquetas en español para mostrar en los selectores de íconos
export const ICON_LABELS: Record<string, string> = {
  FileText: 'Documento',
  Scale: 'Balanza',
  Users: 'Usuarios',
  Shield: 'Escudo',
  Baby: 'Niño/a',
  BarChart3: 'Gráfico de barras',
  ClipboardList: 'Lista',
  Building2: 'Edificio',
  Map: 'Mapa',
  Heart: 'Corazón',
  Briefcase: 'Maletín',
  Gavel: 'Mazo judicial',
  Landmark: 'Monumento',
  Phone: 'Teléfono',
  Globe: 'Globo',
  BookOpen: 'Libro',
  Stethoscope: 'Estetoscopio',
  Leaf: 'Hoja',
  Handshake: 'Apretón de manos',
  AlertTriangle: 'Alerta triángulo',
  Plus: 'Más',
  Search: 'Lupa',
  Eye: 'Ojo',
  AlertCircle: 'Alerta círculo',
  DollarSign: 'Signo pesos',
  GraduationCap: 'Graduación',
  Droplets: 'Gotas',
};

/**
 * Catálogo maestro de servicios para comisarías de familia (GEFA).
 * El admin del tenant activa los que ofrezca su comisaría desde el Editor de Landing Page.
 * TODOS comienzan con enabled: false.
 */
export const MASTER_SERVICE_CATALOG: LandingService[] = [
  // ── COMUNES (todas las entidades) ──────────────────────
  {
    id: 'radicar-solicitud',
    title: 'Radicar Solicitud',
    description: 'Presente una solicitud, denuncia o petición ante la comisaría de familia.',
    icon: 'FileText', linkUrl: '/atencion-ciudadano/solicitud', linkText: 'Radicar Solicitud',
    enabled: false, category: 'Comunes',
  },
  {
    id: 'consultar-caso',
    title: 'Consultar mi Caso',
    description: 'Consulte el estado de su caso o solicitud con su número de radicado.',
    icon: 'Search', linkUrl: '/atencion-ciudadano/consultar', linkText: 'Consultar',
    enabled: false, category: 'Comunes',
  },
  {
    id: 'atencion-ciudadano',
    title: 'Atención a la Ciudadanía',
    description: 'Canales de atención, horarios y puntos de servicio de la comisaría.',
    icon: 'Users', linkUrl: '/atencion-ciudadano/contacto', linkText: 'Contactar',
    enabled: false, category: 'Comunes',
  },

  // ── COMISARÍA DE FAMILIA ───────────────────────────────
  {
    id: 'violencia-intrafamiliar',
    title: 'Denuncia de Violencia Intrafamiliar',
    description: 'Reporte hechos de violencia física, psicológica, sexual o económica dentro de la familia. Atención prioritaria y confidencial (Ley 294/1996, Ley 1257/2008).',
    icon: 'Shield', linkUrl: '/atencion-ciudadano/solicitud', linkText: 'Presentar denuncia',
    enabled: false, category: 'Comisaría de Familia',
  },
  {
    id: 'medida-proteccion',
    title: 'Medidas de Protección',
    description: 'Solicite medidas de protección para la víctima y su grupo familiar frente a situaciones de violencia (Ley 575/2000, Decreto 4799/2011).',
    icon: 'Scale', linkUrl: '/servicios#medida-proteccion', linkText: 'Más información',
    enabled: false, category: 'Comisaría de Familia',
  },
  {
    id: 'restablecimiento-derechos',
    title: 'Restablecimiento de Derechos (PARD)',
    description: 'Proceso administrativo para restablecer los derechos de niños, niñas y adolescentes amenazados o vulnerados (Ley 1098/2006).',
    icon: 'Baby', linkUrl: '/servicios#restablecimiento-derechos', linkText: 'Conocer el proceso',
    enabled: false, category: 'Comisaría de Familia',
  },
  {
    id: 'conciliacion-familiar',
    title: 'Conciliación en Asuntos de Familia',
    description: 'Custodia y cuidado personal, cuota de alimentos y regulación de visitas mediante conciliación.',
    icon: 'Handshake', linkUrl: '/servicios#conciliacion-familiar', linkText: 'Solicitar conciliación',
    enabled: false, category: 'Comisaría de Familia',
  },
  {
    id: 'proteccion-nna',
    title: 'Protección de Niños, Niñas y Adolescentes',
    description: 'Acompañamiento y protección integral de los derechos de la niñez y la adolescencia (Ley 1098/2006).',
    icon: 'Heart', linkUrl: '/servicios#proteccion-nna', linkText: 'Información',
    enabled: false, category: 'Comisaría de Familia',
  },
  {
    id: 'atencion-psicosocial',
    title: 'Atención Psicosocial',
    description: 'Valoración y acompañamiento del equipo interdisciplinario (psicología y trabajo social) a las familias.',
    icon: 'Stethoscope', linkUrl: '/servicios#atencion-psicosocial', linkText: 'Conocer más',
    enabled: false, category: 'Comisaría de Familia',
  },
  {
    id: 'orientacion-juridica',
    title: 'Orientación Jurídica a la Familia',
    description: 'Asesoría sobre derechos de familia y las rutas de atención disponibles ante la comisaría.',
    icon: 'BookOpen', linkUrl: '/servicios#orientacion-juridica', linkText: 'Conocer más',
    enabled: false, category: 'Comisaría de Familia',
  },
];

// Categorías disponibles para el editor (agrupación visual)
export const SERVICE_CATEGORIES = [
  'Comunes',
  'Comisaría de Familia',
] as const;

/**
 * Obtiene la configuración de landing para un tenant.
 * Si no tiene config personalizada, devuelve config vacía (sin servicios).
 */
export function getLandingConfig(
  metadata: Record<string, unknown> | null | undefined,
): LandingConfig {
  // Si el tenant tiene config personalizada, usarla
  if (metadata?.landingConfig) {
    return metadata.landingConfig as LandingConfig;
  }

  // Default: vacío (el admin debe configurar desde el Editor de Landing Page)
  return {
    heroSubtitle: '',
    ctaText: '',
    services: [],
  };
}
