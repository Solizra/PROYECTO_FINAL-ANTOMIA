# Configuración de Supabase para Emails de Recuperación

## Problema Actual
Al hacer clic en el enlace del email de recuperación, aparece el error:
```
"The server is configured with a public base URL of /PROYECTO_FINAL-ANTOMIA/ - did you mean to visit /PROYECTO_FINAL-ANTOMIA/change-password instead?"
```

## Solución: Configurar URLs en Supabase Dashboard

### Paso 1: Acceder al Dashboard
1. Ve a: https://supabase.com/dashboard
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto: `flwobdnthnnnuwlvpirx`

### Paso 2: Configurar Authentication URLs
1. En el menú lateral, ve a **Authentication**
2. Haz clic en **URL Configuration**

### Paso 3: Configurar las URLs
En la sección **URL Configuration**, configura:

**Site URL:**
```
http://localhost:5173
```

**Redirect URLs (agregar estas URLs):**
```
http://localhost:5173/auth/callback
http://localhost:5173/change-password
http://localhost:5173/
```

### Paso 4: Guardar Configuración
1. Haz clic en **Save** o **Update**
2. Espera unos segundos para que se apliquen los cambios

## Configuración para Producción

Cuando despliegues a producción, actualiza las URLs:

**Site URL:**
```
https://tu-dominio.com
```

**Redirect URLs:**
```
https://tu-dominio.com/auth/callback
https://tu-dominio.com/change-password
https://tu-dominio.com/
```

## Flujo Corregido

Después de la configuración:

1. **Usuario solicita reset** → Ingresa email
2. **Supabase envía email** → Con enlace a `/auth/callback`
3. **Usuario hace clic** → Va a `/auth/callback` con tokens
4. **AuthCallback procesa** → Verifica tokens y redirige a `/change-password`
5. **Usuario cambia contraseña** → Sin necesidad de contraseña anterior

## Verificación

Para verificar que funciona:

1. Ve a la página de login
2. Haz clic en "¿Olvidaste tu contraseña?"
3. Ingresa un email registrado
4. Revisa tu email
5. Haz clic en el enlace
6. Deberías ser redirigido a la página de cambio de contraseña

## Notas Importantes

- ✅ **No necesitas configurar servidor de email** - Supabase lo maneja
- ✅ **Las URLs deben coincidir exactamente** con las configuradas
- ✅ **Para desarrollo**: usa `localhost:5173`
- ✅ **Para producción**: usa tu dominio real
- ✅ **El callback maneja automáticamente** la verificación de tokens
