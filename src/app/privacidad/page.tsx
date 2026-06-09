export const dynamic = 'force-dynamic';

import { headers } from 'next/headers';
import { resolveTenantByHost } from '@/lib/tenantResolver';
import { prisma } from '@/lib/prisma';

export default async function PrivacyPolicyPage() {
  const headersList = headers();
  const host = headersList.get('x-tenant-domain') || headersList.get('host');
  const tenant = await resolveTenantByHost(host);
  const settings = tenant
    ? await prisma.tenantSettings.findUnique({ where: { tenantId: tenant.id } })
    : null;

  const entityName = tenant?.name || 'la comisaría de familia';
  const entityAddress = settings?.address || tenant?.address || 'la sede de la comisaría';
  const entityPhone = settings?.phone || tenant?.phone || 'el teléfono de la comisaría';
  const entityEmail = settings?.institutionalEmail || tenant?.institutionalEmail || 'el correo de la comisaría';

  return (
    <main className="section">
      <div className="container">
        <h1>Política de Tratamiento de Datos Personales</h1>

        <p>
          <strong>Entidad:</strong> {entityName}<br />
          <strong>Marco Legal:</strong> Ley 1581 de 2012, Decreto 1377 de 2013 y Ley 1098 de 2006 (Código de Infancia y Adolescencia)
        </p>

        <section>
          <h2>1. Responsable del Tratamiento</h2>
          <p>
            <strong>Entidad:</strong> {entityName}<br />
            <strong>Dirección:</strong> {entityAddress}<br />
            <strong>Teléfono:</strong> {entityPhone}<br />
            <strong>Email:</strong> {entityEmail}
          </p>
        </section>

        <section>
          <h2>2. Finalidad del Tratamiento</h2>
          <p>Los datos personales recolectados serán utilizados para:</p>
          <ul>
            <li>Radicación y trámite de denuncias por violencia intrafamiliar y solicitudes ante la comisaría de familia</li>
            <li>Adopción y seguimiento de medidas de protección a las víctimas y su grupo familiar</li>
            <li>Procesos de restablecimiento de derechos de niños, niñas y adolescentes (PARD)</li>
            <li>Conciliación en asuntos de familia (custodia, cuota de alimentos y regulación de visitas)</li>
            <li>Valoraciones del equipo interdisciplinario (psicología, trabajo social y jurídica)</li>
            <li>Comunicación sobre el estado del proceso y citación a audiencias</li>
            <li>Generación de estadísticas de política pública con datos anonimizados</li>
            <li>Cumplimiento de las obligaciones legales de la comisaría</li>
          </ul>
        </section>

        <section>
          <h2>3. Tratamiento de Datos Sensibles</h2>
          <p>
            Por la naturaleza de su función, la comisaría trata <strong>datos sensibles</strong> de víctimas de
            violencia y de niños, niñas y adolescentes. Estos datos reciben protección reforzada: acceso restringido
            por rol, confidencialidad de las valoraciones psicosociales y registro de auditoría de cada consulta.
          </p>
          <p><strong>Categorías de datos:</strong> identificación, contacto, descripción de los hechos, relación de
            parentesco y rol en el caso, documentos aportados, y datos técnicos de la radicación (IP, fecha y hora).</p>
        </section>

        <section>
          <h2>4. Datos de Niños, Niñas y Adolescentes</h2>
          <p>
            El tratamiento de datos de NNA se rige por el artículo 7 de la Ley 1581 de 2012 y por la Ley 1098 de 2006,
            atendiendo su interés superior y la prevalencia de sus derechos (Art. 44 de la Constitución):
          </p>
          <ul>
            <li>Se garantiza el acceso restringido a su expediente, incluso frente a otras partes del proceso.</li>
            <li>La representación se ejerce por su representante legal o por la autoridad cuando corresponda.</li>
            <li>Sus datos nunca se usan con fines distintos a su protección y restablecimiento de derechos.</li>
          </ul>
        </section>

        <section>
          <h2>5. Derechos del Titular</h2>
          <p>Como titular de datos personales, usted tiene derecho a conocer, actualizar, rectificar y suprimir sus
            datos, y a revocar la autorización, salvo cuando exista un deber legal de conservarlos por tratarse de un
            proceso de comisaría de familia.</p>
        </section>

        <section>
          <h2>6. Procedimiento para Ejercer sus Derechos</h2>
          <p>Puede ejercer sus derechos escribiendo a {entityEmail}, presentándose en {entityAddress} o llamando a
            {' '}{entityPhone}. Indique su nombre completo, tipo y número de documento, la descripción de su solicitud
            y una dirección de notificación.</p>
        </section>

        <section>
          <h2>7. Seguridad de la Información</h2>
          <p>La comisaría implementa medidas técnicas, humanas y administrativas para proteger sus datos: cifrado en
            tránsito (HTTPS/TLS), control de acceso por rol, registro de auditoría inmutable de las operaciones sobre
            datos sensibles, respaldos periódicos y capacitación del personal.</p>
        </section>

        <section>
          <h2>8. Conservación de Datos</h2>
          <ul>
            <li><strong>Expedientes activos:</strong> mientras el proceso esté en curso.</li>
            <li><strong>Expedientes archivados:</strong> según las tablas de retención documental y la Ley 594 de 2000.</li>
            <li><strong>Datos estadísticos:</strong> conservación con anonimización para fines de política pública.</li>
          </ul>
        </section>

        <section>
          <h2>9. Supervisión</h2>
          <p>La autoridad de control en protección de datos en Colombia es la Superintendencia de Industria y Comercio.
            {' '}<a href="https://www.sic.gov.co" target="_blank" rel="noopener">www.sic.gov.co</a>.</p>
        </section>

        <section>
          <h2>10. Autorización</h2>
          <p>Al radicar una solicitud y proporcionar sus datos, usted autoriza a {entityName} a tratarlos conforme a
            esta política y a la finalidad exclusiva de gestionar su caso ante la comisaría de familia.</p>
        </section>
      </div>
    </main>
  );
}
