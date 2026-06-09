import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidad - Entidad Institucional',
  description: 'Política de tratamiento de datos personales conforme a Ley 1581 de 2012',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="section">
      <div className="container">
      <h1>Política de Tratamiento de Datos Personales</h1>

      <p>
        <strong>Última actualización:</strong> Enero 8, 2026<br />
        <strong>Entidad:</strong> Entidad Institucional<br />
        <strong>Marco Legal:</strong> Ley 1581 de 2012 y Decreto 1377 de 2013
      </p>

      <section>
        <h2>1. Responsable del Tratamiento</h2>
        <p>
          <strong>Razón Social:</strong> Entidad Institucional<br />
          <strong>Dirección:</strong> Carrera 10 #10-10, Ciudad/Municipio, Valle del Cauca<br />
          <strong>Teléfono:</strong> (602) 228-0000<br />
          <strong>Email:</strong> contacto@entidadciudad.gov.co
        </p>
      </section>

      <section>
        <h2>2. Finalidad del Tratamiento</h2>
        <p>Los datos personales recolectados serán utilizados para:</p>
        <ul>
          <li>Radicación y tramitación de solicitudes, peticiones, quejas, reclamos y sugerencias</li>
          <li>Respuesta a derechos de petición y acciones de tutela</li>
          <li>Atención de casos relacionados con derechos humanos</li>
          <li>Comunicación sobre el estado de trámites</li>
          <li>Envío de notificaciones oficiales</li>
          <li>Generación de estadísticas institucionales (datos anonimizados)</li>
          <li>Cumplimiento de obligaciones legales</li>
        </ul>
      </section>

      <section>
        <h2>3. Tipo de Datos Recolectados</h2>
        <p><strong>Datos de identificación:</strong></p>
        <ul>
          <li>Tipo y número de documento</li>
          <li>Nombres y apellidos</li>
          <li>Fecha de nacimiento (cuando aplique)</li>
        </ul>

        <p><strong>Datos de contacto:</strong></p>
        <ul>
          <li>Dirección de residencia</li>
          <li>Teléfono</li>
          <li>Correo electrónico</li>
        </ul>

        <p><strong>Datos de la solicitud:</strong></p>
        <ul>
          <li>Motivo de la solicitud</li>
          <li>Descripción del caso</li>
          <li>Documentos adjuntos (cuando aplique)</li>
          <li>Fecha y hora de radicación</li>
          <li>Número de radicación asignado</li>
        </ul>

        <p><strong>Datos técnicos:</strong></p>
        <ul>
          <li>Dirección IP desde la cual se realiza la solicitud</li>
          <li>Información del navegador web</li>
          <li>Fecha y hora de acceso</li>
        </ul>
      </section>

      <section>
        <h2>4. Derechos del Titular</h2>
        <p>Como titular de datos personales, usted tiene derecho a:</p>
        <ul>
          <li><strong>Conocer:</strong> Acceder a sus datos personales que están en nuestras bases de datos</li>
          <li><strong>Actualizar:</strong> Solicitar la actualización de sus datos cuando estos sean inexactos o incompletos</li>
          <li><strong>Rectificar:</strong> Corregir información incorrecta</li>
          <li><strong>Suprimir:</strong> Solicitar la eliminación de sus datos cuando no haya obligación legal de conservarlos</li>
          <li><strong>Revocar:</strong> Retirar su autorización en cualquier momento (salvo obligación legal)</li>
          <li><strong>Oposición:</strong> Oponerse al tratamiento de sus datos en casos específicos</li>
        </ul>
      </section>

      <section>
        <h2>5. Procedimiento para Ejercer sus Derechos</h2>
        <p>Para ejercer cualquiera de estos derechos, puede:</p>
        <ol>
          <li>Enviar solicitud por correo electrónico a: datospersonales@entidadciudad.gov.co</li>
          <li>Presentarse personalmente en nuestras oficinas (Carrera 10 #10-10)</li>
          <li>Enviar comunicación escrita por correo certificado</li>
        </ol>
        <p>
          Su solicitud debe incluir: nombre completo, tipo y número de documento, descripción clara 
          de la solicitud, dirección de notificación y documentos que respalden su petición.
        </p>
        <p><strong>Plazo de respuesta:</strong> 15 días hábiles desde la recepción de la solicitud completa.</p>
      </section>

      <section>
        <h2>6. Seguridad de la Información</h2>
        <p>
          La Entidad Institucional implementa medidas técnicas, humanas y administrativas para proteger 
          sus datos personales contra:
        </p>
        <ul>
          <li>Acceso no autorizado</li>
          <li>Pérdida o alteración</li>
          <li>Divulgación indebida</li>
          <li>Uso inadecuado</li>
        </ul>
        <p>Medidas implementadas:</p>
        <ul>
          <li>Cifrado de datos en tránsito (HTTPS/TLS)</li>
          <li>Controles de acceso basados en roles</li>
          <li>Auditoría de todas las operaciones</li>
          <li>Respaldos periódicos</li>
          <li>Capacitación de personal en protección de datos</li>
        </ul>
      </section>

      <section>
        <h2>7. Conservación de Datos</h2>
        <p>
          Los datos personales serán conservados durante el tiempo necesario para cumplir con las 
          finalidades para las cuales fueron recolectados y de acuerdo con la legislación colombiana:
        </p>
        <ul>
          <li><strong>Expedientes activos:</strong> Mientras el trámite esté en curso</li>
          <li><strong>Expedientes resueltos:</strong> Mínimo 5 años conforme a Ley 594 de 2000</li>
          <li><strong>Datos históricos:</strong> Conservación permanente para fines estadísticos (anonimizados)</li>
        </ul>
      </section>

      <section>
        <h2>8. Transferencia y Transmisión de Datos</h2>
        <p>
          La Entidad Institucional NO transferirá ni transmitirá sus datos personales a terceros, 
          excepto en los siguientes casos:
        </p>
        <ul>
          <li>Cuando sea requerido por autoridad competente con orden judicial</li>
          <li>Para el cumplimiento de obligaciones legales</li>
          <li>Cuando sea necesario para la prestación del servicio solicitado</li>
          <li>Con su autorización expresa y previa</li>
        </ul>
      </section>

      <section>
        <h2>9. Datos de Menores de Edad</h2>
        <p>
          El tratamiento de datos personales de niños, niñas y adolescentes está sujeto a reglas especiales 
          conforme al artículo 7 de la Ley 1581 de 2012:
        </p>
        <ul>
          <li>Se requiere autorización del representante legal</li>
          <li>La solicitud debe ser presentada por el padre, madre o tutor</li>
          <li>Se aplica prioridad constitucional (Art. 44 CP)</li>
        </ul>
      </section>

      <section>
        <h2>10. Cambios en la Política</h2>
        <p>
          Esta política puede ser actualizada periódicamente. Los cambios serán comunicados a través de 
          nuestro sitio web. La versión vigente siempre estará disponible en:
        </p>
        <p><strong>https://entidadciudad.gov.co/privacidad</strong></p>
      </section>

      <section>
        <h2>11. Autorización</h2>
        <p>
          Al utilizar nuestros servicios y proporcionar sus datos personales, usted declara haber leído, 
          entendido y aceptado esta política de tratamiento de datos personales, autorizando expresamente 
          a la Entidad Institucional para el tratamiento de sus datos conforme a 
          lo aquí establecido.
        </p>
      </section>

      <section>
        <h2>12. Supervisión y Quejas</h2>
        <p>
          La autoridad de control en materia de protección de datos personales en Colombia es la 
          Superintendencia de Industria y Comercio - Dependencia para la Protección de Datos Personales.
        </p>
        <p>
          <strong>Sitio web:</strong> <a href="https://www.sic.gov.co" target="_blank" rel="noopener">www.sic.gov.co</a><br />
          <strong>Línea gratuita:</strong> 01-8000-910-165
        </p>
      </section>

      <section>
        <h2>13. Contacto</h2>
        <p>
          Para cualquier consulta sobre esta política o el tratamiento de sus datos personales:
        </p>
        <p>
          <strong>Email:</strong> datospersonales@entidadciudad.gov.co<br />
          <strong>Teléfono:</strong> (602) 228-0000<br />
          <strong>Dirección:</strong> Carrera 10 #10-10, Ciudad/Municipio, Valle del Cauca
        </p>
      </section>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6' }}>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          <strong>Documento vigente desde:</strong> Enero 8, 2026<br />
          <strong>Marco legal:</strong> Ley 1581 de 2012, Decreto 1377 de 2013, Constitución Política de Colombia
        </p>
      </div>
      </div>
    </main>
  );
}
