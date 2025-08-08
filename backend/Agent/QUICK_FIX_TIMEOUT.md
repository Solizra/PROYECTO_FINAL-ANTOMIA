# ⚡ SOLUCIÓN RÁPIDA PARA TIMEOUT

## 🚨 Problema: "Operation timed out after 60 seconds"

### 🔧 Solución Inmediata

1. **Verificar Ollama**:
   ```bash
   npm run check-ollama
   ```

2. **Si Ollama no está ejecutándose**:
   ```bash
   ollama serve
   ```

3. **Si el modelo no está descargado**:
   ```bash
   ollama pull qwen3:1.7b
   ```

4. **Reiniciar todo**:
   ```bash
   # Detener procesos
   pkill -f "ollama"
   pkill -f "node main.js"
   
   # Reiniciar Ollama
   ollama serve &
   
   # Esperar 10 segundos
   sleep 10
   
   # Ejecutar agente
   npm start
   ```

### 🔍 Diagnóstico

**Síntomas del problema**:
- ❌ "Operation timed out after 60 seconds"
- ❌ "Connection refused"
- ❌ "Model not found"

**Causas comunes**:
1. Ollama no está ejecutándose
2. Modelo no descargado
3. Memoria insuficiente
4. CPU sobrecargado

### ⚙️ Configuración Optimizada

El agente ahora incluye:
- ✅ **Timeout extendido**: 8 minutos
- ✅ **Reintentos automáticos**: 3 intentos
- ✅ **Tiempo de espera progresivo**: 2s, 4s, 6s
- ✅ **Manejo de errores robusto**

### 🧪 Prueba Rápida

```bash
# 1. Verificar Ollama
npm run check-ollama

# 2. Si todo está bien, probar el agente
npm test

# 3. Si las pruebas pasan, usar el agente
npm start
```

### 📊 Logs de Debug

El agente ahora muestra logs detallados:
- 🧠 **Intento X/Y**: Progreso de reintentos
- ⏳ **Esperando Xs**: Tiempo entre reintentos
- ✅ **LLM respondió exitosamente**: Confirmación de éxito

### 🆘 Si el problema persiste

1. **Verificar recursos del sistema**:
   ```bash
   # Memoria disponible
   free -h
   
   # CPU usage
   top
   ```

2. **Usar modelo más pequeño**:
   ```bash
   ollama pull llama3.2:3b
   ```
   Y cambiar en `main.js` línea 14:
   ```javascript
   model: "llama3.2:3b",
   ```

3. **Aumentar timeout manualmente**:
   En `main.js` línea 16:
   ```javascript
   timeout: 12 * 60 * 1000, // 12 minutos
   ```

### 🎯 Resultado Esperado

Después de aplicar las soluciones:
- ✅ Ollama ejecutándose
- ✅ Modelo descargado y funcional
- ✅ Agente respondiendo sin timeouts
- ✅ Logs mostrando progreso exitoso

### 💡 Tips Adicionales

- **Cerrar otras aplicaciones** que consuman mucha RAM
- **Usar SSD** para mejor rendimiento
- **Tener al menos 8GB de RAM** disponible
- **Ejecutar en modo headless** si es posible
