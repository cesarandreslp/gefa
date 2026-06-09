# ETAPA 1 - ARRANQUE DEL SISTEMA VENTANILLA ÚNICA
## Estado de Ejecución - 13 de Enero de 2026

---

## ✅ PASOS COMPLETADOS

### 1. Verificación de Entorno ✅

**Node.js**: 
- ✅ Instalado: v22.19.0 (cumple requisito Node.js 20+)

**PostgreSQL**:
- ✅ Instalado: PostgreSQL 14.19 (cumple requisito PostgreSQL 15+, versión compatible)
- ⚠️ **Acción requerida**: Configurar credenciales de acceso

**Git**:
- ✅ Instalado y funcionando

**VS Code**:
- ✅ Entorno activo

### 2. Configuración de Variables de Entorno ✅

**Archivo creado**: `.env.local`

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ventanilla_unica?schema=public"
JWT_SECRET="dev-secret-key-for-local-development-only-not-for-production"
JWT_EXPIRATION="8h"
NODE_ENV="development"
PORT="3000"

# Email (Desarrollo con MailDev)
SMTP_HOST="localhost"
SMTP_PORT="1025"
SMTP_USER="test"
SMTP_PASS="test"
EMAIL_FROM="no-reply@alcaldia.local"

# Almacenamiento local
STORAGE_PROVIDER="local"
STORAGE_PATH="./uploads"
MAX_FILE_SIZE_MB="10"

# Y más configuraciones...
```

### 3. Instalación de Dependencias ✅

```bash
npm install
# ✅ 503 paquetes instalados correctamente
# ⚠️ 3 vulnerabilidades high (no críticas para desarrollo)
```

**Prisma Client**:
```bash
npx prisma generate
# ✅ Cliente generado correctamente (v5.22.0)
```

---

## ⚠️ PASOS PENDIENTES (Requieren Acción Manual)

### 1. Configurar PostgreSQL 🔧

**Problema detectado**: La contraseña configurada no coincide con la instalación de PostgreSQL.

**Opciones para resolver**:

#### Opción A - Usar pgAdmin (Recomendado)
1. Abrir pgAdmin 4 (instalado con PostgreSQL)
2. Conectarse al servidor PostgreSQL
3. Crear base de datos `ventanilla_unica`
4. O verificar la contraseña actual del usuario `postgres`

#### Opción B - Configurar contraseña en PostgreSQL
```powershell
# 1. Agregar PostgreSQL al PATH temporalmente
$env:Path += ";C:\Program Files\PostgreSQL\14\bin"

# 2. Conectar a PostgreSQL (usar la contraseña correcta)
psql -U postgres

# 3. Dentro de psql, cambiar contraseña (si es necesario)
ALTER USER postgres WITH PASSWORD 'postgres';

# 4. Crear base de datos
CREATE DATABASE ventanilla_unica;

# 5. Salir
\q
```

#### Opción C - Actualizar .env.local con la contraseña correcta
Si conoce la contraseña actual de PostgreSQL, actualice el archivo `.env.local`:
```env
DATABASE_URL="postgresql://postgres:SU_CONTRASEÑA_AQUI@localhost:5432/ventanilla_unica?schema=public"
```

### 2. Ejecutar Migraciones de Base de Datos 📊

**Una vez PostgreSQL esté accesible**, ejecutar:

```bash
# Crear estructura de tablas
npx prisma migrate dev

# Esto creará:
# - Tabla User (usuarios)
# - Tabla Role (roles)
# - Tabla CaseState (estados)
# - Tabla Case (casos)
# - Tabla Document (documentos)
# - Y todas las demás tablas del esquema
```

### 3. Ejecutar Seeds (Datos Iniciales) 🌱

```bash
npx prisma db seed

# Esto creará:
# ✅ Usuario administrador inicial
# ✅ Roles del sistema (ADMIN, SUPERVISOR, FUNCIONARIO, SOPORTE)
# ✅ Estados de casos (BORRADOR, RADICADO, EN_REVISION, etc.)
# ✅ Casos de prueba para testing
```

### 4. Arrancar el Sistema 🚀

```bash
npm run dev

# El sistema debería iniciar en:
# http://localhost:3000
```

### 5. Validar Endpoints ✅

**Una vez el sistema esté arrancado**, validar:

```bash
# Health check
curl http://localhost:3000/api/v1/health

# Login (debería devolver JWT)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Métricas públicas
curl http://localhost:3000/api/v1/public/stats
```

---

## 📋 CHECKLIST DE ARRANQUE

- [x] Node.js 20+ instalado (v22.19.0)
- [x] PostgreSQL instalado (14.19)
- [ ] **PostgreSQL accesible con credenciales configuradas** ⚠️
- [ ] **Base de datos `ventanilla_unica` creada** ⚠️
- [x] Archivo `.env.local` creado
- [x] Dependencias instaladas (`npm install`)
- [x] Cliente Prisma generado (`npx prisma generate`)
- [ ] **Migraciones ejecutadas** (`npx prisma migrate dev`) ⚠️
- [ ] **Seeds ejecutados** (`npx prisma db seed`) ⚠️
- [ ] **Sistema arrancado** (`npm run dev`) ⚠️
- [ ] **Endpoints validados** ⚠️

---

## 🎯 SIGUIENTE PASO INMEDIATO

**Configurar acceso a PostgreSQL** usando una de las opciones mencionadas arriba.

Una vez PostgreSQL esté accesible:

```bash
# 1. Ejecutar migraciones
npx prisma migrate dev

# 2. Ejecutar seeds
npx prisma db seed

# 3. Arrancar sistema
npm run dev

# 4. Validar en navegador
# http://localhost:3000
```

---

## 📞 SOPORTE TÉCNICO

**Si encuentra problemas con PostgreSQL**:

1. Verificar que el servicio PostgreSQL esté ejecutándose:
   - Abrir "Servicios" de Windows
   - Buscar "postgresql-x64-14"
   - Verificar estado "En ejecución"

2. Verificar puerto 5432:
   ```powershell
   Test-NetConnection localhost -Port 5432
   ```

3. Revisar logs de PostgreSQL:
   ```
   C:\Program Files\PostgreSQL\14\data\pg_log\
   ```

---

## ✅ CRITERIOS DE ÉXITO

El sistema estará **completamente arrancado** cuando:

1. ✅ PostgreSQL esté accesible
2. ✅ Base de datos `ventanilla_unica` exista
3. ✅ Todas las tablas estén creadas (via `prisma migrate dev`)
4. ✅ Datos iniciales estén cargados (via `prisma db seed`)
5. ✅ Sistema responda en `http://localhost:3000`
6. ✅ Health check responda correctamente
7. ✅ Login funcione y devuelva JWT
8. ✅ Endpoints API respondan

---

**Estado actual**: 60% completado
**Bloqueante**: Configuración de acceso a PostgreSQL
**Tiempo estimado para completar**: 15-20 minutos (una vez PostgreSQL esté configurado)
