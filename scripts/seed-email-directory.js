/**
 * Script para migrar los correos del directorio hardcodeado a la base de datos
 * Ejecutar una sola vez: node scripts/seed-email-directory.js
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CORREOS = [
  'notificacionesjudiciales@personeriabuga.gov.co',
  'participacionciudadana@personeriabuga.gov.co',
  'informacionfinanciera@personeriabuga.gov.co',
  'sgobierno@guadalajaradebuga-valle.gov.co',
  'derechoshumanos@personeriabuga.gov.co',
  'disciplinarios@personeriabuga.gov.co',
  'bienestarsocial@guadalajaradebuga-valle.gov.co',
  'contactenos@guadalajaradebuga-valle.gov.co',
  'educacion@guadalajaradebuga-valle.gov.co',
  'personero@personeriabuga.gov.co',
  'sectransito@guadalajaradebuga-valle.gov.co',
  'eider.cordoba@icbf.gov.co',
  'secsalud@guadalajaradebuga-valle.gov.co',
  'j06pmpalcgbuga@cendoj.ramajudicial.gov.co',
  'secobras@guadalajaradebuga-valle.gov.co',
  'ajtascon@procuraduria.gov.co',
  'trabajosocial@fsjb.org',
  'notificacionesjudiciales@sos.com.co',
  'splaneacion@guadalajaradebuga-valle.gov.co',
  'bugavalle@registraduria.gov.co',
  'lina.ramosc@icbf.gov.co',
  'atencionalciudadano@icbf.gov.co',
  'cj_comisariadefamilia2@bugadigital.gov.co',
  'jalcorr.lahabana@gmail.com',
  'dinstitucional@guadalajaradebuga-valle.gov.co',
  'cj_comisariadefamilia1@bugadigital.gov.co',
  'cmgrd@bugadigital.gov.co',
  'jlab_mao_dmp@hotmail.com',
  'j02pmcbuga@cendoj.ramajudicial.gov.co',
  'ointerno@guadalajaradebuga-valle.gov.co',
  'valle@defensoria.gov.co',
  'siuce@mineducacion.gov.co',
  'provincial.buga@procuraduria.gov.co',
  'personeriabuga@hotmail.com',
  'notificacionesadministrativas@cvc.gov.co',
  'atencionalusuario@cvc.gov.co',
  'servicioalcliente@nuevaeps.com.co',
  'direccion.epmscbuga@inpec.gov.co',
  'mariluz.restrepom@icbf.gov.co',
  'nomasabusoenalmavivabuga@gmail.com',
  'imderbuga1@hotmail.com',
  'servicioalciudadano@unidadvictimas.gov.co',
  'phanor.chalarca@icbf.gov.co',
  'seradicacionpqrdyt@emssanareps.co',
  'estratificacionbuga@gmail.com',
  'sechacienda@guadalajaradebuga-valle.gov.co',
  'deval.ebuga@policia.gov.co',
  'afiliate@emssanareps.co',
  'notificacionesjudiciales@cvc.gov.co',
  'pedro.bejarano@icbf.gov.co',
  'ledys.arboleda@icbf.gov.co',
  'anay.aguilar@nuevaeps.com.co',
  'coordmesavictimasbuga@gmail.com',
  'fis36locbuga@fiscalia.gov.co',
  'correocertificadonotificaciones@4-72.com.co',
  'mipres@atencionintegralencasa.com.co',
  'oficinadelamujer@guadalajaradebuga-valle.gov.co',
  'comisariadefamilia24@gmail.com',
  'eehmcali@gmail.com',
  'inspeccionsantabarbara@bugadigital.gov.co',
  'svivienda@guadalajaradebuga-valle.gov.co',
  'jlopezle@cendoj.ramajudicial.gov.co',
  'sagrifome@guadalajaradebuga-valle.gov.co',
  'eehmcali@icloud.com',
  'notificaciones_gd@defensoria.gov.co',
  'oscar.ordonez@icbf.gov.co',
  'wilfredo.castillo@fiscalia.gov.co',
  'notificaciones@buga.gov.co',
  'prestaciondeservicios@bugadigital.gov.co',
  'entesdecontrol@sos.com.co',
  'cobertura@sembugavalle.gov.co'
];

async function main() {
  console.log('🔄 Sembrando directorio de correos...');
  
  let created = 0;
  let skipped = 0;

  for (const email of CORREOS) {
    const normalized = email.toLowerCase();
    try {
      await prisma.emailDirectory.upsert({
        where: { email: normalized },
        update: { isActive: true },
        create: { email: normalized, isActive: true }
      });
      created++;
    } catch (err) {
      console.log(`⚠️ Saltando ${normalized}:`, err.message);
      skipped++;
    }
  }

  console.log(`✅ Directorio sembrado: ${created} correos creados/actualizados, ${skipped} errores`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
