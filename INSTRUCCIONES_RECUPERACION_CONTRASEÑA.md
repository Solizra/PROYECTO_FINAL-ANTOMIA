# Sistema de Recuperación de Contraseña - AntomIA

## Descripción

Se ha implementado un sistema completo de recuperación y cambio de contraseña usando **Supabase** para el manejo de emails. Dos flujos principales:

### 1. Cambio de Contraseña (Usuario Logueado)
- **Ubicación**: Página de Perfil
- **Funcionalidad**: Botón "Cambiar contraseña" que redirige a una página dedicada
- **Validación**: Requiere contraseña actual + nueva contraseña

### 2. Recuperación de Contraseña (Usuario No Logueado)
- **Ubicación**: Página de Login
- **Funcionalidad**: Enlace "¿Olvidaste tu contraseña?" que usa Supabase para enviar email
- **Proceso**: 
  1. Usuario ingresa email
  2. Supabase verifica que el email existe automáticamente
  3. Supabase envía email con enlace de recuperación
  4. Usuario hace clic en el enlace y establece nueva contraseña

## Archivos Creados/Modificados

### Frontend
- `frontend/src/pages/ForgotPassword.jsx` - Página para solicitar reset
- `frontend/src/pages/ForgotPassword.css` - Estilos para forgot password
- `frontend/src/pages/ChangePassword.jsx` - Página para cambiar contraseña
- `frontend/src/pages/ChangePassword.css` - Estilos para change password
- `frontend/src/components/LoginForm.jsx` - Agregado enlace "¿Olvidaste tu contraseña?"
- `frontend/src/pages/Perfil.jsx` - Agregado botón "Cambiar contraseña"
- `frontend/src/App.jsx` - Agregadas nuevas rutas

### Backend
- **No se requieren cambios en el backend** - Todo se maneja desde el frontend con Supabase

## Configuración Requerida

### ✅ **¡No se requiere configuración adicional!**

El sistema usa **Supabase** para manejar completamente el envío de emails de recuperación. Supabase ya está configurado en tu proyecto y maneja automáticamente:

- ✅ Verificación de emails existentes
- ✅ Envío de emails de recuperación
- ✅ Generación de tokens seguros
- ✅ Validación de enlaces de reset

## Rutas del Sistema

### Frontend
- `/forgot-password` - Solicitar reset de contraseña
- `/change-password` - Cambiar contraseña (con o sin token)

### Backend
- **No se requieren endpoints adicionales** - Todo se maneja con Supabase

## Flujo de Funcionamiento

### Flujo 1: Cambio desde Perfil
1. Usuario logueado va a Perfil
2. Hace clic en "Cambiar contraseña"
3. Ingresa contraseña actual y nueva
4. Sistema actualiza contraseña en Supabase

### Flujo 2: Recuperación por Email
1. Usuario no logueado hace clic en "¿Olvidaste tu contraseña?"
2. Ingresa su email registrado
3. Supabase verifica automáticamente que el email existe
4. Supabase envía email con enlace personalizado
5. Usuario hace clic en el enlace
6. Establece nueva contraseña
7. Supabase actualiza la contraseña automáticamente

## Características de Seguridad

- ✅ Validación de email existente antes de enviar
- ✅ Tokens únicos para cada solicitud
- ✅ Enlaces con expiración (1 hora)
- ✅ Validación de contraseñas (mínimo 6 caracteres)
- ✅ Confirmación de contraseña nueva
- ✅ Manejo de errores robusto
- ✅ Interfaz responsive y accesible

## Pruebas

### Probar Cambio desde Perfil
1. Inicia sesión en la aplicación
2. Ve a Perfil
3. Haz clic en "Cambiar contraseña"
4. Completa el formulario

### Probar Recuperación por Email
1. Ve a la página de Login
2. Haz clic en "¿Olvidaste tu contraseña?"
3. Ingresa un email registrado
4. Revisa tu bandeja de entrada
5. Haz clic en el enlace del email
6. Establece nueva contraseña

## Notas Importantes

- ✅ **El sistema usa Supabase** para la gestión completa de usuarios y emails
- ✅ **No se requiere configuración de servidor de email** - Supabase lo maneja todo
- ✅ **El frontend está configurado** para desarrollo (localhost:5173)
- ✅ **El sistema es compatible** con el flujo de autenticación existente
- ✅ **Más simple y seguro** - Sin dependencias adicionales ni configuración compleja
