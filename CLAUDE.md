# CLAUDE.md — GEFA (Gestión Familiar)

Instrucciones permanentes para Claude Code en este proyecto.

> 🧭 **Antes de trabajar, lee `PUNTO-DE-PARTIDA.md` en la raíz.** Explica el estado actual del proyecto (qué se heredó de Ventanilla Única y qué falta) y el orden de arranque. Detalle de la migración en `MIGRACION-PENDIENTE.md`.

---

## ⚠️ REGLA OBLIGATORIA — BITÁCORA DE IMPLEMENTACIÓN

> **Esta regla NO es opcional. Debe ejecutarse en CADA instrucción, sin excepción.**

### PASO 1 — Al recibir cualquier instrucción (ANTES de hacer nada más)

**Lo primero que debes hacer** — antes de leer código, antes de planear, antes de cualquier acción — es abrir `docs/documentacion/plan-de-implementacion.md` y registrar la instrucción con estado `EN CURSO`:

```markdown
## YYYY-MM-DD

### N. Título corto del cambio
**Estado:** EN CURSO
**Objetivo:** Una frase que explique el por qué.
```

### PASO 2 — Ejecutar la instrucción

Recién después de guardar el paso 1, ejecuta el trabajo solicitado.

### PASO 3 — Al terminar (ANTES de hacer el commit)

**Actualiza la entrada** reemplazando `EN CURSO` por `COMPLETADO` y añadiendo el detalle (archivos tocados, problema/causa/solución si es un fix).

---

## Contexto del proyecto

**Sistema:** GEFA — plataforma SaaS multitenant de gestión de casos para **comisarías de familia** colombianas. Inspirada en el sistema SIGFA. Reemplaza el expediente en papel por un expediente digital y da trazabilidad a casos de violencia intrafamiliar, medidas de protección, restablecimiento de derechos (PARD) y valoraciones psicosociales.

**Origen del código:** GEFA se construyó clonando la base de `ventanilla_unica_base` (misma arquitectura multitenant). Se conserva toda la infraestructura y los servicios transversales; el **dominio** se está reescribiendo de "derechos de petición" a "casos de familia".

**Arquitectura:** Next.js 14 App Router · Node.js · Prisma · PostgreSQL (Neon) · Vercel · GitHub.

**Multi-tenancy:** Cada tenant (entidad territorial / comisaría) tiene su propia BD Neon. El host del request (`subdominio.dominio`) se resuelve al `tenantId` mediante `src/lib/tenantResolver.ts`. Las rutas de API usan el cliente Prisma del tenant (`src/lib/tenantDb.ts` → `getPrismaForTenant`), no el cliente global. El control plane (modelos `Tenant`, `InstitutionType`, `TenantSettings`) guarda `databaseUrl` (pooled) y `databaseUrlDirect` (migraciones) por tenant.

**Datos sensibles (CRÍTICO):** GEFA maneja datos de víctimas de violencia y de NNA. El control de acceso (RBAC) y la auditoría deben ser estrictos. Restringir acceso a valoraciones psicosociales y a expedientes con menores. Cumplimiento Ley 1581 de 2012 (habeas data) y Ley 1098 de 2006 (infancia y adolescencia).

**Dominio a construir (Fase 3+):** `Person` (víctima/agresor/NNA/testigo) + `CaseParty`, `Case` de familia con tipos de violencia, `ProtectionMeasure`, `RestorationProcess` (PARD), `Hearing` (audiencias), `Assessment` (valoraciones). Reutilizar el motor de estados (`StateMachineService`, `CaseStateService`) y de términos/SLA (`SLAService`, `domain/rules/LegalTermsCalculator.ts`).

---

## Reglas de desarrollo

- No ejecutar `npm run dev` ni servidores sin confirmación explícita del usuario.
- Hacer `git commit` y `git push` al finalizar cada cambio de código (cuando exista repositorio remoto configurado).
- No agregar comentarios al código salvo que el "por qué" sea no obvio.
- No crear archivos de documentación adicionales salvo que el usuario lo pida.
- Variables de entorno sensibles van en `.env` — no listarlas en respuestas.

---

## Pendientes de la migración Ventanilla → GEFA

- Reemplazar el dominio de petición (`Case`/`CaseType`/`Citizen`) por el de familia.
- Retirar módulos de personería que aún queden (transparencia, contenidos de landing, folios).
- Endurecer RBAC/auditoría para datos de NNA y víctimas.
- Configurar nuevo repositorio GitHub y proyecto Vercel propios de GEFA.
- Revisar `.env.example` y variables (`DATABASE_URL`, `JWT_SECRET`, `BLOB_*`, SMTP, etc.).
