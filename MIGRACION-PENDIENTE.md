# Migración Ventanilla → GEFA — Pendientes

GEFA se clonó de `ventanilla_unica_base`. La infraestructura y los servicios transversales quedaron listos. Este documento lista lo que falta para completar la transición de dominio (personería → familia).

> **Nota de criterio:** los módulos de personería NO se eliminaron en bruto durante el clonado para no dejar el proyecto sin compilar (no se pudo correr `next build` en este entorno sin `node_modules` ni BD). Se retiran de forma controlada en la fase de dominio, verificando el build tras cada cambio.

---

## 1. A ELIMINAR (módulos específicos de personería)

| Ruta | Qué es | Acción |
|---|---|---|
| `src/app/transparencia/` | Página de transparencia (dir vacío; el frontend no se copió) | Borrar el directorio en local. |
| `src/app/api/public/transparency/` | API de transparencia | Eliminar. |
| `src/app/api/public/legal-texts/` | Textos legales de personería | Eliminar o reescribir para GEFA. |
| `src/lib/transparencyDefaults.ts` | Contenido por defecto de transparencia | Eliminar (revisar referencias en páginas/constants). |
| `src/lib/landingDefaults.ts` | Contenido de landing de personería | Reescribir para GEFA o eliminar. |
| `src/lib/foliosCalculator.ts` | Cálculo de folios estilo personería | Evaluar si aplica; probablemente eliminar. |
| `src/app/{home,la-entidad,servicios}/` | Landing pública de personería | Rehacer para GEFA. |
| `src/app/api/v1/peticiones-reasignacion/`, `reasignaciones/` | Flujo de reasignación de peticiones | Evaluar si el flujo aplica a comisarías. |

> Antes de borrar `transparencyDefaults.ts` / `landingDefaults.ts`, hacer `grep` de sus imports para limpiar referencias y mantener el build verde.

## 2. A TRANSFORMAR (dominio de petición → familia)

| Actual (Ventanilla) | Destino (GEFA) |
|---|---|
| `Case`, `CaseType`, `CaseState`, `CaseStateHistory` (schema) | `Case` de familia con tipos de violencia y workflow propio |
| `Citizen` | `Person` (víctima/agresor/NNA/testigo) + `CaseParty` |
| `src/app/api/v1/cases`, `casos`, `solicitudes` | Endpoints de casos de familia |
| `src/app/admin/cases`, `solicitudes` | Pantallas de casos de familia |
| Tipos DP/Q/SG/DH/MA | Catálogo de tipos de violencia/conflicto familiar |

**Modelos nuevos a crear:** `ProtectionMeasure`, `RestorationProcess` (PARD), `Hearing` (audiencias), `Assessment` (valoraciones psicosociales).

## 3. A REUTILIZAR TAL CUAL (no tocar)

`src/lib/{tenantResolver,tenantDb,prisma,jwt,auth,rateLimit}.ts` · `src/middleware.ts` · `src/services/*` (Auth, Audit, Email, SMS, Notification, Blob, Template, Report, Metrics, Health, SystemSettings, SLA, StateMachine) · modelos `Tenant`/`InstitutionType`/`TenantSettings` · panel `super-admin` · `src/app/api/v1/super-admin/*`.

## 4. SEGURIDAD (endurecer para datos de NNA/víctimas)

- Restringir acceso a `Assessment` y a expedientes con menores por rol.
- Anonimización en reportes agregados.
- Revisar retención y cifrado de campos sensibles.

## 5. INFRAESTRUCTURA

- Crear repositorio propio en GitHub (`gh repo create`).
- Crear proyecto Vercel propio (`vercel`), configurar dominio y variables.
- Definir las BD Neon (control plane + tenants) y completar `.env` (`DATABASE_URL`, `JWT_SECRET`, `BLOB_*`, SMTP).
- Revisar `prisma/seed.ts` y `prisma/seed-superadmin.ts` para los catálogos de familia.
