# 🌱 SISTEMA AUTOMÁTICO DE NOTICIAS CLIMATECH

## 🎯 ¿Qué hace este sistema?

Este sistema **automáticamente**:
1. **Busca noticias** cada minuto desde NewsAPI
2. **Las envía al agente** para análisis de climatech
3. **Crea trends** en la base de datos si son relevantes
4. **Actualiza la tabla** en el frontend en tiempo real
5. **Todo sin que el usuario haga nada**

## 🚀 Cómo iniciar el sistema

### Paso 1: Iniciar el Backend
```bash
cd backend
npm start
```

**Lo que verás:**
```
Server listening on port 3000
🚀 Iniciando programación automática de búsqueda de noticias...
⏰ Programación configurada: ejecutando cada minuto
📅 Próxima ejecución programada según cron: */1 * * * *
```

### Paso 2: Iniciar el Frontend
```bash
cd frontend
npm run dev
```

**Lo que verás:**
```
Local:   http://localhost:5173/
```

### Paso 3: Abrir el navegador
Ve a: `http://localhost:5173`

## ✅ Indicadores visuales en el frontend

### Estado de conexión:
- 🟢 **Conectado**: El frontend está recibiendo actualizaciones en tiempo real
- 🔴 **Desconectado**: Hay problemas de conexión

### Estado de procesamiento:
- ⏳ **"Procesando nuevas noticias..."**: Se están analizando noticias
- 🎉 **"¡Se crearon X nuevos trends!"**: Se agregaron nuevos trends a la tabla

## 🔄 Flujo automático cada minuto

1. **Minuto 0**: El sistema busca noticias de climatech
2. **Minuto 0+30s**: El agente analiza las noticias
3. **Minuto 0+45s**: Se crean trends en la base de datos
4. **Minuto 1**: La tabla se actualiza automáticamente
5. **Se repite** cada minuto indefinidamente

## 📊 Logs del backend (cada minuto)

```
🕐 [22/8/2025, 00:01:00] Iniciando búsqueda de noticias... (máx: 30)
🤖 Enviando 8 URLs al agente para análisis...
✅ Agente terminó el procesamiento de URLs
📊 Trends creados en la base de datos: 3/8
📡 Notificación de trends creados enviada al EventBus: 3 trends
🕐 [22/8/2025, 00:01:00] Búsqueda completada exitosamente
```

## 🧪 Probar el sistema

### Opción 1: Verificar manualmente
```bash
cd backend
npm start
```

### Opción 2: Verificar manualmente
1. Abre el navegador en la página Home
2. Espera 1-2 minutos
3. Observa que la tabla se actualiza automáticamente
4. Los indicadores muestran el estado en tiempo real

## 🔧 Solución de problemas

### La tabla no se actualiza:
1. Verifica que el backend esté corriendo
2. Revisa los logs del backend
3. Verifica que el frontend muestre 🟢 Conectado

### No se crean trends:
1. Verifica que haya newsletters en la base de datos
2. Revisa los logs del agente
3. Verifica la conexión a la base de datos

### Error de conexión:
1. Verifica que ambos servicios estén corriendo
2. Verifica los puertos (3000 para backend, 5173 para frontend)
3. Revisa la consola del navegador

### Error de keys duplicados en React:
1. Verifica que no haya IDs duplicados en la base de datos
2. Si persiste, reinicia el frontend para limpiar el estado
3. Los keys ahora son únicos y no deberían repetirse

## 📝 Archivos clave del sistema

- **`backend/index.js`**: Servidor principal + SSE
- **`backend/APIs/buscarNoticias.mjs`**: Scheduler automático
- **`backend/Agent/main.js`**: Lógica del agente
- **`backend/EventBus.js`**: Sistema de notificaciones
- **`frontend/src/pages/Home.jsx`**: Frontend con actualizaciones en tiempo real

## 🎉 ¡Listo!

Una vez que inicies ambos servicios, el sistema funcionará **completamente automático**. Solo abre el navegador y observa cómo la tabla se actualiza cada minuto sin que hagas nada.

**El usuario no necesita hacer nada más que abrir la página web.**
