/**
 * Migración de roles a la estructura estándar de 6 roles por tenant.
 * Estructura objetivo:
 *   ADMIN (100)                  - Gestión técnica
 *   DIRECTOR (100)               - Máxima autoridad operativa / fallback IA
 *   ASIGNACION_DE_CASOS (90)     - Agente IA
 *   FUNCIONARIO (85)             - Personal técnico
 *   VENTANILLA_UNICA (80)        - Front desk
 *   AUXILIAR_ATENCION_USUARIO (75) - Atención ciudadana (solo lectura)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STANDARD_ROLES = [
  {
    code: 'ADMIN',
    name: 'Administrador',
    level: 100,
    description: 'Gestión técnica del sistema. NO opera casos.',
  },
  {
    code: 'DIRECTOR',
    name: 'Director',
    level: 100,
    description: 'Máxima autoridad institucional. Atiende casos críticos y es fallback de la IA.',
  },
  {
    code: 'ASIGNACION_DE_CASOS',
    name: 'Asignación de Casos (IA)',
    level: 90,
    description: 'Agente de IA que distribuye automáticamente los casos entre funcionarios.',
  },
  {
    code: 'FUNCIONARIO',
    name: 'Funcionario',
    level: 85,
    description: 'Personal técnico o profesional. La IA le asigna casos según su especialidad.',
  },
  {
    code: 'VENTANILLA_UNICA',
    name: 'Ventanilla Única',
    level: 80,
    description: 'Recibe, radica y tramita solicitudes ciudadanas en el mostrador.',
  },
  {
    code: 'AUXILIAR_ATENCION_USUARIO',
    name: 'Auxiliar de Atención al Usuario',
    level: 75,
    description: 'Atención directa al ciudadano. Solo lectura de casos y ciudadanos.',
  },
];

// Mapeo de códigos legacy → código estándar
// Formato: [codigoLegacyExacto_o_sufijo, codigoEstándar]
// Si el código legacy termina en _{SIGLA}, se aplica el sufijo
const LEGACY_SUFFIX_MAP: Record<string, string> = {
  'ADMIN':                          'ADMIN',
  'DIRECTOR_ENCARGADO':             'DIRECTOR',
  'PERSONERO_MUNICIPAL':            'DIRECTOR',  // PMBUGA específico
  'FUNCIONARIO_REGULAR':            'FUNCIONARIO',
  'FUNCIONARIO':                    'FUNCIONARIO',
  'VENTANILLA_UNICA':               'VENTANILLA_UNICA',
  'AUXILIAR_ATENCION_USUARIO':      'AUXILIAR_ATENCION_USUARIO',
  'ASIGNACION_DE_CASOS':            'ASIGNACION_DE_CASOS',
};

/**
 * Dado un roleCode y una sigla de tenant, retorna el código estándar correspondiente.
 * Ej: "ADMIN_PMGUC" con sigla "PMGUC" → "ADMIN"
 *     "DIRECTOR_ENCARGADO_ETEST1" con sigla "ETEST1" → "DIRECTOR"
 *     "PERSONERO_MUNICIPAL" (PMBUGA) → "DIRECTOR"
 */
function resolveStandardCode(roleCode: string, sigla: string): string | null {
  const upper = roleCode.toUpperCase();
  const siglaUpper = sigla.toUpperCase();

  // Quitar el sufijo _{SIGLA} si está presente al final
  const stripped = upper.endsWith(`_${siglaUpper}`)
    ? upper.slice(0, upper.length - siglaUpper.length - 1)
    : upper;

  return LEGACY_SUFFIX_MAP[stripped] ?? null;
}

async function main() {
  console.log('=== Migración de Roles a Estructura Estándar ===\n');

  const tenants = await prisma.tenant.findMany({ orderBy: { sigla: 'asc' } });
  console.log(`Tenants encontrados: ${tenants.map(t => t.sigla).join(', ')}\n`);

  for (const tenant of tenants) {
    console.log(`\n--- Procesando tenant: ${tenant.sigla} (ID: ${tenant.id}) ---`);

    // 1. Obtener roles actuales del tenant
    const existingRoles = await prisma.role.findMany({ where: { tenantId: tenant.id } });
    console.log(`  Roles actuales: ${existingRoles.map(r => r.code).join(', ')}`);

    // 2. Crear roles estándar que falten
    const roleMap: Record<string, string> = {}; // standardCode → roleId (nuevo o existente)

    for (const sr of STANDARD_ROLES) {
      const existing = existingRoles.find(r => r.code === sr.code);
      if (existing) {
        console.log(`  ✓ Ya existe: ${sr.code} (ID: ${existing.id})`);
        roleMap[sr.code] = existing.id;
        // Actualizar level/name/description si difieren
        if (existing.level !== sr.level || existing.name !== sr.name) {
          await prisma.role.update({
            where: { id: existing.id },
            data: { level: sr.level, name: sr.name, description: sr.description, isActive: true },
          });
          console.log(`    → Actualizado (level/name normalizados)`);
        }
      } else {
        const created = await prisma.role.create({
          data: {
            tenantId: tenant.id,
            code: sr.code,
            name: sr.name,
            level: sr.level,
            description: sr.description,
            isActive: true,
          },
        });
        console.log(`  + Creado: ${sr.code} (ID: ${created.id})`);
        roleMap[sr.code] = created.id;
      }
    }

    // 3. Migrar usuarios desde roles legacy
    const legacyRoles = existingRoles.filter(r => !STANDARD_ROLES.some(sr => sr.code === r.code));
    console.log(`  Roles legacy a migrar: ${legacyRoles.map(r => r.code).join(', ') || 'ninguno'}`);

    for (const legacy of legacyRoles) {
      // AUXILIAR (level 30) — rol especial con lógica en auth.ts, NO migrar
      if (legacy.code === 'AUXILIAR') {
        console.log(`  ~ Skipping AUXILIAR (rol especial con lógica de delegación, se preserva)`);
        continue;
      }

      const targetCode = resolveStandardCode(legacy.code, tenant.sigla);
      if (!targetCode) {
        console.warn(`  ⚠ No se encontró mapeo para: ${legacy.code} — se omite`);
        continue;
      }

      const targetRoleId = roleMap[targetCode];
      if (!targetRoleId) {
        console.warn(`  ⚠ Rol destino '${targetCode}' no tiene ID en roleMap — omitiendo`);
        continue;
      }

      // Contar usuarios en este rol legacy
      const userCount = await prisma.user.count({ where: { roleId: legacy.id } });
      console.log(`  → Migrando ${userCount} usuario(s) de ${legacy.code} → ${targetCode}`);

      if (userCount > 0) {
        await prisma.user.updateMany({
          where: { roleId: legacy.id },
          data: { roleId: targetRoleId },
        });
      }

      // Eliminar el rol legacy
      await prisma.role.delete({ where: { id: legacy.id } });
      console.log(`  🗑 Eliminado rol legacy: ${legacy.code}`);
    }

    // 4. Verificación final
    const finalRoles = await prisma.role.findMany({
      where: { tenantId: tenant.id },
      orderBy: { level: 'desc' },
    });
    console.log(`  Roles finales: ${finalRoles.map(r => `${r.code}(${r.level})`).join(', ')}`);
  }

  console.log('\n=== Migración completada ===');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('FATAL:', e);
  await prisma.$disconnect();
  process.exit(1);
});
