# GEFA — Qué reutilizar de Ventanilla Única

Análisis del proyecto `ventanilla_unica_base` como base para GEFA (Gestión Familiar). La buena noticia: la arquitectura de Ventanilla Única **es exactamente la que necesita GEFA** (SaaS multitenant, base de datos por tenant en Neon, Next.js 14 App Router, Prisma, JWT, panel super-admin). No hay que diseñar la infraestructura desde cero: se hereda casi completa y solo se reemplaza el dominio.

**Recomendación de estrategia:** clonar `ventanilla_unica_base` como punto de partida de GEFA, conservar el esqueleto multitenant + SaaS + servicios transversales, y sustituir los módulos de dominio (derechos de petición → casos de familia, medidas de protección, PARD, valoraciones, audiencias).

---

## 1. Reutilizable casi tal cual — Infraestructura multitenant

Esto es el corazón y se copia con cambios mínimos. Valida y reemplaza todo lo que propusimos en el plan de GEFA.

| Archivo / Componente | Qué hace | Reuso en GEFA |
|---|---|---|
| `src/lib/tenantResolver.ts` | Resuelve el tenant por host (subdominio/dominio) con caché en memoria; soporta localhost y subdominios `.localhost` para dev | **Directo.** Misma lógica que diseñamos. |
| `src/lib/tenantDb.ts` | `getTenantPrisma(url)` y `getPrismaForTenant(tenantId)` con caché de clientes Prisma por tenant | **Directo.** Es el `getTenantPrisma` del plan, ya implementado y probado. |
| `src/lib/prisma.ts` | Singleton del cliente Prisma del control plane (con manejo de hot-reload) | **Directo.** |
| `src/lib/jwt.ts` | Firma/verifica JWT con `jose` (compatible con Edge Runtime / middleware de Vercel). El payload ya incluye `tenantId` | **Directo.** |
| `src/lib/auth.ts` | `protectAPIRoute`, RBAC, normalización de roles (`getBaseRoleCode`), resolución de tenant + Prisma del tenant en cada request | **Casi directo** (ajustar el catálogo de roles a los de comisaría). |
| `src/middleware.ts` | Protege `/admin` y `/super-admin`, propaga `x-tenant-domain` | **Directo.** |
| `src/lib/rateLimit.ts` | Rate limiting | **Directo.** |
| Modelos `Tenant`, `InstitutionType`, `TenantSettings` | Control plane con `databaseUrl`, `databaseUrlDirect`, `neonProjectId`, branding por tenant (logo, colores) | **Directo.** Ya tienen el patrón exacto de BD-por-tenant que propusimos (incluido el connection string directo para migraciones, que en el plan no habíamos detallado). |
| `src/app/super-admin/*` (UI) | Páginas del panel super-admin: dashboard, auditoría, configuraciones | **Directo** como shell; ajustar contenido. |
| `src/app/api/v1/super-admin/tenants` | CRUD de tenants (crear con su `databaseUrl`, suspender/activar, cambiar dominio) | **Directo.** Es el provisioning que diseñamos. |
| `src/app/api/v1/super-admin/{audit-logs, system-config, institution-types, admins}` | Endpoints de administración SaaS | **Directo.** |

**Implicación:** las Fases 1 y 2 del plan de GEFA (infra multitenant + auth + panel super-admin) pasan de "construir" a "adaptar". Ahorro estimado: ~4–6 semanas.

> ⚠️ Detalle pendiente del plan que Ventanilla ya resolvió: usa **dos connection strings por tenant** (`databaseUrl` pooled + `databaseUrlDirect` para migraciones). Conviene adoptarlo en GEFA.

---

## 2. Reutilizable — Servicios transversales (agnósticos al dominio)

Capa de servicios madura (~9.000 líneas) que sirve a cualquier sistema de gestión de casos. Estos se heredan con poco o ningún cambio:

- **`AuthService.ts`** — login, sesiones, hashing (bcrypt). Directo.
- **`AuditService.ts`** (528 líneas) — registro de auditoría. **Crítico para GEFA** por el manejo de datos sensibles de víctimas y NNA. Directo.
- **`EmailService.ts`** (975 líneas) — envío de correo, plantillas, nodemailer/SMTP por tenant. Directo.
- **`SMSService.ts`** — notificaciones SMS. Directo (citaciones, alertas de medidas).
- **`NotificationService.ts` + `NotificationHooks.ts`** — motor de notificaciones y disparadores. Directo, adaptando los eventos.
- **`BlobStorageService.ts`** — almacenamiento de documentos en Vercel Blob. Directo (expediente digital).
- **`TemplateService.ts`** — generación de documentos desde plantillas. Directo (autos, oficios, citaciones).
- **`ReportService.ts`** + exportación a Excel (`xlsx`) — reportes. Directo, cambiando los indicadores.
- **`MetricsService.ts`** / **`HealthService.ts`** / **`SystemSettingsService.ts`** — métricas, salud, configuración. Directo.
- **`SLAService.ts`** (472 líneas) + `businessDays.ts` — control de tiempos y días hábiles. **Reutilizable para los términos legales del PARD** y vencimientos de medidas de protección. Adaptación media.
- **`StateMachineService.ts` + `CaseStateService.ts`** — máquina de estados de casos. Reutilizable como motor; se redefinen los estados (radicado → con medida → en seguimiento → archivado/remitido).

---

## 3. Adaptable — Patrón de dominio (mismo molde, distinto contenido)

El dominio de Ventanilla (derechos de petición/quejas) tiene la **misma estructura** que el de GEFA (casos de familia). Se reutiliza el patrón y se renombra/extiende:

| Ventanilla Única | → | GEFA |
|---|---|---|
| `Case`, `CaseType`, `CaseState`, `CaseStateHistory` | → | `Case` de familia con tipos de violencia y workflow propio |
| `Citizen` | → | `Person` (víctima / presunto agresor / NNA / testigo) + `CaseParty` |
| `Assignment`, `AssignmentService`, `AIAssignmentService` | → | Asignación de casos al equipo interdisciplinario (incluso con IA, ya implementada) |
| `Document`, `DocumentService` | → | Expediente digital (igual) |
| `SLAService` / `CaseSLAConfig` | → | Términos legales PARD + vencimiento de medidas |
| `SupervisionService`, `InboxService`, Dashboard | → | Supervisión, bandeja y tableros (igual patrón) |
| — (nuevos, no existen) | → | `ProtectionMeasure`, `RestorationProcess` (PARD), `Hearing` (audiencias), `Assessment` (valoraciones psicosociales) |

El `CaseService`, el patrón de API en `/api/v1/cases`, y el shell de administración (`/admin/cases`, `/admin/usuarios`, `/admin/reports`, `/admin/settings`, login) sirven como plantilla directa para las pantallas equivalentes de GEFA.

---

## 4. A reemplazar / no reutilizar (específico de personería)

- **Tipos de caso** DP, Q, SG, DH, MA → catálogo de tipos de violencia/conflicto familiar.
- **Módulo de Transparencia** (`/transparencia`, `transparencyDefaults.ts`) — no aplica a comisarías.
- **Landing y contenidos** (`landingDefaults.ts`, `atencion-ciudadano`, `la-entidad`, `servicios`) — se rehacen para GEFA.
- **`foliosCalculator.ts`** y lógica de folios/radicación tipo personería — revisar si aplica.
- **`email-directory` / entidades externas** → se reorienta a ICBF, Medicina Legal, Fiscalía.
- **`peticiones-reasignacion`** — evaluar si el flujo aplica a comisarías.

---

## 5. Proceso y convenciones reutilizables

- **`CLAUDE.md` + bitácora de implementación** (`docs/documentacion/plan-de-implementacion.md`) — la disciplina de registrar cada cambio es buena práctica; se replica en GEFA adaptando el contexto.
- **Estructura de carpetas** (`src/lib`, `src/services`, `src/domain`, `src/app/api/v1`, `src/security`, `src/audit`) — coincide con la que propusimos; se adopta tal cual.
- **Scripts** de seed, migración multitenant y stress-test — base reutilizable para el provisioning y QA de GEFA.

---

## 6. Consideración crítica de seguridad para GEFA

Ventanilla maneja datos de ciudadanos; **GEFA maneja datos de víctimas de violencia y NNA**, una categoría mucho más sensible. La base de RBAC + auditoría es sólida, pero al adaptar hay que **endurecer el control de acceso**:

- Restringir el acceso a `Assessment` (valoraciones psicosociales) y a expedientes con menores por rol y por necesidad.
- Anonimización en reportes agregados.
- Revisar retención y cifrado de campos sensibles.

El aislamiento físico por tenant (BD separada) ya juega a favor del cumplimiento de la Ley 1581 y la Ley 1098.

---

## 7. Plan de acción sugerido

1. **Clonar** `ventanilla_unica_base` → `gefa` (nuevo repo en GitHub con `gh repo create`).
2. **Conservar** intactos: `lib/` (tenantResolver, tenantDb, prisma, jwt, auth, rateLimit), `middleware.ts`, modelos `Tenant/InstitutionType/TenantSettings`, panel super-admin y servicios transversales (Auth, Audit, Email, SMS, Notification, Blob, Template, Report, Metrics, Health, SystemSettings).
3. **Redefinir el dominio** en `schema.prisma`: reemplazar el dominio de petición por el de familia (Person, CaseParty, ProtectionMeasure, RestorationProcess, Hearing, Assessment) reusando el motor de estados y SLA.
4. **Eliminar** módulos específicos de personería (transparencia, folios, landing actual).
5. **Endurecer** RBAC/auditoría para datos de NNA y víctimas.
6. **Rehacer** la capa de presentación de dominio (pantallas de casos → casos de familia + nuevas: medidas, audiencias, valoraciones), reutilizando el shell de `/admin`.

Con esto, GEFA arranca con las Fases 0–2 del plan prácticamente resueltas y el esfuerzo se concentra en el dominio (Fases 3–6).

---

*Análisis basado en revisión de `C:\projects\ventanilla_unica_base`.*
