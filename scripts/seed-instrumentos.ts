/**
 * SEED — Catálogo de instrumentos de valoración (Fase C1)
 * ---------------------------------------------------------------------------
 * Siembra el catálogo GLOBAL de instrumentos (`Instrumento` + `InstrumentoCampo`)
 * a partir de `src/domain/catalogs/familyInstrumentos.ts`. Idempotente: upsert por
 * `code` y resincroniza los campos. NO toca datos de dominio del tenant, así que es
 * seguro correrlo sin re-sembrar el demo.
 *
 * Uso: npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/seed-instrumentos.ts
 * ---------------------------------------------------------------------------
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { FAMILY_INSTRUMENTOS } from '../src/domain/catalogs/familyInstrumentos';

const prisma = new PrismaClient();

async function main() {
  console.log('🧰 Sembrando catálogo de instrumentos de valoración\n');

  const idByCode: Record<string, string> = {};

  // Pass 1 — upsert de cada instrumento (sin parentId) + resync de campos.
  for (const def of FAMILY_INSTRUMENTOS) {
    const data = {
      name: def.name, norma: def.norma, version: def.version ?? null,
      profesion: def.profesion as never, appliesTo: (def.appliesTo ?? null) as never,
      assessmentType: (def.assessmentType ?? null) as never, description: def.description ?? null,
      isActive: def.isActive, displayOrder: def.displayOrder,
      scoringConfig: (def.scoringConfig ?? Prisma.JsonNull) as never,
    };
    const instrumento = await prisma.instrumento.upsert({
      where: { code: def.code },
      update: data,
      create: { code: def.code, ...data },
    });
    idByCode[def.code] = instrumento.id;

    // Resincronizar campos: borrar y recrear (la plantilla es la fuente de verdad).
    await prisma.instrumentoCampo.deleteMany({ where: { instrumentoId: instrumento.id } });
    if (def.campos.length > 0) {
      await prisma.instrumentoCampo.createMany({
        data: def.campos.map((c) => ({
          instrumentoId: instrumento.id,
          code: c.code, seccion: c.seccion, label: c.label, tipo: c.tipo as never,
          opciones: (c.opciones ?? Prisma.JsonNull) as never,
          ayuda: c.ayuda ?? null, requerido: c.requerido ?? false, orden: c.orden,
          peso: c.peso ?? null, esCritico: c.esCritico ?? false,
        })),
      });
    }

    const estado = def.isActive ? '✅' : '⏸️  (inactivo)';
    console.log(`   ${estado} ${def.code} — ${def.name} · ${def.campos.length} campo(s)`);
  }

  // Pass 2 — resolver la jerarquía de batería (parentCode → parentId).
  for (const def of FAMILY_INSTRUMENTOS) {
    const parentId = def.parentCode ? idByCode[def.parentCode] ?? null : null;
    await prisma.instrumento.update({ where: { id: idByCode[def.code] }, data: { parentId } });
  }

  console.log('\n✅ Catálogo de instrumentos sembrado.');
}

main().catch((e) => { console.error('❌', e); process.exit(1); }).finally(() => prisma.$disconnect());
