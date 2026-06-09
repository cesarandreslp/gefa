# Plan — Fase mayor: unificación de login y migración de enums (saneamiento de personería)

> Estado: **propuesta de plan** (no ejecutado). Prepara el retiro del panel Ventanilla heredado (`/home/*`) y la limpieza del núcleo de personería, dejando GEFA como una comisaría de familia coherente. Ejecutar **con entorno de pruebas y backup por tenant** (Neon point-in-time recovery), por fases verificables.

## 1. Estado actual (diagnóstico)

GEFA se clonó de Ventanilla (personería) y se construyó la mitad de comisaría **encima**, sin retirar la heredada. Hoy coexisten:

- **Dos paneles internos:**
  - `/admin/*` — panel de comisaría (menú en `AdminNav.tsx`: Bandeja `/admin/inbox`, Familia `/admin/family`, Expedientes `/admin/cases`, Supervisión, Métricas, Reportes, SLA, Configuración, Entidad, Notificaciones, Sistema).
  - `/home/*` — panel Ventanilla heredado (bandeja-entrada PQRS, casos, cierre-casos, peticiones-reasignacion, reasignaciones, atencion-usuario, auxiliares, cargos, usuarios, configuracion-entidad, editor-landing, imprimir-radicado, registro).
- **Dos flujos de login:**
  - `admin/login/page.tsx` → `/admin/inbox` (comisaría).
  - `components/LoginModal.tsx` (montado en `ClientLayout.tsx`, es el login de la landing) → `/home` o `/home/bandeja-entrada` según el nivel de rol. **Este es el que mantiene vivo `/home`.**
- **Enums del schema con valor de personería:** prácticamente solo `DocumentType.PETITION`. El resto de enums son genéricos (AssignmentStatus, SLAStatus, Channel, Notification*) o ya de familia (PartyRole, ViolenceType, CaseModality, ProtectionMeasureType, MeasureStatus, HearingType, AssessmentType, PardStage, RiskLevel). El estado del caso es la tabla `CaseState` (no enum), ya sembrada con estados de comisaría.
- **Endpoints heredados sin llamadas vivas:** `cases/general-request` y `api/v1/contact` (PQRS); candidatos a retiro.
- **Tipos TS heredados:** `domain/types/CaseTypes.ts` (enums DERECHO_PETICION/TUTELA/QUEJA/PQRS, ROLE_PERMISSIONS, LEGAL_TERMS) usados por `CaseService` como tipos; los valores de personería no se usan para crear casos de familia (que usan `caseType` por code de la BD).

## 2. Objetivo

Un solo panel (`/admin/*`, comisaría), un solo login que entra ahí, sin panel `/home/*` ni vocabulario/enum de personería, **sin pérdida de datos** ni de funciones que la comisaría necesite.

## 3. Precondiciones (antes de tocar producción)

1. **Backup por tenant**: confirmar PITR de Neon o snapshot de cada BD de tenant.
2. **Entorno de pruebas**: una BD de tenant de staging (puede ser el tenant demo `CFBUGA`) para validar cada fase antes del fan-out.
3. **Inventario de uso real**: confirmar con el usuario qué módulos de `/home` usa hoy la operación (si hay tenants productivos) para no retirar algo en uso.
4. **Congelar** cambios funcionales en `/home/*` durante el refactor.

## 4. Plan por fases

### Fase A — Unificación de login y navegación (riesgo: medio; sin tocar BD)

Objetivo: que todo entre a `/admin/*` y `/home/*` deje de ser alcanzable, sin romper sesiones.

1. **Mapa de equivalencias `/home` → `/admin`** (primer entregable de la fase):
   | `/home/*` (Ventanilla) | Destino en `/admin/*` (comisaría) |
   |---|---|
   | `page.tsx` (dashboard) | `/admin` / `/admin/home` |
   | `bandeja-entrada` | `/admin/inbox` |
   | `casos`, `cierre-casos` | `/admin/cases` (+ `/admin/family` para expediente) |
   | `cargos` | `/admin/cargos` |
   | `usuarios`, `registro` | `/admin/usuarios` |
   | `configuracion-entidad` | `/admin/entidad` / `/admin/settings` |
   | `editor-landing` | `/admin/settings` (editor de landing) |
   | `atencion-usuario`, `auxiliares` | evaluar: ¿aplica a comisaría? si no, **retirar** |
   | `peticiones-reasignacion`, `reasignaciones` | flujo PQRS de personería → **retirar** (la comisaría reasigna desde `/admin/cases`) |
   | `imprimir-radicado` | portar utilidad a `/admin/cases` si se usa |
2. **Portar** lo que falte: para cada fila sin equivalente que la comisaría necesite, mover/crear el módulo en `/admin/*`.
3. **Unificar el login**: cambiar `LoginModal.tsx` (y `ClientLayout`) para redirigir a `/admin/inbox` (o `/admin` según rol) en vez de `/home`. Mantener un solo criterio de redirección por rol.
4. **Redirección de compatibilidad**: convertir cada ruta `/home/*` en un `redirect()` a su equivalente `/admin/*` (para no romper enlaces/bookmarks/sesiones abiertas), igual que se hizo de forma controlada en la cara pública.
5. **Verificación**: login de cada rol entra a `/admin`; ninguna navegación llega a una página `/home` real; `npm run type-check` + smoke test manual.
6. **Retiro**: una vez sin tráfico ni enlaces a `/home/*`, eliminar los directorios `/home/*` y los redirects de compatibilidad en una limpieza posterior.

**Rollback Fase A**: es solo código (sin BD). Revertir el commit restaura `/home` y el login anterior.

### Fase B — Migración de enums de personería (riesgo: alto; toca BD de cada tenant)

Sólo `DocumentType` requiere migración (el resto ya es comisaría/genérico). Estrategia **aditiva y reversible**, en tres pasos para evitar downtime y pérdida de datos:

1. **Expandir (aditivo, seguro)**: añadir al enum `DocumentType` los valores de comisaría — `DENUNCIA`, `ACTA`, `AUTO`, `VALORACION`, `OFICIO`, `CITACION` — **sin eliminar** los actuales (`PETITION`, etc.). En Postgres, `ALTER TYPE ... ADD VALUE` es aditivo y no reescribe datos. Aplicar vía fan-out con `scripts/migrate-tenant-dbs.js` (idempotente, por tenant, con reporte de éxito/fallo).
2. **Migrar UI y backfill**: el `UploadDocumentForm` y demás selects pasan a usar los valores nuevos; opcional: `UPDATE documents SET document_type='DENUNCIA' WHERE document_type='PETITION'` por tenant (backfill controlado, con conteo previo).
3. **Contraer (diferido, opcional)**: una vez que no queden filas con los valores viejos, retirarlos del enum. Postgres no permite quitar valores de enum directamente: requiere recrear el tipo (crear enum nuevo → migrar columna → drop viejo) — **paso más delicado, se hace al final, con backup y validación de conteo en cero**.

**Rollback Fase B**: los pasos 1–2 son reversibles (los valores viejos siguen existiendo). El paso 3 sólo se ejecuta con datos ya migrados; ante duda, no ejecutarlo (los valores viejos sin uso no estorban).

**Mecánica multitenant** (ya existe): `scripts/migrate-tenant-dbs.js` carga `.env`, recorre los tenants del control plane y aplica el cambio en cada `databaseUrl`. Debe ser idempotente (`ADD VALUE IF NOT EXISTS`) y registrar resultado por tenant. Correr primero contra el tenant de staging.

### Fase C — Retiro de núcleo heredado muerto (riesgo: bajo-medio)

1. Retirar endpoints `cases/general-request` y `api/v1/contact` (sin llamadas vivas; confirmar con grep + logs).
2. Limpiar `domain/types/CaseTypes.ts`: quitar los enums de personería (DERECHO_PETICION/TUTELA/QUEJA/PQRS) y dejar solo lo que `CaseService` use realmente, o sustituir esas referencias por los catálogos de familia.
3. Sanear textos/labels visibles restantes (correos `EmailService`, mensajes del panel) — capa segura, sin enums.

## 5. Orden de ejecución recomendado

1. Precondiciones (backup + staging).
2. **Fase A** (login/navegación) — entrega el mayor valor visible con riesgo acotado y sin BD.
3. **Fase C.1–C.3** (retiro de muerto + textos) — limpieza de bajo riesgo.
4. **Fase B** pasos 1–2 (enum aditivo + UI) — en staging y luego fan-out.
5. **Fase B** paso 3 (contracción del enum) — sólo si se decide, con datos migrados y backup.

## 6. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Retirar un módulo `/home` aún en uso | Inventario + redirects de compatibilidad antes del retiro definitivo |
| Migración de enum corrompe datos | Estrategia aditiva; backfill con conteo; contracción diferida con backup |
| Fan-out falla en algún tenant | Script idempotente, por tenant, con reporte; reintentos; correr en staging primero |
| Sesiones abiertas en `/home` durante el cambio | Redirects de compatibilidad mantienen la navegación |
| Pérdida de funciones que la comisaría sí necesita | Mapa de equivalencias revisado con el usuario antes de retirar |

## 7. Criterios de cierre

- Login de todos los roles entra a `/admin/*`; `/home/*` no alcanzable (o redirige).
- `grep` de vocabulario de personería sin resultados en UI/correos.
- `DocumentType` con valores de comisaría; documentos existentes migrados.
- `general-request`/`contact`/enums muertos retirados; `npm run type-check` y build en verde.
- Bitácora actualizada por fase.
