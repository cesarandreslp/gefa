# Flujo Completo del Sistema - Ventanilla Única Personería Municipal

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Roles del Sistema](#roles-del-sistema)
3. [Ciclo de Vida de un Caso](#ciclo-de-vida-de-un-caso)
4. [Flujo 1: Creación de Casos](#flujo-1-creación-de-casos)
5. [Flujo 2: Asignación con IA](#flujo-2-asignación-con-ia)
6. [Flujo 3: Gestión en Bandeja de Entrada](#flujo-3-gestión-en-bandeja-de-entrada)
7. [Flujo 4: Tipos de Respuesta del Funcionario](#flujo-4-tipos-de-respuesta-del-funcionario)
8. [Flujo 5: Reasignación de Casos](#flujo-5-reasignación-de-casos)
9. [Flujo 6: Rechazo y Conversación con Ciudadano](#flujo-6-rechazo-y-conversación-con-ciudadano)
10. [Flujo 7: Solicitud de Cierre de Caso](#flujo-7-solicitud-de-cierre-de-caso)
11. [Flujo 8: Semáforo de Término Legal](#flujo-8-semáforo-de-término-legal)
12. [Flujo 9: Consulta de Estado por Ciudadano](#flujo-9-consulta-de-estado-por-ciudadano)
13. [Flujo 10: Registro de Atenciones (Auxiliar)](#flujo-10-registro-de-atenciones-auxiliar)
14. [Flujo 11: Impresión de Radicado](#flujo-11-impresión-de-radicado)
15. [Flujo 12: Gestión de Auxiliares](#flujo-12-gestión-de-auxiliares)
16. [Flujo 13: Formulario de Contacto](#flujo-13-formulario-de-contacto)
17. [Flujo 14: Pestañas Exclusivas del Personero](#flujo-14-pestañas-exclusivas-del-personero)
18. [Flujo 15: Generación de Reportes](#flujo-15-generación-de-reportes)
19. [Flujo 16: Panel de Administración](#flujo-16-panel-de-administración)
20. [Flujo 17: Autenticación y Sesión](#flujo-17-autenticación-y-sesión)
21. [Flujo 18: Gestión de Documentos Adjuntos](#flujo-18-gestión-de-documentos-adjuntos)
22. [Flujo 19: Configuración de Listas Desplegables](#flujo-19-configuración-de-listas-desplegables)
23. [Flujo 20: Directorio de Correos Electrónicos](#flujo-20-directorio-de-correos-electrónicos)
24. [Estados del Sistema](#estados-del-sistema)
25. [Notificaciones y Alertas](#notificaciones-y-alertas)
26. [Reglas de Negocio Críticas](#reglas-de-negocio-críticas)
27. [Mapeo de Rutas y Endpoints](#mapeo-de-rutas-y-endpoints)

---

## Visión General

El sistema de Ventanilla Única maneja el ciclo completo de atención de solicitudes ciudadanas en la Personería Municipal de Guadalajara de Buga. Desde la radicación hasta la respuesta final, pasando por asignación automática con IA, gestión por funcionarios, y posibles reasignaciones.

---

## Roles del Sistema

| Rol | Código | Accesos Principales |
|-----|--------|---------------------|
| **Ciudadano** | (público) | Presentar solicitud, consultar estado, responder rechazos |
| **Ventanilla Única** | `VENTANILLA_UNICA` | Crear casos presenciales, imprimir radicados, ver bandeja |
| **Auxiliar de Atención** | `AUXILIAR_ATENCION_USUARIO` | Registrar atenciones, ver registros, configurar listas |
| **Funcionario** (Personero Delegado) | `FUNCIONARIO` | Bandeja de entrada, responder casos, solicitar reasignación, crear auxiliares |
| **Personero Municipal** | `PERSONERO_MUNICIPAL` | Todo lo del funcionario + seguimiento general, invitaciones, leídos, cierre de casos |
| **Administrador** | `ADMIN` | Panel administrativo completo |

---

## Ciclo de Vida de un Caso

```
[CREACIÓN] → [ASIGNACIÓN IA] → [ASIGNADO] → [EN GESTIÓN] → [RESPUESTA] → [CERRADO]
                  ↓                              ↓               ↓
            [FALLBACK →                   [REASIGNACIÓN]   [RECHAZO → Chat
             Personero]                    (opcional)       con ciudadano]
                                                              ↓
                                                          [CIERRE o
                                                           NUEVA RESPUESTA]
```

---

## Flujo 1: Creación de Casos

### 1.1 Creación por Ciudadano (Portal Público)

**Ruta**: `/atencion-ciudadano/solicitud`

1. Ciudadano llena formulario con:
   - Datos personales (tipo/número de documento, nombre, email, teléfono)
   - Datos demográficos (edad, género, discapacidad, etnia, escolaridad)
   - Asunto y descripción del caso
   - Archivo adjunto (opcional, máx 10MB: PDF, Word, JPG, PNG)
   - Consentimiento de datos (obligatorio)
2. Sistema valida campos y crea/actualiza ciudadano (`documentType` + `documentNumber`)
3. Sistema genera `filingNumber` único (ej: `PER-2026-00001`)
4. Estado inicial: `NUEVO`, Canal: `WEB_CIUDADANO`
5. Sistema calcula `dueDate` según plazo legal del tipo de caso
6. Si hay archivo → sube a **Vercel Blob Storage** vía `/api/v1/cases/[id]/documents`
7. Sistema envía **email de confirmación** al ciudadano con número de radicado
8. Sistema llama a `/api/v1/ai/analyze-and-assign` → IA asigna (Flujo 2)

**Endpoint**: `POST /api/v1/cases/general-request`
**Página**: `src/app/atencion-ciudadano/solicitud/page.tsx`

---

### 1.2 Creación por Ventanilla Única (Presencial)

**Ruta**: `/home/casos/nuevo`

- Funcionario VU ingresa datos en nombre del ciudadano
- Canal: `PRESENCIAL`, `TELEFONO` o `CORREO`
- Puede marcar el caso como **prioritario** con justificación
- Resto del flujo idéntico al 1.1

**Endpoint**: `POST /api/v1/ai/analyze-and-assign`
**Página**: `src/app/home/casos/nuevo/page.tsx`

---

## Flujo 2: Asignación con IA

1. Sistema obtiene roles activos (excluye `ADMIN`, `VENTANILLA_UNICA`, `ASIGNACION_DE_CASOS`)
2. Sistema construye prompt con: asunto, descripción, tipo + lista de roles disponibles con descripciones
3. **IA (Groq - llama-3.3-70b)** analiza palabras clave, evalúa competencia por rol, calcula confianza (0-1)
4. Sistema valida recomendación:
   - Rol no existe o inactivo → **Fallback a Personero Municipal**
   - Sin usuarios con ese rol → **Fallback a Personero Municipal**
5. Sistema busca usuario **menos cargado** (algoritmo de balanceo por `maxCaseLoad`)
6. Crea `assignment` con status `PENDING`
7. Actualiza caso a estado `ASIGNADO`
8. Registra en `action_logs`, `case_state_history`, `case_assignment_history`
9. Envía **email de nueva asignación** al funcionario

**Endpoint**: `POST /api/v1/ai/analyze-and-assign`
**Servicios**: `AIAssignmentService.ts`, `AssignmentService.ts`

---

## Flujo 3: Gestión en Bandeja de Entrada

**Ruta**: `/home/bandeja-entrada`

### 3.1 Pestañas por Rol

| Pestaña | VU | Funcionario | Personero |
|---------|-----|-------------|-----------|
| Nuevos / En Trámite | ✅ | ✅ | ✅ |
| En Gestión | ✅ | ✅ | ✅ |
| Rechazados | ✅ | ✅ | ✅ |
| Finalizados | ✅ | ✅ | ✅ |
| Seguimiento General | ❌ | ❌ | ✅ |
| Invitaciones | ❌ | ❌ | ✅ |
| Leídos | ❌ | ❌ | ✅ |

### 3.2 Ver Detalles de un Caso

1. Click en "Ver Detalles"
2. Modal/Bottom-sheet (celular) muestra:
   - Información del ciudadano (nombre, documento, email, teléfono)
   - Asunto, descripción, tipo de caso
   - Número de radicado + fecha
   - Plazo legal, días restantes, semáforo visual
   - Documentos adjuntos (si existen)
   - Funcionario asignado + fecha de asignación
   - Historial de conversación (si hay mensajes)
   - Botones de acción según rol y estado

### 3.3 Marcar como Leído (Personero)

1. Personero accede a caso en bandeja
2. Sistema registra `userId` en array `readBy` del caso
3. La tarjeta del caso cambia de fondo azulado a blanco
4. El caso aparece disponible en la pestaña "Leídos"

### 3.4 Búsqueda de Casos (Solo PC)

- Barra de búsqueda visible solo en desktop
- Filtra en tiempo real por: radicado, nombre, documento, email, asunto, descripción, tipo, estado, funcionario asignado
- Paginación se recalcula con los resultados filtrados

---

## Flujo 4: Tipos de Respuesta del Funcionario

**Endpoint**: `POST /api/v1/solicitudes/[id]/responder`

### 4.1 Respuesta de Cierre (CIERRE)

1. Funcionario selecciona tipo "Cierre"
2. Redacta respuesta completa
3. Sistema envía **email al ciudadano** con la respuesta
4. **Si email falla → caso NO se cierra** (regla crítica)
5. Si email exitoso → caso se marca como `CERRADO` (`closedAt = NOW()`)
6. Caso pasa de "En Gestión" a "Finalizados"

### 4.2 Solicitar Información Adicional (SOLICITAR_INFO)

1. Funcionario necesita más datos del ciudadano
2. Selecciona tipo "Solicitar información"
3. Redacta la pregunta/solicitud
4. Sistema envía email al ciudadano pidiendo la información
5. Caso queda en estado `PENDIENTE_INFO`

### 4.3 Escalar Caso (ESCALAR)

1. Funcionario determina que el caso necesita atención de una dependencia/entidad externa
2. Selecciona tipo "Escalar"
3. Selecciona destinatarios del directorio de correos
4. Puede opcionalmente solicitar respuesta en X días
5. Sistema envía email oficial a las entidades seleccionadas
6. Caso continúa en gestión

### 4.4 Remitir a Entidad Externa (REMITIR)

1. Funcionario determina que el caso es competencia de otra entidad
2. Selecciona tipo "Remitir"
3. Selecciona entidad(es) destinataria(s) del directorio de correos
4. Redacta comunicación de remisión
5. Sistema envía email al ciudadano informando la remisión + email a la entidad
6. Caso se marca como `REFERIDO` (estado final)

### 4.5 Rechazar Caso (RECHAZAR)

1. Funcionario determina que el caso no procede
2. Selecciona tipo "Rechazar"
3. Redacta motivo del rechazo
4. Sistema envía **email al ciudadano** con el motivo + enlace para responder
5. Caso pasa a estado `RECHAZADO`
6. Se inicia un **plazo de 48 horas** para que el ciudadano responda
7. Ver [Flujo 6: Rechazo y Conversación](#flujo-6-rechazo-y-conversación-con-ciudadano)

### 4.6 No Requiere Gestión (NO_REQUIERE)

1. Funcionario determina que el caso no requiere acción
2. Selecciona tipo "No requiere gestión"
3. Redacta justificación
4. Sistema envía email al ciudadano
5. Caso se cierra

---

## Flujo 5: Reasignación de Casos

### 5.1 Solicitud de Reasignación por Funcionario

**Ruta**: Desde la bandeja de entrada del caso

1. Funcionario determina que el caso no es de su competencia
2. Click en "Solicitar Reasignación"
3. Ingresa motivo detallado
4. Sistema crea `action_log`: `REASSIGNMENT_REQUESTED`
5. Sistema notifica a VU y Personero Municipal
6. Timer de reasignación activo (ventana de 2 minutos en días hábiles)
7. Caso permanece visible pero indica "Reasignación solicitada"

**Endpoint**: `POST /api/v1/casos/[caseId]/proponer-reasignacion`

### 5.2 Aprobación/Rechazo

**Ruta**: `/home/peticiones-reasignacion`

**Aprobar**:
1. Revisor evalúa la solicitud
2. Click en "Aprobar"
3. Sistema cambia `assignment.status = REASSIGNED`
4. Sistema llama a IA para nueva asignación (repite Flujo 2)
5. Nuevo funcionario recibe notificación

**Rechazar**:
1. Ingresa motivo del rechazo
2. Sistema notifica al funcionario original
3. Funcionario debe continuar con el caso

**Endpoints**:
- `POST /api/v1/peticiones-reasignacion/[id]/aprobar`
- `POST /api/v1/peticiones-reasignacion/[id]/rechazar`
- `POST /api/v1/peticiones-reasignacion/[id]/cambiar-asignacion`

---

## Flujo 6: Rechazo y Conversación con Ciudadano

### 6.1 Caso Rechazado → Ciudadano Responde

1. Funcionario rechaza caso (Flujo 4.5)
2. Ciudadano recibe email con enlace a **portal de consulta**
3. Ciudadano ingresa número de radicado en `/atencion-ciudadano/consultar`
4. Sistema muestra el rechazo y un **campo para responder**
5. Ciudadano escribe respuesta y la envía
6. Sistema registra respuesta como mensaje de conversación (rol: `CIUDADANO`)
7. El caso en la bandeja del funcionario muestra badge "Respuesta ciudadana"

**Endpoint**: `POST /api/v1/cases/[id]/citizen-response`

### 6.2 Funcionario Continúa el Caso (Chat)

1. Funcionario ve el badge "Respuesta pendiente" en la pestaña "Rechazados"
2. Click en "Continuar caso"
3. Se abre un **modal de chat** con el historial de conversación
4. Funcionario puede:
   - Escribir un nuevo mensaje al ciudadano
   - Adjuntar un archivo
   - Finalizar la conversación respondiendo formalmente

**Endpoint**: `POST /api/v1/solicitudes/[id]/responder` (con contexto de conversación)

### 6.3 Expiración del Plazo

- Si el ciudadano **no responde en 48 horas**, el caso expira
- El caso queda en estado `RECHAZADO` sin posibilidad de respuesta
- El sistema muestra `expiresAt` en la tarjeta del caso

---

## Flujo 7: Solicitud de Cierre de Caso

**Ruta**: `/home/cierre-casos` (solo Personero Municipal)

### 7.1 Funcionario Solicita Cierre

1. Desde la bandeja de entrada, funcionario selecciona "Cierre" como tipo de respuesta
2. Ingresa motivo/justificación del cierre
3. Sistema marca caso con `metadata.pendienteCierre = true`
4. El caso queda pendiente de aprobación del Personero

### 7.2 Personero Aprueba/Rechaza Cierre

1. Personero accede a `/home/cierre-casos`
2. Ve lista de casos pendientes de cierre con:
   - Información del caso + ciudadano
   - Motivo del cierre solicitado
   - Historial de conversación (preview)
3. **Aprobar**: Se ejecuta la respuesta de cierre → email al ciudadano → caso CERRADO
4. **Rechazar**: Caso vuelve a gestión del funcionario (`cierreRechazado = true`)

**Endpoints**:
- PATCH `/api/v1/solicitudes/[id]` (metadata)
- POST `/api/v1/solicitudes/[id]/responder` (cierre aprobado)

---

## Flujo 8: Semáforo de Término Legal

Cada caso tiene un **semáforo visual** que indica la proximidad al vencimiento del plazo legal.

| Color | Condición | Significado |
|-------|-----------|-------------|
| 🟢 Verde | > 50% del plazo restante | Dentro del tiempo |
| 🟡 Amarillo | ≤ 50% del plazo restante | Próximo a vencer |
| 🔴 Rojo | Plazo vencido | Fuera de término |
| ✅ Respondido | Caso cerrado | Ya fue respondido |

**Campos relevantes**:
- `fechaVencimiento`: Fecha límite del caso
- `semaforoTermino`: `'verde' | 'amarillo' | 'rojo' | 'respondido'`
- `respondedAt`: Timestamp de respuesta
- `respondidoDentroDelTermino`: boolean — si se respondió antes del vencimiento

**Cálculo**: Se basa en días hábiles (excluye fines de semana y festivos colombianos).

---

## Flujo 9: Consulta de Estado por Ciudadano

**Ruta**: `/atencion-ciudadano/consultar`

1. Ciudadano ingresa número de radicado (ej: `PER-2026-00001`)
2. Sistema busca caso vía `/api/v1/cases/filing/[filingNumber]` o `/api/v1/cases/public/status`
3. Muestra:
   - Estado actual del caso (con texto amigable)
   - Fecha de radicación
   - Tiempo transcurrido y tiempo restante
   - Si fue rechazado: muestra motivo + campo para responder
   - Si fue cerrado: muestra la respuesta final
4. Si hay documentos públicos → descargables vía `/api/v1/cases/[id]/documents/public`

**Endpoint**: `GET /api/v1/cases/public/status?filingNumber=[numero]`

---

## Flujo 10: Registro de Atenciones (Auxiliar)

### 10.1 Crear Registro

**Ruta**: `/home/atencion-usuario`

1. Auxiliar llena formulario de atención con campos demográficos:
   - Fecha, Nombre, Tipo/Número Documento, Edad, Teléfono, Género
   - Discapacidad, Etnia, Escolaridad, EPS, Barrio
   - Delegatura, Asunto, Descripción, Responsable del Caso
2. Campos con listas desplegables configurables (Delegatura, Asunto, EPS, Discapacidad, Etnia, Responsable)
3. Click "Guardar Registro" → se guarda vía API en la base de datos

**Endpoint**: `POST /api/v1/attendance-records`

### 10.2 Ver y Buscar Registros

**Ruta**: `/home/registro`

- **PC**: Tabla Excel editable con todas las columnas, búsqueda por texto, filtros de fecha
- **Celular**: Cards simplificadas con campos clave (Fecha, Nombre, Asunto, Delegatura, Responsable)
- Filtrar por rango de fechas (Desde/Hasta → botón "Filtrar")
- Descargar Excel (en celular: solo tras aplicar filtro, descarga datos filtrados)

**Endpoints**:
- `GET /api/v1/attendance-records`
- `PUT /api/v1/attendance-records/[id]` (edición inline)
- `POST /api/v1/attendance-records/bulk` (migración)

---

## Flujo 11: Impresión de Radicado

**Ruta**: `/home/imprimir-radicado`

1. Ventanilla Única accede a la página (solo visible para rol VU, solo en PC)
2. Puede llegar con parámetro `?radicado=PER-2026-00001`
3. Sistema busca caso por número de radicado vía `/api/v1/casos/radicado/[numero]`
4. Genera formato de impresión con:
   - Logo institucional
   - Número de radicado
   - Datos del ciudadano
   - Asunto y fecha
5. Botón "Imprimir" → lanza `window.print()`

---

## Flujo 12: Gestión de Auxiliares

**Ruta**: `/home/auxiliares`

**Acceso**: Funcionario, Personero Municipal, Admin

1. Funcionario ve lista de sus auxiliares actuales (máximo 2 activos)
2. Click "Nuevo Auxiliar" → formulario con: Nombre, Cédula, Email, Contraseña
3. Sistema crea usuario con rol `AUXILIAR_ATENCION_USUARIO`
4. Auxiliar puede iniciar sesión y acceder a:
   - Formulario de Atención al Usuario
   - Registro de Atenciones

**Endpoint**: `GET/POST /api/v1/usuarios/auxiliares`

---

## Flujo 13: Formulario de Contacto

**Ruta**: `/atencion-ciudadano/contacto`

1. Ciudadano llena formulario público de contacto
2. Campos: Nombre, Email, Asunto, Mensaje
3. Sistema envía email a la Personería con los datos del contacto
4. No crea un caso formal, es solo un mensaje informativo

**Endpoint**: `POST /api/v1/contact`

---

## Flujo 14: Pestañas Exclusivas del Personero

### 14.1 Seguimiento General

- Personero ve **todos los casos activos** de toda la personería
- Puede ver detalles de cualquier caso sin importar a quién esté asignado
- Vista consolidada para supervisión

### 14.2 Invitaciones

- Personero ve casos que requieren su intervención directa
- Puede responder directamente o enviar "Invitación" (comunicación especial)

### 14.3 Leídos

- Pestaña que almacena los casos que el Personero ha marcado como leídos
- Ayuda a organizar qué casos ya revisó
- **Exclusivo del Personero** — no visible para Funcionario ni Ventanilla Única

---

## Flujo 15: Generación de Reportes

**Endpoint**: `POST /api/v1/reports/generate`

1. Sistema genera reportes con filtros por rango de fechas
2. Se almacenan como documentos descargables
3. Disponibles vía `/api/v1/reports/download/[id]`

### Métricas disponibles
- `GET /api/v1/metrics` — Métricas generales del sistema
- `GET /api/v1/dashboard/stats` — Estadísticas del dashboard por rol
- `GET /api/v1/dashboard/casos-prioritarios` — Casos que requieren atención inmediata
- `GET /api/v1/dashboard/productividad` — Métricas de productividad por funcionario
- `GET /api/v1/dashboard/alertas` — Alertas activas

---

## Flujo 16: Panel de Administración

**Ruta base**: `/admin`

| Página | Función |
|--------|---------|
| `/admin/home` | Dashboard administrativo |
| `/admin/usuarios` | CRUD de usuarios del sistema |
| `/admin/cargos` | Gestión de roles/cargos |
| `/admin/cases` | Vista de todos los casos |
| `/admin/cases/[id]` | Detalle de un caso específico |
| `/admin/inbox` | Bandeja de entrada administrativa |
| `/admin/inbox/pending` | Casos pendientes |
| `/admin/inbox/overdue` | Casos vencidos |
| `/admin/solicitudes/[id]` | Detalle de solicitud |
| `/admin/reports` | Reportes |
| `/admin/metrics` | Métricas del sistema |
| `/admin/notifications` | Gestión de notificaciones |
| `/admin/settings` | Configuración general |
| `/admin/sla-config` | Configuración de SLAs/plazos |
| `/admin/supervision` | Supervisión de funcionarios |
| `/admin/system` | Información del sistema |

---

## Flujo 17: Autenticación y Sesión

### 17.1 Login

**Ruta**: `/` (página principal) o `/admin/login` (admin)

1. Usuario ingresa email y contraseña
2. Sistema valida credenciales vía `POST /api/v1/auth/login`
3. Si correcto → genera JWT token + guarda en cookies
4. Redirige al dashboard según rol:
   - VU → `/home` (dashboard VU)
   - Funcionario → `/home` (dashboard funcionario)
   - Personero → `/home` (dashboard personero)
   - Admin → `/admin/home`

### 17.2 Verificación de Sesión

- `GET /api/v1/auth/me` — Retorna datos del usuario autenticado + rol
- Cada página protegida valida la sesión al cargar

### 17.3 Logout

- `POST /api/v1/auth/logout` — Elimina la cookie de sesión
- Redirige a la página de login

### 17.4 Registro (Admin)

- `POST /api/v1/auth/register` — Crear nuevos usuarios (solo admin)

---

## Flujo 18: Gestión de Documentos Adjuntos

### 18.1 Subida de Documentos

- **Por ciudadano (público)**: `POST /api/v1/documents/upload-public`
- **Por funcionario (autenticado)**: `POST /api/v1/upload`
- **Asociar a caso**: `POST /api/v1/cases/[id]/documents`

### 18.2 Restricciones

- Tamaño máximo: **10 MB**
- Tipos permitidos: PDF, Word (doc/docx), JPG, PNG
- Almacenamiento: **Vercel Blob Storage** (nube)
- Acceso: Público por URL

### 18.3 Consulta de Documentos

- `GET /api/v1/cases/[id]/documents` — Documentos internos (autenticado)
- `GET /api/v1/cases/[id]/documents/public` — Documentos públicos (ciudadano)

---

## Flujo 19: Configuración de Listas Desplegables

**Acceso**: Desde el formulario de Atención al Usuario (botón "Configurar Listas")

**Categorías configurables**:
- Responsable del Caso
- Delegatura
- Asunto
- Discapacidad
- Etnia
- EPS

**Operaciones**:
- `GET /api/v1/dropdown-options` — Listar todas las opciones
- `POST /api/v1/dropdown-options` — Crear nueva opción
- `DELETE /api/v1/dropdown-options/[id]` — Eliminar opción

---

## Flujo 20: Directorio de Correos Electrónicos

Usado al escalar/remitir casos a entidades externas.

- `GET /api/v1/email-directory` — Listar directorio completo
- El funcionario busca y selecciona correos al usar tipos de respuesta ESCALAR o REMITIR
- Incluye autocompletado con búsqueda en tiempo real

---

## Estados del Sistema

### Estados de Caso (CaseState)

| Código | Nombre | Descripción | isFinal |
|--------|--------|-------------|---------|
| NUEVO | Nuevo | Recién creado, sin asignar | No |
| ASIGNADO | Asignado | Asignado a funcionario | No |
| EN_REVISION | En Revisión | Funcionario revisando | No |
| EN_PROCESO | En Proceso | Funcionario trabajando | No |
| PENDIENTE_INFO | Pendiente Información | Esperando datos del ciudadano | No |
| RECHAZADO | Rechazado | Rechazado, esperando respuesta ciudadana | No |
| CERRADO | Cerrado | Finalizado con respuesta | Sí |
| ANULADO | Anulado | Cancelado por razones válidas | Sí |
| REFERIDO | Referido | Enviado a otra entidad | Sí |

### Estados de Asignación (Assignment.status)

| Estado | Descripción |
|--------|-------------|
| PENDING | Asignado, pendiente aceptación |
| ACCEPTED | Funcionario aceptó |
| IN_PROGRESS | Funcionario trabajando |
| COMPLETED | Caso finalizado |
| REASSIGNED | Reasignado a otro funcionario |

### Tipos de Acción (ActionLog.action)

| Tipo | Cuándo se registra |
|------|-------------------|
| CASE_CREATED | Al crear el caso |
| ASSIGNMENT_CREATED | Al asignar caso |
| ASSIGNMENT_ACCEPTED | Funcionario acepta |
| ASSIGNMENT_STARTED | Funcionario inicia trabajo |
| STATE_CHANGED | Cambio de estado |
| REASSIGNMENT_REQUESTED | Funcionario solicita reasignación |
| REASSIGNMENT_APPROVED | Se aprueba reasignación |
| REASSIGNMENT_REJECTED | Se rechaza reasignación |
| CASE_CLOSED | Caso finalizado |
| DOCUMENT_UPLOADED | Documento subido |
| EMAIL_SENT | Email enviado |

---

## Notificaciones y Alertas

### Emails Automáticos

| Destinatario | Evento | Template |
|-------------|--------|----------|
| Ciudadano | Solicitud recibida | Confirmación con radicado |
| Ciudadano | Respuesta de cierre | Respuesta completa del funcionario |
| Ciudadano | Rechazo del caso | Motivo + enlace para responder |
| Ciudadano | Solicitud de información | Pregunta del funcionario |
| Ciudadano | Remisión a entidad | Información de la remisión |
| Funcionario | Nueva asignación | Datos del caso asignado |
| Funcionario | Reasignación aprobada | Nuevo caso reasignado |
| Funcionario | Reasignación rechazada | Debe continuar con el caso |
| Entidad externa | Escalamiento/Remisión | Comunicación oficial |

### Badges en Dashboard

**Ventanilla Única**: Nuevas Solicitudes, Reasignar Caso
**Funcionario**: Bandeja de Entrada (casos nuevos/pendientes), Casos Prioritarios
**Personero Municipal**: Todos los anteriores + Seguimiento General, Invitaciones, Cierre de Casos

### Notificaciones Internas

- `POST /api/v1/notifications/process` — Procesar notificaciones pendientes
- `GET /api/v1/notifications/history` — Historial de notificaciones
- `POST /api/v1/notifications/test` — Test de notificación

---

## Reglas de Negocio Críticas

### 1. Email Obligatorio para Finalizar
Un caso **SOLO** se cierra si el email al ciudadano se envía exitosamente. Si falla → caso permanece abierto.

### 2. Balanceo de Carga en Asignación
La IA siempre asigna al funcionario con **menor carga de trabajo** dentro del rol recomendado.

### 3. Plazos Legales en Días Hábiles
Cada tipo de caso tiene un plazo legal que se calcula excluyendo fines de semana y festivos colombianos.

### 4. Prioridad Automática para Tutelas
Casos que contienen "tutela" son automáticamente prioridad 5 (Crítico) con plazo de 10 días.

### 5. Historial Inmutable
Todo cambio de estado y asignación se registra en `case_state_history`, `case_assignment_history` y `action_logs`.

### 6. Ventana de Reasignación
El funcionario tiene una ventana limitada (calculada en días hábiles) para solicitar reasignación después de recibir un caso.

### 7. Plazo de Respuesta Ciudadana (Rechazos)
El ciudadano tiene **48 horas** para responder a un caso rechazado. Después expira.

### 8. Límite de Auxiliares
Cada funcionario puede crear máximo **2 auxiliares activos**.

---

## Mapeo de Rutas y Endpoints

### Páginas Públicas

| Ruta | Función |
|------|---------|
| `/` | Login + Landing page |
| `/atencion-ciudadano` | Portal del ciudadano |
| `/atencion-ciudadano/solicitud` | Formulario de solicitud |
| `/atencion-ciudadano/consultar` | Consultar estado por radicado |
| `/atencion-ciudadano/contacto` | Formulario de contacto |
| `/la-personeria` | Información institucional |
| `/servicios` | Servicios de la personería |
| `/transparencia` | Información de transparencia |
| `/privacidad` | Política de privacidad |

### Páginas Internas (autenticadas)

| Ruta | Rol(es) | Función |
|------|---------|---------|
| `/home` | Todos | Dashboard principal según rol |
| `/home/bandeja-entrada` | VU, Func, Personero | Bandeja de casos |
| `/home/casos/nuevo` | VU | Crear caso presencial |
| `/home/imprimir-radicado` | VU (solo PC) | Imprimir radicado |
| `/home/registro` | VU, Aux | Registro de atenciones (tabla) |
| `/home/atencion-usuario` | VU, Aux | Formulario de atención |
| `/home/auxiliares` | Func, Personero | Gestión de auxiliares |
| `/home/peticiones-reasignacion` | VU, Personero | Aprobar/rechazar reasignaciones |
| `/home/reasignaciones` | VU, Personero | Vista de reasignaciones |
| `/home/cierre-casos` | Personero | Aprobar/rechazar cierres |
| `/home/cargos` | Admin | Gestión de cargos |
| `/home/usuarios` | Admin | Gestión de usuarios |

### APIs Principales

| Método | Endpoint | Función |
|--------|----------|---------|
| POST | `/api/v1/cases/general-request` | Crear caso (ciudadano) |
| POST | `/api/v1/ai/analyze-and-assign` | Crear caso y asignar con IA |
| GET | `/api/v1/solicitudes/bandeja-entrada` | Listar casos en bandeja |
| GET | `/api/v1/solicitudes/[id]` | Detalle de caso |
| POST | `/api/v1/solicitudes/[id]/responder` | Responder/cerrar caso |
| PATCH | `/api/v1/solicitudes/[id]` | Actualizar metadata del caso |
| GET | `/api/v1/cases/public/status` | Consulta pública de estado |
| POST | `/api/v1/cases/[id]/citizen-response` | Respuesta ciudadana (rechazo) |
| POST | `/api/v1/cases/[id]/documents` | Subir documento a caso |
| POST | `/api/v1/upload` | Subir archivo genérico |
| GET | `/api/v1/reasignaciones/pendientes` | Solicitudes de reasignación |
| GET | `/api/v1/peticiones-reasignacion` | Listar peticiones de reasignación |
| POST | `/api/v1/peticiones-reasignacion/[id]/aprobar` | Aprobar reasignación |
| POST | `/api/v1/peticiones-reasignacion/[id]/rechazar` | Rechazar reasignación |
| GET | `/api/v1/dashboard/stats` | Estadísticas dashboard |
| GET | `/api/v1/dashboard/casos-prioritarios` | Casos prioritarios |
| GET | `/api/v1/attendance-records` | Listar registros de atención |
| POST | `/api/v1/attendance-records` | Crear registro de atención |
| GET | `/api/v1/dropdown-options` | Listar opciones de listas |
| GET | `/api/v1/email-directory` | Directorio de correos |
| POST | `/api/v1/auth/login` | Autenticación |
| POST | `/api/v1/auth/logout` | Cerrar sesión |
| GET | `/api/v1/auth/me` | Datos del usuario actual |

---

## Conclusión

Este sistema maneja el ciclo completo de atención ciudadana con **20 flujos principales** que cubren:

✅ **Creación**: Ciudadano (web) o Ventanilla Única (presencial)
✅ **Asignación automática**: IA con balanceo de carga
✅ **Gestión diferenciada**: Bandeja con pestañas por rol
✅ **6 tipos de respuesta**: Cierre, Solicitar Info, Escalar, Remitir, Rechazar, No Requiere
✅ **Reasignación**: Solicitud → Aprobación/Rechazo → Nueva asignación IA
✅ **Conversación**: Chat bidireccional funcionario ↔ ciudadano (rechazos)
✅ **Cierre controlado**: Aprobación del Personero para cierre de casos
✅ **Semáforo legal**: Control visual de plazos legales
✅ **Trazabilidad**: Historial inmutable de cada acción
✅ **Registro demográfico**: Atenciones con datos sociodemográficos
✅ **Reportes**: Generación y descarga de informes
✅ **Notificaciones**: Email automáticos + badges en dashboard
✅ **Admin**: Panel completo de configuración y supervisión
