# Plan de Trabajo: Cumplimiento de Anexos 1 y 2 (Resolución 1519 de MinTIC)

Este plan detalla las acciones necesarias para ajustar la "Ventanilla Única Base" y hacerla 100% compatible con los lineamientos del Gobierno Nacional (GOV.CO) descritos en el Anexo 1 (Accesibilidad Web - WCAG 2.1 AA) y el Anexo 2 (Estándares de Publicación gubernamental), asumiendo la madurez actual del proyecto (donde la funcionalidad núcleo de PQRSD ya está implementada).

## User Review Required
> [!IMPORTANT]
> Lee cuidadosamente las fases propuestas. Una vez revisadas y aprobadas, procederé a ejecutar los cambios paso a paso de manera estructurada.

---

## Fase 1: Alineación Visual y Estructural GOV.CO (Anexo 2) ✅ [COMPLETADO]

### 1. Header y Navegación
- **Top Bar GOV.CO (✅ Completado):** Añadimos la barra superior (Top Bar) con el logo de GOV.CO y el enlace correcto.
- **Menús Obligatorios (✅ Completado):** Reorganizamos la navegación principal asegurando los 3 menús: `Transparencia`, `Atención`, y `Participa`.

### 2. Footer Institucional
- **Logo CO y GOV.CO (✅ Completado):** Incorporamos los escudos y logos institucionales exigidos.
- **Datos de Contacto (✅ Completado):** Las notificaciones judiciales y teléfonos +57 están estandarizados.
- **Políticas Públicas (✅ Completado):** Los enlaces obligatorios de privacidad o PQRSD están vinculados al final de la página.

---

## Fase 2: Portal de Transparencia y Rendición de Cuentas (Anexo 2)

- **Estructura Base de Transparencia:** Estructurar el esqueleto básico en la ruta `/transparencia` con una tabla de contenidos y jerarquía para documentos normativos (Decretos, Estructura orgánica, plan de compras, presupuesto, información contractual, SIGEP, etc.). 
- **Objetivo:** Dejar las pantallas de publicación e índices listos para que cada entidad (tenant) pueda luego cargar sus PDFs y enlaces sin que falte ninguna sección obligatoria.

---

## Fase 3: Accesibilidad Universal (Anexo 1 - WCAG 2.1 AA)

### 1. Perceptible (Visual y Semántica)
- **Contraste de Color y Tamaños:** Ajustar las hojas de estilos globales para que los contrastes sean aptos para lectura. Validar que la interfaz aguante un zoom del 200% sin generar scroll lateral que impida la navegabilidad.

### 2. Operable (Navegación por Teclado y Ayudas Especiales)
- **Focus States (Teclado):** Establecer indicadores visuales (`outline`) claros y de alto contraste cuando los usuarios de teclado hagan "Tab" a través de nuestro formulario de creación de solicitudes y el menú del sistema.
- **Skip Link:** Garantizar la existencia del enlace "Saltar al contenido principal" (generalmente oculto hasta que se presiona Tab al inicio).

### 3. Comprensible
- **Etiquetas en el flujo PQRSD existente:** Validar que todos los campos del PQRSD actual tengan etiquetas asociadas de forma programática (aria-labels o labels correctos) y garantizar que el botón de envío advierte antes sobre los términos de privacidad si hace falta.

---

## Fase 4: Seguridad Digital y Retoques Finales (Anexo 2)
- **Revisión de Seguridad:** Realizar una validación rápida del uso de tokens (ej. `HttpOnly` cookies, si aplica) y remover cualquier meta-etiqueta en las cabeceras que delate innecesariamente la infraestructura backend.

## Open Questions
> [!WARNING]
> 1. Para la **Top Bar Gobernamental (GOV.CO)**: Considerando que es obligatoria para el Estado, ¿Hacemos que sea fija y siempre visible, o permitimos que se oculte u omita para casos especiales desde la creación del *Tenant* en el Super Admin de OSS?
> 2. Una vez aprobado este plan, ¿empezamos de inmediato con la Fase 1 (Diseñar y agregar la Top Bar y los Menús Obligatorios)?

## Verification Plan
1. **Verificación visual:** Ejecutaremos herramientas de revisión rápida de contraste sobre los colores del sistema.
2. **Auditoría GOV.CO:** Revisaremos el menú principal de `/home` para comprobar visualmente la barra gubernamental y los 3 enlaces.
3. **PQRSD intacto:** Validaremos que el registro exitoso actual de solicitudes (Ventanilla Única) permanezca completamente funcional y ahora esté atado correctamente al menú de *Atención a la Ciudadanía*.
