# Configurar Email con Gmail

## Problema
Gmail rechaza la contraseña normal por seguridad. Error: `Username and Password not accepted`

## Solución: Usar App Password

### Paso 1: Activar Verificación en 2 Pasos
1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. Seguridad → Verificación en 2 pasos
3. Actívala si no la tienes

### Paso 2: Generar App Password
1. Ve a: https://myaccount.google.com/apppasswords
2. Nombre de la app: "Ventanilla Única"
3. Genera la contraseña
4. **Copia** la contraseña de 16 caracteres (sin espacios)

### Paso 3: Actualizar .env.local
Reemplaza el valor de `SMTP_PASS` con la App Password:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=pinedaestiven@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  ← REEMPLAZAR con App Password
SMTP_FROM_NAME=Personería Municipal de Guadalajara de Buga
```

### Paso 4: Reiniciar servidor
```bash
# Ctrl+C para detener
npm run dev
```

## Verificación
Intenta finalizar un caso nuevamente. Deberías ver:
```
✅ Conexión SMTP verificada
✅ Email enviado exitosamente
✅ Caso actualizado a estado final
```

## Alternativa: Usar otro servicio SMTP
Si no quieres usar Gmail, puedes usar:
- **SendGrid** (gratis hasta 100 emails/día)
- **Mailgun** (gratis hasta 5000 emails/mes)
- **Amazon SES**
- **Servidor SMTP corporativo**

Solo cambia las variables SMTP_* en `.env.local`
