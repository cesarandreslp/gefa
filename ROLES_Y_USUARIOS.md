# REGLA ESTRÍCTA - ROLES DEL SISTEMA (CAMISA DE FUERZA)

Este documento contiene la **única estructura de roles válida** para el sistema de Ventanilla Única.  
**Por orden estricta, NUNCA se debe asumir la existencia de otro rol** fuera de estos 4. Toda la lógica de autenticación, renderizado y asignación debe basarse pura y exclusivamente en estos códigos.

## Los 4 Tipos de Usuarios y Roles

| Nombre del Usuario (Ejemplo) | Tipo de Usuario        | Rol del Sistema (Código exacto en DB) |
| :---                         | :---                   | :---                                  |
| Roberto Carlos               | Ingeniero en sistemas  | **Administrador** (`ADMIN`)           |
| Andrea Rico                  | Abogada                | **Personero** (`PERSONERO_MUNICIPAL`) |
| Martin de Francisco          | Abogado Delegado       | **Funcionario** (`FUNCIONARIO`)       |
| Carlos Andres Torres         | Auxiliar contable      | **Funcionario** (`FUNCIONARIO`)       |
| Katerin Ortiz                | Auxiliar               | **Ventanilla unica** (`VENTANILLA_UNICA`) |

---

### Notas para desarrollo (IA y Humanos):
1. **No inventar roles:** Si un requerimiento habla de "Delegado", "Director", "Supervisor" o "Auxiliar Contable", **su rol en el sistema sigue siendo `FUNCIONARIO`** o el que aplique según esta tabla. El "Tipo de Usuario" es solo el cargo o la profesión descriptiva en el mundo real, pero a nivel de código (`roleCode`), solo existen los 4 listados aquí.
2. Esta información **jamás será borrada**.
3. Se encuentra replicada en el encabezado del archivo `.env` para máxima visibilidad.
