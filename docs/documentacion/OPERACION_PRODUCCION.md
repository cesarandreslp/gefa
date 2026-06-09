# OPERACIÓN EN PRODUCCIÓN
# Sistema Ventanilla Única - Personería Municipal de Guadalajara de Buga

**Versión:** 1.0.0  
**Fecha:** Enero 13, 2026  
**Responsable:** Equipo Técnico Institucional

---

## 1. ROLES Y RESPONSABILIDADES

### 1.1 Administrador del Sistema (ADMIN)
**Responsabilidades:**
- Configuración de parámetros institucionales
- Gestión de usuarios y permisos
- Monitoreo de salud del sistema
- Revisión de métricas operativas
- Gestión de respaldos
- Coordinación de mantenimientos

**Acceso:**
- Panel administrativo completo
- Configuración del sistema
- Gestión de notificaciones
- Estado y métricas del sistema

### 1.2 Supervisor (SUPERVISOR)
**Responsabilidades:**
- Supervisión de casos asignados
- Revisión de expedientes
- Consulta de métricas
- Estado del sistema (solo lectura)

**Acceso:**
- Supervisión de casos
- Métricas e indicadores
- Reportes
- Estado del sistema (lectura)

### 1.3 Funcionario (FUNCIONARIO)
**Responsabilidades:**
- Gestión de casos asignados
- Respuesta a solicitudes
- Carga de documentos
- Actualización de estados

**Acceso:**
- Bandeja de trabajo personal
- Gestión de casos asignados
- Consulta de métricas propias

### 1.4 Soporte Técnico (Externo/Contratista)
**Responsabilidades:**
- Mantenimiento preventivo
- Resolución de incidentes técnicos
- Actualizaciones de sistema
- Respaldos y restauración

**Acceso:**
- Servidor (SSH si aplica)
- Base de datos (respaldos)
- Logs del sistema
- Sin acceso a datos sensibles de casos

---

## 2. PROCEDIMIENTOS DE DESPLIEGUE

### 2.1 Despliegue de Actualizaciones

#### Pre-despliegue:
1. **Notificación:** Avisar con 48 horas de anticipación
2. **Backup:** Realizar respaldo completo de BD
3. **Validación:** Compilar código sin errores (`npm run build`)
4. **Documentación:** Actualizar CHANGELOG.md

#### Durante despliegue:
1. **Ventana de mantenimiento:** Fuera de horario laboral (después 18:00)
2. **Tiempo estimado:** 30-60 minutos
3. **Proceso:**
   ```bash
   # 1. Detener servidor
   pm2 stop ventanilla-unica
   
   # 2. Actualizar código
   git pull origin main
   
   # 3. Instalar dependencias
   npm install
   
   # 4. Ejecutar migraciones BD
   npx prisma migrate deploy
   
   # 5. Compilar aplicación
   npm run build
   
   # 6. Iniciar servidor
   pm2 start ventanilla-unica
   
   # 7. Verificar salud
   curl http://localhost:3000/api/v1/health
   ```

#### Post-despliegue:
1. **Verificación:** Health check exitoso
2. **Smoke test:** Crear caso de prueba
3. **Monitoreo:** 30 minutos supervisión activa
4. **Rollback:** Plan de reversión si falla

### 2.2 Rollback de Emergencia

Si el despliegue falla:
```bash
# 1. Detener servidor
pm2 stop ventanilla-unica

# 2. Revertir código
git reset --hard HEAD~1

# 3. Restaurar BD (si hay migraciones)
# Usar backup previo al despliegue

# 4. Reinstalar dependencias
npm install

# 5. Compilar versión anterior
npm run build

# 6. Reiniciar
pm2 start ventanilla-unica
```

---

## 3. GESTIÓN DE INCIDENTES

### 3.1 Niveles de Severidad

#### Crítico (P0)
- Sistema completamente caído
- Base de datos inaccesible
- Pérdida de datos
- **Tiempo de respuesta:** Inmediato
- **Tiempo de resolución:** < 2 horas

#### Alto (P1)
- Funcionalidad principal no disponible
- Notificaciones no funcionan
- Usuarios no pueden autenticarse
- **Tiempo de respuesta:** < 1 hora
- **Tiempo de resolución:** < 4 horas

#### Medio (P2)
- Funcionalidad secundaria afectada
- Performance degradado
- Errores intermitentes
- **Tiempo de respuesta:** < 4 horas
- **Tiempo de resolución:** < 1 día

#### Bajo (P3)
- Problemas cosméticos
- Mejoras de usabilidad
- Documentación
- **Tiempo de respuesta:** < 1 día
- **Tiempo de resolución:** < 1 semana

### 3.2 Proceso de Gestión

1. **Detección:**
   - Health check falla
   - Usuario reporta problema
   - Alertas automáticas (si aplica)

2. **Registro:**
   - Documentar en sistema de tickets
   - Asignar severidad
   - Asignar responsable

3. **Diagnóstico:**
   - Revisar `/api/v1/health`
   - Revisar `/api/v1/system/status`
   - Revisar logs: `pm2 logs ventanilla-unica`
   - Verificar BD: `psql -d ventanilla_unica`

4. **Resolución:**
   - Aplicar solución
   - Documentar causa raíz
   - Actualizar conocimiento

5. **Cierre:**
   - Validar con usuario
   - Documentar lecciones aprendidas
   - Actualizar runbooks

---

## 4. ESCALAMIENTO

### 4.1 Cadena de Escalamiento

**Nivel 1: Administrador del Sistema**
- Horario: Lunes a Viernes 8:00-17:00
- Contacto: admin@personeriabuga.gov.co
- Resuelve: Configuración, usuarios, parámetros

**Nivel 2: Soporte Técnico**
- Horario: 24/7 (bajo demanda)
- Contacto: soporte@proveedor.com
- Resuelve: Incidentes técnicos, BD, servidor

**Nivel 3: Proveedor/Desarrollo**
- Horario: Comercial
- Contacto: desarrollo@proveedor.com
- Resuelve: Bugs críticos, cambios de código

### 4.2 Criterios de Escalamiento

- **Escalar a Nivel 2** si:
  - Incidente no resuelto en 1 hora (P0/P1)
  - Requiere acceso a servidor/BD
  - Problema fuera de alcance administrativo

- **Escalar a Nivel 3** si:
  - Bug confirmado en código
  - Requiere cambio de aplicación
  - Incidente no resuelto en 4 horas

---

## 5. BACKUPS Y RECUPERACIÓN

### 5.1 Estrategia de Respaldos

#### Base de Datos (PostgreSQL)
- **Frecuencia:** Diaria (2:00 AM)
- **Retención:** 30 días
- **Ubicación:** Servidor de respaldos + Nube
- **Tipo:** Dump completo

**Script de Backup:**
```bash
#!/bin/bash
# backup-db.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/database"
DB_NAME="ventanilla_unica"

# Crear backup
pg_dump $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Mantener solo últimos 30 días
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

# Copiar a ubicación secundaria
scp $BACKUP_DIR/backup_$DATE.sql.gz usuario@backup-server:/backups/
```

**Automatización (crontab):**
```
0 2 * * * /scripts/backup-db.sh
```

#### Documentos (Vercel Blob / Local)
- **Frecuencia:** Semanal (Domingos 3:00 AM)
- **Retención:** 90 días
- **Ubicación:** Storage secundario
- **Tipo:** Sincronización incremental

### 5.2 Procedimiento de Restauración

#### Restaurar Base de Datos:
```bash
# 1. Detener aplicación
pm2 stop ventanilla-unica

# 2. Crear backup de BD actual (por seguridad)
pg_dump ventanilla_unica > /tmp/pre-restore-backup.sql

# 3. Restaurar desde backup
gunzip < /backups/database/backup_YYYYMMDD_HHMMSS.sql.gz | psql ventanilla_unica

# 4. Validar restauración
psql ventanilla_unica -c "SELECT COUNT(*) FROM \"Case\";"

# 5. Reiniciar aplicación
pm2 start ventanilla-unica

# 6. Verificar health
curl http://localhost:3000/api/v1/health
```

#### Restaurar Documentos:
```bash
# Sincronizar desde backup secundario
rsync -av --progress usuario@backup-server:/backups/documents/ /app/uploads/
```

### 5.3 Verificación de Backups

**Mensual:**
- Restaurar backup en entorno de pruebas
- Validar integridad de datos
- Documentar resultado

**Endpoint de verificación:**
- GET `/api/v1/system/status`
- Campo: `lastBackup` (fecha último backup exitoso)

---

## 6. MANTENIMIENTO

### 6.1 Mantenimiento Preventivo

#### Mensual:
- [ ] Revisar logs del sistema
- [ ] Limpiar notificaciones antiguas (> 90 días)
- [ ] Validar respaldos
- [ ] Actualizar dependencias críticas
- [ ] Revisar métricas de performance

#### Trimestral:
- [ ] Optimización de BD (VACUUM ANALYZE)
- [ ] Revisión de seguridad
- [ ] Actualización de documentación
- [ ] Capacitación a usuarios

#### Anual:
- [ ] Auditoría de seguridad completa
- [ ] Actualización mayor de framework
- [ ] Revisión de arquitectura
- [ ] Plan de mejoras

### 6.2 Ventanas de Mantenimiento

**Regular:**
- Día: Domingos
- Hora: 02:00 - 06:00 AM
- Frecuencia: Mensual (primer domingo)

**Emergencia:**
- Cualquier día/hora
- Notificación mínima: 2 horas
- Solo para incidentes críticos

**Notificación:**
- Email institucional
- Banner en sistema (48h antes)
- Mensaje en login

---

## 7. MONITOREO Y ALERTAS

### 7.1 Endpoints de Monitoreo

#### Health Check (Público)
```
GET /api/v1/health
Frecuencia: Cada 5 minutos
Alerta si: status !== 'healthy'
```

#### Métricas (Admin)
```
GET /api/v1/system/metrics
Frecuencia: Cada 15 minutos
Alerta si:
- pendingNotifications > 100
- averageResponseTime > 10 días
```

#### Estado Detallado (Admin/Supervisor)
```
GET /api/v1/system/status
Frecuencia: Manual
Uso: Diagnóstico
```

### 7.2 Indicadores Clave (KPIs)

- **Disponibilidad:** > 99.5% (objetivo)
- **Tiempo de respuesta:** < 500ms (p95)
- **Casos radicados/día:** Monitoreo
- **Notificaciones pendientes:** < 50
- **Tiempo promedio de resolución:** < 5 días

### 7.3 Logs

**Ubicación:**
- Aplicación: `pm2 logs ventanilla-unica`
- Sistema: `/var/log/`
- BD: PostgreSQL logs

**Retención:** 30 días

**Información NO registrada:**
- Contraseñas
- Tokens completos
- Documentos sensibles
- Datos personales completos

---

## 8. SEGURIDAD OPERATIVA

### 8.1 Control de Acceso

- **Servidor:** SSH con clave, sin password
- **Base de datos:** IP whitelist, credenciales rotadas
- **Admin panel:** 2FA recomendado (futuro)
- **Backups:** Encriptados en tránsito

### 8.2 Endpoints Críticos

Protegidos con autenticación y autorización:
- `/admin/*` - Solo usuarios autenticados
- `/api/v1/settings/*` - Solo ADMIN
- `/api/v1/system/metrics` - Solo ADMIN
- `/api/v1/system/status` - ADMIN + SUPERVISOR

### 8.3 Rate Limiting

Aplicado en:
- Login: 5 intentos/hora
- API pública: 100 requests/15 min
- Formularios: 10 envíos/hora

---

## 9. CHECKLIST DE PRODUCCIÓN

### Pre-Go-Live
- [ ] Migraciones de BD ejecutadas
- [ ] Variables de entorno configuradas
- [ ] SMTP configurado y probado
- [ ] Usuarios admin creados
- [ ] Backups automatizados configurados
- [ ] Health checks funcionales
- [ ] SSL/TLS configurado
- [ ] Firewall configurado
- [ ] Documentación completa
- [ ] Capacitación a usuarios

### Post-Go-Live (Primeras 48h)
- [ ] Monitoreo continuo
- [ ] Validar backups
- [ ] Revisar logs
- [ ] Soporte activo disponible
- [ ] Métricas registradas

### Primera Semana
- [ ] Reunión de revisión
- [ ] Ajustes de configuración
- [ ] Documentar problemas encontrados
- [ ] Optimizaciones necesarias

---

## 10. CONTACTOS DE EMERGENCIA

**Administrador del Sistema:**
- Nombre: [COMPLETAR]
- Email: admin@personeriabuga.gov.co
- Teléfono: [COMPLETAR]

**Soporte Técnico:**
- Nombre: [COMPLETAR]
- Email: soporte@proveedor.com
- Teléfono: [COMPLETAR]
- Horario: 24/7

**Proveedor/Desarrollo:**
- Nombre: [COMPLETAR]
- Email: desarrollo@proveedor.com
- Horario: Lunes-Viernes 8:00-17:00

---

## 11. HISTORIAL DE CAMBIOS

| Fecha | Versión | Cambios | Responsable |
|-------|---------|---------|-------------|
| 2026-01-13 | 1.0.0 | Documento inicial | Sistema |

---

**Nota:** Este documento debe revisarse y actualizarse trimestralmente.

