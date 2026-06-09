# GEFA — Punto de Partida (handoff a Claude Code)

> **Léeme primero.** Este documento le dice a Claude Code en qué estado está el proyecto y por dónde empezar. El plan completo de producto está en `plan-plataforma-gestion-familiar.md`; el detalle de migración en `MIGRACION-PENDIENTE.md`; el análisis de reutilización en `gefa-reutilizacion-desde-ventanilla.md`.

---

## 1. Qué es esto y de dónde viene

GEFA es una plataforma SaaS multitenant para **comisarías de familia**. Se construyó **clonando `ventanilla_unica_base`** (misma arquitectura). La infraestructura multitenant y los servicios transversales ya están en el repo y funcionan; lo que falta es **reescribir el dominio** (derechos de petición → casos de familia) y conectar la infraestructura (git, Neon, Vercel).

---

## 2. Estado actual vs. plan original (9 fases)

| Fase del plan | Estado | Nota |
|---|---|---|
| **0 — Descubrimiento** | ⚠️ Parcial | Arquitectura y modelo definidos; falta validar el flujo del caso con comisarías reales. |
| **1 — Infraestructura multitenant** | ✅ Heredada | `tenantResolver`, `tenantDb`, `prisma`, `middleware`, control plane (`Tenant`/`InstitutionType`/`TenantSettings`), provisioning de tenants en `api/v1/super-admin/tenants`. **Falta:** crear las BD Neon reales y conectar Vercel/GitHub. |
| **2 — Auth + RBAC + super-admin** | ✅ Heredada | JWT (`jose`), `protectAPIRoute`, panel `super-admin`. **Falta:** ajustar el catálogo de roles a comisaría. |
| **3 — Núcleo de casos y expediente** | 🔲 Por hacer | Existe el patrón (`Case`/`Citizen`/`Document`) pero con dominio de petición. Hay que transformarlo. |
| **4 — Medidas de protección + PARD** | 🔲 Por hacer | Modelos nuevos: `ProtectionMeasure`, `RestorationProcess`. Reutilizar `SLAService` + `LegalTermsCalculator`. |
| **5 — Equipo interdisciplinario + agenda** | 🔲 Por hacer | Modelos nuevos: `Hearing`, `Assessment`. |
| **6 — Notificaciones + reportes** | ✅ Base heredada | `NotificationService`, `EmailService`, `SMSService`, `ReportService` listos; adaptar eventos e indicadores. |
| **7 — Portal ciudadano + integraciones** | 🔲 Opcional/futuro | — |
| **8 — Hardening + seguridad + QA** | 🔲 Por hacer | Endurecer RBAC/auditoría para NNA y víctimas. |

**Resumen:** las Fases 1, 2 y la base de la 6 están resueltas por herencia. El trabajo real arranca en la **Fase 3 (dominio)**, más unas tareas de infraestructura previas.

---

## 3. POR DÓNDE EMPIEZA CLAUDE CODE (orden recomendado)

### Paso 0 — Dejar el repo sano (manual, una vez)
El clonado se hizo desde un entorno que no permitía operaciones git. En tu equipo:

```bash
cd C:\projects\gefa
rmdir /s /q .git              # eliminar el .git parcial
rmdir /s /q src\app\transparencia   # carpeta vacía sobrante
git init
git add -A
git commit -m "chore: init GEFA desde Ventanilla Única"
gh repo create gefa --private --source=. --remote=origin --push
npm install                   # restaurar node_modules
```

### Paso 1 — Verificar que compila
```bash
npm run type-check
npm run build
```
Si algo falla, suele ser por referencias a módulos de personería. Corregir según `MIGRACION-PENDIENTE.md`.

### Paso 2 — Limpiar módulos de personería
Seguir la sección 1 de `MIGRACION-PENDIENTE.md` (transparencia, landing, folios), **verificando el build tras cada borrado**.

### Paso 3 — Configurar infraestructura
- Crear control plane + al menos una BD de tenant en Neon.
- Completar `.env` desde `.env.example` (`DATABASE_URL`, `JWT_SECRET`, `BLOB_*`, SMTP).
- Conectar el proyecto en Vercel (`vercel`), wildcard de subdominios y variables.

### Paso 4 — Reescribir el dominio (Fase 3, el corazón del trabajo)
En `prisma/schema.prisma`, transformar según sección 2 de `MIGRACION-PENDIENTE.md`:
- `Citizen` → `Person` + `CaseParty` (víctima/agresor/NNA/testigo).
- `Case`/`CaseType` → caso de familia con tipos de violencia.
- Añadir `ProtectionMeasure`, `RestorationProcess` (PARD), `Hearing`, `Assessment`.
- Reutilizar `StateMachineService`/`CaseStateService` para el workflow y `SLAService` para términos legales.

Luego adaptar API (`api/v1/cases`, `casos`, `solicitudes`) y pantallas (`admin/cases`).

### Paso 5 — Seguridad para datos sensibles
Endurecer RBAC y auditoría para valoraciones (`Assessment`) y expedientes con NNA (sección 4 de `MIGRACION-PENDIENTE.md`).

---

## 4. Reglas que Claude Code debe respetar

Están en `CLAUDE.md` (se carga automáticamente). Las dos críticas:
- **Bitácora obligatoria:** registrar cada instrucción en `docs/documentacion/plan-de-implementacion.md` (EN CURSO → COMPLETADO).
- **No tocar** la capa reutilizable (`lib/`, `middleware.ts`, servicios transversales, control plane, super-admin) salvo para ajustes puntuales de roles.

---

## 5. Mapa rápido de archivos clave

```
src/lib/tenantResolver.ts     # resuelve tenant por host
src/lib/tenantDb.ts           # cliente Prisma por tenant (getPrismaForTenant)
src/lib/auth.ts               # protectAPIRoute + RBAC
src/middleware.ts             # protege /admin y /super-admin
prisma/schema.prisma          # ← AQUÍ empieza la reescritura de dominio
src/services/                 # 23 servicios transversales (reutilizar)
src/app/api/v1/super-admin/   # provisioning de tenants
src/app/admin/                # shell de administración a adaptar
```
