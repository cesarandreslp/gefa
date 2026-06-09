# GEFA — Plataforma de Gestión Familiar

## 📋 Descripción

GEFA es una plataforma SaaS multitenant para la gestión de casos en **comisarías de familia** colombianas. Inspirada en el sistema SIGFA, reemplaza el expediente en papel por un expediente digital y da trazabilidad a casos de violencia intrafamiliar, medidas de protección, restablecimiento de derechos (PARD), audiencias y valoraciones psicosociales.

> Construida sobre la base de `ventanilla_unica_base` (misma arquitectura multitenant): se conserva toda la infraestructura y los servicios transversales, y se reescribe el dominio hacia casos de familia.

## 🎯 Estado del Proyecto

**Base clonada y en proceso de adaptación de dominio.**

- ✅ Infraestructura multitenant (BD por tenant en Neon) heredada
- ✅ Auth/RBAC, panel super-admin y servicios transversales heredados
- ⏳ Dominio de familia (Person, Case, ProtectionMeasure, PARD, Hearing, Assessment) — en construcción
- ⏳ Retiro de módulos específicos de personería

## 🏛️ Marco Normativo

El sistema se rige principalmente por:

- **Ley 294/1996**: Violencia intrafamiliar
- **Ley 1098/2006**: Código de Infancia y Adolescencia (protección de NNA)
- **Decreto 4840/2007**: Reglamentación de las comisarías de familia
- **Ley 1581/2012**: Protección de Datos Personales (Habeas Data)
- **Ley 2126/2021**: Fortalecimiento de las comisarías de familia

## 🛠️ Stack Tecnológico

### Backend
- **Framework**: Next.js 14+ (solo backend, no UI)
- **Runtime**: Node.js 20+
- **Lenguaje**: TypeScript 5+
- **ORM**: Prisma 5+
- **Base de Datos**: PostgreSQL 15+ (Neon serverless)

### Justificación Técnica
- ✅ Type-safety completo con TypeScript
- ✅ Migraciones automáticas con Prisma
- ✅ Escalabilidad con PostgreSQL en Neon
- ✅ APIs REST optimizadas con Next.js
- ✅ Preparado para UI futura sin reescribir backend

## 📁 Estructura del Proyecto

```
ventanilla_unica/
│
├── docs/                          # Documentación técnica
│   └── technical/
│       ├── normative-rules.md     # Marco normativo
│       ├── process-flows.md       # Flujos de proceso
│       ├── architecture.md        # Arquitectura técnica
│       ├── security-model.md      # Modelo de seguridad
│       └── roadmap.md             # Hoja de ruta
│
├── prisma/                        # Prisma ORM
│   ├── schema.prisma              # Modelo de datos
│   └── migrations/                # Migraciones
│
├── src/                           # Código fuente
│   ├── domain/                    # Capa de dominio
│   │   ├── entities/              # Entidades de negocio
│   │   ├── rules/                 # Reglas de negocio
│   │   └── types/                 # Tipos de dominio
│   │
│   ├── services/                  # Capa de servicios
│   │   ├── CaseService.ts
│   │   ├── UserService.ts
│   │   └── ...
│   │
│   ├── api/                       # Capa de API
│   │   └── v1/                    # Versión 1
│   │       ├── cases/
│   │       ├── users/
│   │       └── ...
│   │
│   ├── security/                  # Seguridad
│   │   ├── auth/
│   │   └── authorization/
│   │
│   ├── audit/                     # Auditoría
│   │   └── AuditService.ts
│   │
│   └── lib/                       # Utilidades
│       ├── prisma.ts              # Cliente Prisma
│       ├── constants.ts           # Constantes
│       └── ...
│
├── .env.example                   # Variables de entorno ejemplo
├── package.json                   # Dependencias
├── tsconfig.json                  # Configuración TypeScript
└── README.md                      # Este archivo
```

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js >= 20.0.0
- npm >= 9.0.0
- PostgreSQL >= 15 (o cuenta en Neon)
- Git

### Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/tu-organizacion/ventanilla-unica.git
cd ventanilla-unica
```

### Paso 2: Instalar Dependencias

```bash
npm install
```

### Paso 3: Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env.local

# Editar .env.local con tus valores
nano .env.local
```

**Variables críticas**:
```env
DATABASE_URL="postgresql://user:password@host/database"
JWT_SECRET="tu-secret-super-seguro"
ENCRYPTION_KEY="tu-key-de-32-bytes"
```

### Paso 4: Configurar Base de Datos

#### Opción A: Crear Base de Datos en Neon

1. Registrarse en [neon.tech](https://neon.tech)
2. Crear un nuevo proyecto
3. Copiar la URL de conexión
4. Pegar en `DATABASE_URL` en `.env.local`

#### Opción B: PostgreSQL Local

```bash
# Crear base de datos
createdb ventanilla_unica

# Configurar URL en .env.local
DATABASE_URL="postgresql://usuario:password@localhost:5432/ventanilla_unica"
```

### Paso 5: Ejecutar Migraciones

```bash
# Generar cliente de Prisma
npm run db:generate

# Aplicar migraciones
npm run db:migrate

# (Opcional) Cargar datos iniciales
npm run db:seed
```

### Paso 6: Iniciar Servidor de Desarrollo

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000`

## 📊 Modelo de Datos

### Entidades Principales

- **Citizen**: Ciudadanos que interactúan con la Personería
- **Case**: Casos o trámites radicados
- **CaseType**: Tipos de casos (DP, Tutela, PQRS, etc.)
- **CaseState**: Estados del flujo (Radicado, Asignado, etc.)
- **Assignment**: Asignación de casos a funcionarios
- **Document**: Documentos asociados a casos
- **User**: Funcionarios del sistema
- **Role**: Roles con permisos
- **ActionLog**: Log de auditoría (inmutable)
- **Notification**: Notificaciones enviadas

Ver [schema.prisma](./prisma/schema.prisma) para el modelo completo.

## 🔐 Seguridad

### Autenticación
- JWT (JSON Web Tokens)
- Bcrypt para contraseñas (factor de costo: 12)
- Refresh tokens
- Bloqueo por intentos fallidos

### Autorización
- RBAC (Role-Based Access Control)
- Permisos granulares
- Verificación a nivel de endpoint y recurso

### Auditoría
- Registro inmutable de todas las acciones
- Checksum para integridad
- Retención según normativa

### Protección de Datos
- Cumplimiento Ley 1581/2012 (Habeas Data)
- Cifrado en tránsito (TLS 1.3)
- Cifrado de datos sensibles en reposo
- Enmascaramiento en logs

Ver [security-model.md](./docs/technical/security-model.md) para detalles completos.

## 📖 API

### Versión
API REST v1 disponible en `/api/v1`

### Endpoints Principales

```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh

GET    /api/v1/cases
POST   /api/v1/cases
GET    /api/v1/cases/:id
PUT    /api/v1/cases/:id
DELETE /api/v1/cases/:id

GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/:id
PUT    /api/v1/users/:id

POST   /api/v1/documents/upload
GET    /api/v1/documents/:id/download

GET    /api/v1/reports/metrics
GET    /api/v1/reports/compliance
```

### Formato de Respuesta

**Éxito**:
```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "timestamp": "2026-01-08T10:30:00Z",
    "requestId": "uuid"
  }
}
```

**Error**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Descripción del error",
    "details": [...]
  }
}
```

## 🧪 Testing (Fase Futura)

```bash
# Tests unitarios
npm run test

# Tests de integración
npm run test:integration

# Cobertura
npm run test:coverage
```

## 📝 Scripts Disponibles

```bash
# Desarrollo
npm run dev                 # Iniciar servidor de desarrollo

# Build
npm run build               # Compilar para producción
npm start                   # Iniciar servidor de producción

# Base de datos
npm run db:generate         # Generar cliente Prisma
npm run db:push             # Push de schema (desarrollo)
npm run db:migrate          # Crear migración
npm run db:migrate:prod     # Aplicar migraciones en producción
npm run db:studio           # Abrir Prisma Studio
npm run db:seed             # Cargar datos iniciales

# Calidad
npm run lint                # Linter
npm run type-check          # Verificar tipos TypeScript
```

## 👥 Roles del Sistema

| Rol | Nivel | Descripción |
|-----|-------|-------------|
| **Personero** | 100 | Máxima autoridad, todos los permisos |
| **Delegado** | 90 | Segunda autoridad, aprobación de casos |
| **Profesional** | 70 | Gestión de casos asignados |
| **Auxiliar** | 50 | Apoyo administrativo |
| **Admin** | 100 | Administrador técnico del sistema |
| **Ciudadano** | 10 | Consulta de sus propios casos |

## 📈 Roadmap

### ✅ FASE 0 - Arquitectura y Fundamentos (Actual)
- Documentación completa
- Modelo de datos
- Estructura base
- Reglas de negocio

### ⏳ FASE 1 - Implementación Backend (Abril 2026)
- Lógica completa de casos
- Sistema de asignación
- Notificaciones
- Reportes básicos

### ⏳ FASE 2 - Interfaz de Usuario (Agosto 2026)
- Portal ciudadano
- Panel de funcionarios
- Dashboard de métricas

### ⏳ FASE 3 - Integraciones (Noviembre 2026)
- Firma electrónica
- Correo institucional
- Sistemas municipales
- Portal de transparencia

### ⏳ FASE 4 - Optimización (2027)
- Inteligencia artificial
- Analítica avanzada
- App móvil

Ver [roadmap.md](./docs/technical/roadmap.md) para detalles completos.

## 📚 Documentación

- [Marco Normativo](./docs/technical/normative-rules.md)
- [Flujos de Proceso](./docs/technical/process-flows.md)
- [Arquitectura Técnica](./docs/technical/architecture.md)
- [Modelo de Seguridad](./docs/technical/security-model.md)
- [Roadmap del Proyecto](./docs/technical/roadmap.md)

## 🤝 Contribución

Este es un proyecto institucional de la Personería Municipal. Para contribuir:

1. Revisar la documentación técnica
2. Seguir los estándares de código
3. Respetar la arquitectura definida
4. Documentar todos los cambios
5. Asegurar cumplimiento normativo

## 📄 Licencia

Copyright © 2026 Personería Municipal de Guadalajara de Buga  
Todos los derechos reservados.

Este software es propiedad de la Personería Municipal y su uso está restringido a la entidad.

## 📞 Contacto

**Personería Municipal de Guadalajara de Buga**  
- **Dirección**: Carrera 13 No. 6-45, Guadalajara de Buga, Valle del Cauca  
- **Teléfono**: (+57) 2 2363636  
- **Email**: personeria@guadalajaradebuga.gov.co  
- **Web**: https://www.guadalajaradebuga.gov.co

## 🙏 Agradecimientos

- Equipo técnico de desarrollo
- Funcionarios de la Personería por su valiosa retroalimentación
- Comunidad de código abierto por las herramientas utilizadas

---

**Desarrollado con ❤️ para servir a la ciudadanía de Guadalajara de Buga**
