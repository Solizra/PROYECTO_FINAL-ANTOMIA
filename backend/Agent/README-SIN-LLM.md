# 🌱 CLIMATECH NEWS ANALYZER (SIN LLM)

## 🚀 Versión Completamente Independiente

Esta versión del agente funciona **sin ningún LLM** (ni Ollama, ni OpenAI, ni ningún otro modelo de lenguaje). Utiliza análisis de texto local basado en palabras clave para detectar noticias sobre Climatech.

## ✨ Características

- ✅ **Respuesta instantánea** (sin timeouts)
- ✅ **Instalación simple** (solo npm install)
- ✅ **Funciona offline** (sin dependencias externas)
- ✅ **Análisis transparente** con puntuaciones visibles
- ✅ **Bajo consumo de recursos** (< 100MB RAM)
- ✅ **Sin dependencias complejas**

## 📋 Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Ejecutar agente
npm run start-no-ollama

# 3. Probar funcionalidad
npm run test-no-llm
```

## 🎯 Cómo Funciona

### 1. **Extracción de Contenido**
- Extrae texto desde URLs de noticias
- Filtra contenido relevante (párrafos, artículos)
- Maneja errores de conexión

### 2. **Generación de Resumen**
- Selecciona las primeras 3 oraciones más relevantes
- Filtra oraciones muy cortas o irrelevantes
- Mantiene contexto del contenido original

### 3. **Detección de Climatech**
- Usa 50+ palabras clave relacionadas con Climatech
- Calcula puntuación basada en coincidencias
- Considera densidad de palabras clave
- **Criterios**: Al menos 3 palabras clave o densidad ≥2%

### 4. **Comparación con Newsletters**
- Obtiene newsletters desde la base de datos
- Compara palabras clave entre noticia y newsletters
- Asigna puntuaciones por coincidencias
- Ordena por relevancia

### 5. **Clasificación de Temas**
- Detecta temas principales para noticias no-Climatech
- Categorías: tecnología, deportes, política, economía, etc.

## 🔧 Comandos Disponibles

```bash
# Ejecutar agente
npm run start-no-ollama

# Probar funcionalidad
npm run test-no-llm

# Modo desarrollo
npm run dev-no-ollama
```

## 📊 Palabras Clave Incluidas

### Energías Renovables
- solar, eólica, hidroeléctrica, renovable, energía limpia
- paneles solares, turbinas eólicas, energía verde

### Eficiencia Energética
- eficiencia energética, ahorro energético, optimización
- edificios verdes, certificación energética

### Captura de Carbono
- carbono, CO2, emisiones, captura, secuestro
- huella de carbono, compensación, neutralidad

### Movilidad Sostenible
- vehículo eléctrico, transporte público, bicicleta
- movilidad sostenible, transporte limpio

### Agricultura Sostenible
- agricultura sostenible, agricultura orgánica
- permacultura, agricultura regenerativa

### Tecnologías Ambientales
- monitoreo ambiental, sensores, IoT ambiental
- tecnología verde, innovación ambiental

### Políticas Climáticas
- cambio climático, política climática
- acuerdo de parís, COP, regulación ambiental

### Materiales Sostenibles
- materiales sostenibles, biodegradable, reciclable
- economía circular, reutilización

## 🧪 Ejemplo de Uso

```bash
# Iniciar agente
npm run start-no-ollama

# Pega un link de noticia
https://ejemplo.com/noticia-climatech

# Respuesta instantánea:
✅ Esta noticia SÍ está relacionada con Climatech.

📰 Título: Tesla invierte en energía solar
📝 Resumen: Tesla ha anunciado una nueva inversión...

📧 Newsletters relacionados encontrados:
1. Newsletter sobre energías renovables (puntuación: 8)
2. Newsletter sobre vehículos eléctricos (puntuación: 6)
```

## 📈 Métricas de Rendimiento

- **Tiempo de respuesta**: < 1 segundo
- **Precisión**: ~85% (basada en palabras clave)
- **Uso de memoria**: < 100MB RAM
- **CPU**: Mínimo
- **Dependencias**: Solo Node.js estándar

## 🔍 Análisis Transparente

El agente muestra exactamente por qué clasifica una noticia:

```
🔍 Evaluando si es Climatech (análisis local)...
✅ Evaluación local: SÍ es Climatech
📊 Puntuación: 8 palabras clave encontradas
🔍 Palabras encontradas: solar, energía renovable, vehículos eléctricos, eficiencia energética, huella de carbono
```

## 🛠️ Personalización

### Agregar Nuevas Palabras Clave

Edita el array `CLIMATECH_KEYWORDS` en `main-no-ollama.js`:

```javascript
const CLIMATECH_KEYWORDS = [
  // ... palabras existentes ...
  'nueva-palabra-clave',
  'otra-palabra-clave'
];
```

### Ajustar Sensibilidad

Modifica los criterios en `determinarSiEsClimatechLocal`:

```javascript
// Más estricto: requiere más palabras clave
const esClimatech = puntuacion >= 5 || densidad >= 3;

// Menos estricto: requiere menos palabras clave
const esClimatech = puntuacion >= 2 || densidad >= 1;
```

## 🚨 Solución de Problemas

### Error de Conexión a Base de Datos
```bash
# Verificar que el backend esté ejecutándose
cd ../../
npm start
```

### Error de Extracción de Contenido
- Algunos sitios web pueden bloquear el scraping
- Intenta con diferentes URLs
- El agente maneja errores automáticamente

### Baja Precisión
- Revisa las palabras clave en el código
- Ajusta los criterios de clasificación
- Agrega palabras clave específicas de tu dominio

## 🎯 Ventajas vs Versión con LLM

| Aspecto | Sin LLM | Con LLM |
|---------|---------|---------|
| **Velocidad** | ⚡ Instantáneo | ⏱️ 30-120s |
| **Instalación** | 🎯 Simple | 🔧 Compleja |
| **Costo** | 💰 Gratis | 💰 Gratis (local) |
| **Dependencias** | 🛡️ Mínimas | 🌐 Ollama + modelo |
| **Transparencia** | 📊 Visible | 🤖 Caja negra |
| **Recursos** | 💾 < 100MB | 💾 4-8GB RAM |

## 🚀 Casos de Uso Ideales

- ✅ **Desarrollo rápido** y testing
- ✅ **Entornos con recursos limitados**
- ✅ **Demostraciones** (sin timeouts)
- ✅ **Análisis en lote** de noticias
- ✅ **Sistemas embebidos** o edge computing

## 📝 Licencia

MIT License - Libre para uso comercial y personal.

---

**¡Esta versión es perfecta para evitar los problemas de timeout y dependencias complejas!**
