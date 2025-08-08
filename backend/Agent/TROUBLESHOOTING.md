# 🔧 SOLUCIÓN DE PROBLEMAS - CLIMATECH NEWS ANALYZER

## ❌ Errores Comunes y Soluciones

### 1. Error: "respuesta.trim is not a function"

**Problema**: El LLM devuelve un objeto en lugar de un string.

**Solución**: ✅ **SOLUCIONADO** - Se agregó la función `procesarRespuestaLLM()` que maneja diferentes tipos de respuesta del LLM.

### 2. Error: "Operation timed out after 60 seconds"

**Problema**: El LLM tarda demasiado en responder.

**Soluciones**:
- Verificar que Ollama esté ejecutándose: `ollama serve`
- Verificar que el modelo esté descargado: `ollama list`
- Descargar el modelo si no está: `ollama pull qwen3:1.7b`
- Aumentar el timeout en la configuración del LLM

### 3. Error: "Error HTTP: 404" al obtener newsletters

**Problema**: El backend no está ejecutándose o la ruta no existe.

**Soluciones**:
- Verificar que el backend esté ejecutándose en `http://localhost:3000`
- Verificar que la ruta `/api/Newsletter` exista
- Comprobar que la base de datos esté conectada

### 4. Error: "Cannot find module"

**Problema**: Dependencias no instaladas.

**Solución**:
```bash
cd backend/Agent
npm install
```

### 5. Error: "Ollama not found"

**Problema**: Ollama no está instalado o no está en el PATH.

**Solución**:
- Instalar Ollama desde: https://ollama.ai
- Verificar que esté en el PATH del sistema
- Ejecutar: `ollama serve`

## 🚀 Instalación Rápida

### Paso 1: Instalar dependencias
```bash
cd backend/Agent
npm run install-deps
```

### Paso 2: Configurar variables de entorno
Editar el archivo `.env` con tus credenciales de base de datos.

### Paso 3: Verificar configuración
```bash
npm run setup
```

### Paso 4: Ejecutar pruebas
```bash
npm test
```

### Paso 5: Iniciar agente
```bash
npm start
```

## 🔍 Verificaciones de Diagnóstico

### Verificar Ollama
```bash
ollama list
```
Debería mostrar `qwen3:1.7b` en la lista.

### Verificar Backend
```bash
curl http://localhost:3000/api/Newsletter
```
Debería devolver un JSON con los newsletters.

### Verificar Base de Datos
```bash
psql -h localhost -U tu_usuario -d tu_base_de_datos -c "SELECT * FROM \"Newsletter\" LIMIT 5;"
```

## 📊 Logs de Debug

El agente proporciona logs detallados con emojis:

- 🔗 **Extracción de contenido**: Problemas con web scraping
- 📝 **Generación de resúmenes**: Problemas con el LLM
- 🔍 **Evaluación Climatech**: Problemas de clasificación
- 📥 **Consultas BDD**: Problemas de conexión a base de datos
- 🔗 **Comparaciones**: Problemas de análisis semántico

## 🛠️ Configuración Avanzada

### Ajustar Timeout del LLM
En `main.js`, línea 15:
```javascript
timeout: 4 * 60 * 1000, // 4 minutos
```

### Cambiar Modelo de LLM
En `main.js`, línea 14:
```javascript
model: "qwen3:1.7b", // Cambiar por otro modelo
```

### Ajustar Temperatura
En `main.js`, línea 13:
```javascript
temperature: 0.3, // Valores entre 0.0 y 1.0
```

## 📞 Soporte

Si los problemas persisten:

1. **Revisar logs completos** del agente
2. **Verificar versión de Node.js** (requiere >= 18)
3. **Verificar conectividad de red** para web scraping
4. **Comprobar permisos** de archivos y directorios

## 🔄 Reinicio Completo

Si todo falla, ejecutar en orden:

```bash
# 1. Detener todos los procesos
pkill -f "node main.js"
pkill -f "ollama"

# 2. Reiniciar Ollama
ollama serve &

# 3. Reiniciar backend
cd ../.. && npm start &

# 4. Reiniciar agente
cd Agent && npm start
```
