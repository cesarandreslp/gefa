# Plan de Implementación — GEFA

Bitácora de cambios del proyecto. Una entrada por instrucción (ver regla en `CLAUDE.md`).

---

## 2026-06-10

### 38. Bloque de dominio — peso procesal (declaración), acervo probatorio e instrumento de valoración
**Estado:** EN CURSO
**Objetivo:** Recopilar e implementar lo identificado en la sesión (a partir de "¿a quién le corresponde tomar las declaraciones?") para que el expediente sea conforme a la norma. Principio rector ya guardado: solo la declaración del Comisario (`DIRECTOR`) tiene peso procesal; lo que aportan partes y funcionarios es insumo del expediente cuyo valor probatorio fija el comisario.

**Backlog a mejorar/implementar:**

1. **Modelo `Declaracion` (nuevo).** Hoy NO existe. Diligencia con peso procesal.
   - Campos: `caseId`, `declaranteId` (→ `CaseParty`/`Person`), `tipoDeclarante` (víctima / denunciante / agresor=descargos / testigo / interviniente), `tomadaPorUserId` (**solo `DIRECTOR`**), `fecha`, `contenido`/acta, `hearingId?` (si se rindió en audiencia).
   - RBAC: crear/firmar exclusivo del `DIRECTOR`; un `FUNCIONARIO` no puede ser autor. Auditar en `ActionLog`.
   - Decisión de diseño: modelo propio (no `hearingType`), porque la autoría exclusiva y el peso procesal deben ser explícitos y la declaración puede tomarse fuera de audiencia.

2. **`Document` → acervo probatorio (mejoras).** Base ya existe (`fileHash` SHA-256, `documentType: EVIDENCE`, `uploadedByType: CITIZEN`, `mimeType`).
   - Añadir `aportanteId` (→ `CaseParty`): quién la aporta como **parte**, no solo quién la subió.
   - Añadir **valoración probatoria del `DIRECTOR`**: estado (ADMITIDA / RECHAZADA / PENDIENTE), valor probatorio, `valoradaPorUserId`, `valoradaAt`. Hoy no existe.
   - Añadir confidencialidad reforzada (`isConfidential`/nivel) para contenido sensible (lesiones, audios de amenaza, NNA); hoy solo hay `isInternal`.

3. **Subsistema de instrumentos de valoración (NUEVO, el grande).** Decisión del usuario: no es un campo; es un flujo completo dentro de la plataforma.
   - **Catálogo de instrumentos con plantillas estructuradas** (campos/secciones por formato). Referentes: VIF/feminicidio → **Resolución 0362 de 2026** Minjusticia (Ley 2126/2021; complementos: protocolo Medicina Legal, FIR Fiscalía); PARD/NNA → ICBF **F3.G16.P** (psicológica) y **F5.G16.P** (socio-familiar). Res. 0362/2026 es reciente (marzo/2026): confirmar estructura contra texto oficial antes de sembrarla.
   - El profesional (psicólogo/trabajador social) **escoge y diligencia** el formato en la plataforma; se calcula el resultado/nivel de riesgo según el formato.
   - La **IA genera un informe preliminar** por cada instrumento diligenciado (borrador editable por el profesional).
   - Cuando todos están diligenciados, la IA produce un **pre-informe consolidado**.
   - El **comisario (`DIRECTOR`) revisa y aprueba** el pre-informe; ahí adquiere validez (la IA solo produce borradores, nunca peso procesal → coherente con el principio rector).

4. **RBAC/auditoría transversal.** Autoría de declaración, valoración de prueba y aprobación de pre-informe exclusivas del `DIRECTOR`; acceso restringido a pruebas confidenciales y a valoraciones psicosociales (`Assessment.isConfidential` ya lo trae).

**Infra IA heredada (verificada):** proveedor **GROQ** (`groq-sdk`, modelo `llama-3.3-70b-versatile`); config por tenant en `TenantSettings.groqApiKey` (fallback `GROQ_API_KEY`); patrón reusable en `src/services/AIAssignmentService.ts` (cliente cacheado por key, `chat.completions.create` con `response_format: json_object`). El subsistema de informes reusa esta infra; NO hace falta campo nuevo en el tenant.

**Decisiones del usuario:** (1) declaración = **modelo propio** (no `hearingType`); (2) instrumentos = **subsistema con plantillas + IA** (ver punto 3); (3) **solo planear las fases** ahora, implementar después.

**Plan por fases (a ejecutar en sesiones siguientes):**
- **Fase A — Declaración con peso procesal:** modelo `Declaracion` + enum tipo de declarante; RBAC autor = solo `DIRECTOR`; UI registrar/firmar en expediente; `ActionLog`; ejemplo en seed.
- **Fase B — Acervo probatorio:** extender `Document` (`aportanteId` → `CaseParty`; estado probatorio ADMITIDA/RECHAZADA/PENDIENTE + `valoradaPor`/`valoradaAt`; confidencialidad reforzada); RBAC valoración = `DIRECTOR`; UI cargar prueba con aportante + bandeja del comisario.
- **Fase C — Instrumentos de valoración (subsistema), sub-fases:**
  - C1 catálogo + plantillas estructuradas (modelo de instrumento y sus campos; sembrar Res.0362/2026, F3.G16.P, F5.G16.P contra texto oficial).
  - C2 diligenciamiento en plataforma vinculado a `Assessment` (respuestas + cálculo de resultado).
  - C3 informe preliminar por IA por instrumento (reusa infra GROQ; borrador editable).
  - C4 pre-informe consolidado por IA cuando todos están diligenciados.
  - C5 revisión y aprobación del `DIRECTOR` (estados BORRADOR→EN_REVISIÓN→APROBADO; firma).
- **Fase D — Endurecimiento RBAC/auditoría** (transversal; cierre).

**Decisiones de protección de datos (para Fase C/D):**
- **IA multiproveedor:** la config del tenant debe permitir GROQ **y otros proveedores** (no atarse a GROQ). Implica generalizar `groqApiKey` a una config de proveedor IA por tenant.
- **Anonimizar** los datos sensibles/NNA antes de enviarlos a la IA.
- Confirmar estructura oficial de Res. 0362/2026 antes de C1 (acordado).

**Ejecución:** orden A→B→C→D, confirmado por el usuario.

#### Fase A — Declaración con peso procesal
**Estado:** COMPLETADO
**Alcance:** modelo `Declaracion` + enum tipo de declarante; RBAC autor = solo `DIRECTOR`; UI registrar/firmar en el expediente; `ActionLog`; ejemplo en seed.
**Hecho:**
- Schema: modelo `Declaracion` (declarante→`CaseParty`, `tipoDeclarante`, `tomadaPor`→`User` rel. `DeclaracionTomadaPor`, `hearing?` opcional, `contenido`, `isSigned`/`signedAt`) + enum `TipoDeclarante` (VICTIMA/DENUNCIANTE/AGRESOR/TESTIGO/INTERVINIENTE/NNA); relaciones inversas en `Tenant`/`Case`/`CaseParty`/`User`/`Hearing`. Aplicado con `db push`.
- RBAC: `FAMILY_DECLARATION_AUTHOR_ROLES = ['DIRECTOR']` en `familyApi` (ni FUNCIONARIO ni ADMIN pueden tomarla). Lectura con `FAMILY_WRITE_ROLES` (sin ventanilla/Secretaría).
- API: `GET`/`POST /api/v1/family/cases/[caseId]/declaraciones` (POST solo DIRECTOR, valida que el declarante sea parte del caso y la audiencia sea del caso) y `PATCH /api/v1/family/declaraciones/[id]` (corrige/firma; bloquea edición si ya está firmada). Auditoría `FAMILY_DECLARATION_TAKEN/UPDATED/SIGNED`.
- UI: `DeclaracionesSection` en el expediente (se auto-oculta si el rol no tiene lectura; toma/firma con aviso de exclusividad del Comisario). Labels `TIPO_DECLARANTE_LABELS`.
- Seed: declaración de ejemplo (víctima del CASO 1, firmada por la comisaria) + limpieza idempotente. type-check verde.
- Nota: el seed NO se re-ejecutó (evitar borrar datos demo vigentes); la tabla ya existe vía `db push`.

#### Fase C — Instrumentos de valoración (subsistema)

##### C1.1 — Extensión del motor: puntuación + batería (para el instrumento Res. 0362/2026)
**Estado:** COMPLETADO (motor; transcripción de sub-instrumentos en etapas siguientes)
**Contexto:** el PDF oficial (`docs/documentacion/Guia-...feminicidio...pdf`) revela que el instrumento de Minjusticia es una **batería**: Módulo 1 Caracterización (ítems 1–76), Módulo 2 entrevista semiestructurada, **FIR-R** (suma de "Sí" → bajo 0–10/moderado 11–15/alto 16–22; ítems críticos→alto), **DA-R** (18 ítems ponderados P1=4,P2=3,P3–6=2,P7–17=1,P18 cualitativa; máx 26) y concepto técnico. Ver memoria [[instrumento-riesgo-feminicidio-res0362]].
**Decisiones del usuario:** (1) extender el motor y transcribir por etapas; (2) **incluir el FIR-R** asumiendo que la Res. 0362/2026 lo adopta (anotar el supuesto de IP — derechos del FIR-R son de la Fiscalía); (3) **pre-rellenar** identificación (secciones A/B) desde `Person`/`CaseParty`.
**Alcance C1.1:** extender `Instrumento` (auto-relación `parent`/`subInstrumentos` para batería; `scoringConfig` Json con cortes/criticalToHigh) e `InstrumentoCampo` (`peso` Int, `esCritico` Bool); actualizar tipos del catálogo y el seeder. Las etapas siguientes transcriben DA-R, FIR-R, Caracterización (con pre-fill) y entrevista/concepto.

##### C1 — Catálogo + plantillas estructuradas
**Estado:** COMPLETADO
**Alcance:** modelo `Instrumento` + `InstrumentoCampo` (motor de plantillas, catálogo global por `code`); catálogo de dominio + seeder idempotente (seguro de correr sin tocar datos demo); endpoint de listado. Sembrar ICBF F3.G16.P (psicológica) y F5.G16.P (socio-familiar) con estructura base **marcada como pendiente de validación oficial**; Minjusticia Res.0362/2026 se siembra **inactivo** hasta confirmar su estructura. UI de diligenciamiento va en C2.
**Hecho:**
- Schema: modelos `Instrumento` (catálogo global por `code`: norma, version, `profesion`, `appliesTo`=CaseModality, `assessmentType`, isActive) + `InstrumentoCampo` (seccion, label, `tipo`=CampoTipo, opciones Json, requerido, orden) + enums `ProfesionInstrumento` y `CampoTipo`. `db push` aplicado.
- Catálogo de dominio `src/domain/catalogs/familyInstrumentos.ts` (con aviso explícito de que la estructura de campos es base a validar contra el texto oficial).
- Seeder idempotente `scripts/seed-instrumentos.ts` (upsert por code + resync de campos; no toca datos del tenant). Ejecutado: ICBF_F3G16P (7 campos) y ICBF_F5G16P (10 campos) activos; MINJUSTICIA_RES0362_2026 inactivo, 0 campos.
- API `GET /api/v1/family/instrumentos?profesion=&modalidad=` (solo activos, con campos; RBAC `FAMILY_CONFIDENTIAL_ROLES`). type-check verde.

#### Fase B — Acervo probatorio (pruebas aportadas por las partes)
**Estado:** COMPLETADO
**Alcance:** extender `Document` (`aportanteId`→`CaseParty`; estado probatorio ADMITIDA/RECHAZADA/PENDIENTE + `valoradaPor`/`valoradaAt`; confidencialidad reforzada); RBAC valoración = `DIRECTOR`; UI cargar prueba con aportante + bandeja del comisario para admitir/valorar.
**Hecho:**
- Schema: `Document` gana `aportanteId`→`CaseParty` (rel. `DocumentoAportante`), `isConfidential`, `evidenceStatus` (enum `EvidenceStatus` PENDIENTE/ADMITIDA/RECHAZADA), `evidenceValue`, `valoradaPor`→`User` (rel. `PruebaValoradaPor`), `valoradaAt`. Relaciones inversas en `CaseParty` y `User`. Aplicado con `db push`.
- `DocumentService.uploadDocument`: acepta `aportanteId`/`isConfidential`; una EVIDENCE nace `PENDIENTE`.
- API: `POST cases/[id]/documents` lee y valida `aportanteId` (parte del caso) + `isConfidential`; `GET` ahora incluye aportante/valorador y **filtra las confidenciales** para roles fuera de `FAMILY_CONFIDENTIAL_ROLES` (ventanilla/Secretaría no las ven). Nueva `PATCH /api/v1/family/documents/[id]` para valorar (solo `DIRECTOR`, `FAMILY_EVIDENCE_VALUATION_ROLES`), auditada `FAMILY_EVIDENCE_VALUED`.
- UI: `CaseDocuments` recibe `parties`; al subir EVIDENCE muestra aportante + casilla confidencial; lista con badge de estado, candado confidencial y control `EvidenceValuationControl` (admitir/rechazar con motivación, exclusivo del Comisario).
- Nota: no se sembró evidencia de ejemplo (el seed no crea documentos y un blob ficticio daría 404). type-check verde.

### 37. Seed demo crea municipio + comisarías + Secretaría desde cero
**Estado:** COMPLETADO
**Objetivo:** Cerrar el pendiente menor de la entrada 36: que `seed-demo-gefa.ts` genere la estructura jerárquica (tenant = "Municipio de Guadalajara de Buga", 3 comisarías, rol + usuario de Secretaría de Gobierno, casos y funcionarios asignados a su sede) sin depender del script de migración posterior.
**Hecho:** En `scripts/seed-demo-gefa.ts` — tenant renombrado a "Municipio de Guadalajara de Buga"; rol `SECRETARIA_GOBIERNO` añadido a `roleDefs`; nueva sección "3b. Comisarías" crea CF1/CF2/CF3 (idempotente); `userDefs` gana campo `com` (comisaría) + usuario `secretaria.gobierno@buga.gov.co` (nivel municipio); cada caso nace con `comisariaId` (VIF→CF1, PARD→CF1, CAV→CF2 ⇒ CF1: 2, CF2: 1, CF3: 0); resumen final actualizado. El bucle de usuarios ahora hace upsert del `comisariaId` para que el re-seed reasigne sedes. `migrate-municipio-demo.ts` queda como ruta de migración para BD demo ya sembradas (pre-jerarquía); para entornos nuevos basta el seed. type-check verde.

### 36. Jerarquía Municipio → Comisarías → Secretaría de Gobierno (seguimiento estadístico)
**Estado:** COMPLETADO
**Objetivo:** Modelar que el **tenant es el municipio/administración** con **varias comisarías** (sedes) y una **Secretaría de Gobierno** que hace seguimiento **estadístico** por comisaría (sin acceso a expedientes). Decisión del usuario: tenant = municipio; reconceptualizar CFBUGA → "Municipio de Buga" con 3 comisarías. Fases: (1) modelo `Comisaria` + `comisariaId` en `Case`/`User` (migración aditiva); (2) rol `SECRETARIA_GOBIERNO` (solo estadísticas, bloquea expedientes/valoraciones); (3) tablero de seguimiento con desglose por comisaría + sexo de demandante/demandado (`Person.gender` × `CaseParty.role`) + cumplimiento de medidas; (4) reconceptualizar el tenant demo y repartir datos en 3 comisarías.

**Fase 1 (modelo) — HECHA:** modelo `Comisaria` (sede) + `comisariaId` en `Case` y `User`; migración aditiva aplicada (db push). Relación en `Tenant`.
**Fase 2 (rol) — HECHA:** `FAMILY_STATS_ROLES = ['ADMIN','DIRECTOR','SUPERVISOR','SECRETARIA_GOBIERNO']` en `familyApi`; `family/stats` pasa a ese conjunto. La Secretaría no está en READ/WRITE/CONFIDENTIAL → bloqueada de expedientes.
**Fase 4 (datos demo) — HECHA:** `scripts/migrate-municipio-demo.ts` reconceptualizó CFBUGA → "Municipio de Guadalajara de Buga", creó 3 comisarías (CF1 Primera, CF2 Segunda, CF3 móvil), repartió los 3 casos (CF1: 2, CF2: 1, CF3: 0), asignó funcionarios a sus sedes y creó el rol + usuario `secretaria.gobierno@buga.gov.co` / `Secretaria2026!`.
**Fase 3 (seguimiento) — HECHA:** endpoint `GET /api/v1/family/seguimiento` (por comisaría: registros, casos por estado/modalidad, **sexo de demandante** [DENUNCIANTE/VÍCTIMA × `Person.gender`] y **demandado** [AGRESOR], cumplimiento de medidas) protegido por `FAMILY_STATS_ROLES`; pantalla `/admin/seguimiento` con tarjeta comparativa por comisaría + resumen del municipio. `AdminNav`: item "Seguimiento" y filtro especial para `SECRETARIA_GOBIERNO` (solo seguimiento/estadísticas/reportes, nunca expedientes). Login de la Secretaría → `/admin/seguimiento`.

**Pendiente menor:** actualizar `seed-demo-gefa.ts` para crear la estructura municipio+comisarías desde cero (hoy se logra con el script de migración sobre el demo existente).

### 35. Rebranding visual del tenant: paleta institucional (gov.co/MinTIC), logo y navegación
**Estado:** COMPLETADO

**Hecho:**
- **Paleta institucional (azul gov.co)**: reemplazo de morado/fucsia por azul institucional/ámbar/teal en ~17 archivos (portal, tablero, expediente, hub ciudadano, landing, plantillas de correo, estados de familia, notifications/system): `#7c3aed`→`#1a5fb4`, morados oscuros→`#003d7a`/`#002855`, fondos morado claro→azul claro, fucsia NNA `#be185d`→ámbar `#b45309`, `#8b5cf6`/`#9333ea` y clases `purple-`→teal/cyan. `globals.css` ya tenía base azul (`#003d7a`).
- **Tenant CFBUGA**: `primaryColor`/`secondaryColor` en BD y en el seed → `#003d7a`/`#1a5fb4` (antes morado/cyan). El tenant inyecta estas variables vía `ClientLayout`, así todo el panel/login usa azul.
- **Logo de personería retirado**: `ClientLayout` (header) y `LoginModal` muestran el **nombre de la comisaría** en texto institucional cuando el tenant no tiene logo propio (antes caían a `/logo.png` heredado).
- **Navegación**: `AdminNav` con más separación entre items, **separador vertical** entre grupos (Operación / Dirección) y título "Panel Admin" en azul institucional.

Type-check en verde. Sin morados/fucsia residuales (grep limpio).
**Objetivo:** Aplicar identidad institucional al tenant en todo lo suyo: (a) eliminar el **logo heredado de personería**; (b) cambiar la **paleta** a estándar gov.co/MinTIC (azul institucional), **sin fucsia ni morado** (hoy `#7c3aed`/`#be185d`/`#ede9fe` en portal/tablero/expediente/landing y `primaryColor` del tenant en BD); (c) **barra de navegación** con separación más resaltada. Aplica a login del tenant, panel `/admin`, expediente, portal ciudadano y landing de la entidad.

## 2026-06-09

### 34. Revisar páginas transversales del menú admin (rastros de Ventanilla)
**Estado:** COMPLETADO
**Objetivo:** Las páginas transversales del menú (`/admin/reports`, `/admin/entidad`, `/admin/settings`, `/admin/notifications`, `/admin/system`) son heredadas; revisar y sanear vocabulario/contenido de personería/Ventanilla visible al usuario.

**Hallazgo:** las páginas del menú son **administración genérica** (Entidad/contacto/branding/SMTP, Notificaciones, Sistema, Reportes) que aplica igual a una comisaría — sin contenido de personería. Único rastro real: el placeholder **"Entidad Institucional"**.

**Hecho:**
- Reemplazo "Entidad Institucional" → "Comisaría de Familia" en 6 archivos (incluye `metrics`, `LoginModal`, `registro-entidad`, y los fallbacks/plantillas de `ReportService`, `TemplateService`, `SystemSettingsService` — correos al ciudadano y reportes).
- `auth/login` `X-Redirect-To` → `/admin` (antes `/admin/home`).
- Retirado `/admin/home` (dashboard heredado, duplica el Tablero), con redirect en `next.config.js` → `/admin`. Type-check en verde.

### 33. Gestión documental en el expediente de familia (portar desde /admin/cases)
**Estado:** COMPLETADO
**Objetivo:** El expediente de familia (`/admin/family/[caseId]`) no permite subir/ver documentos; `/admin/cases/[id]` sí (`UploadDocumentForm` + endpoint `cases/[id]/documents`). Portar la gestión documental al expediente de familia (listar + subir, con tipos de comisaría) reutilizando el endpoint existente, para completar el expediente y poder retirar `/admin/cases`.

**Hecho:**
- **`CaseDocuments.tsx` (nuevo)** en `/admin/family/[caseId]`: lista los documentos (GET `cases/[caseId]/documents`) y permite subir (POST FormData, tipos de comisaría DENUNCIA/ACTA/AUTO/VALORACION/OFICIO/CITACION, máx. 25 MB) recargando su propia lista. Reutiliza el endpoint genérico existente (válido para casos de familia; roles ADMIN/DIRECTOR/FUNCIONARIO/VENTANILLA). Insertado en el expediente antes del visor de auditoría.
- **Retirado `/admin/cases`** (UI heredada de Ventanilla): redirect en `next.config.js` → `/admin/family`. El endpoint `/api/v1/cases/[id]/documents` se conserva (lo usa `CaseDocuments`). Sin enlaces ni imports cruzados. Type-check en verde.

**Con esto el panel interno queda sin UI de Ventanilla** (retirados `/home`, `/admin/inbox`, `/admin/solicitudes`, `/admin/cases`) y el expediente de familia es completo (partes, equipo, medidas, PARD, audiencias, valoraciones, documentos, auditoría).

### 32. Tablero de inicio del panel + retiro de páginas heredadas (inbox/cases/solicitudes)
**Estado:** COMPLETADO

**Hecho:**
- **Tablero** (`/admin/page.tsx`, antes vacío): client component que consume `family/stats` y `family/vencimientos`. Muestra KPIs (casos, NNA, medidas vigentes, alertas), casos por estado (barras), por tipo de situación (modalidad) y panel de "requiere atención" (vencimientos). Accesos rápidos a Radicar/Agenda/Vencimientos.
- `AdminNav`: añadido "🏠 Tablero" como primer item con `exact` (para no quedar siempre activo).
- **Login → `/admin`** (Tablero) en `admin/login` y `LoginModal` (antes `/admin/family`).
- **Retiradas** las páginas heredadas `/admin/inbox/*` y `/admin/solicitudes/*` (PQRS), con redirects en `next.config.js` → `/admin/family`. Sin imports cruzados; type-check en verde.
- **`/admin/cases` NO se retira**: el expediente de familia (`/admin/family/[caseId]`) aún no replica la gestión documental que tiene `cases/[id]` (UploadDocumentForm). Queda pendiente portar la subida de documentos a Familia antes de retirar `cases`.
**Objetivo:** Puntos 3 y 4 de la propuesta del panel admin. (3) Crear un **Tablero de inicio** de la comisaría (resumen: casos por estado/modalidad, vencimientos próximos, medidas vigentes, audiencias) y que el login caiga ahí. (4) Retirar/redirigir las páginas heredadas de Ventanilla (`/admin/inbox`, `/admin/cases`, `/admin/solicitudes`) hacia el módulo de comisaría, como se hizo con `/home`.

### 30. Fix: error server-side en /atencion-ciudadano/consultar (portal consolidado)
**Estado:** NO REPRODUCIBLE — probable deploy stale
**Diagnóstico:** `npm run build` compila limpio (los "Dynamic server usage" son benignos, rutas API con cookies). Reproducción local con `next start`: `/atencion-ciudadano/consultar` y la landing devuelven **HTTP 200 sin errores**, tanto con `tenant=null` (localhost) como simulando `Host: gefa-cfbuga.vercel.app` (tenant CFBUGA). El código está correcto. `prisma.ts` usa `PrismaClient` estándar (sin adaptador Neon serverless), pero Prisma funciona en Vercel (el panel carga). **Conclusión:** el error que se vio en Vercel corresponde casi seguro a un deploy desactualizado al momento de añadir el dominio (la versión previa de `consultar` era la de Ventanilla). Pendiente: retest en el deploy actual; si persiste, capturar el log de la función (digest 2438100093). Mejora futura sugerida: adaptador `@prisma/adapter-neon` para robustez en serverless.
**Objetivo:** En el deploy de Vercel (`gefa-cfbuga.vercel.app/atencion-ciudadano/consultar`) aparece "Application error: a server-side exception has occurred" (digest 2438100093). La ruta renderiza `<ComisariaPortal initialTab="consultar"/>`. Sin accesos inseguros evidentes en el portal; falta el log de Vercel para el digest. Se retoma tras #31.

### 31. Panel del administrador del tenant: menú de comisaría y login a Casos de Familia
**Estado:** COMPLETADO — `AdminNav` reorganizado a comisaría (operación Familia + dirección), retirados items de Ventanilla (inbox/cases/supervisión/SLA/métricas); login (`admin/login` + `LoginModal`) → `/admin/family`; `admin/login` admite DIRECTOR/VENTANILLA/ASIGNACION; enlaces "volver" → `/admin/family`. Type-check en verde. (Las páginas transversales del menú —reportes, entidad, settings, notificaciones, sistema— siguen siendo heredadas; pueden tener rastros de Ventanilla por revisar.)
**Objetivo:** El panel `/admin` mezcla módulos de comisaría (`/admin/family/*`) con heredados de Ventanilla (inbox/cases/solicitudes), y el login cae en `/admin/inbox` (bandeja PQRS). Reorganizar `AdminNav` para mostrar el menú de comisaría (Casos de Familia, Radicar, Agenda, Vencimientos, Estadísticas + dirección: Equipo, Reportes, Entidad, Configuración…) y quitar los items de Ventanilla; y redirigir el login (admin/login + LoginModal) a `/admin/family`.

### 29. Ejecutar Fase A del refactor: unificar login y navegación en /admin
**Estado:** COMPLETADO

**Hecho:**
- `LoginModal.tsx`: ambos handlers redirigen a `/admin/inbox` (antes a `/home`/`/home/bandeja-entrada` por nivel). SUPER_ADMIN sigue a `/super-admin`.
- `ClientLayout.tsx`: enlaces "ir al panel" → `/admin/inbox`; `isDashboard` detecta `/admin` (antes `/home`).
- `admin/cargos`, `admin/usuarios`, `admin/solicitudes/[id]`: botones de volver → `/admin/inbox`.
- `next.config.js`: `redirects()` de compatibilidad `/home/*` → equivalente en `/admin` (casos→cases, cargos→cargos, usuarios/registro→usuarios, configuracion-entidad→entidad, editor-landing→settings, resto→inbox).
- **Retirado el panel Ventanilla**: borrado `src/app/home/*` (sin imports cruzados ni producción). `npm run type-check` en verde (tras limpiar cache `.next/types/app/home`).

**Siguiente:** Fase C (retiro de `general-request`/`contact`, limpieza de `CaseTypes.ts` y textos/correos) y Fase B (migración del enum `DocumentType`).

**Fase C.1 (hecha):** retirados los endpoints muertos `cases/general-request` y `api/v1/contact` (sin llamadas vivas) y el script `test-general-request.js`. `npm run type-check` en verde.

**Fase C.2 (hecha):** eliminado `src/domain/types/CaseTypes.ts` (enums de personería DERECHO_PETICION/TUTELA/QUEJA/PQRS + ROLE_PERMISSIONS/LEGAL_TERMS). Era importado solo por `CaseService`, y solo como tipos (nadie usaba los valores). `CaseService` se desacopló: `caseTypeCode`/`stateCode`→`string`, `priority`→`number` (los codes ya son dinámicos de la BD). Type-check en verde.

**Fase C.3 (hecha):** saneado el aviso de escalamiento al ciudadano en `EmailService` — fuera "proceso disciplinario (Art. 115 Ley 1952/2019)" y "derecho de petición (Ley 1712/2014)"; ahora lenguaje de comisaría con reserva por protección de datos sensibles (Ley 1581/2012 + Ley 1098/2006). Se conservan los códigos de razón para no romper el flujo.

**Fase B (hecha):** migración **aditiva** del enum `DocumentType` en el schema — añadidos `DENUNCIA`, `ACTA`, `AUTO`, `VALORACION`, `OFICIO`, `CITACION` conservando los valores heredados (compatibilidad). Aplicado a la BD demo con `prisma db push` (aditivo, sin pérdida de datos; en producción real se usaría el fan-out `migrate-tenant-dbs.js`). `UploadDocumentForm` ahora ofrece los tipos de comisaría. La contracción (retiro de los valores legacy) queda diferida y opcional. Type-check en verde.

**Con esto el refactor del plan (Fases A, B, C) queda ejecutado.** El sistema quedó con un solo panel (comisaría `/admin/*`), sin panel ni endpoints ni tipos de personería, y con catálogo de documentos de comisaría. Sin tenants en producción, el riesgo fue mínimo.
**Objetivo:** Ejecutar la Fase A del `PLAN_REFACTOR_COMISARIA.md` (aprobado; sin tenants en producción). Unificar el login en el panel de comisaría `/admin/*`: `LoginModal` y enlaces internos dejan de apuntar a `/home` (Ventanilla) y van a `/admin/inbox`; las rutas `/home/*` se redirigen a su equivalente en `/admin` (compatibilidad) para luego retirarse.

### 28. Preparar el plan de la fase mayor: migración de enums + unificación de login
**Estado:** COMPLETADO — plan entregado en `docs/documentacion/PLAN_REFACTOR_COMISARIA.md` (pendiente aprobación para ejecutar)
**Objetivo:** A pedido del usuario, NO ejecutar aún el refactor mayor sino **preparar el plan**: (a) unificar el login y la navegación en el panel de comisaría `/admin/*` retirando el panel Ventanilla `/home/*`; (b) migrar los enums de personería del schema (DocumentType, etc.) a valores de comisaría en todas las BD de tenants (multitenant). Investigar los dos flujos de login, el mapeo `/home`↔`/admin`, los enums afectados y la mecánica de migración existente; entregar un plan por fases con riesgos y rollback.

### 27. Sanear rastros de personería en el panel interno y el núcleo (post-cara pública)
**Estado:** EN CURSO
**Objetivo:** Aplicar el principio "GEFA es comisaría, no personería" al resto del sistema (panel interno y núcleo), no solo a la cara pública (#26). Auditoría hecha: hay un panel Ventanilla heredado (`/home/*`, bandeja PQRS) coexistiendo con el de comisaría (`/admin/*`), más tipos de personería en `CaseTypes.ts` y endpoints `general-request`/`contact`. Ejecutar por fases verificables (type-check + commit por fase), de menor a mayor riesgo, reescribiendo o retirando con reemplazo de comisaría — sin ocultar. Primer paso: verificar qué del panel Ventanilla está vivo vs muerto para retirar con seguridad.

**Avance y hallazgo (límite técnico):**
- Hecho seguro: etiquetas del catálogo de tipos de documento en `admin/cases/[id]/UploadDocumentForm.tsx` → dominio de comisaría (sin tocar el enum del schema).
- Hallazgo que frena el saneamiento profundo: (1) el panel Ventanilla `/home/*` **está vivo** (login vía `LoginModal`/`ClientLayout` redirige ahí) — retirarlo es un refactor de login/navegación; (2) los catálogos como `DocumentType` son **enums del schema Prisma** y cambiar sus valores exige **migración multitenant** (BD por tenant) → alto riesgo. Lo seguro sin migrar es cambiar etiquetas/textos visibles conservando los `value`.
- **Recomendación:** el saneamiento profundo (retirar `/home`, migrar enums, unificar login en `/admin`) es un refactor mayor que conviene hacer con entorno de pruebas y por fases, no a ciegas sobre producción. Lo visible (labels/textos/correos) sí se puede seguir saneando de forma segura.

### 26. Reconstruir la cara pública del ciudadano según el flujo REAL de comisaría de familia
**Estado:** COMPLETADO
**Objetivo:** Corregir el rumbo de la entrada #25. En vez de **ocultar/redirigir** el flujo ciudadano heredado de personería (PQRS/tutelas), reconstruirlo correctamente para una **comisaría de familia**. Premisa del usuario: los componentes técnicos se reutilizan, pero el **flujo de negocio** de una comisaría (denuncia de violencia → medida de protección → conciliación/audiencia → PARD → seguimiento) NO es el de una personería (PQRS/derecho de petición/tutela). Pasos: (1) revertir el código de la entrada #25 (los redirects); (2) investigar el flujo documentado de comisaría; (3) rediseñar la cara pública (radicar/consultar/seguimiento) con vocabulario de comisaría y datos reales del tenant, sobre la infraestructura heredada; (4) consolidar en un solo flujo (sin duplicar con `/comisaria-en-linea`).

**Investigación:** `plan-plataforma-gestion-familiar.md` define el flujo de comisaría (denuncia/medida/PARD/conciliación/seguimiento) y el portal ciudadano "crea casos en estado preliminar para revisión". Confirmado que el problema era solo la **cara pública** heredada con vocabulario PQRS de personería (petición/queja/tutela) y datos ficticios ("Entidad Institucional", "Carrera 10 #10-10"), idéntica en todos los tenants.

**Resolución (reescribir y consolidar, no ocultar):**
- **Reescritas a comisaría con datos dinámicos del tenant:** `atencion-ciudadano` (hub: radicar/consultar + líneas de emergencia 155/123/122/141 ICBF + sede del tenant), `privacidad` (habeas data de comisaría, Ley 1581/2012 + Ley 1098/2006, datos sensibles de víctimas/NNA) y `atencion-ciudadano/contacto` (datos del tenant + CTA al portal).
- **Consolidación del motor (sin duplicar, sin redirect):** el portal se extrajo a un componente reutilizable `comisaria-en-linea/ComisariaPortal.tsx` con prop `initialTab`. Lo renderizan: `comisaria-en-linea/page.tsx`, `atencion-ciudadano/solicitud` (reemplaza el formulario PQRS de 1194 líneas) y `atencion-ciudadano/consultar` (reemplaza la consulta heredada de Ventanilla). Un solo flujo ciudadano de comisaría en todas las URLs.
- **Landing del tenant:** botones "Radicar denuncia o solicitud" / "Consultar mi caso" → portal.

**Resultado:** sin contenido de personería en la cara pública (grep limpio), sin flujos duplicados, datos reales del tenant. `npm run type-check` en verde. El backend heredado (casos, emails, estados) se conserva intacto.

### 25. Branding/contenido por defecto del tenant: quitar herencia de personería
**Estado:** COMPLETADO (flujo ciudadano; quedan 2 páginas informativas pendientes)
**Objetivo:** El contenido por defecto que ve un tenant (landing de entidad: servicios, subtítulo hero, CTA, etc.) se hereda de `ventanilla_unica_base` (personería: tutelas, derechos de petición…). Es crítico porque cada tenant nuevo nace con ese branding ajeno. Reescribir los defaults a GEFA / comisaría de familia (o neutralizarlos) para que un tenant recién creado muestre contenido propio del dominio de familia.

**Diagnóstico:** `landingDefaults.ts` (catálogo de servicios) y `la-entidad`/`servicios` ya estaban adaptados a comisaría de familia. El branding de personería estaba en el **flujo ciudadano heredado** (`atencion-ciudadano/*`), hardcodeado e idéntico para todos los tenants: términos PQRS (Derechos de Petición, Tutelas, Quejas Disciplinarias), vocabulario "petición/queja/reclamo" y datos ficticios ("Entidad Institucional", "Carrera 10 #10-10", `contacto@entidadciudad.gov.co`). Ese flujo además se solapaba con el portal nuevo `/comisaria-en-linea` (Fase 7).

**Decisión del usuario:** **unificar en el portal GEFA** — apuntar los accesos ciudadanos al portal y retirar/redirigir las páginas PQRS heredadas redundantes.

**Implementación:**
- **`src/app/page.tsx`** (landing del tenant): los botones del hero "Radicar Solicitud" → `/comisaria-en-linea` y "Consultar Solicitud" → `/comisaria-en-linea?tab=consultar` (antes apuntaban a `/atencion-ciudadano/solicitud` y `/consultar`).
- **`src/app/comisaria-en-linea/page.tsx`**: ahora también abre la pestaña de consulta con `?tab=consultar` (además del `?radicado=` ya existente).
- **`src/app/atencion-ciudadano/page.tsx`** y **`.../solicitud/page.tsx`**: reemplazadas por un `redirect('/comisaria-en-linea')` (se retira el hub PQRS y el formulario PQRS de 1194 líneas; la ruta se conserva para no romper enlaces antiguos). Los servicios del catálogo que apuntaban a `/atencion-ciudadano/solicitud` quedan cubiertos por el redirect.

**No tocado a propósito (bajo riesgo):** `/atencion-ciudadano/consultar` se conserva intacta porque es destino de enlaces en correos del flujo heredado (Ventanilla) y soporta respuestas del ciudadano; el backend heredado sigue operando.

**Pendiente (informativas/legales, no son flujo PQRS):** `atencion-ciudadano/contacto` y `privacidad` aún tienen datos ficticios y vocabulario "petición/tutela". Opción futura: hacerlas dinámicas con los datos del tenant o redirigirlas. `npm run type-check` en verde.

### 24. Asignar dominio al tenant demo para probar la landing de entidad en Vercel
**Estado:** COMPLETADO
**Objetivo:** Que el host del preview resuelva a la comisaría demo (CFBUGA) y se vea su landing de entidad, no la del producto. El usuario eligió la vía de subdominio. Como `*.vercel.app` no admite sub-subdominios (`cfbuga.gefa-black.vercel.app` no es válido), se usa un alias `*.vercel.app` de primer nivel: `gefa-cfbuga.vercel.app`. Acción de datos: fijar `Tenant.domain` del tenant demo a ese host (el alias debe añadirse luego en Vercel → Project → Domains).

**Hecho:** `Tenant.domain` de CFBUGA cambiado de `cf-buga.gov.co` → `gefa-cfbuga.vercel.app` en la BD; `scripts/seed-demo-gefa.ts` actualizado para crear con ese dominio. `resolveTenantByHost` hace lookup por `domain` exacto, así que en cuanto el host `gefa-cfbuga.vercel.app` llegue a la app, resolverá a CFBUGA y mostrará su landing de entidad (con "Radicar Solicitud" / "Consultar Solicitud"). **Pendiente manual del usuario:** añadir el dominio `gefa-cfbuga.vercel.app` en Vercel → Project → Settings → Domains (no requiere DNS por ser `*.vercel.app`).

### 23. Página raíz del SaaS: landing informativa de GEFA en vez del login
**Estado:** COMPLETADO
**Objetivo:** En el dominio raíz del SaaS (p. ej. `gefa-black.vercel.app`), que no pertenece a ninguna comisaría, `resolveTenantByHost` devuelve null y la raíz mostraba directamente el `SuperAdminLogin`. Lo lógico es una página informativa del producto. Decisión del usuario: (a) mostrar una **landing del producto GEFA** (qué es, para comisarías de familia, características) con accesos discretos a "Acceso institucional" y "Registrar entidad"; (b) mover el login del super-admin a una ruta propia enlazada de forma discreta desde la landing. No se toca el comportamiento cuando sí hay tenant (sigue mostrando la landing de la entidad).

**Implementación:**
- **`src/app/components/GefaLanding.tsx` (nuevo):** landing del producto (server component, estilos inline + lucide-react) — barra superior con "Acceso institucional", hero, 6 características (expediente digital, medidas de protección, PARD, equipo interdisciplinario, notificaciones/analítica, trazabilidad/auditoría), bloque de marco normativo (Leyes 1098/2006, 294/1996, 1257/2008, 2126/2021, 1581/2012) y footer. CTAs: "Registrar entidad" → `/registro-entidad`, "Acceso institucional" → `/acceso`.
- **`src/app/acceso/page.tsx` (nuevo):** ruta propia que renderiza el `SuperAdminLogin` (el login del control plane sale de la raíz). El flujo de login no cambia (POST `/api/v1/auth/login`, redirige a `/super-admin`).
- **`src/app/page.tsx`:** el fallback `if (!tenant)` ahora devuelve `<GefaLanding />` en lugar de `<SuperAdminLogin />`.

**Verificación:** `npm run type-check` en verde. Nota operativa: para ver en el preview de Vercel la *landing de entidad* (no la del producto), el dominio debe resolver a un tenant — configurar `DEFAULT_TENANT_SIGLA` o registrar el dominio/subdominio en el `Tenant` (p. ej. `cfbuga.gefa-black.vercel.app`).

### 22. Rebranding de UI: reemplazar referencias a "Ventanilla Única" por GEFA
**Estado:** COMPLETADO
**Objetivo:** El producto ya es GEFA (gestión de comisarías de familia), pero quedan textos fijos heredados que dicen "Ventanilla Única" / "Sistema de Ventanilla Única" en etiquetas visibles (títulos, metadatos, encabezados, mensajes de UI). Cambiar esas referencias de marca a GEFA. NO tocar el rol funcional `VENTANILLA_UNICA` (recepción/mostrador) ni identificadores de código que romperían RBAC/seed; solo el texto de marca visible al usuario.

**Decisión de alcance (confirmada con el usuario):** se cambia **solo la marca del producto** y el texto a usar es **"GEFA — Gestión Familiar"**. Se deja intacto el **rol/cargo de mostrador** "Ventanilla Única" (es un cargo legítimo de recepción), incluido su código `VENTANILLA_UNICA`, su label visible y su provisioning.

**Implementación:** reemplazo por **frases de marca** (no la palabra suelta) para no afectar el rol — script temporal `scripts/_rebrand.js` (creado y borrado tras usarse) que aplicó, en orden de más larga a más corta y en UTF-8: `Sistema de Ventanilla Única Digital`, `Sistema de Ventanilla Única`, `Sistema Ventanilla Única`, `plataforma Ventanilla Única`, `Ventanilla Única Digital` → `GEFA — Gestión Familiar`. **39 archivos** modificados (metadatos `@author`, `fromName`/pies de `EmailService` y `TemplateService`, footer de reportes en `ReportService`, fallbacks `tenant?.name || 'Ventanilla Única Digital'` en endpoints de email, login del super-admin, `constants.NAME`, `DashboardHeader`, etc.).
**Ajustes manuales (4) de marca con redacción distinta:** `app/layout.tsx` (title del navegador → `${tenant.name} · GEFA — Gestión Familiar` y description), `notifications/test` (asunto de email de prueba), `TemplateService` ("mensaje automático del sistema GEFA — Gestión Familiar") y `EmailService:905` (gramática: "a través de la **plataforma** GEFA — Gestión Familiar").

**Verificación:** `npm run type-check` en verde. Las 19 referencias que quedan a "Ventanilla Única" son todas del **rol/cargo** (definición del rol, notificaciones al usuario de ventanilla, labels, comentarios de lógica) — ninguna es marca de producto.

### 21. Datos de ejemplo: superadmin del SaaS, tenant demo y sus usuarios/casos
**Estado:** COMPLETADO
**Objetivo:** Dejar el entorno listo para probar: crear (a) las credenciales del superadmin del control plane, (b) un tenant de ejemplo (comisaría) con su configuración, usuarios por rol y catálogos, y (c) algunos casos/expedientes de familia con información de muestra para ver el sistema funcionando de extremo a extremo.

**Implementación — `scripts/seed-demo-gefa.ts` (nuevo, idempotente):** se ejecutó contra la BD apuntada por `DATABASE_URL`. Crea/asegura:
- **SUPER_ADMIN (control plane):** `superadmin@system.local` / `superadmin123` (rol global `SUPER_ADMIN`, `tenantId` null).
- **Tenant demo:** *Comisaría de Familia de Guadalajara de Buga* (`CFBUGA`, dominio `cf-buga.gov.co`) con `TenantSettings`. `databaseUrl` null → opera en la BD global (modo desarrollo; el patrón `dbUrl ? getTenantPrisma : mainPrisma` lo resuelve a la principal).
- **Roles del tenant:** `ADMIN`, `DIRECTOR` (Comisario/a — único con acceso al visor de auditoría), `FUNCIONARIO` (equipo interdisciplinario), `VENTANILLA_UNICA`.
- **Usuarios:** admin / comisaria / psicologa / trabajo.social / abogada / ventanilla `@cfbuga.gov.co` (credenciales en el resumen del script).
- **Catálogos:** 7 estados de familia (globales) + 7 tipos de caso `{code}_CFBUGA`.
- **3 expedientes** con partes, equipo, historial y auditoría: `CFBUGA-2026-000001` VIF (medida de protección vigente + valoración de riesgo ALTO confidencial + audiencia de descargos), `CFBUGA-2026-000002` PARD de NNA (proceso de restablecimiento en seguimiento + 2 valoraciones confidenciales), `CFBUGA-2026-000003` CAV (radicado por el portal ciudadano, audiencia de conciliación programada).
- **22 registros de `ActionLog` encadenados** con el mismo SHA-256 de `computeAuditChecksum` — verificado: `chainIntact = true`, 0 filas alteradas; el visor de la Fase 8 los mostrará como cadena íntegra.

**Verificación:** conteos OK (3 casos, 7 personas, 3 valoraciones confidenciales, etc.) e integridad de la cadena revalidada con el algoritmo del visor. Re-ejecutable: limpia solo los datos de dominio del tenant demo antes de resembrar.

### 20. Fase 8 — Cierre: visor de auditoría por caso en el panel admin
**Estado:** COMPLETADO
**Objetivo:** Completar lo que resta de la Fase 8 (hardening). El `ActionLog` encadenado por checksum (entrada #18) ya se escribe en cada acción de familia, pero no hay forma de consultarlo desde la UI. Crear un visor de trazabilidad por expediente: endpoint admin protegido por RBAC que lea el `ActionLog` del caso y una vista en el panel admin que muestre el historial inmutable (quién, qué, cuándo, IP), con verificación de integridad de la cadena de hashes.

**Implementación:**
- **`src/lib/familyApi.ts`:** (a) nuevo conjunto **`FAMILY_AUDIT_ROLES = ['ADMIN', 'DIRECTOR']`** — el visor expone IPs y accesos a datos confidenciales, así que es de control interno (dirección/administración), no del funcionario que opera el caso (revisión final de RBAC). (b) Extraído **`computeAuditChecksum()`** como fuente única de verdad del encadenado SHA-256; `auditFamily()` se refactorizó para usarlo, de modo que la escritura y el verificador no diverjan.
- **`src/app/api/v1/family/cases/[caseId]/audit/route.ts` (GET, nuevo):** protegido por `FAMILY_AUDIT_ROLES`, valida pertenencia del caso al tenant (`findCaseInTenant`). Lee el `ActionLog` del caso (orden desc) y **re-verifica la integridad de cada fila** recalculando su checksum con `computeAuditChecksum`; marca `integrityValid` por entrada y devuelve un `summary` (`total`, `tampered`, `chainIntact`). Expone quién/qué/cuándo/IP/rol; no devuelve `before`/`after` (podrían contener PII).
- **`src/app/admin/family/[caseId]/ExpedienteActions.tsx`:** nuevo componente **`AuditSection`** — hace su propio fetch y **se auto-oculta** si el endpoint responde 401/403 (el patrón de `assessmentsDenied`), de modo que solo dirección/administración ve la sección. Muestra el badge de integridad de la cadena, etiquetas legibles por acción (mapa `AUDIT_ACTION_LABELS`, incl. "Acceso a valoración (confidencial)") y un borde rojo + aviso "⚠ alterado" en filas cuyo checksum no cuadre.
- **`src/app/admin/family/[caseId]/page.tsx`:** se renderiza `<AuditSection>` al cierre del expediente.

**Decisión:** el visor es solo lectura y **no auto-audita** su propia consulta, para no contaminar la cadena del caso con entradas recursivas de cada apertura del panel. `npm run type-check` en verde.

**Con esto la Fase 8 queda cerrada** (auditoría escrita + anonimización + visor de trazabilidad + RBAC del visor). Pendiente futuro/operativo: pruebas de carga.

### 19. Fase 7 — Portal ciudadano ("Comisaría en línea")
**Estado:** COMPLETADO
**Objetivo:** Portal público por tenant: (a) **radicación en línea** de una solicitud/denuncia por la ciudadanía (sin autenticación, rate-limited, tenant por host) que crea el caso en estado inicial para revisión del personal; (b) **consulta de estado** del caso por número de radicado + documento del denunciante, devolviendo solo información no sensible (estado y fechas, sin datos de víctimas/NNA/agresor). Reutiliza la resolución de tenant y el rate limit heredados.

**Implementación:**
- **`src/app/api/v1/family/public/intake/route.ts` (POST, nuevo):** radicación en línea sin auth. Rate limit `FORM_SUBMISSION`, tenant por host (`getTenantFromRequest` → `getTenantPrisma`), rechaza tenant inactivo. En una transacción crea/reusa `Person` (denunciante, con `dataConsent`) y su `Citizen` espejo (FK requerido por `Case`), crea el `Case` en estado inicial (`channel='WEB'`, `priority=40`, `metadata.origen='portal_ciudadano'`, `requiereRevision=true`), la `CaseParty` (`VICTIMA` si `esVictima`, si no `DENUNCIANTE`) y el `CaseStateHistory` inicial. Calcula `dueDate` con `LegalTermsCalculator` y la modalidad con `CASE_TYPE_MODALITY`. Devuelve el número de radicado como comprobante. Todas las entradas pasan por `sanitizeString`.
- **`src/app/api/v1/family/public/status/route.ts` (GET, nuevo):** consulta de estado con **doble factor** (radicado + documento del denunciante). Si el host no resuelve tenant, lo infiere por la sigla del radicado. Respuesta **uniforme** ante "no existe" y "documento no coincide" (404) para no revelar la existencia de un radicado a quien no acredita ser el denunciante. Expone **solo info no sensible**: estado, tipo, asunto, fechas de radicado/vencimiento y una línea de tiempo de **estados** (nombre/color/fecha) — **sin comentarios del expediente** (podrían contener PII de víctimas/NNA/agresor). Rate limit `QUERY`.
- **`src/app/comisaria-en-linea/page.tsx` (nuevo):** portal público (client component) con dos pestañas — *Radicar solicitud* (formulario con datos del denunciante, tipo de caso, asunto y descripción; aviso de línea de emergencia 123/155; autorización de tratamiento de datos Ley 1581/2012; comprobante con el radicado y botón de copiar) y *Consultar estado* (radicado + documento → tarjeta con estado actual y seguimiento). Pre-llena la consulta desde `?radicado=`.

**Diseño de privacidad (Ley 1581/2012, Ley 1098/2006):** se creó un endpoint nuevo en vez de reutilizar `cases/public/status` (dominio de petición de Ventanilla, que expone historial y nombres). El de familia exige doble factor, oculta toda PII y solo muestra la progresión de estados. Tipos ofrecidos a la ciudadanía: VIF, MP, CAV, CF, PNNA (los de oficio como PARD los abre la autoridad). Ruta y endpoints quedan fuera del matcher de auth del middleware (solo protege `/admin` y `/super-admin`). `npm run type-check` en verde.

**Con esto la Fase 7 queda cubierta.** Pendiente menor de Fase 8: visor de auditoría por caso en el panel admin y revisión final de RBAC.

### 18. Fase 8 — Hardening: auditoría de acciones de familia y acceso a datos sensibles
**Estado:** COMPLETADO
**Objetivo:** Cumplimiento Ley 1581/2012 y Ley 1098/2006: registrar en log inmutable las acciones sobre el dominio de familia, incl. acceso a valoraciones.

**Hallazgo:** el `AuditService` heredado escribe en el **prisma global**, no en la BD del tenant — contradice el principio de aislamiento del plan ("AuditLog append-only en cada tenant"). Además su tipo `AuditAction` es un union cerrado sin acciones de familia.
**Solución — `auditFamily()` en `src/lib/familyApi.ts` (nuevo):** escribe el `ActionLog` en la **BD del tenant** (`auth.db`) con encadenado de checksum SHA-256 (previousHash → GENESIS_BLOCK), capturando IP y user-agent (`getClientIp`/`getUserAgent`). Best-effort: nunca lanza ni interrumpe el request.

**Acciones auditadas (14 puntos de escritura + acceso confidencial):**
- `Person`: `FAMILY_PERSON_CREATED`, `FAMILY_PERSON_UPDATED`.
- `Case`: `FAMILY_CASE_CREATED` (radicación), `FAMILY_CASE_STATE_CHANGED` (transición/reapertura).
- `CaseParty`: `FAMILY_PARTY_ADDED`, `FAMILY_PARTY_REMOVED`.
- `ProtectionMeasure`: `FAMILY_MEASURE_ISSUED`, `FAMILY_MEASURE_UPDATED`.
- `RestorationProcess`: `FAMILY_PARD_OPENED`, `FAMILY_PARD_UPDATED`.
- `Hearing`: `FAMILY_HEARING_SCHEDULED`, `FAMILY_HEARING_UPDATED`.
- `Assignment`: `FAMILY_TEAM_ASSIGNED`, `FAMILY_TEAM_REMOVED`.
- **`Assessment` (confidencial):** `FAMILY_ASSESSMENT_CREATED`, `FAMILY_ASSESSMENT_UPDATED` y **`FAMILY_ASSESSMENT_ACCESSED`** en cada lectura (lista e individual) — deja rastro de quién consulta datos sensibles de NNA/víctimas.

**Anonimización confirmada:** `GET /api/v1/family/stats` (y la pantalla) devuelven solo conteos agregados y nombres de estados/modalidades/profesionales — ninguna PII de víctimas/NNA. Los reportes agregados cumplen el requisito de anonimización (Ley 1098/2006).
**Verificación:** `type-check` OK; `build` OK.

### 17. Fase 6 — Dashboard analítico de comisaría (estadísticas con cruce de variables)
**Estado:** COMPLETADO
**Objetivo:** Tablero estadístico por comisaría para política pública.

**`GET /api/v1/family/stats` (nuevo):** agregados tenant-scoped con `groupBy` — total de casos, total de NNA, casos por modalidad, por estado (con nombre/color), **cruce por tipo de violencia** (desnormaliza el array `violenceTypes`), medidas por estado, partes por rol y carga por profesional (asignaciones por usuario, ordenado desc). Roles `FAMILY_READ_ROLES`.
**Pantalla `admin/family/stats/page.tsx` (nueva):** tarjetas de totales + gráficos de barras simples (sin librería) por cada dimensión, con etiquetas legibles, y **exportación CSV**. Botón "Estadísticas" añadido en el encabezado del listado.
**Verificación:** `type-check` OK; `build` OK.
**Con esto la Fase 6 queda cubierta** (notificaciones + analítica). Pendiente futuro: reportes PDF y portal ciudadano (Fase 7).

### 16. Fase 6 — Notificaciones desde el cron (vencimientos y recordatorios de audiencia)
**Estado:** COMPLETADO
**Objetivo:** Cablear notificaciones reales desde el cron diario.

**`src/lib/familyNotifications.ts` (nuevo):** `sendVencimientoNotifications(db, tenantId)` reúne medidas vencidas/por vencer, PARD atrasados y audiencias próximas (48 h), resuelve los **profesionales asignados** a esos casos (Fase 5) y envía **un correo-resumen (digest) por profesional** con `EmailService.sendEmail` (best-effort; los fallos no abortan el job). Devuelve el número de correos enviados.
**Cron — `/api/cron/family-vencimientos`:** tras marcar vencidas, invoca el envío de notificaciones por tenant y añade `notified` al resumen. El error de notificación se captura sin interrumpir el fan-out.
**Verificación:** `type-check` OK. (Requiere SMTP configurado en Vercel para envío real; si falta, `sendEmail` retorna false sin romper el job.)

### 15. Fase 5 — Equipo interdisciplinario y agenda
**Estado:** COMPLETADO
**Objetivo:** Fase 5 del roadmap: asignación de casos de familia al equipo + agenda de audiencias.

**Asignación al equipo (reutiliza el modelo `Assignment`):**
- `GET/POST /api/v1/family/cases/[caseId]/assignments` — lista/asigna profesionales (valida usuario activo del tenant, 409 si ya asignado, `status: ACCEPTED`, `assignedBy` = usuario actual). `DELETE .../[assignmentId]` retira al profesional. Roles `FAMILY_WRITE_ROLES` para modificar, `FAMILY_READ_ROLES` para ver.
- UI: componente autónomo `TeamSection` en `ExpedienteActions.tsx` (lista miembros + alta con dropdown de `GET /api/v1/users` + retiro), insertado en el expediente tras las Partes.

**Agenda de audiencias:**
- `GET /api/v1/family/agenda?from&to&mine` — audiencias del tenant en rango (por defecto próximos 30 días), opción `mine=true` (las que preside el usuario), con caso y quien preside.
- Pantalla `admin/family/agenda/page.tsx` — vista agrupada por día, hora destacada, estado (programada/celebrada), enlace al expediente, filtro "solo las que presido". Botón "Agenda" añadido en el encabezado del listado.

**Verificación:** `type-check` OK; `build` OK (endpoints y páginas en el manifiesto).
**Nota:** con la asignación al equipo ya hay destinatarios para notificaciones de vencimiento/recordatorio (Fase 6).

### 14. Fase 4 — Alertas de vencimiento (cron) y dashboard de vencimientos
**Estado:** COMPLETADO
**Objetivo:** Cerrar la Fase 4 con el control de términos: job (Vercel Cron) + dashboard por comisaría + pantalla de vencimientos.

**Lógica compartida — `src/lib/familyVencimientos.ts` (nuevo):** `markExpiredMeasures()` marca como `VENCIDA` toda medida `VIGENTE` con `expiresAt` pasado; `computeVencimientos()` devuelve medidas vencidas, medidas próximas a vencer (≤ 5 días) y PARD atrasados (no `CIERRE` con `nextFollowUpAt` pasado o `openedAt` > 120 días ≈ término Art. 100 Ley 1098/2006). Constantes `MEASURE_WARNING_DAYS` y `PARD_TERM_DAYS`.

**Cron — `POST/GET /api/cron/family-vencimientos` (nuevo):** fan-out sobre `tenant.findMany({ isActive })`; para cada tenant usa su BD propia (`getTenantPrisma`) o el control plane como fallback, marca vencidas y arma un resumen por tenant. Protegido con `CRON_SECRET` (exige `Authorization: Bearer <secret>` si la variable existe). `maxDuration = 60`.

**Programación — `vercel.json` (nuevo):** cron diario `0 7 * * *` → `/api/cron/family-vencimientos`. `CRON_SECRET` generado y cargado por **Vercel CLI** en Production y Development.

**Dashboard — `GET /api/v1/family/vencimientos` (nuevo):** versión por comisaría (tenant del usuario, `FAMILY_READ_ROLES`) con las 3 listas + conteos.

**Pantalla — `admin/family/vencimientos/page.tsx` (nueva):** tarjetas de medidas vencidas (rojo), próximas a vencer (ámbar) y PARD atrasados (morado), con enlace al expediente. Botón "Vencimientos" añadido en el encabezado del listado de casos.
**Verificación:** `type-check` OK; `build` OK (cron, API y página en el manifiesto).
**Con esto la Fase 4 queda cubierta.** Pendiente futuro: envío real de notificaciones (email/SMS) a funcionarios cuando exista asignación de casos al equipo (Fase 5).

### 13. Fase 4 — Medidas de protección, PARD y audiencias: acciones en el expediente
**Estado:** COMPLETADO
**Objetivo:** Según el roadmap de `plan-plataforma-gestion-familiar.md`, la Fase 4 es el corazón legal de la comisaría. Las APIs ya existían (Módulo 2) pero el expediente solo mostraba datos; se cablearon las acciones operativas desde la UI.

**Componentes — `src/app/admin/family/[caseId]/ExpedienteActions.tsx` (nuevo):** formularios cliente colapsables que consumen los endpoints `/api/v1/family/*`:
- `AddMeasureForm` — emite medida (tipo, fundamento legal, vencimiento, descripción) → `POST .../measures`.
- `MeasureStatusControl` — sobre medidas VIGENTE: marcar incumplida/cumplida/revocar → `PATCH /measures/[id]`.
- `AddHearingForm` — programa audiencia (tipo, fecha/hora, lugar) → `POST .../hearings`.
- `HearingOutcomeControl` — registra realización (resultado + acta) → `PATCH /hearings/[id]`.
- `AddPardForm` — abre PARD seleccionando un NNA vinculado → `POST .../restoration` (oculto si no hay NNA en el caso).
- `PardStageControl` — avanza etapa APERTURA→…→CIERRE → `PATCH /restoration/[id]`.
- `AddAssessmentForm` — registra valoración (tipo, riesgo, persona, hallazgos) → `POST .../assessments`; solo visible si el rol tiene acceso confidencial.

**Expediente (`admin/family/[caseId]/page.tsx`):** cada sección (medidas, PARD, audiencias, valoraciones) tiene ahora su botón de acción en el encabezado y controles por ítem; tras cada acción se recarga el expediente. Se derivan `nnaParties` para el PARD. La sección de valoraciones solo muestra el formulario cuando el endpoint confidencial no devolvió 403.
**Verificación:** `type-check` OK; `build` OK.
**Pendiente Fase 4 (siguiente):** alertas de vencimiento de medidas y términos PARD (Vercel Cron) y dashboard de vencimientos.

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

