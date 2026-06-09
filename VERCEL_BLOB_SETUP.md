# ============================================================================
# INSTRUCCIONES PARA CONFIGURAR VERCEL BLOB STORAGE
# ============================================================================

## Paso 1: Obtener credenciales de Vercel Blob

1. Ve a: https://vercel.com/dashboard/stores
2. Haz clic en "Create Database" o "Create Store"
3. Selecciona "Blob Store"
4. Dale un nombre: ventanilla-unica-files
5. Copia el token que te da (BLOB_READ_WRITE_TOKEN)

## Paso 2: Agregar a .env.local

Agrega la siguiente línea a tu archivo .env.local:

BLOB_READ_WRITE_TOKEN="vercel_blob_rw_XXXXXXXXXXXXXXXXXXXXXXXXX"

## Paso 3: Reiniciar servidor

Detén el servidor (Ctrl+C) y vuelve a ejecutar:
npm run dev

## ============================================================================
## CÓMO FUNCIONA
## ============================================================================

✅ Los archivos subidos irán a Vercel Blob Storage
✅ Se organizan automáticamente por carpetas: casos/{caseId}/archivo.pdf
✅ La URL del archivo se guarda en la base de datos
✅ Límite de 10MB por archivo
✅ Tipos permitidos: PDF, Word (docx), Imágenes (jpg, png)

## ============================================================================
## ENDPOINTS DISPONIBLES
## ============================================================================

### Subir archivo público (formulario ciudadano):
POST /api/v1/upload
FormData:
  - file: archivo
  - folder: "casos" (opcional)
  - caseId: ID del caso (opcional)

### Subir documento asociado a caso (autenticado):
Ya integrado en el servicio DocumentService.ts

## ============================================================================
## EJEMPLO DE USO EN EL FORMULARIO
## ============================================================================

El formulario ya tiene el campo de subida de archivos.
Cuando el usuario adjunta un archivo:

1. Se valida localmente (tamaño, tipo)
2. Al enviar el formulario, se sube a Vercel Blob
3. Se crea el caso con la URL del archivo
4. El archivo queda asociado al caso en la tabla documents

## ============================================================================
## VENTAJAS DE VERCEL BLOB
## ============================================================================

✅ Escalable y rápido (CDN global)
✅ Sin límite de archivos (pagas por GB usado)
✅ URLs públicas automáticas
✅ Integración nativa con Vercel
✅ Backup automático
✅ No requieres S3 ni configuración compleja

## ============================================================================
## PLAN FREE DE VERCEL BLOB
## ============================================================================

- 1 GB de almacenamiento GRATIS
- Sin límite de bandwidth
- Perfecto para desarrollo y pruebas
- Escala automáticamente si necesitas más

