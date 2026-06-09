/**
 * Catálogo maestro de Índice de Transparencia y Acceso a la Información Pública
 * Estructura según Ley 1712 de 2014 y Decreto 103 de 2015 - MinTIC Colombia
 *
 * Las 9 categorías son iguales para todas las entidades públicas.
 * El contenido (ítems activos y URLs) varía por entidad.
 */

export interface TransparencyItem {
  id: string;
  title: string;
  description: string;
  linkUrl: string;
  content?: string;   // Texto libre (ej. Misión, Visión). Si está definido, el editor muestra textarea.
  enabled: boolean;
}

export interface TransparencyCategory {
  id: string;
  num: string;
  title: string;
  icon: string;
  enabled: boolean;
  items: TransparencyItem[];
}

export interface TransparencyConfig {
  categories: TransparencyCategory[];
}

export const TRANSPARENCY_CATALOG: TransparencyCategory[] = [
  {
    id: 'informacion-entidad',
    num: '1',
    title: 'Información de la entidad',
    icon: '🏛️',
    enabled: false,
    items: [
      { id: 'mision', title: 'Misión', description: 'Misión institucional de la entidad.', linkUrl: '', content: '', enabled: false },
      { id: 'vision', title: 'Visión', description: 'Visión institucional de la entidad.', linkUrl: '', content: '', enabled: false },
      { id: 'organigrama', title: 'Organigrama', description: 'Estructura orgánica de la entidad.', linkUrl: '', enabled: false },
      { id: 'directorio-funcionarios', title: 'Directorio de funcionarios y contratistas', description: 'Nombres, cargos, dependencias, correos y teléfonos.', linkUrl: '', enabled: false },
      { id: 'mapa-procesos', title: 'Mapa de procesos', description: 'Mapas y cartas descriptivas de los procesos institucionales.', linkUrl: '', enabled: false },
      { id: 'presupuesto-general', title: 'Presupuesto general', description: 'Presupuesto de ingresos y gastos aprobado para la vigencia.', linkUrl: '', enabled: false },
      { id: 'plan-accion', title: 'Plan de Acción', description: 'Plan de acción anual de la entidad.', linkUrl: '', enabled: false },
      { id: 'mecanismos-participacion', title: 'Mecanismos de participación ciudadana', description: 'Espacios y mecanismos para participar en la gestión institucional.', linkUrl: '', enabled: false },
      { id: 'glosario', title: 'Glosario', description: 'Términos y definiciones utilizados por la entidad.', linkUrl: '', enabled: false },
      { id: 'informe-actividad', title: 'Informe de actividades', description: 'Informes de gestión y actividades institucionales.', linkUrl: '', enabled: false },
    ],
  },
  {
    id: 'normativa',
    num: '2',
    title: 'Normativa',
    icon: '⚖️',
    enabled: false,
    items: [
      { id: 'leyes', title: 'Leyes', description: 'Leyes que rigen el funcionamiento de la entidad.', linkUrl: '', enabled: false },
      { id: 'decretos', title: 'Decretos', description: 'Decretos aplicables a la entidad.', linkUrl: '', enabled: false },
      { id: 'resoluciones', title: 'Resoluciones', description: 'Resoluciones emitidas por la entidad.', linkUrl: '', enabled: false },
      { id: 'circulares', title: 'Circulares', description: 'Circulares internas y externas vigentes.', linkUrl: '', enabled: false },
      { id: 'actos-administrativos', title: 'Actos administrativos generales', description: 'Actos de carácter general expedidos por la entidad.', linkUrl: '', enabled: false },
      { id: 'politica-datos', title: 'Política de tratamiento de datos personales', description: 'Política de privacidad y tratamiento de datos conforme a la Ley 1581 de 2012.', linkUrl: '', enabled: false },
    ],
  },
  {
    id: 'contratacion',
    num: '3',
    title: 'Contratación',
    icon: '📝',
    enabled: false,
    items: [
      { id: 'plan-adquisiciones', title: 'Plan anual de adquisiciones', description: 'Plan de compras y contrataciones para la vigencia.', linkUrl: '', enabled: false },
      { id: 'secop-i', title: 'SECOP I', description: 'Contratos publicados en el Sistema Electrónico de Contratación Pública I.', linkUrl: 'https://www.contratos.gov.co', enabled: false },
      { id: 'secop-ii', title: 'SECOP II', description: 'Procesos de contratación en SECOP II.', linkUrl: 'https://community.secop.gov.co', enabled: false },
      { id: 'convenios', title: 'Convenios y acuerdos', description: 'Convenios interinstitucionales e interadministrativos vigentes.', linkUrl: '', enabled: false },
    ],
  },
  {
    id: 'planeacion-presupuesto',
    num: '4',
    title: 'Planeación, Presupuesto y Control',
    icon: '📊',
    enabled: false,
    items: [
      { id: 'plan-estrategico', title: 'Plan estratégico institucional', description: 'Plan de desarrollo o plan estratégico de la entidad.', linkUrl: '', enabled: false },
      { id: 'paac', title: 'Plan Anticorrupción y de Atención al Ciudadano (PAAC)', description: 'Plan anual de lucha contra la corrupción y atención al ciudadano.', linkUrl: '', enabled: false },
      { id: 'paa', title: 'Plan Anual de Adquisiciones (PAA)', description: 'Programación de compras bienes y servicios.', linkUrl: '', enabled: false },
      { id: 'presupuesto-ingresos', title: 'Presupuesto de ingresos y gastos', description: 'Ejecución presupuestal de ingresos y gastos.', linkUrl: '', enabled: false },
      { id: 'estados-financieros', title: 'Estados financieros', description: 'Balance general, estado de resultados y flujo de caja.', linkUrl: '', enabled: false },
      { id: 'informe-gestion', title: 'Informe de gestión y resultados', description: 'Informe de gestión anual presentado a organismos de control.', linkUrl: '', enabled: false },
      { id: 'auditoria-interna', title: 'Informes de auditoría interna', description: 'Resultados de auditorías internas y seguimiento a hallazgos.', linkUrl: '', enabled: false },
      { id: 'control-interno', title: 'Informe de Control Interno', description: 'Informe del Sistema de Control Interno (MECI).', linkUrl: '', enabled: false },
    ],
  },
  {
    id: 'tramites-servicios',
    num: '5',
    title: 'Trámites y Servicios',
    icon: '⚙️',
    enabled: false,
    items: [
      { id: 'pqrs-tramite', title: 'PQRS en línea', description: 'Radicación de peticiones, quejas, reclamos y sugerencias.', linkUrl: '/atencion-ciudadano/solicitud', enabled: false },
      { id: 'tramites-linea', title: 'Trámites en línea', description: 'Catálogo de trámites disponibles ante la entidad.', linkUrl: '/servicios', enabled: false },
      { id: 'servicios-linea', title: 'Servicios en línea', description: 'Servicios disponibles en el portal institucional.', linkUrl: '/servicios', enabled: false },
      { id: 'carta-trato', title: 'Carta de trato digno al ciudadano', description: 'Compromisos de la entidad con la atención al ciudadano.', linkUrl: '', enabled: false },
      { id: 'consulta-estado', title: 'Consulta de estado de solicitudes', description: 'Seguimiento al estado de trámites y solicitudes radicadas.', linkUrl: '/atencion-ciudadano/consultar', enabled: false },
    ],
  },
  {
    id: 'participa',
    num: '6',
    title: 'Participa',
    icon: '🤝',
    enabled: false,
    items: [
      { id: 'consultas-publicas', title: 'Consultas públicas', description: 'Proyectos normativos y decisiones sometidos a consulta ciudadana.', linkUrl: '', enabled: false },
      { id: 'rendicion-cuentas', title: 'Rendición de cuentas', description: 'Audiencias y eventos de rendición de cuentas a la ciudadanía.', linkUrl: '', enabled: false },
      { id: 'diagnostico-participativo', title: 'Diagnóstico participativo', description: 'Resultados de procesos de participación para identificar necesidades.', linkUrl: '', enabled: false },
      { id: 'control-social', title: 'Control social', description: 'Espacios y herramientas para el control social a la gestión pública.', linkUrl: '', enabled: false },
    ],
  },
  {
    id: 'datos-abiertos',
    num: '7',
    title: 'Datos Abiertos',
    icon: '🔓',
    enabled: false,
    items: [
      { id: 'conjuntos-datos', title: 'Conjuntos de datos abiertos', description: 'Datos publicados en formatos abiertos y reutilizables.', linkUrl: 'https://www.datos.gov.co', enabled: false },
      { id: 'inventario-activos', title: 'Inventario de activos de información', description: 'Registro de los activos de información de la entidad.', linkUrl: '', enabled: false },
      { id: 'indice-informacion', title: 'Índice de información clasificada y reservada', description: 'Listado de información exceptuada de acceso público.', linkUrl: '', enabled: false },
      { id: 'esquema-publicacion', title: 'Esquema de publicación de información', description: 'Procedimiento para el acceso a la información pública.', linkUrl: '', enabled: false },
    ],
  },
  {
    id: 'grupos-interes',
    num: '8',
    title: 'Información para Grupos de Interés',
    icon: '👥',
    enabled: false,
    items: [
      { id: 'ninos-ninas', title: 'Niños, niñas y adolescentes', description: 'Información y servicios dirigidos a niños, niñas y adolescentes.', linkUrl: '', enabled: false },
      { id: 'adultos-mayores', title: 'Adultos mayores', description: 'Programas y servicios para adultos mayores.', linkUrl: '', enabled: false },
      { id: 'discapacidad', title: 'Personas con discapacidad', description: 'Información en formatos accesibles y servicios para personas con discapacidad.', linkUrl: '', enabled: false },
      { id: 'comunidades-etnicas', title: 'Comunidades étnicas', description: 'Información y servicios para comunidades indígenas, afrodescendientes y raizales.', linkUrl: '', enabled: false },
      { id: 'mujeres', title: 'Mujeres', description: 'Política de igualdad de género e información dirigida a mujeres.', linkUrl: '', enabled: false },
      { id: 'victimas', title: 'Víctimas del conflicto', description: 'Servicios y atención a víctimas del conflicto armado.', linkUrl: '', enabled: false },
    ],
  },
  {
    id: 'informacion-confidencial',
    num: '9',
    title: 'Reporte de Información Confidencial',
    icon: '🔒',
    enabled: false,
    items: [
      { id: 'excepcion-dano', title: 'Información exceptuada por daño', description: 'Información cuya divulgación causa daño a derechos de personas naturales o jurídicas.', linkUrl: '', enabled: false },
      { id: 'excepcion-ley', title: 'Información exceptuada por ley', description: 'Información clasificada como reservada o confidencial por mandato legal.', linkUrl: '', enabled: false },
      { id: 'amparo-ley', title: 'Fundamento legal de las excepciones', description: 'Base normativa que sustenta la clasificación o reserva de la información.', linkUrl: '', enabled: false },
    ],
  },
  {
    id: 'informes-pqrsd',
    num: '10',
    title: 'Informes PQRSD',
    icon: '📈',
    enabled: false,
    items: [
      { id: 'estadisticas-pqrsd', title: 'Estadísticas de PQRSD', description: 'Rendición de cuentas con estadísticas actualizadas de peticiones, quejas, reclamos y sugerencias.', linkUrl: '#estadisticas-pqrsd', enabled: false },
      { id: 'informe-anual-pqrsd', title: 'Informe anual de PQRSD', description: 'Informe consolidado anual de gestión de PQRSD.', linkUrl: '', enabled: false },
      { id: 'tiempos-respuesta', title: 'Tiempos de respuesta', description: 'Indicadores de cumplimiento en tiempos de atención a solicitudes ciudadanas.', linkUrl: '', enabled: false },
    ],
  },
];

/**
 * Obtiene la configuración de transparencia para un tenant.
 * Hace merge entre el catálogo maestro y la config guardada.
 */
export function getTransparencyConfig(
  metadata: Record<string, unknown> | null | undefined,
): TransparencyConfig {
  const saved = metadata?.transparencyConfig as TransparencyConfig | undefined;

  if (!saved?.categories?.length) {
    return { categories: TRANSPARENCY_CATALOG.map(c => ({ ...c })) };
  }

  // Merge: catálogo maestro + datos guardados del tenant
  const merged = TRANSPARENCY_CATALOG.map(catalogCat => {
    const savedCat = saved.categories.find(c => c.id === catalogCat.id);
    if (!savedCat) return { ...catalogCat };

    const mergedItems = catalogCat.items.map(catalogItem => {
      const savedItem = savedCat.items?.find(i => i.id === catalogItem.id);
      return savedItem ? { ...catalogItem, ...savedItem } : { ...catalogItem };
    });

    return {
      ...catalogCat,
      title: savedCat.title ?? catalogCat.title,
      enabled: savedCat.enabled ?? false,
      items: mergedItems,
    };
  });

  return { categories: merged };
}
