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
 * Catálogo maestro de servicios.
 * Unión de todos los servicios de: Personería, Alcaldía, Contraloría, Hospital y genéricos.
 * TODOS comienzan con enabled: false.
 */
export const MASTER_SERVICE_CATALOG: LandingService[] = [
  // ── COMUNES (todas las entidades) ──────────────────────
  {
    id: 'pqrs',
    title: 'PQRS',
    description: 'Radique peticiones, quejas, reclamos y sugerencias ante la entidad.',
    icon: 'FileText', linkUrl: '/atencion-ciudadano/solicitud', linkText: 'Radicar PQRS',
    enabled: false, category: 'Comunes',
  },
  {
    id: 'consulta-solicitudes',
    title: 'Consulta de Solicitudes',
    description: 'Consulte el estado de sus trámites y solicitudes en línea.',
    icon: 'Search', linkUrl: '/atencion-ciudadano/consultar', linkText: 'Consultar',
    enabled: false, category: 'Comunes',
  },
  {
    id: 'atencion-ciudadano',
    title: 'Atención al Ciudadano',
    description: 'Información sobre canales de atención, horarios y puntos de servicio.',
    icon: 'Users', linkUrl: '/atencion-ciudadano/contacto', linkText: 'Contactar',
    enabled: false, category: 'Comunes',
  },
  {
    id: 'transparencia',
    title: 'Transparencia y Rendición de Cuentas',
    description: 'Consulta estadísticas, informes de gestión y rendición de cuentas.',
    icon: 'BarChart3', linkUrl: '/transparencia', linkText: 'Ver datos',
    enabled: false, category: 'Comunes',
  },

  // ── PERSONERÍA MUNICIPAL ───────────────────────────────
  {
    id: 'derecho-peticion',
    title: 'Derecho de Petición',
    description: 'Presenta tus solicitudes, quejas o reclamos ante las entidades públicas del municipio. Término de respuesta: 15 días hábiles (Ley 1755/2015).',
    icon: 'FileText', linkUrl: '/atencion-ciudadano/solicitud', linkText: 'Radicar Petición',
    enabled: false, category: 'Personería',
  },
  {
    id: 'tutela',
    title: 'Acciones de Tutela',
    description: 'Protección inmediata de derechos fundamentales cuando son vulnerados o amenazados. Término: 10 días hábiles (Art. 86 CP, Decreto 2591/1991).',
    icon: 'Scale', linkUrl: '/servicios#tutela', linkText: 'Más información',
    enabled: false, category: 'Personería',
  },
  {
    id: 'disciplinario',
    title: 'Quejas Disciplinarias',
    description: 'Atendemos quejas y denuncias contra servidores públicos municipales por presuntas faltas disciplinarias (Ley 1952/2019).',
    icon: 'Shield', linkUrl: '/servicios#disciplinario', linkText: 'Ver detalles',
    enabled: false, category: 'Personería',
  },
  {
    id: 'victimas',
    title: 'Atención a Víctimas del Conflicto Armado',
    description: 'Orientación, asesoría y acompañamiento a víctimas del conflicto armado. Acceso a la oferta institucional (Ley 1448/2011).',
    icon: 'Heart', linkUrl: '/servicios#victimas', linkText: 'Conocer más',
    enabled: false, category: 'Personería',
  },
  {
    id: 'nna',
    title: 'Defensa de Niños, Niñas y Adolescentes',
    description: 'Protección de los derechos de niños, niñas y adolescentes en el municipio (Ley 1098/2006).',
    icon: 'Baby', linkUrl: '/servicios#nna', linkText: 'Información',
    enabled: false, category: 'Personería',
  },
  {
    id: 'ddhh',
    title: 'Promoción de Derechos Humanos',
    description: 'Jornadas de capacitación, talleres y actividades de divulgación sobre derechos humanos.',
    icon: 'BookOpen', linkUrl: '/servicios#ddhh', linkText: 'Conocer más',
    enabled: false, category: 'Personería',
  },
  {
    id: 'control-preventivo',
    title: 'Control Preventivo y Veeduría',
    description: 'Vigilancia preventiva sobre contratos públicos, manejo de recursos y gestión administrativa municipal (Ley 136/1994).',
    icon: 'Eye', linkUrl: '/servicios#control-preventivo', linkText: 'Ver detalles',
    enabled: false, category: 'Personería',
  },

  // ── ALCALDÍA MUNICIPAL ─────────────────────────────────
  {
    id: 'tramites',
    title: 'Trámites y Servicios',
    description: 'Consulte y realice los trámites disponibles de la administración municipal.',
    icon: 'ClipboardList', linkUrl: '/servicios#tramites', linkText: 'Ver trámites',
    enabled: false, category: 'Alcaldía',
  },
  {
    id: 'licencias',
    title: 'Licencias y Permisos',
    description: 'Solicite licencias de construcción, permisos de funcionamiento y más.',
    icon: 'Shield', linkUrl: '/servicios#licencias', linkText: 'Solicitar',
    enabled: false, category: 'Alcaldía',
  },
  {
    id: 'servicios-publicos',
    title: 'Servicios Públicos',
    description: 'Información sobre acueducto, alcantarillado, aseo y alumbrado público.',
    icon: 'Droplets', linkUrl: '/servicios#servicios-publicos', linkText: 'Consultar',
    enabled: false, category: 'Alcaldía',
  },
  {
    id: 'planeacion',
    title: 'Planeación y Ordenamiento Territorial',
    description: 'Plan de ordenamiento territorial, estratificación y desarrollo urbano.',
    icon: 'Map', linkUrl: '/servicios#planeacion', linkText: 'Ver más',
    enabled: false, category: 'Alcaldía',
  },
  {
    id: 'hacienda',
    title: 'Hacienda e Impuestos',
    description: 'Información sobre predial, industria y comercio, y demás obligaciones tributarias municipales.',
    icon: 'DollarSign', linkUrl: '/servicios#hacienda', linkText: 'Consultar',
    enabled: false, category: 'Alcaldía',
  },
  {
    id: 'salud-bienestar',
    title: 'Salud Pública y Bienestar Social',
    description: 'Programas de salud pública, bienestar social y atención a población vulnerable.',
    icon: 'Heart', linkUrl: '/servicios#salud-bienestar', linkText: 'Ver programas',
    enabled: false, category: 'Alcaldía',
  },
  {
    id: 'educacion-cultura',
    title: 'Educación y Cultura',
    description: 'Programas educativos, culturales y deportivos del municipio.',
    icon: 'GraduationCap', linkUrl: '/servicios#educacion', linkText: 'Información',
    enabled: false, category: 'Alcaldía',
  },

  // ── CONTRALORÍA ────────────────────────────────────────
  {
    id: 'denuncias-fiscales',
    title: 'Denuncias Fiscales',
    description: 'Presente denuncias sobre el uso indebido de recursos públicos en su municipio.',
    icon: 'AlertTriangle', linkUrl: '/atencion-ciudadano/solicitud', linkText: 'Presentar denuncia',
    enabled: false, category: 'Contraloría',
  },
  {
    id: 'auditorias',
    title: 'Auditorías y Resultados',
    description: 'Consulte el estado y resultados de las auditorías realizadas a entidades públicas.',
    icon: 'Search', linkUrl: '/servicios#auditorias', linkText: 'Consultar',
    enabled: false, category: 'Contraloría',
  },
  {
    id: 'responsabilidad-fiscal',
    title: 'Responsabilidad Fiscal',
    description: 'Procesos de responsabilidad fiscal para proteger el patrimonio público.',
    icon: 'Gavel', linkUrl: '/servicios#responsabilidad-fiscal', linkText: 'Más información',
    enabled: false, category: 'Contraloría',
  },
  {
    id: 'control-fiscal',
    title: 'Control Fiscal Participativo',
    description: 'Mecanismos de participación ciudadana en el control fiscal.',
    icon: 'Users', linkUrl: '/servicios#participacion', linkText: 'Participar',
    enabled: false, category: 'Contraloría',
  },
  {
    id: 'jurisdiccion-coactiva',
    title: 'Jurisdicción Coactiva',
    description: 'Cobro de obligaciones fiscales a favor del patrimonio público.',
    icon: 'Landmark', linkUrl: '/servicios#coactiva', linkText: 'Información',
    enabled: false, category: 'Contraloría',
  },

  // ── HOSPITAL / ESE ─────────────────────────────────────
  {
    id: 'servicios-salud',
    title: 'Servicios de Salud',
    description: 'Consulta, urgencias, hospitalización, especialidades y programas de prevención disponibles.',
    icon: 'Stethoscope', linkUrl: '/servicios#salud', linkText: 'Ver servicios',
    enabled: false, category: 'Hospital',
  },
  {
    id: 'citas-medicas',
    title: 'Citas Médicas y Autorizaciones',
    description: 'Información sobre asignación de citas, autorizaciones y referencia de pacientes.',
    icon: 'ClipboardList', linkUrl: '/servicios#citas', linkText: 'Consultar',
    enabled: false, category: 'Hospital',
  },
  {
    id: 'derechos-paciente',
    title: 'Derechos y Deberes del Paciente',
    description: 'Conozca sus derechos y deberes como usuario de los servicios de salud.',
    icon: 'BookOpen', linkUrl: '/servicios#derechos', linkText: 'Conocer más',
    enabled: false, category: 'Hospital',
  },
  {
    id: 'prevencion',
    title: 'Programas de Prevención y Promoción',
    description: 'Vacunación, salud pública, prevención de enfermedades y promoción del bienestar.',
    icon: 'Shield', linkUrl: '/servicios#prevencion', linkText: 'Información',
    enabled: false, category: 'Hospital',
  },
  {
    id: 'participacion-salud',
    title: 'Participación Social en Salud',
    description: 'Mecanismos de participación ciudadana en la gestión de los servicios de salud.',
    icon: 'Handshake', linkUrl: '/servicios#participacion-salud', linkText: 'Participar',
    enabled: false, category: 'Hospital',
  },
];

// Categorías disponibles para el editor (agrupación visual)
export const SERVICE_CATEGORIES = [
  'Comunes',
  'Personería',
  'Alcaldía',
  'Contraloría',
  'Hospital',
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
