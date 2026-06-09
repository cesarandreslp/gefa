const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const initialDropdowns = [
  // DISCAPACIDAD
  ...['Ninguna', 'Física', 'Auditiva', 'Visual', 'Sordoceguera', 'Intelectual'].map(v => ({ category: 'DISCAPACIDAD', value: v })),
  
  // ETNIA
  ...['Ninguna', 'Afrocolombianos (negros, mulatos, palenqueros)', 'Pueblos Indígenas', 'Gitanos o Pueblo Rom', 'Raizales de San Andrés y Providencia'].map(v => ({ category: 'ETNIA', value: v })),
  
  // EPS
  ...['NUEVA EPS', 'S.O.S', 'SURA', 'EMSSANAR', 'COMPENSAR', 'COMFENALCO', 'SANITAS', 'SALUD TOTAL', 'REGIMEN ESPECIAL', 'REDESIMAT IPS', 'TODOMED', 'SABIA SALUD', 'COOSALUD', 'FOMAG', 'MUTUAL SER EPS', 'OTRAS EPS', 'NO APLICA'].map(v => ({ category: 'EPS', value: v })),
  
  // DELEGATURA
  ...['La Promoción y Defensa de los Derechos Humanos y el Medio Ambiente', 'La Participación Ciudadana', 'Salud y Defensa del Interés Publico', 'La Rama Judicial y Juzgamiento en Primera Instancia Dentro de la Acción Disciplinaria', 'La Vigilancia de la Conducta Oficial', 'La Contratación y los Servicios Públicos Domiciliarios', 'Despacho Personero'].map(v => ({ category: 'DELEGATURA', value: v })),
  
  // RESPONSABLE DEL CASO
  ...['Dr. Carlos Mauricio López Posso', 'Dra. Clara Ximena Rueda Tenorio', 'Dr. Edward Aldemar Rojas Rebellon', 'Dra. Elsa Oladis Sánchez Ramírez', 'Dr. Jeffryn Yohany García Cohecha', 'Dr. Julio Eliecer Mosquera Betancourt', 'Dra. María Isabel Rodríguez', 'Dra. María Fernanda Lopeda Libreros', 'Sr. Mario Galvis Giraldo', 'Dra. Maryzabel Becerra Becerra Tascón', 'Dr. Nikolai Olaya Maldonado', 'Dra. Paula Andrea González Barbosa'].map(v => ({ category: 'RESPONSABLE DEL CASO', value: v })),
  
  // ASUNTO
  ...['Tutela', 'Desacato', 'Asesoría', 'Derecho de petición', 'Queja', 'Veeduría', 'Declaración', 'Vivanto', 'Recurso', 'Bienestar adulto mayor', 'Impugnación', 'Curso pedagógico', 'Defensor publico', 'Amparo de pobreza', 'Notificación personal', 'Intervención especial', 'Versión libre'].map(v => ({ category: 'ASUNTO', value: v }))
];

async function main() {
  console.log('🌱 Inicializando DropdownOptions (Opciones de combos)...');

  for (const item of initialDropdowns) {
    const existing = await prisma.dropdownOption.findUnique({
      where: {
        category_value: {
          category: item.category,
          value: item.value
        }
      }
    });

    if (!existing) {
      await prisma.dropdownOption.create({
        data: {
          category: item.category,
          value: item.value
        }
      });
      console.log(`✅ Creado: [${item.category}] ${item.value}`);
    } else {
      console.log(`⚡ Ya existe: [${item.category}] ${item.value}`);
    }
  }

  console.log('✅ Carga completa.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
