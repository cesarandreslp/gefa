/**
 * Plantillas jurídicas predefinidas del despacho. Se precargan por tenant (lazy:
 * la primera vez que se listan, si el tenant no tiene ninguna). El encabezado
 * institucional (Alcaldía + sede + comisario/a) lo inyecta la generación; aquí solo
 * va el CUERPO con marcadores {{variable}}. `{{informe_final}}` se prellena con el
 * informe final compilado del caso cuando la plantilla lo requiere.
 */

import { PrismaClient, TemplateKind } from '@prisma/client';
import type { TemplateVariable } from './documentsApi';

export interface DefaultTemplate {
  kind: TemplateKind;
  name: string;
  description: string;
  bodyHtml: string;
  variables: TemplateVariable[];
  signerRoles: string[];
  profesiones: string[];
  requiereInformeFinal?: boolean;
}

const V = {
  ciudad: { key: 'ciudad', label: 'Ciudad', type: 'text' as const, required: true },
  fecha: { key: 'fecha', label: 'Fecha', type: 'date' as const, required: true },
  radicado: { key: 'radicado', label: 'Radicado', type: 'text' as const, required: true },
};

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    kind: 'CITACION',
    name: 'Citación a audiencia',
    description: 'Citación a las partes a audiencia.',
    signerRoles: ['DIRECTOR', 'JURIDICA'],
    profesiones: ['JURIDICA'],
    variables: [V.ciudad, V.fecha, V.radicado,
      { key: 'citado', label: 'Persona citada', type: 'text', required: true },
      { key: 'fecha_audiencia', label: 'Fecha y hora de la audiencia', type: 'text', required: true },
      { key: 'lugar', label: 'Lugar', type: 'text' },
      { key: 'asunto', label: 'Asunto', type: 'text' },
    ],
    bodyHtml: `<p style="text-align:right;">{{ciudad}}, {{fecha}}</p>
<p>Señor(a) <strong>{{citado}}</strong></p>
<p>Asunto: Citación — Radicado {{radicado}}{{asunto}}</p>
<p>Por medio del presente, y en ejercicio de las funciones legales de esta Comisaría de Familia, se le <strong>CITA</strong> a la audiencia que se llevará a cabo el <strong>{{fecha_audiencia}}</strong> en {{lugar}}, dentro del proceso de la referencia.</p>
<p>Se le advierte que su inasistencia injustificada podrá acarrear las consecuencias previstas en la ley. Deberá presentarse con su documento de identidad y las pruebas que pretenda hacer valer.</p>
<p>Atentamente,</p>`,
  },
  {
    kind: 'OFICIO',
    name: 'Oficio',
    description: 'Oficio general a entidad o persona.',
    signerRoles: ['DIRECTOR', 'JURIDICA'],
    profesiones: ['JURIDICA'],
    variables: [V.ciudad, V.fecha, V.radicado,
      { key: 'destinatario', label: 'Destinatario', type: 'text', required: true },
      { key: 'cargo_destinatario', label: 'Cargo / Entidad', type: 'text' },
      { key: 'asunto', label: 'Asunto', type: 'text', required: true },
      { key: 'cuerpo', label: 'Texto del oficio', type: 'multiline', required: true },
    ],
    bodyHtml: `<p style="text-align:right;">{{ciudad}}, {{fecha}}</p>
<p>Señor(a)<br/><strong>{{destinatario}}</strong><br/>{{cargo_destinatario}}</p>
<p>Asunto: {{asunto}} — Radicado {{radicado}}</p>
<p>{{cuerpo}}</p>
<p>Cordialmente,</p>`,
  },
  {
    kind: 'AUTO',
    name: 'Auto de trámite',
    description: 'Auto que ordena una actuación dentro del proceso.',
    signerRoles: ['DIRECTOR'],
    profesiones: ['JURIDICA'],
    variables: [V.ciudad, V.fecha, V.radicado,
      { key: 'considerandos', label: 'Considerandos', type: 'multiline', required: true },
      { key: 'ordena', label: 'Lo que se ordena', type: 'multiline', required: true },
    ],
    bodyHtml: `<p style="text-align:center;"><strong>AUTO</strong><br/>Radicado {{radicado}}</p>
<p>{{ciudad}}, {{fecha}}</p>
<p><strong>CONSIDERANDO:</strong></p>
<p>{{considerandos}}</p>
<p><strong>RESUELVE:</strong></p>
<p>{{ordena}}</p>
<p>Notifíquese y cúmplase.</p>`,
  },
  {
    kind: 'CONSTANCIA_CONCILIACION',
    name: 'Constancia de conciliación',
    description: 'Constancia del resultado de la diligencia de conciliación.',
    signerRoles: ['DIRECTOR', 'JURIDICA'],
    profesiones: ['JURIDICA'],
    variables: [V.ciudad, V.fecha, V.radicado,
      { key: 'convocante', label: 'Convocante', type: 'text', required: true },
      { key: 'convocado', label: 'Convocado', type: 'text', required: true },
      { key: 'resultado', label: 'Resultado (acuerdo / no acuerdo / inasistencia)', type: 'multiline', required: true },
    ],
    bodyHtml: `<p style="text-align:center;"><strong>CONSTANCIA DE CONCILIACIÓN</strong><br/>Radicado {{radicado}}</p>
<p>En {{ciudad}}, a {{fecha}}, se deja constancia de la diligencia de conciliación adelantada entre <strong>{{convocante}}</strong> (convocante) y <strong>{{convocado}}</strong> (convocado).</p>
<p><strong>Resultado:</strong> {{resultado}}</p>
<p>Para constancia se firma por quienes en ella intervinieron.</p>`,
  },
  {
    kind: 'ACTA_AUDIENCIA',
    name: 'Acta de audiencia',
    description: 'Acta de lo ocurrido en audiencia.',
    signerRoles: ['DIRECTOR'],
    profesiones: ['JURIDICA'],
    variables: [V.ciudad, V.fecha, V.radicado,
      { key: 'tipo_audiencia', label: 'Tipo de audiencia', type: 'text', required: true },
      { key: 'asistentes', label: 'Asistentes', type: 'multiline' },
      { key: 'desarrollo', label: 'Desarrollo de la audiencia', type: 'multiline', required: true },
      { key: 'decision', label: 'Decisión', type: 'multiline' },
    ],
    bodyHtml: `<p style="text-align:center;"><strong>ACTA DE AUDIENCIA</strong><br/>{{tipo_audiencia}} — Radicado {{radicado}}</p>
<p>En {{ciudad}}, a {{fecha}}, se instala la audiencia con la asistencia de: {{asistentes}}.</p>
<p><strong>Desarrollo:</strong></p>
<p>{{desarrollo}}</p>
<p><strong>Decisión:</strong></p>
<p>{{decision}}</p>
<p>No siendo otro el objeto, se levanta la sesión y se firma.</p>`,
  },
  {
    kind: 'DECLARACION',
    name: 'Acta de declaración',
    description: 'Declaración rendida ante el comisario.',
    signerRoles: ['DIRECTOR'],
    profesiones: ['JURIDICA'],
    variables: [V.ciudad, V.fecha, V.radicado,
      { key: 'declarante', label: 'Declarante', type: 'text', required: true },
      { key: 'documento', label: 'Documento de identidad', type: 'text' },
      { key: 'contenido', label: 'Contenido de la declaración', type: 'multiline', required: true },
    ],
    bodyHtml: `<p style="text-align:center;"><strong>ACTA DE DECLARACIÓN</strong><br/>Radicado {{radicado}}</p>
<p>En {{ciudad}}, a {{fecha}}, comparece <strong>{{declarante}}</strong>, identificado(a) con {{documento}}, quien previa advertencia sobre las consecuencias de faltar a la verdad, declara:</p>
<p>{{contenido}}</p>
<p>Leída la presente y hallándola conforme, se firma por el(la) declarante y el(la) Comisario(a) de Familia.</p>`,
  },
  {
    kind: 'MEDIDA_PROTECCION',
    name: 'Resolución de medida de protección',
    description: 'Medida de protección a favor de la víctima (Ley 1257/2008, Ley 294/1996).',
    signerRoles: ['DIRECTOR'],
    profesiones: ['JURIDICA'],
    variables: [V.ciudad, V.fecha, V.radicado,
      { key: 'victima', label: 'Víctima', type: 'text', required: true },
      { key: 'agresor', label: 'Agresor', type: 'text', required: true },
      { key: 'considerandos', label: 'Considerandos / hechos', type: 'multiline', required: true },
      { key: 'medidas', label: 'Medidas que se adoptan', type: 'multiline', required: true },
      { key: 'fundamento', label: 'Fundamento legal', type: 'text' },
    ],
    bodyHtml: `<p style="text-align:center;"><strong>RESOLUCIÓN — MEDIDA DE PROTECCIÓN</strong><br/>Radicado {{radicado}}</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>El(la) Comisario(a) de Familia, en uso de sus facultades legales ({{fundamento}}),</p>
<p><strong>CONSIDERANDO</strong> que {{considerandos}}, en favor de <strong>{{victima}}</strong> y en contra de <strong>{{agresor}}</strong>,</p>
<p><strong>RESUELVE:</strong></p>
<p>{{medidas}}</p>
<p>Notifíquese personalmente, advirtiendo que su incumplimiento dará lugar a las sanciones de ley. Contra la presente proceden los recursos de ley.</p>`,
  },
  {
    kind: 'INFORME_JURIDICO',
    name: 'Informe jurídico',
    description: 'Concepto/informe jurídico del caso.',
    signerRoles: ['JURIDICA'],
    profesiones: ['JURIDICA'],
    variables: [V.ciudad, V.fecha, V.radicado,
      { key: 'objeto', label: 'Objeto del informe', type: 'text', required: true },
      { key: 'analisis', label: 'Análisis', type: 'multiline', required: true },
      { key: 'conclusion', label: 'Conclusión / recomendación', type: 'multiline', required: true },
    ],
    bodyHtml: `<p style="text-align:center;"><strong>INFORME JURÍDICO</strong><br/>Radicado {{radicado}}</p>
<p>{{ciudad}}, {{fecha}}</p>
<p><strong>Objeto:</strong> {{objeto}}</p>
<p><strong>Análisis:</strong></p>
<p>{{analisis}}</p>
<p><strong>Conclusión:</strong></p>
<p>{{conclusion}}</p>`,
  },
  {
    kind: 'SEGUIMIENTO',
    name: 'Acta de seguimiento',
    description: 'Seguimiento al cumplimiento de medidas o acuerdos.',
    signerRoles: ['JURIDICA'],
    profesiones: ['JURIDICA'],
    variables: [V.ciudad, V.fecha, V.radicado,
      { key: 'medida', label: 'Medida/acuerdo objeto de seguimiento', type: 'text', required: true },
      { key: 'hallazgos', label: 'Hallazgos del seguimiento', type: 'multiline', required: true },
      { key: 'acciones', label: 'Acciones a seguir', type: 'multiline' },
    ],
    bodyHtml: `<p style="text-align:center;"><strong>ACTA DE SEGUIMIENTO</strong><br/>Radicado {{radicado}}</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>Se realiza seguimiento a: {{medida}}.</p>
<p><strong>Hallazgos:</strong> {{hallazgos}}</p>
<p><strong>Acciones a seguir:</strong> {{acciones}}</p>`,
  },
  {
    kind: 'RECURSO',
    name: 'Resolución de recurso',
    description: 'Resuelve un recurso interpuesto contra una decisión.',
    signerRoles: ['DIRECTOR'],
    profesiones: ['JURIDICA'],
    variables: [V.ciudad, V.fecha, V.radicado,
      { key: 'recurrente', label: 'Recurrente', type: 'text', required: true },
      { key: 'recurso', label: 'Recurso interpuesto', type: 'text', required: true },
      { key: 'considerandos', label: 'Considerandos', type: 'multiline', required: true },
      { key: 'decision', label: 'Decisión (confirma / revoca / modifica)', type: 'multiline', required: true },
    ],
    bodyHtml: `<p style="text-align:center;"><strong>RESOLUCIÓN — RECURSO</strong><br/>Radicado {{radicado}}</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>Procede el Despacho a resolver el {{recurso}} interpuesto por <strong>{{recurrente}}</strong>.</p>
<p><strong>CONSIDERANDO:</strong></p>
<p>{{considerandos}}</p>
<p><strong>RESUELVE:</strong></p>
<p>{{decision}}</p>
<p>Notifíquese y cúmplase.</p>`,
  },
  {
    kind: 'RESOLUCION',
    name: 'Resolución (decisión de fondo)',
    description: 'Resolución de fondo del caso; se construye sobre el informe final compilado.',
    signerRoles: ['DIRECTOR'],
    profesiones: ['JURIDICA'],
    requiereInformeFinal: true,
    variables: [V.ciudad, V.fecha, V.radicado,
      { key: 'considerandos', label: 'Considerandos adicionales', type: 'multiline' },
      { key: 'resuelve', label: 'Parte resolutiva', type: 'multiline', required: true },
      { key: 'fundamento', label: 'Fundamento legal', type: 'text' },
    ],
    bodyHtml: `<p style="text-align:center;"><strong>RESOLUCIÓN</strong><br/>Radicado {{radicado}}</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>El(la) Comisario(a) de Familia, en uso de sus facultades legales ({{fundamento}}),</p>
<p><strong>CONSIDERANDO:</strong></p>
<p>Que del informe final del caso se desprende lo siguiente:</p>
<p>{{informe_final}}</p>
<p>{{considerandos}}</p>
<p><strong>RESUELVE:</strong></p>
<p>{{resuelve}}</p>
<p>Notifíquese y cúmplase.</p>`,
  },
];

/**
 * Siembra las plantillas predefinidas en el tenant (idempotente por kind+name).
 * Devuelve cuántas creó. Se usa de forma perezosa (al listar si no hay ninguna) y
 * desde el botón "Cargar plantillas predefinidas".
 */
export async function seedDefaultTemplates(
  db: PrismaClient,
  tenantId: string,
  createdByUserId?: string | null
): Promise<number> {
  let created = 0;
  for (const t of DEFAULT_TEMPLATES) {
    const exists = await db.documentTemplate.findFirst({
      where: { tenantId, kind: t.kind, name: t.name },
      select: { id: true },
    });
    if (exists) continue;
    await db.documentTemplate.create({
      data: {
        tenantId,
        kind: t.kind,
        name: t.name,
        description: t.description,
        bodyHtml: t.bodyHtml,
        variables: t.variables as never,
        signerRoles: t.signerRoles as never,
        profesiones: t.profesiones,
        requiereInformeFinal: !!t.requiereInformeFinal,
        createdByUserId: createdByUserId ?? null,
      },
    });
    created++;
  }
  return created;
}
