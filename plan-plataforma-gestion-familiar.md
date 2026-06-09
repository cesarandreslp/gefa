# Plan de Trabajo y Arquitectura — Plataforma de Gestión Familiar (tipo SIGFA)

> Sistema SaaS multitenant para la gestión de casos de comisarías de familia: radicación, expediente digital, medidas de protección, restablecimiento de derechos (PARD), equipo interdisciplinario, audiencias, notificaciones y analítica para política pública.

**Stack objetivo:** Next.js (App Router) · Node.js · Neon (PostgreSQL serverless) + Prisma · Vercel (Vercel CLI) · GitHub (GitHub CLI)
**Modelo:** SaaS multitenant con **base de datos separada por tenant** + panel de superadministración.

---

## 1. Visión del producto

El objetivo es replicar y mejorar lo que hace SIGFA en Cali, pero como producto SaaS vendible a cualquier municipio, distrito o entidad territorial del país. Cada cliente (tenant) corresponde a una administración territorial que opera una o varias comisarías de familia. La plataforma reemplaza los expedientes en papel por un expediente digital, garantiza trazabilidad y tiempos de atención más cortos, y genera estadísticas confiables con cruce de variables para planes y políticas públicas.

Principios rectores del diseño:

- **Aislamiento de datos por tenant.** Cada entidad territorial tiene su propia base de datos física en Neon. No hay riesgo de fuga de datos entre municipios y se facilita el cumplimiento de la Ley 1581 de 2012 (protección de datos personales) y el tratamiento de datos sensibles de NNA (Ley 1098 de 2006).
- **Datos sensibles primero.** Toda la arquitectura asume que se manejan datos de víctimas de violencia, menores de edad y agresores. Auditoría, cifrado y control de acceso por rol son requisitos no negociables, no funciones opcionales.
- **Operación 24/7.** Las comisarías atienden de forma permanente; la plataforma debe ser resiliente y disponible.
- **Configurable por tenant.** Catálogos, tipos de violencia, formularios y flujos pueden variar según la entidad.

---

## 2. Arquitectura general

### 2.1 Modelo multitenant: base de datos por tenant

Se adopta el patrón **database-per-tenant** sobre Neon. Existen dos planos lógicos:

**Plano de control (Control Plane).** Una base de datos central ("catálogo maestro") que conoce a todos los tenants, sus credenciales de conexión, su estado, su plan de suscripción y los usuarios superadmin. Es la única base que el panel de superadmin consulta directamente.

**Plano de datos (Tenant / Data Plane).** Una base de datos independiente por cada entidad territorial. Contiene todo el dominio operativo: casos, personas, medidas, audiencias, valoraciones, documentos, etc. El esquema es idéntico entre tenants (mismo `schema.prisma`), pero los datos están físicamente aislados.

Neon facilita este patrón porque permite crear bases de datos y proyectos vía API de forma programática y casi instantánea, con escalado a cero (serverless), de modo que un tenant inactivo no genera costo de cómputo.

```
                    ┌─────────────────────────┐
                    │   Next.js en Vercel      │
                    │  (App Router + API)      │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┴──────────────────┐
              │  Tenant Resolver (middleware)        │
              │  subdominio / dominio → tenantId     │
              └─────────────────┬───────────────────┘
                                │ lee credenciales
                    ┌───────────▼────────────┐
                    │   CONTROL PLANE DB      │  ◄── Panel Superadmin
                    │  (tenants, planes,      │
                    │   superadmins, billing) │
                    └───────────┬─────────────┘
                                │ devuelve DATABASE_URL del tenant
        ┌───────────────────────┼────────────────────────┐
        ▼                       ▼                         ▼
┌───────────────┐     ┌───────────────┐         ┌───────────────┐
│  Tenant DB A  │     │  Tenant DB B  │   ...   │  Tenant DB N  │
│ (Municipio A) │     │ (Municipio B) │         │ (Municipio N) │
└───────────────┘     └───────────────┘         └───────────────┘
```

### 2.2 Resolución de tenant

Cada tenant se identifica por **subdominio** (`cali.miplataforma.gov.co`) o **dominio propio** (`comisarias.cali.gov.co`). Un middleware de Next.js (`middleware.ts`) intercepta cada request, extrae el host, resuelve el `tenantId` contra el control plane (con caché), y lo inyecta en el contexto de la petición. Si el host no resuelve a un tenant activo, se redirige a una página de error o al portal de marketing.

### 2.3 Enrutamiento de conexiones Prisma

Se mantiene un **pool de clientes Prisma por tenant**, cacheado en memoria (con expiración LRU) para no reconstruir el cliente en cada request. Un módulo `getTenantPrisma(tenantId)`:

1. Consulta el control plane por la `databaseUrl` del tenant (cacheada).
2. Reutiliza o crea un `PrismaClient` apuntando a esa URL.
3. Devuelve el cliente listo para usar.

Se usa el driver serverless de Neon (`@neondatabase/serverless` + `@prisma/adapter-neon`) para que funcione bien en el entorno de funciones de Vercel (conexiones HTTP/WebSocket en lugar de TCP persistente).

### 2.4 Provisioning automático de tenants

Cuando un superadmin crea un tenant nuevo, un servicio de provisioning ejecuta de forma orquestada:

1. Crea la base de datos en Neon vía su API.
2. Aplica las migraciones de Prisma sobre la nueva base (`prisma migrate deploy` con la URL recién creada).
3. Ejecuta el *seed* inicial (catálogos base, roles, primer usuario administrador del tenant).
4. Registra el tenant y su `databaseUrl` (cifrada) en el control plane.
5. Configura el subdominio/dominio y, opcionalmente, el dominio en Vercel vía API.

Las migraciones futuras se aplican como un *fan-out*: un job recorre todos los tenants activos y ejecuta `migrate deploy` en cada base, registrando el resultado.

### 2.5 Despliegue (Vercel + GitHub)

- **Repositorio único en GitHub** (monorepo) con la app Next.js. La gestión se hace con **GitHub CLI** (`gh repo create`, `gh pr`, `gh secret set`).
- **CI/CD en Vercel**: cada push a `main` despliega producción; cada PR genera un *preview deployment*. Se administra con **Vercel CLI** (`vercel`, `vercel env add`, `vercel deploy --prod`, `vercel domains add`).
- **GitHub Actions** para correr lint, tests, `prisma validate`, y el job de migraciones multitenant antes de promover a producción.
- **Secretos**: las credenciales del control plane y la API key de Neon viven en variables de entorno de Vercel y en GitHub Secrets; las URLs de cada tenant viven cifradas dentro del control plane, nunca en el código.

---

## 3. Plan de trabajo por fases

Estimación total orientativa: **20 a 26 semanas** con un equipo pequeño (1–2 backend, 1–2 frontend, 1 diseño/UX, 1 QA, 1 líder técnico/PM). Las duraciones son indicativas y se ajustan al tamaño real del equipo.

### Fase 0 — Descubrimiento y fundamentos (1–2 semanas)
Levantamiento de requisitos legales y funcionales con comisarías reales, definición del flujo de un caso (de la radicación al archivo), mapeo de roles y permisos, inventario de catálogos (tipos de violencia, parentescos, medidas), y definición de los indicadores que exige la política pública. Entregables: documento de requisitos, mapa de procesos, modelo de datos preliminar, backlog priorizado.

### Fase 1 — Infraestructura y esqueleto multitenant (2–3 semanas)
Creación del repositorio en GitHub, proyecto en Vercel, cuenta y proyecto base en Neon. Implementación del control plane, el resolver de tenants, el enrutamiento dinámico de Prisma y el servicio de provisioning. Pipeline de CI/CD y job de migraciones multitenant. Entregable: se puede crear un tenant nuevo de forma automatizada y servir su subdominio.

### Fase 2 — Autenticación, autorización y panel superadmin (2–3 semanas)
Login, gestión de sesiones, RBAC por rol, y el **panel de superadmin** (alta/baja de tenants, monitoreo, planes y suscripciones, estado de bases de datos). Entregable: SaaS operable a nivel de administración.

### Fase 3 — Núcleo de casos y expediente digital (3–4 semanas)
Radicación de casos, registro de personas (víctimas, agresores, NNA, otros intervinientes), expediente digital con línea de tiempo, máquina de estados del caso y gestión documental. Entregable: una comisaría puede radicar y gestionar el ciclo básico de un caso.

### Fase 4 — Medidas de protección y restablecimiento de derechos (3–4 semanas)
Emisión de medidas de protección, seguimiento de cumplimiento, alertas de vencimiento, y el proceso PARD para NNA con su articulación al ICBF. Workflow completo con audiencias asociadas. Entregable: cobertura del corazón legal del trabajo de la comisaría.

### Fase 5 — Equipo interdisciplinario y agenda (2–3 semanas)
Módulo de valoraciones (psicología, trabajo social, medicina), agenda de citas y audiencias, citaciones y asignación de casos al equipo. Entregable: trabajo coordinado del equipo interdisciplinario dentro del expediente.

### Fase 6 — Notificaciones, reportes y analítica (2–3 semanas)
Motor de notificaciones (correo/SMS, recordatorios, vencimientos), dashboards operativos y tableros estadísticos con cruce de variables para política pública, exportaciones (PDF/Excel). Entregable: indicadores confiables y comunicación automatizada.

### Fase 7 — Portal ciudadano e integraciones (2–3 semanas, opcional/iterativa)
Radicación en línea por parte de la ciudadanía (tipo "Comisaría en línea"), consulta de estado de un caso, y conectores hacia entidades externas (ICBF, Medicina Legal, Fiscalía, SISBÉN) según disponibilidad de APIs. Entregable: ampliación del acceso y la interoperabilidad.

### Fase 8 — Hardening, seguridad, QA y puesta en marcha (2–3 semanas)
Pruebas de seguridad (pentest básico, revisión de control de acceso), pruebas de carga, auditoría de cumplimiento de habeas data, documentación, capacitación a funcionarios y despliegue del primer tenant productivo con acompañamiento. Entregable: producto listo para operación real.

---

## 4. Módulos del sistema

A continuación, los módulos que componen el desarrollo. Cada uno se describe en su dimensión funcional (qué hace para el usuario) y técnica (cómo se implementa).

### 4.1 Módulo de Tenancy y Provisioning (Control Plane)
**Funcional:** administra el ciclo de vida de cada entidad cliente: alta, suspensión, reactivación y baja. Es la base del modelo SaaS.
**Técnico:** control plane en Neon con su propio `PrismaClient`. Servicio de provisioning que crea la base del tenant, aplica migraciones y seed, y registra credenciales cifradas. Orquestador de migraciones *fan-out* para evolucionar el esquema en todas las bases.

### 4.2 Módulo de Superadministración (SaaS Admin)
**Funcional:** panel exclusivo del proveedor del software. Permite ver todos los tenants, su estado, métricas de uso, planes contratados, facturación y salud de cada base de datos. Crea y configura tenants nuevos.
**Técnico:** área protegida `/superadmin` con su propio guard de rol. Solo accede al control plane; nunca toca datos sensibles de un tenant. Dashboards de monitoreo (tenants activos, uso, errores de provisioning).

### 4.3 Módulo de Autenticación y Autorización (RBAC)
**Funcional:** inicio de sesión seguro, recuperación de contraseña, gestión de sesiones y control de acceso por rol. Roles previstos: superadmin, administrador del tenant, comisario de familia, abogado, psicólogo, trabajador social, médico, profesional de apoyo y ventanilla/recepción.
**Técnico:** autenticación con sesiones (p. ej. Auth.js/NextAuth o solución propia con JWT + cookies httpOnly). Middleware de autorización por rol y por recurso. Contraseñas con hashing fuerte (argon2/bcrypt). MFA opcional para roles sensibles.

### 4.4 Módulo de Usuarios y Equipo Interdisciplinario
**Funcional:** el administrador del tenant gestiona los funcionarios, sus roles y a qué comisaría pertenecen. Permite asignar casos a profesionales y formar el equipo psicosocial/jurídico.
**Técnico:** entidades `User` y `Role` dentro de la base del tenant, con relación a `Comisaria`. Asignaciones de caso (`CaseAssignment`) que vinculan profesionales a casos.

### 4.5 Módulo de Comisarías y Configuración del Tenant
**Funcional:** una entidad puede operar varias comisarías (incluida una unidad móvil). Aquí se configuran sedes, horarios, catálogos (tipos de violencia, parentescos, tipos de medida), plantillas de documentos y formularios.
**Técnico:** entidades `Comisaria` y tablas de catálogo configurables por tenant. Motor de plantillas para autos y oficios.

### 4.6 Módulo de Personas (Víctimas, Agresores, NNA)
**Funcional:** registro único de personas involucradas en los casos, evitando duplicados. Maneja datos de identificación, contacto, condición de vulnerabilidad, relación de parentesco y rol en cada caso (víctima, presunto agresor, niño/niña/adolescente, testigo).
**Técnico:** entidad `Person` reutilizable entre casos, con `CaseParty` como tabla puente que define el rol de la persona en un caso específico. Marcado especial de NNA para activar reglas de protección reforzada.

### 4.7 Módulo de Casos y Expediente Digital
**Funcional:** corazón del sistema. Radicación del caso con número único, clasificación del tipo de violencia, narración de hechos, vinculación de personas, y un expediente digital con línea de tiempo de todas las actuaciones. Reemplaza el expediente físico.
**Técnico:** entidad `Case` con máquina de estados (radicado → en trámite → con medida → en seguimiento → archivado/remitido). Eventos del caso (`CaseEvent`) que alimentan la línea de tiempo y la trazabilidad.

### 4.8 Módulo de Medidas de Protección
**Funcional:** emisión de medidas (salida del agresor del hogar, prohibición de acercamiento, etc.), con su vigencia, alcance y seguimiento de cumplimiento. Genera alertas antes del vencimiento y permite prórrogas o nuevas medidas.
**Técnico:** entidad `ProtectionMeasure` ligada al caso, con fechas de inicio/fin, estado de cumplimiento e historial. Jobs programados que detectan vencimientos y disparan notificaciones.

### 4.9 Módulo de Restablecimiento de Derechos (PARD)
**Funcional:** gestiona el Proceso Administrativo de Restablecimiento de Derechos para NNA, con sus etapas, términos legales y la articulación con el ICBF. Controla el cumplimiento de plazos legales.
**Técnico:** entidad `RestorationProcess` con etapas y términos parametrizables, alertas de vencimiento de términos y registro de remisiones a ICBF.

### 4.10 Módulo de Audiencias y Agenda
**Funcional:** programación de audiencias y citas, citaciones a las partes, calendario por comisaría y por profesional, y registro de resultados de cada audiencia.
**Técnico:** entidades `Hearing` y `Appointment` con calendario, estados (programada, realizada, aplazada) y vínculo a notificaciones/citaciones.

### 4.11 Módulo de Valoraciones Psicosociales
**Funcional:** registro de las valoraciones y conceptos de psicología, trabajo social y medicina dentro del expediente, con sus recomendaciones, que sustentan las decisiones del comisario.
**Técnico:** entidad `Assessment` tipada por disciplina, vinculada al caso y al profesional, con control de acceso restringido por sensibilidad.

### 4.12 Módulo de Gestión Documental
**Funcional:** carga, generación y almacenamiento de documentos del expediente (autos, oficios, denuncias, pruebas, soportes). Generación de documentos a partir de plantillas con datos del caso.
**Técnico:** almacenamiento de archivos en object storage (Vercel Blob o S3 compatible), metadatos en la base del tenant, generación de PDF desde plantillas. Control de versiones y registro de quién accede a cada documento.

### 4.13 Módulo de Notificaciones y Alertas
**Funcional:** recordatorios de audiencias, alertas de vencimiento de medidas y términos, y notificaciones a funcionarios y partes por correo y SMS.
**Técnico:** servicio de notificaciones con proveedores (Resend/SendGrid para correo, Twilio u operador local para SMS), colas de envío y jobs programados (cron de Vercel) para vencimientos.

### 4.14 Módulo de Reportes y Analítica
**Funcional:** dashboards operativos (casos por estado, carga por profesional, tiempos de atención) y tableros estadísticos con cruce de variables (tipo de violencia, sexo, edad, georreferencia) que alimentan planes y políticas públicas. Exportación a PDF y Excel.
**Técnico:** vistas y consultas agregadas sobre la base del tenant, capa de reporting, y exportadores. Posibilidad de anonimización para reportes agregados a nivel nacional.

### 4.15 Módulo de Auditoría y Trazabilidad
**Funcional:** registro inmutable de quién hizo qué y cuándo sobre datos sensibles. Esencial para cumplimiento legal y para la transparencia que exige el sistema.
**Técnico:** tabla `AuditLog` append-only en cada tenant, interceptores que registran accesos y cambios, y registro de eventos de seguridad. Retención configurable.

### 4.16 Módulo de Portal Ciudadano (opcional)
**Funcional:** permite a la ciudadanía radicar solicitudes en línea y consultar el estado de su caso, ampliando el acceso a la justicia (similar a "Comisaría en línea").
**Técnico:** rutas públicas por tenant con formularios validados, captcha/anti-abuso, y creación de casos en estado preliminar para revisión del personal.

### 4.17 Módulo de Integraciones (opcional/futuro)
**Funcional:** interoperabilidad con ICBF, Medicina Legal, Fiscalía y bases como SISBÉN, según disponibilidad de APIs.
**Técnico:** capa de conectores desacoplada con adaptadores por entidad, colas y reintentos, y registro de las interacciones para auditoría.

---

## 5. Modelo de datos (Prisma)

Se manejan **dos esquemas Prisma**: uno para el control plane y otro para el tenant. A continuación, una versión resumida e ilustrativa (no exhaustiva).

### 5.1 Schema del Control Plane (`prisma/control/schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("CONTROL_PLANE_DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  output   = "../../node_modules/.prisma/control"
}

model Tenant {
  id            String        @id @default(cuid())
  name          String                            // p. ej. "Alcaldía de Cali"
  slug          String        @unique             // subdominio: "cali"
  customDomain  String?       @unique             // "comisarias.cali.gov.co"
  databaseUrl   String                            // cifrada en reposo
  neonProjectId String?
  status        TenantStatus  @default(PROVISIONING)
  plan          Plan          @relation(fields: [planId], references: [id])
  planId        String
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  migrations    TenantMigration[]
}

enum TenantStatus {
  PROVISIONING
  ACTIVE
  SUSPENDED
  DISABLED
}

model Plan {
  id           String   @id @default(cuid())
  name         String                          // "Básico", "Profesional"
  maxCases     Int?
  maxUsers     Int?
  priceMonthly Decimal  @db.Decimal(12,2)
  tenants      Tenant[]
}

model SuperAdmin {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  createdAt    DateTime @default(now())
}

model TenantMigration {
  id        String   @id @default(cuid())
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  tenantId  String
  migration String
  appliedAt DateTime @default(now())
  success   Boolean
}
```

### 5.2 Schema del Tenant (`prisma/tenant/schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("TENANT_DATABASE_URL")   // inyectada en runtime por tenant
}

generator client {
  provider = "prisma-client-js"
  output   = "../../node_modules/.prisma/tenant"
}

model Comisaria {
  id       String  @id @default(cuid())
  name     String
  address  String?
  isMobile Boolean @default(false)   // unidad móvil
  users    User[]
  cases    Case[]
}

model User {
  id           String           @id @default(cuid())
  email        String           @unique
  passwordHash String
  fullName     String
  role         Role
  comisaria    Comisaria?       @relation(fields: [comisariaId], references: [id])
  comisariaId  String?
  isActive     Boolean          @default(true)
  assignments  CaseAssignment[]
  assessments  Assessment[]
  createdAt    DateTime         @default(now())
}

enum Role {
  TENANT_ADMIN
  COMISARIO
  ABOGADO
  PSICOLOGO
  TRABAJADOR_SOCIAL
  MEDICO
  APOYO
  RECEPCION
}

model Person {
  id           String      @id @default(cuid())
  documentType String?
  documentId   String?
  fullName     String
  birthDate    DateTime?
  isMinor      Boolean     @default(false)
  sex          String?
  phone        String?
  address      String?
  parties      CaseParty[]

  @@index([documentId])
}

model Case {
  id           String              @id @default(cuid())
  caseNumber   String              @unique          // radicado
  comisaria    Comisaria           @relation(fields: [comisariaId], references: [id])
  comisariaId  String
  violenceType String                               // catálogo
  status       CaseStatus          @default(RADICADO)
  description  String?
  openedAt     DateTime            @default(now())
  closedAt     DateTime?
  parties      CaseParty[]
  measures     ProtectionMeasure[]
  hearings     Hearing[]
  assessments  Assessment[]
  documents    Document[]
  events       CaseEvent[]
  assignments  CaseAssignment[]
  restoration  RestorationProcess?
}

enum CaseStatus {
  RADICADO
  EN_TRAMITE
  CON_MEDIDA
  EN_SEGUIMIENTO
  ARCHIVADO
  REMITIDO
}

model CaseParty {
  id           String    @id @default(cuid())
  case         Case      @relation(fields: [caseId], references: [id])
  caseId       String
  person       Person    @relation(fields: [personId], references: [id])
  personId     String
  partyRole    PartyRole
  relationship String?                              // parentesco
}

enum PartyRole {
  VICTIMA
  PRESUNTO_AGRESOR
  NNA
  TESTIGO
  OTRO
}

model ProtectionMeasure {
  id        String        @id @default(cuid())
  case      Case          @relation(fields: [caseId], references: [id])
  caseId    String
  type      String                                 // catálogo de medidas
  startDate DateTime
  endDate   DateTime?
  status    MeasureStatus @default(VIGENTE)
  notes     String?
}

enum MeasureStatus {
  VIGENTE
  VENCIDA
  PRORROGADA
  INCUMPLIDA
  CUMPLIDA
}

model RestorationProcess {
  id      String    @id @default(cuid())
  case    Case      @relation(fields: [caseId], references: [id])
  caseId  String    @unique
  stage   String
  dueDate DateTime?
  icbfRef String?
}

model Hearing {
  id          String   @id @default(cuid())
  case        Case     @relation(fields: [caseId], references: [id])
  caseId      String
  scheduledAt DateTime
  status      String                               // programada/realizada/aplazada
  result      String?
}

model Assessment {
  id             String   @id @default(cuid())
  case           Case     @relation(fields: [caseId], references: [id])
  caseId         String
  discipline     String                            // psicologia/trabajo social/medicina
  professional   User     @relation(fields: [professionalId], references: [id])
  professionalId String
  findings       String?
  createdAt      DateTime @default(now())
}

model Document {
  id        String   @id @default(cuid())
  case      Case     @relation(fields: [caseId], references: [id])
  caseId    String
  name      String
  blobUrl   String
  mimeType  String?
  createdBy String?
  createdAt DateTime @default(now())
}

model CaseAssignment {
  id     String @id @default(cuid())
  case   Case   @relation(fields: [caseId], references: [id])
  caseId String
  user   User   @relation(fields: [userId], references: [id])
  userId String
}

model CaseEvent {
  id        String   @id @default(cuid())
  case      Case     @relation(fields: [caseId], references: [id])
  caseId    String
  type      String                                 // para la línea de tiempo
  payload   Json?
  actorId   String?
  createdAt DateTime @default(now())
}

model AuditLog {
  id        String   @id @default(cuid())
  actorId   String?
  action    String
  entity    String
  entityId  String?
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([entity, entityId])
}
```

---

## 6. Estructura de carpetas (Next.js App Router)

```
plataforma-gestion-familiar/
├── app/
│   ├── (marketing)/                 # landing pública del SaaS
│   ├── superadmin/                  # panel de superadmin (control plane)
│   │   ├── tenants/
│   │   ├── plans/
│   │   └── layout.tsx               # guard rol SUPERADMIN
│   ├── (tenant)/                    # app por tenant (resuelta por host)
│   │   ├── dashboard/
│   │   ├── casos/
│   │   │   ├── [caseId]/            # expediente digital
│   │   │   └── nuevo/              # radicación
│   │   ├── personas/
│   │   ├── medidas/
│   │   ├── audiencias/
│   │   ├── valoraciones/
│   │   ├── reportes/
│   │   ├── usuarios/
│   │   └── configuracion/
│   ├── portal/                      # portal ciudadano (opcional)
│   └── api/                         # route handlers
│       ├── auth/
│       ├── tenants/                 # provisioning (solo superadmin)
│       ├── casos/
│       ├── medidas/
│       └── webhooks/
├── middleware.ts                    # resolución de tenant por host
├── lib/
│   ├── control-plane/
│   │   └── prisma.ts                # cliente Prisma del control plane
│   ├── tenant/
│   │   ├── get-tenant-prisma.ts     # cache de clientes por tenant
│   │   └── resolve-tenant.ts
│   ├── provisioning/
│   │   ├── neon.ts                  # API de Neon (crear DB)
│   │   └── migrate.ts               # migrate deploy por tenant
│   ├── auth/
│   ├── rbac/
│   └── notifications/
├── prisma/
│   ├── control/schema.prisma
│   └── tenant/schema.prisma
├── components/
├── scripts/
│   └── migrate-all-tenants.ts       # fan-out de migraciones
├── .github/workflows/               # CI/CD (GitHub Actions)
└── package.json
```

---

## 7. Endpoints / superficie de API (selección)

| Método | Ruta | Plano | Descripción |
|--------|------|-------|-------------|
| POST | `/api/auth/login` | tenant/superadmin | Inicio de sesión |
| POST | `/api/tenants` | control | Provisionar nuevo tenant (crea DB + migra + seed) |
| GET | `/api/tenants` | control | Listar tenants (superadmin) |
| PATCH | `/api/tenants/:id` | control | Suspender / reactivar / cambiar plan |
| POST | `/api/casos` | tenant | Radicar un caso |
| GET | `/api/casos` | tenant | Listar/filtrar casos |
| GET | `/api/casos/:id` | tenant | Expediente + línea de tiempo |
| PATCH | `/api/casos/:id/estado` | tenant | Cambiar estado (workflow) |
| POST | `/api/casos/:id/medidas` | tenant | Emitir medida de protección |
| POST | `/api/casos/:id/audiencias` | tenant | Programar audiencia |
| POST | `/api/casos/:id/valoraciones` | tenant | Registrar valoración psicosocial |
| POST | `/api/casos/:id/documentos` | tenant | Subir/generar documento |
| GET | `/api/reportes/estadisticas` | tenant | Indicadores con cruce de variables |
| POST | `/api/cron/vencimientos` | tenant | Job de alertas (Vercel Cron) |

---

## 8. Seguridad y cumplimiento

Por la naturaleza de los datos (víctimas de violencia, NNA, agresores), el cumplimiento no es opcional:

- **Habeas data (Ley 1581 de 2012):** consentimiento, finalidad, tratamiento de datos sensibles y derechos del titular. Política de privacidad por tenant.
- **Protección reforzada de NNA (Ley 1098 de 2006):** acceso restringido a expedientes con menores, anonimización en reportes agregados.
- **Aislamiento físico por tenant:** una base por entidad reduce drásticamente el impacto de cualquier incidente.
- **Cifrado:** datos en tránsito (TLS) y credenciales/URLs de tenant cifradas en reposo dentro del control plane.
- **Control de acceso por rol y por recurso (RBAC):** principio de mínimo privilegio.
- **Auditoría inmutable:** todo acceso o cambio sobre datos sensibles queda registrado.
- **Respaldo y recuperación:** backups por tenant (Neon soporta point-in-time recovery) y plan de continuidad para operación 24/7.

---

## 9. Riesgos y consideraciones

- **Costo y límites de Neon:** el modelo database-per-tenant escala bien con escalado a cero, pero conviene monitorear el número de proyectos/bases y los límites del plan contratado. Alternativa de transición: schema-per-tenant si el volumen de tenants crece mucho.
- **Migraciones multitenant:** un cambio de esquema debe aplicarse a N bases; el job de fan-out debe ser idempotente, transaccional por tenant y con reporte de fallos.
- **Conexiones en serverless:** usar el driver serverless de Neon y caché de clientes Prisma para evitar agotar conexiones en funciones de Vercel.
- **Cumplimiento legal cambiante:** los términos legales (plazos PARD, tipos de medida) deben ser parametrizables, no estar "quemados" en el código.
- **Validación con usuarios reales:** el flujo del caso debe validarse con comisarios y equipo psicosocial antes de construir, para no automatizar un proceso equivocado.

---

*Documento de planeación técnica. Las estimaciones de tiempo son orientativas y deben ajustarse al equipo y al alcance final acordado.*
