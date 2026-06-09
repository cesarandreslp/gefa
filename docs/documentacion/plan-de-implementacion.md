# Plan de Implementación — GEFA

Bitácora de cambios del proyecto. Una entrada por instrucción (ver regla en `CLAUDE.md`).

---

## 2026-06-09

### 12. Fase 3 — Módulo 4: workflow de estados y seguimiento (motor)
**Estado:** COMPLETADO
**Objetivo:** Implementar las transiciones de estado del caso de familia con validación, historial y UI, sin tocar el `StateMachineService` heredado (que usa estados de petición).

**Motor — `src/domain/rules/familyStateMachine.ts` (nuevo):** matriz de transiciones del workflow de familia, estados finales (`REMITIDO`, `CERRADO`), reapertura restringida a ADMIN/DIRECTOR (a `EN_SEGUIMIENTO`/`EN_VALORACION`). `validateFamilyTransition()` valida origen/destino, permisos y comentario obligatorio (deriva `requiresComment` del catálogo de estados + fuerza comentario en reaperturas). `availableFamilyTransitions()` da los destinos para la UI. Independiente del motor heredado.

**Endpoint `/api/v1/family/cases/[caseId]/transition`:**
- `GET` — estados disponibles desde el actual según el rol (normalizado con `getBaseRoleCode`).
- `POST` — valida la transición; en transacción actualiza `case.stateId` (set `closedAt`/`closedBy` si pasa a `CERRADO`) y registra `CaseStateHistory` (`reason: TRANSITION`/`REOPENED`). Rechaza con 422 si la transición o el comentario no son válidos. Roles `FAMILY_WRITE_ROLES`.

**Expediente (`admin/family/[caseId]`):** la GET del expediente ahora incluye `stateHistory`. La pantalla añade: tarjeta **"Cambiar estado"** (select de transiciones disponibles + comentario obligatorio cuando aplica) y **línea de tiempo del historial** (de→a, comentario, autor, fecha, badge REAPERTURA).
**Verificación:** `type-check` OK; `build` OK (endpoint y página en el manifiesto).

### 11. Fase 3 — Módulo 3b: pantallas de admin (radicación + expediente de familia)
**Estado:** COMPLETADO
**Objetivo:** Crear las pantallas del panel admin que consumen las APIs del Módulo 2/3.

**Patrón:** client components que hacen `fetch('/api/v1/family/*')` (cookie `auth-token` automática; `protectAPIRoute` resuelve tenant + RBAC). Estilos inline coherentes con el shell `admin`.

**Catálogo de etiquetas — `src/domain/catalogs/familyLabels.ts` (nuevo):** mapas valor-enum → texto en español (roles de parte, tipos de violencia, modalidades, tipos/estados de medida, tipos de audiencia, etapas PARD, niveles de riesgo) para no divergir entre vistas.

**Pantallas (`src/app/admin/family/`):**
- `page.tsx` — listado de casos de familia: búsqueda por radicado/asunto, tabla con modalidad, nº de partes (con badge NNA), estado coloreado; botón "Radicar caso".
- `nuevo/page.tsx` — formulario de radicación: tipo de caso (desde `FAMILY_CASE_TYPES`), canal, asunto, descripción, checkboxes de tipos de violencia, y **partes dinámicas** (agregar/quitar) con rol, documento y datos personales; exige representante legal cuando el rol es NNA. Hace `POST /api/v1/family/cases` y redirige al expediente.
- `[caseId]/page.tsx` — expediente digital: encabezado (radicado, estado, vencimiento, prioridad, tipos de violencia, descripción), partes, medidas de protección, PARD, audiencias y **valoraciones** (consultadas aparte a su endpoint confidencial; si el rol no tiene acceso muestra aviso de restricción en vez de los datos).

**Navegación:** añadida la entrada "👨‍👩‍👧 Familia" → `/admin/family` en `AdminNav.tsx`.
**Verificación:** `type-check` OK; `build` OK (las 3 páginas en el manifiesto).

### 10. Fase 3 — Módulo 3: radicación de caso de familia (endpoint orquestador)
**Estado:** COMPLETADO
**Objetivo:** Crear `POST /api/v1/family/cases` (+ GET listado y GET expediente) que orqueste la radicación de un caso de comisaría de familia, reutilizando la infraestructura heredada de radicación/SLA.

**Decisión de diseño (a pedido del usuario):** `Case.citizenId` se mantiene **obligatorio**. La radicación de familia crea/encuentra un `Citizen` **espejo** del radicante principal (víctima > denunciante > primera parte) para satisfacer el FK, mientras el modelo real de partes vive en `Person`/`CaseParty`. (Se descartó la alternativa de hacer `citizenId` opcional porque rompía ~13 archivos del dominio heredado.)

**Schema:** `Case.violenceTypes` y `Case.caseModality` pasaron de `String`/`String[]` a los enums tipados `ViolenceType[]` / `CaseModality?` (Prisma solo genera los enums usados por algún modelo). `prisma db push` aplicado.

**Estados del workflow — `src/domain/catalogs/familyCaseStates.ts` (nuevo):** se detectó que el provisioning de tenants **no sembraba `CaseState`** (solo lo hacía `seed.ts`), por lo que una comisaría nueva no podía radicar. Catálogo canónico de 7 estados de comisaría: `RADICADO` (inicial) → `EN_VALORACION` → `EN_AUDIENCIA` → `MEDIDA_ADOPTADA` → `EN_SEGUIMIENTO` → `CERRADO`; `REMITIDO` (salida por competencia). Sembrado en: `super-admin/tenants`, `registro-entidad` y `seed-family.ts` (estados globales por BD).

**Endpoint `POST /api/v1/family/cases`:** valida tipo de caso, partes (rol `PartyRole`, exige `personId` o `person`) y `violenceTypes`; deriva `caseModality` del tipo (`CASE_TYPE_MODALITY`); resuelve el estado inicial (`isInitial`, 422 si falta); genera radicado secuencial (`caseService.generateFilingNumber`); calcula vencimiento (`LegalTermsCalculator`); eleva prioridad si hay NNA o modalidad sensible. En una transacción: resuelve/crea las `Person` (dedupe por documento, deriva `isMinor` por edad), crea el `Citizen` espejo, el `Case`, el historial inicial y las `CaseParty`.
**`GET /api/v1/family/cases`:** listado paginado de casos con `caseModality`, filtros `search`/`modality`/`stateCode`.
**`GET /api/v1/family/cases/[caseId]`:** expediente (caso + partes + medidas + PARD + audiencias); **excluye** valoraciones (confidenciales, vía su endpoint restringido) — solo expone `_count.assessments`.
**Verificación:** `type-check` OK, `build` OK (rutas en el manifiesto).

### 9. Fase 3 — Módulo 2: APIs de dominio familiar
**Estado:** COMPLETADO
**Objetivo:** Crear los endpoints REST del dominio de comisaría de familia sobre los modelos del Módulo 1, con aislamiento por tenant (`auth.db`) y RBAC, incluido hardening de `Assessment`.

**Helper compartido — `src/lib/familyApi.ts`:** centraliza el RBAC para evitar divergencias sobre datos sensibles. Grupos de roles:
- `FAMILY_READ_ROLES` (ADMIN, DIRECTOR, ASIGNACION_DE_CASOS, FUNCIONARIO, VENTANILLA_UNICA) — lectura del expediente no confidencial.
- `FAMILY_INTAKE_ROLES` (ADMIN, DIRECTOR, FUNCIONARIO, VENTANILLA_UNICA) — alta/edición de personas y partes.
- `FAMILY_WRITE_ROLES` (ADMIN, DIRECTOR, FUNCIONARIO) — actos con efecto jurídico (medidas, PARD, audiencias).
- `FAMILY_CONFIDENTIAL_ROLES` (ADMIN, DIRECTOR, FUNCIONARIO) — **valoraciones** (excluye ventanilla y auxiliar). Hardening Ley 1581/2012 + Ley 1098/2006.
- `findCaseInTenant()` (guard anti-fuga entre comisarías) e `isValidEnum()` (validación de enums Prisma).

**12 rutas nuevas bajo `/api/v1/family/` (namespace propio, sin colisionar con el dominio heredado):**
- `persons` (GET lista/búsqueda paginada, POST — deriva `isMinor` por `birthDate`, 409 si duplicado) y `persons/[id]` (GET con vínculos a casos, PATCH).
- `cases/[caseId]/parties` (GET, POST — valida `PartyRole`, exige representante legal para NNA, 409 en duplicado) y `parties/[partyId]` (DELETE).
- `cases/[caseId]/measures` (GET, POST) y `measures/[id]` (PATCH — incumplimiento/revocación/renovación/notificación policial).
- `cases/[caseId]/restoration` (GET, POST — valida que el `childId` sea NNA) y `restoration/[id]` (GET, PATCH etapa/hallazgos/cierre).
- `cases/[caseId]/hearings` (GET, POST) y `hearings/[id]` (PATCH realización/acta/resultado/siguiente audiencia).
- `cases/[caseId]/assessments` (GET, POST) y `assessments/[id]` (GET, PATCH) — **acceso restringido**, `isConfidential` por defecto.

**Verificación:** `npm run type-check` OK. `npm run build` OK — las 12 rutas aparecen como dinámicas (`ƒ`) en el manifiesto.

### 8. Fase 3 — Módulo 1b: seed de tipos de caso de comisaría de familia
**Estado:** COMPLETADO
**Objetivo:** Reescribir el catálogo de tipos de caso (personería → comisaría de familia) con términos y referencias normativas correctas, y unificar las 3 fuentes que estaban divergentes.

**Catálogo canónico nuevo — `src/domain/catalogs/familyCaseTypes.ts`:** fuente única de verdad. 7 tipos de caso de comisaría de familia, con días hábiles y base legal:
- `VIF` Violencia Intrafamiliar (10 d — Ley 294/1996, 575/2000, 1257/2008)
- `MP` Medida de Protección (10 d — Art. 17 Ley 294/1996)
- `PARD` Restablecimiento de Derechos NNA (80 d ≈ 4 meses — Arts. 99-100 Ley 1098/2006)
- `CAV` Custodia, Alimentos y Visitas (30 d — Art. 111 Ley 1098/2006, Ley 640/2001)
- `PNNA` Protección a NNA (10 d — Ley 1098/2006)
- `CF` Conciliación Familiar (30 d — Ley 640/2001, Ley 2126/2021)
- `OJ` Orientación Jurídica (5 d — Decreto 4840/2007, Ley 2126/2021)
- Exporta también `CASE_TYPE_MODALITY` (code → enum `CaseModality`) para preselección en el front.

**Unificación de las 3 fuentes divergentes** (antes cada una repetía DP/Q/SG…):
- `src/app/api/v1/super-admin/tenants/route.ts`: provisioning multitenant usa `FAMILY_CASE_TYPES` (camino real de creación de cada comisaría). Códigos sufijados con `_SIGLA`.
- `src/app/api/v1/registro-entidad/route.ts`: auto-registro usa el mismo catálogo (eliminada la definición local).
- `prisma/seed.ts`: catálogo de tipos de caso ahora importa `FAMILY_CASE_TYPES`.

**Seed ejecutable nuevo — `prisma/seed-family.ts`:** idempotente (upsert), aplica el catálogo a todos los tenants de la BD apuntada por `DATABASE_URL` (o uno solo por sigla vía argv). Script `db:seed:family` en `package.json`. Verificado contra el control plane (reporta correctamente "no hay tenants" — los tipos viven en la BD de cada comisaría).
**Verificación:** `npm run type-check` OK.

### 7. Paso 4 / Fase 3 — Módulo 1: modelos de dominio de familia (schema)
**Estado:** COMPLETADO
**Objetivo:** Iniciar la reescritura del dominio (petición → familia) de forma ADITIVA y no destructiva.

**Cambios en `prisma/schema.prisma`:**
- **Encabezado**: actualizado de "VENTANILLA ÚNICA PERSONERÍA MUNICIPAL" a "GEFA (Gestión Familiar)" con el marco normativo correcto (Art. 42 CP, Leyes 294/1996, 575/2000, 1098/2006, 1257/2008, Decreto 4840/2007, Ley 2126/2021).
- **8 enums nuevos**: `PartyRole`, `ViolenceType`, `CaseModality`, `ProtectionMeasureType`, `MeasureStatus`, `HearingType`, `AssessmentType`, `PardStage`, `RiskLevel`.
- **6 modelos nuevos**: `Person`, `CaseParty`, `ProtectionMeasure`, `RestorationProcess`, `Hearing`, `Assessment`.
- **Campos aditivos en `Case`**: `violenceTypes String[]` y `caseModality String?`.
- **Relaciones agregadas** a `Tenant` (6 nuevas), `Case` (5 nuevas), `User` (4 nuevas — `issuedMeasures`, `presidedHearings`, `conductedAssessments`, `managedRestorations`).
- Los modelos heredados (`Case`, `Citizen`, `CaseType`) permanecen intactos para mantener build y app operativos.

**BD (Neon control plane)**: `prisma db push` aplicado OK — 32 tablas (6 nuevas: `persons`, `case_parties`, `protection_measures`, `restoration_processes`, `hearings`, `assessments`). Cliente Prisma regenerado.
**Verificación**: `npm run type-check` pasa sin errores.

---

### 5. Conectar repo GitHub ↔ Vercel y blob stores por CLI
**Estado:** COMPLETADO (parcial — ver nota de git)
**Objetivo:** Completar por CLI (sin trabajo manual del usuario) las conexiones pendientes del Paso 3: vincular el repo GitHub al proyecto Vercel (deploy automático) y conectar los blob stores para inyectar `BLOB_READ_WRITE_TOKEN`.

- **Blob Storage — RESUELTO por CLI.** Los stores `gefa-files`/`gefa-attachments` habían quedado huérfanos (la conexión interactiva previa se cortó, sin token). Se creó `gefa-storage` (`store_o9k3WUHC9AMBSAvO`, privado, iad1) con `vercel blob create-store --access private --yes`, que lo enlazó al proyecto e inyectó **`BLOB_READ_WRITE_TOKEN`** en Production, Preview y Development. Verificado con `vercel env ls`. (Los 2 stores huérfanos quedaron vacíos; su borrado quedó pendiente porque es una acción destructiva en infra cloud.)
- **Git GitHub↔Vercel — RESUELTO.** `vercel git connect` fallaba ("Failed to connect... access to the repository") porque la **GitHub App de Vercel** no tenía acceso al repo en la cuenta `cesarandreslp` (no era un tema de visibilidad: seguía fallando incluso tras hacer el repo público). Tras autorizar la GitHub App de Vercel en el navegador (una sola vez, vía https://github.com/apps/vercel/installations/new), `vercel git connect https://github.com/cesarandreslp/gefa` devolvió **"Connected"**. Desde ahora cada `git push` a `master` dispara un deploy automático en Vercel.

### 6. Deploy de GEFA a producción por CLI
**Estado:** COMPLETADO
**Objetivo:** Publicar GEFA en producción usando Vercel CLI (sin auto-deploy de git), autorizado por el usuario.

- **Problema de tamaño de upload:** los primeros `vercel --prod` fallaban con "File size limit exceeded (100 MB)" subiendo ~672MB. Diagnóstico: los directorios `docs/promt/fase *` (≈669MB de material de trabajo local, no rastreados por git pero presentes en disco) se estaban subiendo. **Hallazgo clave:** cuando existe `.vercelignore`, Vercel usa ESE archivo e ignora `.gitignore` — por eso `docs/promt/` (que sí está en `.gitignore`) igual se subía.
- **`.vercelignore`** (nuevo): excluye `node_modules`, `.next`, `.git`, `.vercel`, `docs`, logs y `.env*`. Con esto el upload bajó al tamaño del código fuente.
- **Deploy OK:** `vercel --prod --yes` → build en 56s. **Producción: https://gefa-black.vercel.app** (alias) / `gefa-4g2b8bkmq-cesar-lozanos-projects.vercel.app`.
- **Verificación:** `GET /` → HTTP 200; `GET /api/v1/health` → 200 con `{"database":"healthy","message":"Database connected"}`. La BD Neon y las variables de entorno (JWT, ENCRYPTION_KEY, BLOB_READ_WRITE_TOKEN) operan correctamente en producción.
- **Pendiente:** ajustar el `domain` de los tenants y, si se desea auto-deploy en cada push, autorizar la GitHub App de Vercel (navegador, una sola vez); mientras tanto cada publicación se hace con `vercel --prod`.

---

### 4. Paso 2 del plan — Limpiar módulos de personería
**Estado:** COMPLETADO
**Objetivo:** Retirar de forma controlada los módulos específicos de personería (transparencia, textos legales, folios, defaults de landing/transparencia) según la sección 1 de `MIGRACION-PENDIENTE.md`, verificando el build tras cada borrado para mantenerlo verde.

**Bloque 1 — Transparencia (Ley 1712) + calculadora de folios.** Build y type-check verdes tras los borrados.
- Eliminados: `src/app/api/public/transparency/route.ts`, `src/app/admin/transparencia/page.tsx`, `src/lib/transparencyDefaults.ts`, `src/lib/foliosCalculator.ts` (este último sin importadores).
- `src/app/api/v1/mi-entidad/route.ts`: removido el import y uso de `getTransparencyConfig` (GET ya no expone `transparencyConfig`; PATCH ya no persiste `transparencyConfig`). Se conserva `getLandingConfig`.
- `src/app/admin/AdminNav.tsx`: quitada la entrada de menú "🔍 Transparencia".
- `src/app/home/page.tsx`: quitado el botón "Índice de Transparencia" y el import ahora-no-usado de `Eye`.
- Nota: el *campo* `folios` del modelo `Case` NO se tocó (pertenece al dominio, Fase 3).

**Bloque 2 — Rehacer landing para GEFA + decisión sobre legal-texts.** Build y type-check verdes.
- **`src/lib/landingDefaults.ts`**: reemplazado el `MASTER_SERVICE_CATALOG` (que mezclaba servicios de Personería/Alcaldía/Contraloría/Hospital) por un catálogo de **comisaría de familia**: denuncia de violencia intrafamiliar, medidas de protección, restablecimiento de derechos (PARD), conciliación familiar (custodia/alimentos/visitas), protección de NNA, atención psicosocial y orientación jurídica, más los 3 servicios comunes (radicar, consultar, atención). `SERVICE_CATEGORIES` ahora es `['Comunes', 'Comisaría de Familia']`. Se eliminó el servicio que enlazaba a `/transparencia` (ruta borrada). Se conservaron interfaces, `AVAILABLE_ICONS`, `ICON_LABELS` y `getLandingConfig` (los consumidores `editor-landing`, `admin/entidad`, `servicios`, `page` siguen compilando).
- **`src/app/page.tsx`**: el hero ya no antepone "Ventanilla Única"; usa directamente el nombre de la entidad (ej. "Comisaría de Familia de Buga"). Fallback de `rawName` cambiado a 'Comisaría de Familia'.
- **`src/app/la-entidad/page.tsx`**: reescrito el contenido (antes 100% personería) — hero, ¿qué es?, misión, visión, 8 funciones y marco legal (Art. 42 CP, Leyes 294/1996, 575/2000, 1098/2006, 1257/2008, 2126/2021). Íconos añadidos: `Baby`, `Handshake`, `HeartHandshake`.
- **`src/app/ClientLayout.tsx`**: reemplazados los 3 enlaces muertos a `/transparencia` (nav desktop, menú móvil, footer) por enlaces a `/la-entidad` ("La Comisaría"); texto del footer actualizado al propósito de comisaría de familia.
- **`src/app/servicios/page.tsx`**: sin cambios de contenido (es data-driven desde `landingConfig`).
- **Decisión legal-texts:** **se conserva** `src/app/api/public/legal-texts/route.ts` + `LEGAL_TEXTS` en `SystemSettingsService` + `LegalTextsSection` en `admin/settings`. Son genéricos (política de privacidad, términos, nota de transparencia) y aplican a GEFA: las comisarías son entidades públicas sujetas a Ley 1712 (transparencia) y la política de privacidad es requerida por Ley 1581 (habeas data). Las menciones de "Ley 1712/transparencia" restantes en servicios (Audit, PublicStats, Report, Supervision) son de cumplimiento y se mantienen.
- **Evaluación `peticiones-reasignacion`/`reasignaciones`:** **se conservan**. Es un flujo genérico de gestión de casos (el director aprueba reasignar un caso a otro funcionario/profesional), aplicable a comisarías de familia. No es específico de personería.

---

### 3. Garantizar un usuario ADMIN del tenant por cada tenant creado
**Estado:** COMPLETADO
**Objetivo:** Igual que existe el panel super-admin para el administrador del SaaS, cada tenant (comisaría) debe tener su propio usuario ADMIN al ser creado, para que pueda administrar su entidad.

**Hallazgo:** El flujo ya creaba un ADMIN por tenant — verificado de extremo a extremo contra la BD real:
- `POST /api/v1/super-admin/tenants` genera `admin@{sigla}.gov.co` + contraseña temporal, crea el rol `ADMIN` (level 100) y el usuario admin con `mustChangePassword: true`, y devuelve las credenciales.
- El panel super-admin (`src/app/super-admin/page.tsx`, modal de éxito) **muestra las credenciales** (email + contraseña temporal) al crear la entidad.
- El login (`src/app/api/v1/auth/login/route.ts`) enruta `SUPER_ADMIN → /super-admin` y el resto (incluido `ADMIN`) `→ /admin/home`, que es el panel completo del tenant (`src/app/admin/*`: usuarios, cargos, casos, settings, métricas, etc.).
- Test contra la BD: tenant + ADMIN creados, rol correcto, hash de contraseña válido (login posible).

**Mejora aplicada (endurecimiento de la invariante):** El Paso 2 del POST (roles + tipos + usuario ADMIN + usuario IA en la BD del tenant) **no era transaccional** — si la creación del admin fallaba tras crear los roles, podía quedar un tenant **sin administrador**.
- **`src/app/api/v1/super-admin/tenants/route.ts`**: Todo el aprovisionamiento del Paso 2 se envolvió en una transacción interactiva (`db.$transaction`, timeout 20 s). El `Promise.all` de tipos de caso se cambió a bucle secuencial dentro de la transacción. Si la transacción falla, se revierte y además se elimina el registro global del Paso 1 (`tenantSettings` + `tenant`) → nunca queda una entidad a medio crear ni sin admin. Se añadió una salvaguarda extra: si `adminUser` resultara nulo, se revierte igual. El `iaPasswordHash` se calcula antes de la transacción para no alargarla con bcrypt.
- Verificado: transacciones interactivas con rollback funcionan sobre la conexión Neon pooled; probado el path de éxito (tenant + admin OK) y el de fallo (rollback total, sin huérfanos).

---

### 2. Arranque de infraestructura: git, GitHub, Vercel, build y base de datos
**Estado:** COMPLETADO
**Objetivo:** Dejar el repositorio sano con git, publicarlo en GitHub, conectar Vercel, verificar que compila y provisionar la base de datos del control plane.

**Repositorio y compilación:**
- Eliminado el `.git` parcial heredado y reinicializado (`git init`). Verificado que `src/app/transparencia` ya no existía.
- `npm install` (479 paquetes; `prisma generate` en postinstall).
- **`npm run type-check`** falló con 4 grupos de errores; corregidos:
  - `src/app/page.tsx` y `src/app/servicios/page.tsx`: el tipo del `ICON_MAP` de lucide-react usaba `size?: number`, incompatible con `LucideProps` (que acepta `number | string`). Cambiado a `size?: number | string`.
  - `src/app/api/v1/peticiones-reasignacion/route.ts`: `peticion.user` posiblemente null → optional chaining (`peticion.user?.fullName ?? 'Desconocido'`).
  - `src/app/api/v1/reasignaciones/pendientes/route.ts`: `solicitud.user` posiblemente null → optional chaining.
- **`npm run build`** exitoso (todas las rutas `force-dynamic`).
- Commit inicial (327 archivos) e identidad git configurada.

**GitHub:** repo privado creado y push con `gh repo create gefa --private --source=. --remote=origin --push` → https://github.com/cesarandreslp/gefa

**Vercel:** proyecto `gefa` creado y linkeado (`vercel link`). La conexión automática del repo GitHub falló por OAuth (pendiente de conectar desde el dashboard). Creados 2 blob stores privados (`gefa-files`, `gefa-attachments`).

**Variables de entorno (Vercel, los 3 entornos):** `JWT_SECRET` y `ENCRYPTION_KEY` generados con crypto; `JWT_EXPIRATION=8h`, `NODE_ENV`, `API_VERSION=v1`.

**Base de datos (control plane):**
- Provisionada vía integración Neon de Vercel (`vercel integration add neon`) → proyecto Neon `neon-erin-book`, BD `neondb` en `us-east-1`. Inyectó automáticamente `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (directa) y demás vars `POSTGRES_*`/`PG*` en los 3 entornos. Creó `.env.local`.
- Esquema aplicado con `prisma db push` usando la conexión directa (`.env` local con `DATABASE_URL` = unpooled) → **26 tablas** creadas.
- Ejecutado `prisma/seed-superadmin.ts` → rol global `SUPER_ADMIN` (level 1000) + usuario `superadmin@system.local`. **El seed principal `seed.ts` NO se ejecutó** por ser de dominio personería (Ventanilla); su reescritura para familia es tarea de Fase 3.

**Pendiente manual del usuario:**
- Conectar el repo GitHub al proyecto Vercel desde el dashboard (para deploy automático).
- Conectar los blob stores al proyecto en el dashboard para que inyecten `BLOB_READ_WRITE_TOKEN`.
- Provisionar las BD por comisaría (tenant) desde el panel super-admin cuando se definan las entidades reales.

---

### 1. Inicialización de GEFA a partir de Ventanilla Única
**Estado:** COMPLETADO
**Objetivo:** Crear la base de código de GEFA clonando `ventanilla_unica_base` para reutilizar toda la infraestructura multitenant y los servicios transversales.

- **Copia de código:** se copió el árbol fuente (`src/`, `prisma/`, `public/`, `scripts/`, configs) excluyendo artefactos de build (`node_modules`, `.next`, `.git`, logs, `*.tsbuildinfo`, dumps JSON, `.env`).
- **Conservado intacto:** `src/lib/` (tenantResolver, tenantDb, prisma, jwt, auth, rateLimit), `src/middleware.ts`, `src/services/` (23 servicios), `prisma/schema.prisma`, panel `super-admin` y API `api/v1/` (90 archivos), shell `admin`.
- **`package.json`:** renombrado a `gefa`, descripción y autor actualizados.
- **`CLAUDE.md`:** reescrito para el contexto de comisarías de familia (dominio, datos sensibles NNA, pendientes de migración).
- **`README.md`:** encabezado, descripción, estado y marco normativo actualizados (Ley 294/1996, 1098/2006, Decreto 4840/2007, Ley 2126/2021).
- **`transparencia` (frontend):** no se copió la página (módulo de personería que no se reutiliza).

**Pendiente (Fase de dominio):** ver `MIGRACION-PENDIENTE.md` en la raíz.

---

# Historial heredado de Ventanilla Única (referencia)

> Las entradas siguientes pertenecen al proyecto de origen y se conservan como referencia técnica de la arquitectura multitenant.

## 2026-05-08

### 5. Aislamiento de datos por tenant — creación en BD propia
**Objetivo:** Por ley y seguridad, todo lo relacionado con un tenant (roles, usuarios, tipos de caso) debe quedar en su propia base de datos Neon, no en la BD principal.

- **`src/app/api/v1/super-admin/tenants/route.ts`**: Reescrito el POST handler. Ahora:
  1. La BD global solo guarda el registro Tenant (directorio) y TenantSettings.
  2. Si `databaseUrl` está provisto, usa `getTenantPrisma(databaseUrl)` para crear en la BD del tenant: réplica de Tenant (necesaria para FK constraints), 6 roles estándar, 5 tipos de caso base, usuario ADMIN y usuario IA.
  3. Si no hay `databaseUrl`, crea todo en la BD global (fallback para tenants de demo sin BD dedicada).
  - **Añadido import** `getTenantPrisma` de `@/lib/tenantDb`.
  - **Extrae credenciales antes de la transacción** para reutilizarlas en ambas fases.

- **`src/app/super-admin/page.tsx`**: Agregados campos "URL Base de Datos Neon" y "URL Directa BD Neon" al formulario de creación de tenant. Ambos son opcionales, con toggle show/hide (tratados como contraseñas). Si se proveen, se envían al API y quedan guardados en el registro global del tenant.

**Problema:** Tenants existentes (buga, guacari) tienen sus datos en la BD global. Esto viola el aislamiento requerido por ley.
**Causa raíz:** El POST original usaba `prisma.$transaction` (BD global) para todo — roles, usuarios, tipos de caso.
**Solución:** Separar en dos fases: fase 1 = BD global (Tenant + Settings), fase 2 = BD del tenant (todo lo demás), con fallback a BD global si no hay `databaseUrl`.

---

### 6. Script de migración: BD global → BDs de tenant (con CaseState independiente)
**Objetivo:** Mover todos los datos de buga y guacarí desde la BD global hacia sus propias BDs Neon, garantizando independencia total (incluyendo CaseStates propios por tenant).

- **`scripts/migrate-global-to-tenant-dbs.js`**: Script nuevo idempotente (upsert). Lee de la BD global y escribe en la BD de cada tenant que tenga `databaseUrl` configurada.
  - Incluye `CaseState` replicado en cada tenant DB con los mismos UUIDs → FKs satisfechas, independencia total del global.
  - Incluye `InstitutionType` y `NonBusinessDay` para FK de Tenant y cálculos SLA.
  - Migra en orden: InstTypes → CaseStates → NonBizDays → Tenant replica → TenantSettings → Roles → Positions → CaseTypes → SLAConfig → Users → Citizens → Cases → Assignments → StateHistory → AssignHistory → Documents → ActionLogs → Notifications → AttendanceRecords.
  - Detecta y copia usuarios externos (IA, asignadores cross-tenant) para satisfacer FK en assignments e historial.
  - Muestra verificación cruzada fuente vs destino al final.
  - No borra nada de la BD global.
  - Modos: `--dry-run` (solo conteos), `--tenant SIGLA` (un tenant), `--verify` (igual a dry-run).

**Resultado ejecutado (2026-05-08):**
- BUGA: 7 CaseStates, 7 roles, 19 usuarios, 14 ciudadanos, 43 casos, 5 tipos de caso — totalmente en BD propia.
- GUACARI: 7 CaseStates, 6 roles, 11 usuarios, 9 ciudadanos, 15 casos, 5 tipos de caso — totalmente en BD propia.
- Columna `faviconUrl` faltante en tabla `tenants` de ambas BDs de tenant agregada via `migrate-tenant-dbs.js`.
- 1 ciudadano huérfano en BD global de Guacarí (mismo documentNumber+tenantId que ya existe en BD propia con distinto UUID) — permanece en global sin impacto funcional.

**Problema:** Buga y guacarí tienen datos en la BD global, violando aislamiento por ley.
**Causa raíz:** El tenant isolation se implementó para tenants nuevos pero los existentes quedaron en la BD global. Adicionalmente, el cliente Prisma generado con `--no-engine` (para Vercel) fuerza DataProxy (P6001). El script carga `.env` manualmente y requiere `copyEngine: true` en el cliente generado local.
**Solución:** Script idempotente que lee global y escribe en cada tenant DB; la BD global no se toca hasta verificación manual.

---

### 1. Límite de peso en subida de favicon (Super Admin)
**Objetivo:** Evitar que el super admin suba imágenes demasiado pesadas como favicon, lo cual degradaría el rendimiento de carga.

- **`src/app/super-admin/page.tsx`**: Agregada validación `file.size > 100 * 1024` en `handleFaviconUpload` y `handleEditFaviconUpload` — muestra alerta y cancela la subida si el archivo supera 100 KB. Placeholder actualizado a "PNG recomendado, 32×32 px, máx. 100 KB" en ambos modales (crear y editar tenant).

---

## Sesión anterior (resumida)

### Normalización de roles (8 tenants)
- Cambiado `Role.code String @unique` → `@@unique([code, tenantId])` en `prisma/schema.prisma` para permitir roles con el mismo código en distintos tenants.
- Creado `scripts/migrate-roles.ts`: normalizó los 8 tenants a exactamente 6 roles estándar: `ADMIN(100)`, `DIRECTOR(100)`, `ASIGNACION_DE_CASOS(90)`, `FUNCIONARIO(85)`, `VENTANILLA_UNICA(80)`, `AUXILIAR_ATENCION_USUARIO(75)`.
- Actualizado `src/lib/auth.ts`: mapa de legado (`DIRECTOR_ENCARGADO`, `PERSONERO_MUNICIPAL`, `REVISOR` → `DIRECTOR`), niveles y permisos.
- Actualizado `src/domain/types/CaseTypes.ts`: enum `RoleCode` y `ROLE_LEVELS` con los 6 roles estándar.

### Servicio de asignación por IA
- `src/services/AIAssignmentService.ts`:
  - `getAvailableFuncionarios`: consulta roles nivel 85 (FUNCIONARIO) + código DIRECTOR.
  - **Validación 1**: el cargo recomendado debe existir en la lista en memoria.
  - **Validación 2**: verificación en BD que el usuario sigue activo con ese cargo asignado.
  - Fallback al Director si el cargo no está disponible.
  - Reemplazado `REVISOR` → `DIRECTOR` en toda la lógica.

### Cascada al renombrar cargo
- `src/app/api/v1/positions/[id]/route.ts` (PUT): al renombrar un cargo, actualiza `user.position` en todos los usuarios que lo tenían mediante transacción.

### Pestañas activos/inactivos en usuarios
- `src/app/home/usuarios/page.tsx`: separación en pestañas "Activos" e "Inactivos". Inactivos muestran solo botón "Reactivar".

### Rutas de API
- 20+ rutas actualizadas: `REVISOR` → `DIRECTOR`, `DIRECTOR_ENCARGADO` → `DIRECTOR`.
- `src/app/api/v1/registro-entidad/route.ts`: roles base actualizados.
- `src/app/api/v1/super-admin/tenants/route.ts`: nuevos tenants crean los 6 roles estándar.

---

## 2026-04-24

### 1. Campo `description` opcional en cargos (Positions)
**Objetivo:** Permitir al admin describir las funciones de un cargo para que el sistema mejore la asignación automática, sin revelar que usa IA.

- **`prisma/schema.prisma`**: agregado `description String? @db.Text` al modelo `Position`. Aplicado con `db push --skip-generate`.
- **`src/app/api/v1/positions/route.ts`** (POST): acepta y guarda el campo `description`.
- **`src/app/api/v1/positions/[id]/route.ts`** (PUT): guarda `description` si viene en el body (con `...(description !== undefined && {...})`).
- **`src/services/AIAssignmentService.ts`**: `getAvailableFuncionarios` obtiene las descripciones de cargos via `$queryRaw` (porque el cliente Prisma fue generado antes del campo), construye un `Map<name, description>` y lo incluye en `userTypeDescription` solo si el admin lo definió.
- **`src/app/home/cargos/page.tsx`**:
  - Agregado campo `description` al estado `formData`.
  - Textarea opcional en el formulario con texto: *"Describe las funciones o temas que maneja este cargo. Ayuda al sistema a mejorar la asignación automática de casos."*
  - Muestra la descripción en la tarjeta del cargo con etiqueta "Descripción" (en cursiva).
- En el prompt del sistema de asignación: solo muestra `Descripción del cargo:` cuando el admin la definió explícitamente (distinguido del fallback).
- **Restricción de lenguaje**: ninguna referencia a "IA" o "AI" visible al usuario final — todo usa lenguaje neutro ("el sistema").

---

### 2. Casos llegan a Ventanilla Única automáticamente
**Objetivo:** Cuando se radica un caso, el usuario VENTANILLA_UNICA debe recibirlo en su bandeja para gestión.

- **`src/services/AIAssignmentService.ts`** (`autoAssignCase`): agregado bloque que asigna el caso a todos los usuarios `VENTANILLA_UNICA` activos del tenant (igual que se hacía con ADMIN).
- **`scripts/repair-ventanilla-assignments.ts`** (nuevo): script de reparación que retroactivamente asignó los casos existentes a los usuarios VENTANILLA_UNICA.
  - Resultado: Buga → 15 casos asignados a `kate@personeria.gov.co`; Guacarí → 5 casos a `carlos@gmail.com`.

---

### 3. Eliminación de asignaciones incorrectas a ADMIN
**Problema identificado:** El sistema asignaba incorrectamente todos los casos a usuarios ADMIN. Los admins solo gestionan el sistema, no ven casos.

- **`src/services/AIAssignmentService.ts`**: eliminado el bloque que asignaba casos a todos los usuarios ADMIN.
- **BD**: eliminadas las 7 asignaciones incorrectas existentes en la base de datos.

---

### 4. Conteos en pestañas del Director
**Objetivo:** Las pestañas de la bandeja del Director deben mostrar cuántos casos hay en cada una.

- **`src/app/home/bandeja-entrada/page.tsx`**:
  - Agregados estados: `directorNuevosCount`, `directorSeguimientoCount`, `directorInvitacionesCount`.
  - Función `loadDirectorTabCounts`: llama en paralelo los 3 endpoints de bandeja para contar.
  - Se llama al cargar si el rol es DIRECTOR, y se refresca cada 30 segundos.
  - Badges de color en cada pestaña desktop: rojo (Nuevos), azul (Seguimiento General), morado (Invitaciones).
  - Dropdown móvil también muestra los conteos entre paréntesis.

---

### 5. Notificación al funcionario cuando el Director agrega una nota
**Objetivo:** Cuando el Director escribe una nota interna en un caso, el funcionario asignado debe recibir una notificación por email.

- **`src/services/NotificationHooks.ts`**: agregado hook `onInternalNote` que envía notificación tipo `GENERIC` al funcionario asignado.
- **`src/app/api/v1/cases/[id]/notes/route.ts`** (POST):
  - Busca el funcionario activo asignado al caso (rol nivel 85).
  - Llama `NotificationHooks.onInternalNote` de forma no bloqueante.

---

### 6. Ocultar contador de tiempo en botón Reasignar para FUNCIONARIO
**Problema:** El funcionario veía el temporizador de reasignación (ej: "Reasignar (1:45)"), información innecesaria para él.

- **`src/app/home/bandeja-entrada/page.tsx`**: función `getReasignarTexto` retorna siempre `'Reasignar'` cuando el rol es `FUNCIONARIO`, independientemente del timer.

---

### 7. Corrección de cruce de tenants en peticiones de reasignación
**Problema:** La página `/home/peticiones-reasignacion` mostraba peticiones de todos los tenants mezcladas.

**Causa raíz:** Los endpoints consultaban `ActionLog` sin filtrar por tenant (la tabla `ActionLog` no tiene `tenantId` directo, se filtra por `entityId` que es el `caseId`).

- **`src/app/api/v1/peticiones-reasignacion/route.ts`**: primero obtiene los IDs de casos del tenant autenticado, luego filtra los `ActionLog` por esos IDs. Mismo filtro aplicado a `REASSIGNMENT_APPROVED` / `REASSIGNMENT_REJECTED`.
- **`src/app/api/v1/peticiones-reasignacion/count/route.ts`**: mismo fix — filtra por casos del tenant antes de contar peticiones pendientes.

---

## 2026-04-24 (continuación)

### 8. Corrección de badge "Nuevo" en pestaña Seguimientos Leídos / Invitaciones Leídas
**Problema:** Un caso en "Seguimientos Leídos" mostraba el badge "Nuevo" (indicador de no leído), lo cual es contradictorio: si VU lo clasificó, necesariamente lo abrió.

**Causa raíz:** Race condition entre dos PATCHes simultáneos:
1. Al abrir el modal, se lanza `PATCH { readBy: [..., userId] }` de forma asíncrona (no bloqueante).
2. Si VU hace clic en "Seguimiento" antes de que ese primer PATCH termine, el segundo PATCH lee la metadata sin el `userId` aún guardado y la merge sobrescribe `readBy` sin incluirlo.

**Solución:** En `handleClasificarCaso` (`src/app/home/bandeja-entrada/page.tsx`), cuando el rol es `VENTANILLA_UNICA`, se incluye `readBy` con el `userId` en el mismo payload del PATCH de clasificación, eliminando la carrera.

**Fix adicional (casos anteriores al fix):** El badge "Nuevo", el fondo azul y el borde izquierdo azul de la tarjeta ahora se suprimen en las pestañas `seguimientosLeidos` e `invitacionesLeidas`, ya que esos casos por definición ya fueron procesados por VU y mostrar "Nuevo" ahí es semánticamente incorrecto.

---

### 9. Corrección de contador "Bandeja de Entrada" en Dashboard Operativo de VU
**Problema:** La tarjeta "Bandeja de Entrada" en el dashboard de VU mostraba un contador (ej: 6) aunque la pestaña "Nuevos" estuviera vacía, porque todos los casos ya habían sido clasificados como Seguimiento/Invitación.

**Causa raíz:** `GET /api/v1/solicitudes/nuevas/count` contaba todos los casos en estado `RADICADO` asignados al usuario, sin excluir los que ya tenían `vuClassification` en metadata. La pestaña "Nuevos" de bandeja-entrada sí aplica ese filtro, pero el endpoint de conteo no lo hacía.

**Solución:** En `src/app/api/v1/solicitudes/nuevas/count/route.ts`, después de deduplicar por `caseId`, se filtra para `VENTANILLA_UNICA` excluyendo los casos donde `metadata.vuClassification` esté presente — mismo criterio que usa la pestaña Nuevos.

---

### 10. Destino Interno en sticker de radicado muestra el funcionario actual tras reasignación
**Problema:** `GET /api/v1/casos/radicado/[numero]` devolvía el nombre del primer assignment más reciente sin importar el rol. Tras una reasignación, podía devolver un usuario VENTANILLA_UNICA o ADMIN en lugar del funcionario trabajando el caso, y los statuses consultados (`ACCEPTED`, `PENDING`) podían no cubrir el estado del nuevo assignment.

**Solución corregida:** El filtro Prisma con `user: { role: { code: { notIn: [...] } } }` en una relación anidada no funcionaba (devolvía array vacío en todos los casos). Se cambió a:
- La consulta trae TODOS los assignments ordenados por `assignedAt: desc`, con `role.code` incluido en el `select`
- El filtrado de roles administrativos se hace en memoria con `.find()`, igual que hacen las demás rutas del sistema
- Lógica: primero busca el assignment activo más reciente (`PENDING/ACCEPTED/IN_PROGRESS`) que no sea rol administrativo; si no hay, toma cualquiera que no sea administrativo (para casos cerrados/completados)

---

### 11. Aislamiento por tenant en registros de trazabilidad (AttendanceRecord)
**Problema:** La página de Trazabilidad (`/home/registro`) mostraba registros de todos los tenants mezclados. El modelo `AttendanceRecord` no tenía campo `tenantId`, por lo que era imposible filtrar.

**Solución:**
- **`prisma/schema.prisma`**: agregado `tenantId String?` con índice `@@index([tenantId])` al modelo `AttendanceRecord`. Aplicado con `db push --skip-generate`.
- **`GET /api/v1/attendance-records`**: agrega `where: { tenantId: auth.user.tenantId }` al `findMany`.
- **`POST /api/v1/attendance-records`**: guarda `tenantId: auth.user.tenantId` al crear.
- **`POST /api/v1/attendance-records/bulk`**: guarda `tenantId: auth.user.tenantId` en cada registro del array.
- Registros existentes sin `tenantId` quedan con `null` y no aparecen en ningún tenant (aislamiento seguro).

---

### 12. Limpieza de tenants de prueba
**Acción:** Eliminación física permanente (no soft-delete) de 6 tenants de prueba con todos sus datos asociados.

**Tenants eliminados:** Entidad Test, Personeria Municipal de Cali, Alcaldía El Cerrito, Alcaldía Vijes, Personería Cancelária, Personería Pradera.

**Datos eliminados:** 6 tenants, 6 usuarios, 36 roles, 30 cargos, 26 tipos de caso, 1 caso, 1 ciudadano, 1 historial de estado, 17 actionLogs.

**Tenants conservados intactos:**
- Personería Municipal de Guadalajara de Buga: 43 casos, 19 usuarios ✅
- Guacarí: 6 casos, 12 usuarios ✅

---

## 2026-04-29

### 13. Portal de entidades externas (respuesta con token único)
**Objetivo:** Entidades externas (Alcaldía, Policía, etc.) reciben un link por correo con un token de un solo uso para responder a un oficio sin necesidad de cuenta en el sistema.

- **`prisma/schema.prisma`**: nuevo modelo `ExternalEntityAccess` con `token`, `entityName`, `caseId`, `usedAt`, `expiresAt`.
- **`GET /api/v1/entidad/[token]`**: valida token, retorna datos del caso (número, descripción, documentos, historial).
- **`POST /api/v1/entidad/[token]/responder`**: recibe respuesta + documentos adjuntos, marca token como usado, guarda la respuesta en el historial del caso.
- **`src/app/entidad/responder/[token]/page.tsx`**: página pública (sin autenticación) donde la entidad externa redacta y envía su respuesta.
- **`src/services/EmailService.ts`**: refactorizado con nueva función `sendExternalEntityInvitation` que incluye el link con token en el correo.

---

### 14. Arquitectura multi-tenant completa (migración a subdominios)
**Objetivo:** Cada tenant opera en su propio subdominio (`buga.ossprobe.store`, `guacari.ossprobe.store`) con base de datos separada.

- **`src/lib/tenantResolver.ts`** (nuevo): resuelve el host del request al `tenantId` consultando la BD principal por el campo `domain`. Cachea resultado en memoria 5 min.
- **`src/lib/tenantDb.ts`** (nuevo): retorna el cliente Prisma correspondiente al tenant activo según su `DATABASE_URL` configurada.
- **`prisma/schema.prisma`**: schema dividido — BD principal (tenants, superadmins) y BD por tenant (casos, usuarios, roles, etc.).
- **`scripts/migrate-to-multitenant.ts`**: script de migración que separó los datos de cada tenant a su propia BD Neon.
- **Primera configuración Vercel**: desplegado el proyecto `vu-app` con wildcard `*.ossprobe.store` apuntando al mismo deployment.

---

## 2026-05-05

### 15. Subida de archivos MP3 (audio)
**Objetivo:** Permitir que ciudadanos adjunten grabaciones de voz a sus solicitudes.

- **`src/app/api/v1/documents/upload-public/route.ts`**: agregado `audio/mpeg` y `audio/mp3` a los tipos MIME aceptados.
- **`src/app/home/bandeja-entrada/page.tsx`**: los archivos `.mp3` se muestran con ícono de audio y reproductor inline.
- **`src/app/atencion-ciudadano/consultar/page.tsx`**: ciudadanos pueden adjuntar MP3 desde el formulario de consulta pública.

---

### 16. Múltiples archivos adjuntos en formularios ciudadanos
**Objetivo:** El ciudadano puede adjuntar más de un archivo por solicitud (antes solo se permitía uno).

- **`src/app/atencion-ciudadano/consultar/page.tsx`**:
  - El input de archivo acumula selecciones sucesivas en lugar de reemplazarlas.
  - Lista de archivos seleccionados con botón "×" para remover individualmente.
  - Todos los archivos se suben en paralelo al enviar.

---

### 17. Corrección de error 500 en subida de documentos
**Problema:** La ruta `POST /api/v1/documents/upload-public` fallaba con 500 porque intentaba usar `userId` del token JWT (que no existe en el contexto público ciudadano) como `uploadedBy`.

- **`src/app/api/v1/documents/upload-public/route.ts`**: usa `citizenId` como `uploadedBy`; `auditUserId` se pasa como `null` explícito en el servicio de auditoría.

---

### 18. Routing multi-tenant en BD y subdominios en emails
**Problema:** Después de la migración multi-tenant, las rutas de API seguían usando la BD principal en lugar de la BD del tenant. Los emails de notificación generaban links con `localhost` en lugar del subdominio correcto del tenant.

- **`src/app/api/v1/cases/general-request/route.ts`**: usa `tenantDb` para todas las consultas.
- **`src/app/api/v1/cases/public/status/route.ts`**: resuelve tenant por `sigla` como fallback cuando no hay subdominio; usa `tenantDb`.
- **`src/services/EmailService.ts`**: construye el link de seguimiento usando `tenant.domain` en lugar de `NEXT_PUBLIC_APP_URL`.
- **`src/app/admin/entidad/page.tsx`**: página de administración de entidad para el rol ADMIN del tenant.
- **`src/app/super-admin/page.tsx`**: panel Super Admin expandido — lista tenants, permite crear/editar tenant con campo `domain`.
- **`src/services/CaseService.ts`**, **`CitizenService.ts`**, **`AIAssignmentService.ts`**, **`AssignmentService.ts`**: todos migrados a `tenantDb`.

---

## 2026-05-06

### 19. Cache de tenant domain, rutas públicas y respuesta ciudadana
- **`src/lib/tenantResolver.ts`**: función `clearTenantCache(tenantId)` para invalidar el cache cuando se actualiza el dominio de un tenant.
- **`src/app/api/v1/super-admin/tenants/[id]/route.ts`** (PATCH): llama `clearTenantCache` tras cada actualización para que el nuevo dominio surta efecto inmediatamente.
- **`src/app/api/v1/cases/[id]/citizen-response/route.ts`**: ruta para que el ciudadano envíe respuesta adicional a un caso abierto; usa `tenantDb`.
- **`src/app/api/v1/cases/public/status/route.ts`**: corrección final — devuelve `sigla` del tenant en la respuesta para que el frontend construya el subdominio correcto.
- **`src/app/atencion-ciudadano/consultar/page.tsx`**: muestra estado del caso con subdominio correcto del tenant en el link de seguimiento.

---

## 2026-05-11

### 22. Aviso de escalamiento visible en dashboard del ciudadano
**Objetivo:** Cuando un funcionario escala un caso con "Enviar solo a la entidad", el ciudadano debe ver un mensaje formal en el historial de su dashboard (no solo el banner genérico).

- **`src/app/api/v1/cases/public/status/route.ts`**: modificado el filtro `historialVisible` para incluir la primera entrada interna (`primeraEntradaInterna`) en el historial visible. En el mapeo de `responseHistory`, esa entrada se reemplaza con `AVISO_ESCALAMIENTO_CIUDADANO` (texto estándar, no el texto interno real). Las entradas internas subsiguientes siguen ocultas.

**Problema:** El dashboard del ciudadano no mostraba ningún cambio visible tras el escalamiento.
**Causa raíz:** El filtro `historialVisible` descartaba todos los entries con `isInternal === true`.
**Solución:** Incluir `primeraEntradaInterna` en el historial visible pero sustituir su contenido real por texto estandarizado.

---

### 23. Aviso de escalamiento personalizado con nombre y causal legal
**Objetivo:** El texto que ve el ciudadano (dashboard + email) debe incluir su nombre y la causal legal seleccionada por el funcionario.

- **`src/app/api/v1/cases/public/status/route.ts`**: agrega `reason: true` al select de `stateHistory` y `citizen` al select del caso. El `AVISO_ESCALAMIENTO_CIUDADANO` se construye dinámicamente con el nombre del ciudadano y la causal (`PROCESO_DISCIPLINARIO`, `ANALISIS_PRUEBAS`, `COMPETENCIA_EXTERNA`) mapeada a texto legible.
- **`src/services/EmailService.ts`**: `sendEscalationNoticeToCitizen` acepta nuevo parámetro `escalationReason?` y genera el `bodyTexto` dinámico con la misma lógica de mapeo.
- **`src/app/api/v1/solicitudes/[id]/responder/route.ts`**: pasa `escalationReason` al llamar `sendEscalationNoticeToCitizen`.

---

### 24. Ocultar textarea del ciudadano cuando caso está en gestión interna
**Objetivo:** Si el caso fue escalado, el formulario de respuesta del ciudadano no debe aparecer aunque haya un `REQUIERE_INFORMACION` previo sin responder.

- **`src/app/atencion-ciudadano/consultar/page.tsx`**: condición `&& !result.casoEnGestion` añadida al bloque que muestra el formulario de respuesta. La gestión interna cancela cualquier solicitud de información pendiente.

---

### 25. Badge "Responder a ciudadano" en lugar de "Requiere Información"
**Objetivo:** El badge de estado en el timeline del ciudadano debe ser comprensible desde su perspectiva.

- **`src/app/atencion-ciudadano/consultar/page.tsx`**: en el mapeo de `response.stateName` dentro del timeline, cuando `response.state === 'REQUIERE_INFORMACION'` se muestra "Responder a ciudadano" en lugar del nombre técnico de la BD.

---

### 26. Portal de entidades — mostrar todos los documentos del caso
**Objetivo:** La entidad externa debe ver todos los documentos no-internos del caso, incluyendo los subidos por el ciudadano.

- **`src/app/api/v1/entidad/[token]/route.ts`**: filtro cambiado de `{ uploadedByType: 'USER' }` a `{ isInternal: false }`.

**Problema:** Los documentos del ciudadano se guardan con `uploadedByType: 'CITIZEN'`, por lo que el filtro anterior los excluía.
**Causa raíz:** El filtro asumía que solo los funcionarios suben documentos relevantes.
**Solución:** Filtrar únicamente por `isInternal: false`, incluyendo documentos de cualquier origen no marcado como interno.

---

### 27. Toggle interno/visible por documento en bandeja del funcionario
**Objetivo:** El funcionario decide qué archivos puede ver la entidad escalada marcando cada documento como interno o visible.

- **`src/app/api/v1/documents/[id]/route.ts`** *(nuevo)*: endpoint `PATCH` que actualiza `isInternal` de un documento. Requiere autenticación.
- **`src/app/api/v1/solicitudes/[id]/route.ts`**: expone `isInternal` en el mapa de documentos devuelto al frontend.
- **`src/app/home/bandeja-entrada/page.tsx`**: agrega campo `isInternal?` a la interfaz `Solicitud.documentos`, función `toggleDocumentInternal` que llama al PATCH y actualiza el estado local, y botón 🔒/🌐 por documento en ambas secciones de documentos (modal de detalle y panel de chat). Fondo rojo = interno, verde = visible para entidad.

---

## 2026-05-12

### 29. Autenticación propia del portal de entidades externas
**Objetivo:** Proteger el acceso al portal de entidades con credenciales únicas por caso, vinculadas al módulo de auditoría. La primera persona que abre el enlace define sus credenciales; cualquier acceso posterior exige las mismas.

- **`prisma/schema.prisma`**: agregados campos a `ExternalTokenRoute`: `caseId String?`, `credentialEmail String?`, `credentialCedula String?`, `credentialPasswordHash String?`, `credentialsSetAt DateTime?`. Aplicado con `prisma db push`.
- **`src/lib/externalEntitySession.ts`** *(nuevo)*: utilidades criptográficas — `hashPassword`/`verifyPassword` (scrypt + salt aleatorio, timing-safe), `createSessionToken`/`verifySessionToken` (HMAC-SHA256 firmado con `NEXTAUTH_SECRET`, TTL 24 h).
- **`src/app/api/v1/entidad/[token]/auth/route.ts`** *(nuevo)*: endpoint POST público. Si no hay credenciales guardadas → las registra y retorna `{ sessionToken, isFirstAccess: true }`. Si ya existen → valida email + cédula + contraseña. Registra en `ActionLog`: `EXTERNAL_ENTITY_CREDENTIALS_SET`, `EXTERNAL_ENTITY_LOGIN` o `EXTERNAL_ENTITY_LOGIN_FAILED`.
- **`src/app/api/v1/solicitudes/[id]/responder/route.ts`**: agrega `caseId: id` al create de `ExternalTokenRoute` para que la auditoría quede vinculada al caso.
- **`src/app/api/v1/entidad/[token]/route.ts`**: requiere header `Authorization: Bearer <sessionToken>`. Valida sesión con `verifySessionToken`. Registra `EXTERNAL_ENTITY_CASE_VIEWED` en `ActionLog`.
- **`src/app/api/v1/entidad/[token]/responder/route.ts`**: ídem — requiere sesión válida. Registra `EXTERNAL_ENTITY_RESPONSE_SUBMITTED` en `ActionLog` con email de la sesión.
- **`src/app/entidad/responder/[token]/page.tsx`**: reescrito con estado `'auth'` como pantalla inicial. Flujo: formulario (email + cédula + contraseña) → POST `/auth` → `sessionToken` en `sessionStorage` → carga del caso con header Authorization. Sesión guardada sobrevive mientras la pestaña esté abierta; al cerrar y volver se re-autentica. Aviso de primer acceso visible tras registro.

**Problema:** El portal era accesible sin ninguna autenticación — cualquiera con el link podía ver y responder el caso.
**Causa raíz:** El diseño original usaba el token de URL como único mecanismo de seguridad. Sin credenciales, si el link se reenvía o intercepta, el acceso es abierto.
**Solución:** Capa de autenticación propia (sin usuarios del sistema): credenciales se crean en el primer acceso y se validan en los siguientes. Todo queda trazado en `ActionLog` para auditoría.

---

## 2026-05-11 (continuación)

### 28. Portal de entidades: resolución de BD por token en lugar de subdominio
**Objetivo:** El portal `/entidad/responder/[token]` debe funcionar desde cualquier subdominio (ej: `alcaldiaguacari.ossprobe.store`) sin romperse, porque ese subdominio no está registrado como tenant.

- **`prisma/schema.prisma`**: nuevo modelo `ExternalTokenRoute` en la BD global. Mapea `token → tenantId + databaseUrl`. Aplicado con `prisma db push`.
- **`src/app/api/v1/solicitudes/[id]/responder/route.ts`**: al generar el `externalToken` (cuando `soloEntidad=true`), escribe inmediatamente una entrada en `ExternalTokenRoute` en la BD global con el token, tenantId y databaseUrl del tenant.
- **`src/app/api/v1/entidad/[token]/route.ts`**: reemplaza `getTenantFromRequest` (lectura del host HTTP) por una consulta directa a `ExternalTokenRoute` usando el token. Si no existe la entrada → 404. Si existe → conecta a la BD del tenant.
- **`src/app/api/v1/entidad/[token]/responder/route.ts`**: mismo cambio — resolución por token, no por subdominio.

**Problema:** Las rutas del portal usaban `getTenantFromRequest` que lee el subdominio HTTP. Un subdominio como `alcaldiaguacari.ossprobe.store` no está registrado como tenant → resolver retorna null → se usa `mainPrisma` (BD global) → el token no existe ahí → 404.
**Causa raíz:** El portal de entidades es público (sin autenticación) y puede ser accedido desde cualquier subdominio; la resolución basada en host no aplica a rutas sin tenant propio.
**Solución:** Índice global `ExternalTokenRoute` que permite resolver la BD correcta usando únicamente el token, haciendo el portal completamente independiente del subdominio.

---

## 2026-05-08

### 20. Dominio de producción `ossprobe.store`
**Objetivo:** Hacer la aplicación accesible desde internet con dominio propio y soporte para todos los tenants vía subdominio.

- **Dominio adquirido:** `ossprobe.store` en Squarespace.
- **Nameservers delegados a Vercel:** `ns1.vercel-dns.com` / `ns2.vercel-dns.com` configurados en Squarespace.
- **Vercel wildcard:** `*.ossprobe.store` añadido al proyecto `vu-app` — cubre automáticamente cualquier tenant nuevo sin configuración DNS adicional.
- **Vercel CLI:** instalado `v53.2.0`, autenticado con token `VERCEL_TOKEN` guardado en `.env`.
- **Pendiente:** actualizar campo `domain` de los tenants Buga (`buga.ossprobe.store`) y Guacarí (`guacari.ossprobe.store`) desde el panel Super Admin una vez propague el DNS (15 min – 2 h).

---

## 2026-05-13

### 30. Corrección de error 500 en autenticación del portal de entidades externas
**Objetivo:** El portal `/entidad/responder/[token]` retornaba HTTP 500 al intentar autenticarse, impidiendo el acceso a la entidad externa.

**Síntoma:** Al ingresar credenciales (email, cédula, contraseña) en `https://alcaldiaguacari.ossprobe.store/entidad/responder/[token]`, el formulario mostraba "Error de conexión. Intente nuevamente." La consola del navegador reportaba `Failed to load resource: the server responded with a status of 500`.

**Diagnóstico:** Se encontraron **dos bugs encadenados** mediante scripts de diagnóstico que simularon el flujo paso a paso contra las BDs reales:

**Bug 1 — `NOT NULL` constraint en `action_logs.userId` (BDs de tenant)**
- **Causa raíz:** Las BDs de Buga y Guacarí fueron creadas con una versión del schema donde `ActionLog.userId` era `String` (requerido). Posteriormente se cambió a `String?` (opcional) en `prisma/schema.prisma`, pero solo se regeneró el cliente Prisma sin ejecutar `ALTER TABLE` en las BDs existentes.
- **Impacto:** La ruta `POST /api/v1/entidad/[token]/auth` crea un `ActionLog` con `userId: null` (entidades externas no son usuarios del sistema). La BD rechazaba el insert con `P2011: Null constraint violation on the fields: (userId)`.
- **Solución:** `ALTER TABLE action_logs ALTER COLUMN "userId" DROP NOT NULL` ejecutado en ambas BDs de tenant via `scripts/fix-actionlog-userid.js --apply`.

**Bug 2 — `NEXTAUTH_SECRET` no configurado**
- **Causa raíz:** La función `getSecret()` en `src/lib/externalEntitySession.ts` buscaba `process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET`, pero el proyecto usa `JWT_SECRET` para toda la criptografía (definido en `src/lib/jwt.ts`). Ninguna de las variables buscadas existía en las variables de entorno de Vercel.
- **Impacto:** Incluso después de corregir el Bug 1, la función `createSessionToken()` (que firma tokens HMAC-SHA256) lanzaba `Error: NEXTAUTH_SECRET no está configurado` al intentar generar el token de sesión. Esto solo afectaba el camino de login exitoso — el camino de credenciales incorrectas retornaba 401 correctamente porque el error ocurría después de la validación.
- **Solución:** Agregado `process.env.JWT_SECRET` como segundo fallback en `getSecret()`.

**Archivos modificados:**
- **`src/lib/externalEntitySession.ts`**: `getSecret()` ahora busca `NEXTAUTH_SECRET || JWT_SECRET || SESSION_SECRET`.
- **`src/app/api/v1/entidad/[token]/auth/route.ts`**: Envuelto todo el handler POST en `try/catch` que retorna JSON `{ error, details }` con status 500. Antes, cualquier excepción no capturada hacía que Next.js retornara HTML, y el `res.json()` del frontend lanzaba una segunda excepción que enmascaraba el error real con "Error de conexión".
- **`src/app/entidad/responder/[token]/page.tsx`**: Agregado `console.error` en el catch de `handleAuth` para facilitar diagnóstico futuro.

**Scripts de diagnóstico creados:**
- `scripts/check-external-token.js`: verifica existencia de tabla y token en BD global.
- `scripts/debug-auth-flow.js`: simula el flujo auth completo paso a paso.
- `scripts/debug-auth-success.js`: simula específicamente el camino de login exitoso.
- `scripts/check-all-columns.js`: audita nullability de todas las columnas de `action_logs` vs schema.
- `scripts/fix-actionlog-userid.js`: detecta y corrige `NOT NULL` en `userId` de todas las BDs de tenant.

---

## 2026-05-19

### 31. Soporte de video MP4 y aumento del límite de archivo a 25 MB
**Objetivo:** Permitir que ciudadanos, funcionarios y entidades externas adjunten archivos de video `.mp4` en cualquier formulario de carga del sistema, y aumentar el tamaño máximo permitido de 10 MB a 25 MB para acomodar videos.

**Backend — Validación de MIME types y extensiones:**
- **`src/lib/constants.ts`**: agregado `video/mp4` a `FILES.ALLOWED_MIME_TYPES` y `.mp3`, `.mp4` a `FILES.ALLOWED_EXTENSIONS`. `MAX_SIZE_MB` cambiado de `10` a `25`.
- **`src/services/BlobStorageService.ts`**: agregado `video/mp4` a `ALLOWED_TYPES`. `MAX_FILE_SIZE` cambiado de `10 MB` a `25 MB`. Mensaje de error actualizado para incluir audio y video.
- **`src/services/DocumentService.ts`**: agregado `video/mp4` a `ALLOWED_MIME_TYPES`. `MAX_FILE_SIZE` cambiado de `10 MB` a `25 MB`. Mensaje de error actualizado.
- **`src/app/api/v1/documents/upload-public/route.ts`**: agregado `.mp4` a `ALLOWED_EXTENSIONS` y `video/mp4` a `ALLOWED_MIME_TYPES`. `MAX_FILE_SIZE` cambiado a `25 MB`.
- **`src/app/api/v1/cases/[id]/documents/public/route.ts`**: validación de tamaño cambiada de `10 MB` a `25 MB`.

**Frontend — Atributo `accept`, validaciones client-side y textos de ayuda:**
- **`src/app/home/casos/nuevo/page.tsx`**: accept `.mp4`, validación `25 * 1024 * 1024`, texto "Tamaño máximo: 25MB".
- **`src/app/atencion-ciudadano/solicitud/page.tsx`**: accept `.mp4`, validación `25 MB`, texto actualizado.
- **`src/app/atencion-ciudadano/consultar/page.tsx`**: accept `.mp4`, validación `25 MB`, texto actualizado. Ícono 🎬 para documentos de video.
- **`src/app/entidad/responder/[token]/page.tsx`**: accept `.mp4`, texto "máx. 25MB". Ícono 🎬 para documentos de video.
- **`src/app/admin/cases/[id]/UploadDocumentForm.tsx`**: accept `.mp4`, `video/mp4` en allowedTypes, validación `25 MB`, texto actualizado.

**Formatos ahora soportados:** PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG, MP3, **MP4**.
**Tamaño máximo:** **25 MB** (antes 10 MB).

---

### 32. Badges de autor en timeline del ciudadano
**Objetivo:** Identificar visualmente quién escribió cada mensaje en el historial de respuestas del dashboard ciudadano. Antes, todas las cajas se veían iguales y no era posible distinguir si un mensaje provenía del funcionario, del ciudadano o del sistema.

**API — `src/app/api/v1/cases/public/status/route.ts`:**
- Expandido `changedByUser` select para incluir `fullName` y `role.code`/`role.name`.
- Agregados campos `authorType` (`FUNCIONARIO` | `CIUDADANO` | `SISTEMA`) y `authorLabel` a cada entrada del `responseHistory`.
- Lógica: si `toState.code === 'RADICADO'` → Sistema; si `isInternal` (escalamiento) → Sistema; si `changedByUser` con rol FUNCIONARIO/DIRECTOR/ASIGNACION_DE_CASOS → Funcionario.

**Frontend — `src/app/atencion-ciudadano/consultar/page.tsx`:**
- Interfaz `CaseStatus.responseHistory` ampliada con `authorType` y `authorLabel`.
- Cada tarjeta del timeline ahora muestra:
  - **Badge de autor** con color sólido: 🏛️ Funcionario (azul `#1e40af`), 👤 Ciudadano (verde `#059669`), ⚙️ Sistema (gris `#6b7280`).
  - **Borde izquierdo grueso** (4px) con el color del autor.
  - **Fondo diferenciado**: azul claro (funcionario), verde claro (ciudadano), gris claro (sistema).
  - **Punto del timeline** coloreado según el autor.
- Las respuestas del ciudadano embebidas (`respuestaCiudadano`) se muestran como sub-caja verde dentro de la tarjeta del funcionario, con etiqueta "👤 Respuesta del ciudadano".

---

## 2026-05-25

### 58. Fix: respuesta de entidad siempre se guardaba como interna, ocultándola al ciudadano cuando soloEntidad=false
**Estado:** COMPLETADO
**Objetivo:** Cuando el funcionario escala SIN marcar "solo a la dependencia/entidad", la respuesta de la entidad debe ser visible para el ciudadano en el portal.

- **`src/app/api/v1/entidad/[token]/responder/route.ts`**: Agregado `isInternal: true` al select de `historial` para leer el valor de la entrada original del escalamiento. Cambiado `isInternal: true` (hardcodeado) a `isInternal: historial.isInternal` al crear la respuesta de la entidad en `CaseStateHistory`, de modo que hereda el valor del ESCALAR que originó el token.

**Problema:** La respuesta de la entidad no aparecía en el portal del ciudadano aunque el funcionario no había marcado "solo a la dependencia/entidad".
**Causa raíz:** `entidad/[token]/responder/route.ts` guardaba la respuesta con `isInternal: true` hardcodeado. Esto hacía que `status/route.ts` la tomara como `primeraEntradaInterna`, la mostrara como aviso de escalamiento (texto genérico) y ocultara el contenido real de la entidad. Además, `casoEnGestion` quedaba `true` deshabilitando el portal ciudadano.
**Solución:** Propagar el `isInternal` del entry original del ESCALAR (que ya refleja si `soloEntidad` fue `true` o `false`) hacia la respuesta de la entidad. Con `soloEntidad=false`, el entry queda `isInternal: false`, el filtro de `status/route.ts` lo detecta como `[ENTIDAD_EXTERNA:]` y lo muestra correctamente al ciudadano.

---

## 2026-05-22

### 51. Auditoría completa: todas las URLs en emails/notificaciones usan dominio del tenant
**Estado:** COMPLETADO
**Objetivo:** Ningún email ni notificación del sistema debe generar un link a localhost:3000 en producción.

- **`src/services/EmailService.ts`**: Agregado parámetro `tenantId?: string` a `sendCitizenReassignmentEmail` y cambiado `this.getBaseUrl()` por `await this.getBaseUrlForTenant(tenantId)`.
- **`src/services/NotificationHooks.ts`**: Importado `EmailService`. En `onCaseAssigned`, extraído `const baseUrl = await EmailService.getBaseUrlForTenant(assignmentData.tenantId)` antes del objeto `templateData`. La URL del caso al funcionario ahora usa el dominio correcto del tenant.
- **`src/app/api/v1/peticiones-reasignacion/[id]/aprobar/route.ts`**: Pasado `auth.user.tenantId` como sexto argumento a `sendCitizenReassignmentEmail`.
- **`src/app/api/v1/solicitudes/[id]/responder/route.ts`**: Reemplazado `EmailService.getBaseUrl()` por `await EmailService.getBaseUrlForTenant(caso.tenantId)` en el fallback de construcción de URL para entidades externas.
- **`src/app/api/v1/entidad/[token]/responder/route.ts`**: Reemplazado `EmailService.getBaseUrl()` por `await EmailService.getBaseUrlForTenant(historial.tenantId)` en el fallback del email al funcionario.
- **`src/app/api/v1/ai/analyze-and-assign/route.ts`**: Pasado `auth.user!.tenantId` a `sendCitizenConfirmationEmail` (era el único call site que no lo hacía).

**Problema:** Cualquier email generado por el sistema (asignación, reasignación, respuesta a entidad, notificación al funcionario) podía contener links a `http://localhost:3000` si las variables de entorno `NEXT_PUBLIC_APP_URL`/`NEXT_PUBLIC_API_URL` no estaban definidas en Vercel.
**Causa raíz:** Solo `sendCitizenConfirmationEmail` resolvía el dominio del tenant desde la BD. El resto usaba `getBaseUrl()` directamente como fallback.
**Solución:** Identificadas 6 ubicaciones. Todas usan ahora `getBaseUrlForTenant(tenantId)` que resuelve el dominio real desde `prisma.tenant.domain`.

---

### 50. URLs de correos al ciudadano apuntan a localhost en producción
**Estado:** COMPLETADO
**Objetivo:** Los emails enviados al ciudadano deben contener el dominio real del tenant, no localhost:3000.

- **`src/services/EmailService.ts`**: Agregado método estático `getBaseUrlForTenant(tenantId?)` que resuelve el dominio del tenant desde la BD (`prisma.tenant.domain`) y construye la URL con el protocolo correcto. Tres funciones que generaban links al portal ciudadano usaban `this.getBaseUrl()` (que cae a `localhost:3000` si no hay variable de entorno): `sendCitizenConfirmationEmail`, `sendCaseResponseEmail` y `sendEscalationNoticeToCitizen`. Todas ahora usan `await this.getBaseUrlForTenant(tenantId)`. `sendCitizenConfirmationEmail` tenía la lógica duplicada inline — simplificada para usar el mismo método.

**Problema:** Los links de "Consultar Estado de mi Solicitud" en los correos al ciudadano mostraban `http://localhost:3000/atencion-ciudadano/consultar?radicado=...`.
**Causa raíz:** `getBaseUrl()` retorna `NEXT_PUBLIC_APP_URL || NEXT_PUBLIC_API_URL || 'http://localhost:3000'`. En Vercel esas variables no estaban definidas, por lo que caía al fallback. Solo `sendCitizenConfirmationEmail` resolvía el dominio del tenant desde la BD, pero las otras funciones no.
**Solución:** Extraer la lógica de resolución de dominio a `getBaseUrlForTenant(tenantId?)` y aplicarla en todas las funciones que construyen links al portal ciudadano.

---

### 49. Director ve todos los documentos adjuntos en panel de cierre de casos
**Estado:** COMPLETADO
**Objetivo:** El director debe ver todos los documentos del caso (incluyendo internos) en la página de cierre, no solo el primero de la petición.

- **`src/app/api/v1/solicitudes/bandeja-entrada/route.ts`**: `getRevisorInbox` filtraba documentos por `documentType IN ['PETITION','SUPPORTING_DOC']` y limitaba a 1. Eliminados el `where` y el `take` para traer todos. En `formatCase` se agrega `isInternal: doc.isInternal ?? false` al mapeo de documentos.
- **`src/app/home/cierre-casos/page.tsx`**: Agregada interfaz `Documento` con campo `isInternal`. Agregados helpers `formatBytes` y `DocIcon`. Nueva sección "Archivos adjuntos" entre la conversación y el formulario de rechazo: lista descargable de todos los archivos, con icono por tipo, tamaño y badge amarillo "Interno" para documentos internos.

**Problema:** El director no podía ver ningún archivo adjunto del caso en la pantalla de aprobación/rechazo de cierre.
**Causa raíz:** (1) La query del tab `cierreCasos` traía solo 1 documento filtrado por tipo; (2) la página no tenía UI para mostrar documentos.
**Solución:** Eliminar filtros y límite en la query, añadir `isInternal` al formatter, y agregar la sección de archivos en la página.

---

## 2026-05-21

### 48. Badge "Cierre rechazado" en bandeja del funcionario
**Estado:** COMPLETADO
**Objetivo:** Cuando el director rechaza el cierre, el funcionario ve un badge rojo en la tarjeta hasta que abre el caso.

- **`src/app/api/v1/solicitudes/bandeja-entrada/route.ts`**: Agregado campo `cierreRechazado` al return de `formatCase`: `true` cuando `metadata.cierreRechazado === true` y `!metadata.cierreRechazadoLeido`.
- **`src/app/api/v1/solicitudes/[id]/rechazar-cierre/route.ts`**: Al rechazar, se guarda `cierreRechazadoLeido: false` en metadata para que el badge aparezca desde el primer momento.
- **`src/app/home/bandeja-entrada/page.tsx`**: Nuevo estado `cierreRechazadoIds`. Populado en `loadSolicitudes`. Badge rojo (`#dc2626`) con animación pulse en esquina superior derecha de la tarjeta, visible solo para `FUNCIONARIO`. Al abrir el modal se incluye `cierreRechazadoLeido: true` en el PATCH de lectura y se elimina del set local. Agregado `XCircle` al import de lucide-react.

---

### 47. Rechazar cierre: textarea con motivo y notificación al funcionario
**Estado:** COMPLETADO
**Objetivo:** Cuando el director rechaza un cierre, debe escribir el motivo en un textarea y ese mensaje llega por email solo al funcionario asignado.

- **`src/app/api/v1/solicitudes/[id]/rechazar-cierre/route.ts`**: Nuevo endpoint `POST`. Requiere rol `DIRECTOR` o `ADMIN`. Recibe `{ motivo }`, actualiza `metadata` del caso (`pendienteCierre: false, motivoRechazo, cierreRechazado: true`), busca el funcionario asignado (nivel 85) y le envía email con el motivo usando `EmailService.sendEmail` directamente. Solo el funcionario recibe el email.
- **`src/app/home/cierre-casos/page.tsx`**: Eliminado el `confirm()` y el PATCH directo de `handleRechazarCierre`. Agregados estados `rechazandoId`, `motivoRechazo`, `loadingRechazo`. Al hacer clic en "Rechazar Cierre" se muestra un formulario inline con textarea (fondo rojo claro). Los botones normales se ocultan mientras el formulario está abierto. El botón "Enviar rechazo" se desactiva si el textarea está vacío. Al confirmar llama al nuevo endpoint y recarga la lista.

---

### 46. Motivo de cierre no aparece en panel del director
**Estado:** COMPLETADO
**Objetivo:** El director debe ver el motivo que escribió el funcionario al solicitar el cierre del caso.

- **`src/app/api/v1/solicitudes/bandeja-entrada/route.ts`**: `formatCase` no retornaba el campo `metadata` del caso. La página `/home/cierre-casos` lee `solicitud.metadata.motivoCierre` para mostrar el motivo. Al no existir `metadata` en la respuesta, siempre mostraba "Sin motivo especificado". Agregado `metadata: caso.metadata ?? null` al objeto retornado por `formatCase`.

**Problema:** El panel del director mostraba "Sin motivo especificado" aunque el funcionario sí lo escribía.
**Causa raíz:** `formatCase` en `bandeja-entrada/route.ts` no incluía `metadata` en su return — el funcionario lo guarda vía PATCH en BD pero la bandeja nunca lo exponía.
**Solución:** Agregar `metadata` al return de `formatCase`.

---

### 45. Polling silencioso cada 10 segundos en bandeja de entrada
**Estado:** COMPLETADO
**Objetivo:** Que los casos nuevos y notificaciones aparezcan automáticamente sin refrescar la página y sin parpadeos visibles.

- **`src/app/home/bandeja-entrada/page.tsx`**: El `setInterval` existente ya llamaba `loadSolicitudes(false)` (sin mostrar spinner) pero cada 30 segundos y sin actualizar los contadores de notificaciones. Cambiado el intervalo de `30000` a `10000`. Agregados `loadRespuestasPendientes()` y `loadEnGestionNotifications()` al intervalo para que los badges de ciudadano respondió, nota del director y entidad respondió también se refresquen. Actualizadas las dependencias del `useEffect`.

---

### 44. Badges persisten tras recargar página (fix)
**Estado:** COMPLETADO
**Objetivo:** Los badges de "Nota del Director" y "Entidad respondió" deben desaparecer permanentemente cuando el funcionario abre el modal, no solo en memoria local.

- **`src/app/api/v1/solicitudes/bandeja-entrada/route.ts`**: `tieneNotas` ahora es `false` cuando `metadata.notasLeidas === true`. `tieneRespuestaEntidad` ahora es `false` cuando `metadata.entidadRespLeida === true`. Así los badges no reaparecen tras recargar la página.
- **`src/app/home/bandeja-entrada/page.tsx`**: En `handleAbrirChatModal`, cuando alguno de los badges está activo, se envía un PATCH fire-and-forget a `/api/v1/solicitudes/${id}` con `{ metadata: { notasLeidas: true, entidadRespLeida: true } }` para persistir la lectura. Además se eliminan los IDs de los sets locales para efecto visual inmediato.
- **`src/app/api/v1/cases/[id]/notes/route.ts`**: Extendido el select de `caseWithAssignment` para incluir `metadata`. Tras crear el `ActionLog`, se hace `db.case.update` con `notasLeidas: false` para que el badge reaparezca cuando el director crea una nueva nota.
- **`src/app/api/v1/entidad/[token]/responder/route.ts`**: Extendido el select de `currentState` para incluir `metadata`. Tras la transacción, se hace `db.case.update` con `entidadRespLeida: false` para que el badge reaparezca cuando la entidad envía una nueva respuesta.

**Problema:** Los badges desaparecían al abrir el modal (estado local) pero reaparecían al recargar la página (re-fetch desde BD).
**Causa raíz:** `tieneNotas` y `tieneRespuestaEntidad` se calculaban sin considerar si el funcionario ya los había visto.
**Solución:** Flags en metadata del caso (`notasLeidas`, `entidadRespLeida`) que se activan cuando el funcionario abre el caso y se resetean cuando llega contenido nuevo.

---

### 43. Checkbox "Permitir respuesta del ciudadano" en "Responder a Ciudadano"
**Estado:** COMPLETADO
**Objetivo:** Cuando el funcionario elige "Responder a Ciudadano", debe poder controlar si el ciudadano tendrá textarea habilitado para responder.

- **`src/app/home/bandeja-entrada/page.tsx`**: Nuevo estado `ciudadanoPuedeResponder` (default `true`). Se resetea a `true` al cambiar de tipo de respuesta. Se muestra como checkbox solo cuando `tipoRespuesta === 'SOLICITAR_INFO'`, con feedback visual: fondo verde cuando está marcado, ámbar cuando no. Se incluye en el body del POST solo cuando el tipo es `SOLICITAR_INFO`.
- **`src/app/api/v1/solicitudes/[id]/responder/route.ts`**: Recibe `ciudadanoPuedeResponder` (default `true`). Cuando `tipoRespuesta === 'SOLICITAR_INFO'` escribe `metadata.bloquearRespuestaCiudadano = !ciudadanoPuedeResponder` en los metadatos del caso.
- **`src/app/api/v1/cases/public/status/route.ts`**: `casoEnGestion` ahora es `true` también cuando `metadata.bloquearRespuestaCiudadano === true`, independientemente del flujo de escalamiento. Esto deshabilita el textarea del ciudadano en el portal público.

---

### 42. Badges visuales en "En Gestión": nota del director y respuesta de entidad
**Estado:** COMPLETADO
**Objetivo:** Las tarjetas en la pestaña "En Gestión" deben mostrar un badge ámbar cuando hay nota del director y uno naranja cuando una entidad u oficina ha respondido.

- **`src/app/api/v1/solicitudes/bandeja-entrada/route.ts`**: En `getStandardInbox`, agregado `actionLogs: { where: { action: 'INTERNAL_NOTE' }, select: { id: true }, take: 1 }` al include del caso. En `formatCase`, agregados dos campos al return: `tieneNotas` (verdadero si existen ActionLog de tipo INTERNAL_NOTE para ese caso) y `tieneRespuestaEntidad` (verdadero si la conversación contiene algún mensaje con `rol === 'ENTIDAD_EXTERNA'`).
- **`src/app/home/bandeja-entrada/page.tsx`**: Dos nuevos estados `notasDirIds` y `entidadRespIds` (conjuntos de IDs). Populados al cargar `loadSolicitudes` filtrando por los nuevos campos. En las tarjetas de "En Gestión": badge ámbar (`#d97706`) en la esquina superior izquierda para notas del director (solo cuando `userRole === 'FUNCIONARIO'`); badge naranja (`#ea580c`) en la esquina inferior derecha para respuestas de entidad.

---

### 41. Notas internas del director: nota no visible al funcionario y notificación no enviada
**Estado:** COMPLETADO
**Objetivo:** El funcionario debe ver las notas que el director deja en un caso, y recibir el email de notificación.

- **`src/app/api/v1/cases/[id]/notes/route.ts`**: `NotificationHooks.onInternalNote()` se llamaba sin `await`. En Vercel (serverless), la función retorna la respuesta HTTP antes de que el email se envíe y el proceso se termina. Agregado `await` para garantizar que el email se envíe antes de retornar.
- **`src/app/home/bandeja-entrada/page.tsx`**: La sección de notas internas solo existía en el modal de detalle (`isModalOpen`, abierto con `handleVerDetalle`). El funcionario usa el modal de chat (`isChatModalOpen`, abierto con `handleAbrirChatModal` al hacer clic en una tarjeta). Agregada una sección "Notas del Director" dentro del área de historial del chat modal, visible únicamente cuando `userRole === 'FUNCIONARIO'` y existen notas (`notasInternas.length > 0`).

**Problema:** El funcionario no veía las notas ni recibía el email de notificación.
**Causa raíz (doble):** (1) Fire-and-forget en serverless — `onInternalNote` sin `await` → proceso termina antes de enviar el email; (2) La sección de notas solo estaba en el modal de detalle del director, no en el modal de chat que usa el funcionario.
**Solución:** Agregar `await` a la llamada de notificación y añadir la sección de notas al modal de chat del funcionario.

---

### 40. Contador de badge VU alineado con filtro "Nuevos" (Option B)
**Estado:** COMPLETADO
**Objetivo:** El contador de notificaciones de VU debe reflejar todos los casos sin clasificar, no solo los que están en estado RADICADO.

- **`src/app/api/v1/solicitudes/nuevas/count/route.ts`**: La lógica de conteo para `VENTANILLA_UNICA` usaba `stateId IN [RADICADO]`, idéntico al error que ya se corrigió en `bandeja-entrada`. Cuando el funcionario avanzaba el caso a EN_ESTUDIO o REQUIERE_INFORMACION, el contador bajaba a 0 aunque el caso aún no hubiera sido clasificado por VU. Ahora usa `stateId NOT IN estadosFinales` + filtro en memoria `!vuClassification`, igual que la pestaña "Nuevos".

**Problema:** El contador de la badge de VU mostraba 0 en cuanto el funcionario movía el caso de RADICADO, aunque VU todavía no lo hubiera clasificado.
**Causa raíz:** El endpoint `nuevas/count` tenía un filtro distinto al de `bandeja-entrada` — el fix de la pestaña "Nuevos" de la sesión anterior no se replicó al endpoint de conteo.
**Solución:** Reemplazar el filtro de estados en `count` por la misma lógica de estados no finales que usa `bandeja-entrada`.

---

### 37. Mostrar archivos adjuntos internos en portal de entidad externa
**Estado:** COMPLETADO
**Objetivo:** La entidad a quien se escaló el caso debe ver todos los documentos del expediente en su portal — incluyendo los marcados como isInternal: true (propios de la entidad o del funcionario).

- **`src/app/api/v1/entidad/[token]/route.ts`**: Eliminado el filtro `where: { isInternal: false }` en la consulta de documentos. Ahora se devuelven todos los documentos del caso. Agregado `isInternal` al select y al mapeo de la respuesta.
- **`src/app/entidad/responder/[token]/page.tsx`**: Actualizada la interfaz `CaseDocument` para incluir `isInternal?: boolean`. En el render, los documentos internos se muestran con fondo amarillo/ámbar y etiqueta "🔒 Interno" para que la entidad los distinga de los adjuntos del ciudadano (fondo azul).

**Problema:** En el portal de la entidad no aparecían documentos con `isInternal: true` (documentos que la propia entidad subió en respuestas anteriores y documentos internos del funcionario).
**Causa raíz:** El filtro `where: { isInternal: false }` en el GET de `entidad/[token]` excluía todos los documentos internos. El flag `isInternal` es para el portal ciudadano; la entidad es un participante autorizado que debe ver el expediente completo.
**Solución:** Remover el filtro, exponer el campo `isInternal` en la respuesta y diferenciar visualmente en el frontend.

---

### 36. Fix definitivo colores chat "Continuar Caso" — entidad externa izquierda
**Estado:** COMPLETADO
**Objetivo:** En el panel de chat del modal "Continuar Caso", los mensajes de entidad/oficina externa deben aparecer a la izquierda con color diferente; solo el funcionario va a la derecha.

- **`src/app/api/v1/solicitudes/[id]/route.ts`**: Dos correcciones en `buildConversacion`:
  1. El soporte de `[ENTIDAD_EXTERNA:email]` existía como cambio local pero nunca se commiteó — ahora sí se incluye.
  2. Mensajes en formato antiguo `"Respuesta de entidad externa: [texto]"` no eran detectados y caían como FUNCIONARIO. Se agregó detección explícita antes del `else` genérico.
- **`src/app/api/v1/solicitudes/bandeja-entrada/route.ts`**: Misma corrección de formato antiguo agregada en `formatCase` para consistencia.

**Problema:** El modal "Continuar Caso" mostraba todos los mensajes de entidad externa como "Tú (Funcionario)" en azul alineados a la derecha.
**Causa raíz (doble):** (1) `[id]/route.ts` — el archivo correcto que alimenta el chat — nunca tuvo commiteado el soporte de ENTIDAD_EXTERNA; (2) mensajes históricos en formato `"Respuesta de entidad externa: [texto]"` no tenían detección en ninguno de los dos archivos.
**Solución:** Commitear los cambios pendientes en `[id]/route.ts` y agregar detección del formato antiguo en ambos archivos.

---

### 35. Reforzar regla de bitácora obligatoria en CLAUDE.md
**Estado:** COMPLETADO
**Objetivo:** Hacer explícito e inequívoco que la bitácora debe registrarse ANTES de ejecutar cualquier instrucción y actualizarse ANTES del commit, sin excepción.

- **`CLAUDE.md`**: Reescrita la sección "Regla obligatoria: Bitácora de implementación". Ahora está marcada con ⚠️ y encabezada con la advertencia "Esta regla NO es opcional. Debe ejecutarse en CADA instrucción, sin excepción." Los tres pasos son ahora explícitos: PASO 1 = guardar EN CURSO antes de cualquier acción, PASO 2 = ejecutar la instrucción, PASO 3 = actualizar a COMPLETADO antes del commit.

---

### 34. Chat con colores por tipo de autor en bandeja del funcionario
**Estado:** COMPLETADO
**Objetivo:** El funcionario debe distinguir visualmente por colores qué mensajes son del ciudadano, de una entidad/institución externa o suyos propios al continuar un caso.

- **`src/app/api/v1/solicitudes/bandeja-entrada/route.ts`**: corregido bug en `formatCase` — el bloque 1 capturaba cualquier comentario en estado `REQUIERE_INFORMACION` como `FUNCIONARIO`, incluyendo los de `[ENTIDAD_EXTERNA:]`, creando entradas duplicadas y mal etiquetadas. Reestructurado a un único `if/else if` en orden: entidad externa → ciudadano → funcionario.
- **`src/app/home/bandeja-entrada/page.tsx`**: mejorado el esquema de colores en ambos bloques (modal de detalle + panel de chat). Ahora 3 estilos diferenciados:
  - 🏛️ **Funcionario**: azul (`#eff6ff` / `var(--color-primary)`) — alineado derecha.
  - 👤 **Ciudadano**: verde (`#f0fdf4`, borde `#bbf7d0`) — alineado izquierda, muestra nombre real.
  - 🏢 **Entidad / Institución**: ámbar (`#fff7ed`, borde `#fed7aa`) — alineado izquierda.

**Problema:** Los mensajes de entidad externa aparecían como "Tú (Funcionario)" en azul oscuro, con el prefijo `[ENTIDAD_EXTERNA:email]` crudo visible.
**Causa raíz:** El bloque de clasificación de `formatCase` checkeaba `estadoCodigo === 'REQUIERE_INFORMACION'` antes que `[ENTIDAD_EXTERNA:]`, por lo que los mensajes de entidad caían como FUNCIONARIO.
**Solución:** Invertir prioridad — entidad externa se detecta primero; el resto sigue en cascada.

---

### 39. Casos nuevos no llegaban a la bandeja de VU en pestaña "Nuevos"
**Estado:** COMPLETADO
**Objetivo:** Garantizar que todo caso nuevo siempre llegue a la bandeja de Ventanilla Única, independientemente del resultado de la IA.

- **`src/services/AIAssignmentService.ts`**: La notificación a VU estaba al final de `autoAssignCase()`, después del análisis de IA y el assignment al funcionario. Si cualquier paso anterior fallaba (IA sin respuesta, funcionario no disponible, etc.), la función retornaba sin crear asignaciones para VU. Se movió la notificación a VU al **paso 2**, inmediatamente después de encontrar el caso, usando `client.assignment.create()` directo en lugar de `assignmentService.assignCase()`. Esto evita además el efecto secundario de marcar la asignación del funcionario como `REASSIGNED`.
- **`src/app/api/v1/ai/analyze-and-assign/route.ts`**: No se pasaba `db` al llamar `autoAssignCase()`. Sin `db`, el servicio usaba el `prisma` global, que no contiene casos de BDs de tenant → el caso no era encontrado y la función retornaba "Caso no encontrado" antes de crear asignaciones para VU ni para el funcionario. Corregido pasando `db` en ambas llamadas.
- **`src/app/api/v1/cases/general-request/route.ts`**: Si no existía usuario con rol `ASIGNACION_DE_CASOS` en la BD del tenant, la asignación completa (IA + VU) era omitida. Se añadió fallback: cuando no hay `aiUser`, se buscan directamente los usuarios VU y se crean sus asignaciones usando el primer ADMIN activo como `assignedBy`.

**Causa raíz:** Tres rutas de entrada al sistema (portal ciudadano, bandeja interna, reasignación directa) tenían condiciones de fallo que impedían la creación de asignaciones para VU — el flujo de VU dependía del éxito completo del flujo de IA en lugar de ser independiente.

**Corrección adicional** — Casos que progresaban de estado antes de ser clasificados por VU desaparecían de "Nuevos" porque el filtro exigía `state = RADICADO`. Para VU, "Nuevos" ahora muestra todos los casos con asignación VU sin `vuClassification`, excluyendo solo los estados finales (CERRADO, FINALIZADO, etc.). **Backfill:** script `scripts/backfill-vu-assignments.js` ejecutado — 1 asignación creada en Guacarí (PMGUC-2026-000007).

---

### 38. Ocultar escalamiento al ciudadano cuando el funcionario usa "Enviar solo a la entidad"
**Estado:** COMPLETADO
**Objetivo:** Cuando se escala con `soloEntidad=true`, el ciudadano nunca debe ver el intercambio con la entidad; pero sí debe ver mensajes posteriores que el funcionario le dirija directamente.

- **`src/app/api/v1/entidad/[token]/responder/route.ts`**: Cambiado `isInternal: false` a `isInternal: true` al guardar la respuesta de la entidad en `CaseStateHistory`. Los tokens solo se generan cuando `soloEntidad=true`, por lo que toda respuesta vía token pertenece a un escalamiento reservado.
- **`src/app/api/v1/cases/public/status/route.ts`**: Reemplazado el filtro temporal (`timestamp >= fechaCorte`) por un filtro basado en `isInternal` + prefijo de comentario. Ahora: entradas `isInternal=true` → solo la primera se muestra como aviso; entradas `[ENTIDAD_EXTERNA:]` con escalamiento activo → ocultas (cubre datos legacy con `isInternal=false`); todo lo demás → visible. Esto permite que mensajes posteriores del funcionario al ciudadano (con `isInternal=false`, sin prefijo de entidad) aparezcan correctamente aunque tengan timestamp posterior al corte. Además, `casoEnGestion` ahora se calcula dinámicamente: es `true` solo mientras no haya un mensaje post-escalamiento del funcionario al ciudadano; en cuanto existe uno, pasa a `false` y el textarea del ciudadano se habilita.

---

### 33. Ocultar email de entidad externa en etiqueta de autor
**Estado:** COMPLETADO
**Objetivo:** El label de la entidad externa en la conversación no debe mostrar el email (`[ENTIDAD_EXTERNA:arevalo@gmail.com]`) sino solo "Respuesta de entidad externa".

- **`src/app/home/bandeja-entrada/page.tsx`**: corregidos los dos bloques `conversacion.map()` (modal de detalle + panel de chat). Antes solo manejaban `isFuncionario` true/false, por lo que `ENTIDAD_EXTERNA` caía en el caso ciudadano mostrando el email crudo. Ahora se detecta `msg.rol === 'ENTIDAD_EXTERNA'` y muestra "Respuesta de entidad externa" con estilo naranja diferenciado (fondo `#fff7ed`, borde `#fed7aa`).

---

## 2026-05-22

### 57. sendEntityEmail ignoraba retorno de sendEmail — siempre reportaba éxito aunque fallara
**Estado:** COMPLETADO
**Objetivo:** Hacer visible el fallo real del envío a entidades en los logs.

- **`src/services/EmailService.ts`**: `sendEntityEmail` hacía `await this.sendEmail(...)` sin capturar el resultado y retornaba `true` siempre. Corregido a `const sent = await this.sendEmail(...); return sent;`.

**Problema:** El email a la entidad/dependencia no llegaba pero el sistema reportaba éxito.
**Causa raíz:** `sendEmail` retorna `boolean` (nunca lanza excepción), pero `sendEntityEmail` ignoraba ese valor.
**Solución:** Capturar el retorno y propagarlo correctamente.

---

### 56. Fusionar REMITIR en ESCALAR — eliminar "Comunicar con Entidad Externa" como tipo separado
**Estado:** COMPLETADO
**Objetivo:** Un solo tipo de respuesta "Comunicar con Dependencia / Entidad Externa" cubre ambos casos, simplificando el flujo.

- **`src/app/home/bandeja-entrada/page.tsx`**: Eliminada la opción `REMITIR` del select. Renombrada la opción ESCALAR a "Comunicar con Dependencia / Entidad Externa". Todos los condicionales `|| tipoRespuesta === 'REMITIR'` simplificados. Textos de labels y checkbox actualizados a "dependencia / entidad".
- **`src/app/api/v1/solicitudes/[id]/responder/route.ts`**: Eliminado `REMITIR` del mapa `RESPONSE_TYPE_TO_STATE`. ESCALAR ahora siempre genera `externalToken` (antes solo cuando `soloEntidad=true`), para que tanto dependencias internas como entidades externas puedan responder via portal.

---

### 55. Correos no se enviaban: fromEmail usaba SMTP_USER ("resend") en vez de SMTP_FROM
**Estado:** COMPLETADO
**Objetivo:** Corregir que `sendEmail` usaba `smtpConfig.user` ("resend") como dirección del remitente, generando `from: <resend>` — email inválido que Resend rechaza silenciosamente.

- **`src/services/EmailService.ts`**: Añadido campo `fromEmail` a la interfaz `SmtpConfig`. En `getSmtpConfig` se lee `SMTP_FROM` / `SMTP_FROM_EMAIL` / `NOREPLY_FROM_EMAIL` para obtener el email del remitente. En `sendEmail` se usa `smtpConfig.fromEmail` antes del fallback a `smtpConfig.user`.

**Problema:** Todos los emails (entidad y ciudadano) fallaban silenciosamente tras la migración a Resend.
**Causa raíz:** `getSmtpConfig` no exponía `fromEmail`; `sendEmail` usaba `smtpConfig.user` ("resend") como dirección `from`, que es el usuario de autenticación SMTP de Resend, no una dirección válida. Resend rechazaba el mensaje.
**Solución:** Separar la dirección de autenticación SMTP (`user="resend"`) de la dirección del remitente (`fromEmail="noreply@ossprobe.store"`), ambas ya presentes en las vars de entorno.

---

### 54. Correos no se enviaban: TenantSettings tenía credenciales Gmail mezcladas con host Resend
**Estado:** COMPLETADO
**Objetivo:** Que todos los correos salgan correctamente ahora que el SMTP global es Resend.

- **`src/services/EmailService.ts`**: `getSmtpConfig` consultaba `TenantSettings.smtpUser/smtpPass` del tenant. El tenant buga tenía credenciales viejas de Gmail. Al migrar `SMTP_HOST` a `smtp.resend.com`, el código intentaba autenticar con usuario Gmail en el servidor Resend → falla de autenticación → todos los emails fallaban silenciosamente. Se eliminó la rama de tenant-específico: ahora siempre usa las variables de entorno globales. La configuración por tenant se habilitará cuando cada entidad tenga su propio dominio verificado en Resend.

**Problema:** Ningún correo llegaba después de migrar a Resend (ni al ciudadano ni a la entidad).
**Causa raíz:** `getSmtpConfig` mezclaba el host del `.env` (`smtp.resend.com`) con user/pass del tenant (`estivenshot13@gmail.com` + contraseña Gmail) → autenticación inválida.
**Solución:** `getSmtpConfig` ignora `TenantSettings` y usa únicamente las variables de entorno globales (SMTP_HOST, SMTP_USER, SMTP_PASS).

---

### 53. ESCALAR/REMITIR: checkbox soloEntidad visible para ambos, ciudadano lee pero no responde
**Estado:** COMPLETADO
**Objetivo:** Cuando soloEntidad=false en ESCALAR/REMITIR el ciudadano puede leer las actualizaciones en el portal pero sin textarea de respuesta; cuando soloEntidad=true recibe el aviso de reserva. REMITIR debe mostrar el checkbox igual que ESCALAR.

- **`src/app/api/v1/solicitudes/[id]/responder/route.ts`**: Eliminado el forzado `soloEntidad=true` para REMITIR. `externalToken` ahora se genera si `tipoRespuesta === 'REMITIR' || soloEntidad` — REMITIR siempre genera token (para que la entidad pueda responder vía portal), ESCALAR solo cuando está bajo reserva.
- **`src/app/home/bandeja-entrada/page.tsx`**: Checkbox "Enviar solo a la dependencia/entidad" ahora visible para ambos, ESCALAR y REMITIR. Etiqueta dinámica según tipo. Descripción actualizada: cuando NO está marcado informa que el ciudadano verá las actualizaciones en el portal. Fetch body y `esInterno` de archivos corregidos: usan `soloEntidad` para ambos tipos sin forzado.
- **`src/app/atencion-ciudadano/consultar/page.tsx`**: Condición del formulario de respuesta del ciudadano ahora incluye `result.state === 'REQUIERE_INFORMACION'`, evitando que un REQUIERE_INFORMACION antiguo en el historial active el textarea cuando el caso ya avanzó a ESCALADO_A_OTRA_DEPENDENCIA o REMITIDO_A_ENTIDAD_EXTERNA.

**Problema:** Al usar REMITIR el checkbox estaba oculto (forzado a soloEntidad=true), el funcionario no podía elegir visibilidad para el ciudadano. Además, si un caso pasaba de REQUIERE_INFORMACION a ESCALADO sin reserva (soloEntidad=false), el ciudadano veía el textarea de respuesta de la solicitud anterior.
**Causa raíz:** Fix anterior (#52) resolvió el token ocultando el checkbox de REMITIR y forzando soloEntidad=true. El portal ciudadano solo validaba `casoEnGestion` (basado en isInternal) y no el estado actual del caso.
**Solución:** Separar la generación del token (siempre para REMITIR) de la visibilidad del historial (controlada por soloEntidad). Proteger el textarea verificando que el estado actual del caso sea REQUIERE_INFORMACION.

---

### 52. REMITIR a entidad externa no enviaba correo con enlace de respuesta
**Estado:** COMPLETADO
**Objetivo:** Cuando el funcionario usa "Comunicar con Entidad Externa" (REMITIR), la entidad debe recibir siempre el enlace para responder a través del portal, no una URL de consulta de solo lectura.

**Problema:** El toggle "Enviar solo a la entidad" (`soloEntidad`) se mostraba para REMITIR pero venía desactivado por defecto. Sin `soloEntidad=true` no se generaba `externalToken`, por lo que el email a la entidad incluía una URL de consulta pública de solo lectura (`/atencion-ciudadano/consultar?radicado=...`) en lugar del enlace de respuesta (`/entidad/responder/{token}`). La entidad recibía el email pero no podía responder a través del portal.

**Causa raíz:** `externalToken = soloEntidad ? randomUUID() : null` — sin el toggle activado, nunca se generaba el token. Para REMITIR, el token es siempre necesario ya que el propósito es que la entidad externa pueda responder.

**Solución:** Para REMITIR, `soloEntidad` siempre es `true` (forzado).

- **`src/app/api/v1/solicitudes/[id]/responder/route.ts`**: Se desestructura `soloEntidadRaw` del body y se crea `soloEntidad = tipoRespuesta === 'REMITIR' ? true : soloEntidadRaw`. Aplica en toda la lógica de email, token y historial.
- **`src/app/home/bandeja-entrada/page.tsx`**: Se oculta el toggle "Enviar solo a la entidad" para REMITIR (condición `tipoRespuesta === 'ESCALAR'`). Se fuerza `soloEntidad: true` en el body del fetch cuando REMITIR. Los archivos adjuntos de REMITIR también se marcan `isInternal=true`. Se agrega validación obligatoria: ESCALAR y REMITIR requieren al menos un email de destino antes de poder enviar.

