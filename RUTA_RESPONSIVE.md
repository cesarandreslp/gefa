# 📱 Ruta de Trabajo — Optimización Responsiva (Móvil / Tablet / PC)

> Checklist completo para hacer la aplicación 100% responsiva.
> Marcar con `[x]` lo completado, `[/]` lo que está en progreso.

---

## Fase 1: Portal Público (Ciudadano) — PRIORIDAD MÁXIMA
Lo que ven los ciudadanos desde su celular.

- [ ] `/` — Landing page (hero, cards de servicios, footer)
- [ ] `/atencion-ciudadano` — Hub de atención (cards de solicitud y contacto)
- [ ] `/atencion-ciudadano/solicitud` — Formulario de solicitud PQRS
- [ ] `/atencion-ciudadano/consultar` — Consulta de estado por radicado
- [ ] `/atencion-ciudadano/contacto` — Formulario de contacto general
- [ ] `/la-personeria` — Página institucional
- [ ] `/servicios` — Listado de servicios
- [ ] `/transparencia` — Documentos y normatividad
- [ ] `/privacidad` — Política de datos

---

## Fase 2: Formulario del Auxiliar de Atención
Permite registro desde tablet en ventanilla.

- [ ] `/home/atencion-usuario` — Formulario de registro presencial (grids, selects, botones)
- [ ] Modal "Configurar Listas" — Responsivo del modal de opciones dinámicas

---

## Fase 3: Dashboards Operativos
Para que funcionarios consulten desde celular.

- [ ] `/home` — Dashboard Operativo (KPIs, tarjetas, tabla de casos prioritarios)
  - [ ] Vista Ventanilla Única
  - [ ] Vista Funcionario / Delegatura
  - [ ] Vista Personero Municipal
- [ ] Página de Login (`/`) — Formulario de inicio de sesión

---

## Fase 4: Páginas Funcionales Internas
Módulos de gestión de casos.

- [ ] `/home/bandeja-entrada` — Tabla de casos con filtros
- [ ] `/home/casos/nuevo` — Formulario de radicación manual
- [ ] `/home/imprimir-radicado` — Vista previa e impresión de radicado
- [ ] `/home/peticiones-reasignacion` — Lista de peticiones (cards móvil)
- [ ] `/home/reasignaciones` — Panel de reasignaciones
- [ ] `/home/cierre-casos` — Panel de cierre de casos

---

## Fase 5: Tabla de Registros (Trazabilidad)
Caso especial por la cantidad de columnas.

- [ ] `/home/registro` — Tabla tipo Excel (scroll horizontal, headers sticky)

---

## Fase 6: Panel Admin
Usado principalmente desde PC, menor prioridad.

- [ ] `/home/usuarios` — Gestión de usuarios
- [ ] `/home/cargos` — Gestión de cargos/roles
- [ ] `/admin/*` — Módulos administrativos avanzados

---

## Estrategia Técnica
- **Media queries globales** en `index.css` con breakpoints: `768px` (tablet), `480px` (móvil).
- **Grids adaptativos:** 3 cols → 2 cols → 1 col según ancho.
- **Tablas:** `overflow-x: auto` con scroll horizontal.
- **Botones:** Stack vertical en móvil.
- **Modales:** `width: 95vw` en móvil, centrado.
- **Fuentes:** Escala reducida en pantallas chicas.
- **Sin cambios en lógica o APIs:** Solo CSS/estilos.
