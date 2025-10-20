# Sistema de Feedback de Trends - ANTOMIA

## 📋 Descripción General

El sistema de feedback de trends en ANTOMIA permite a los usuarios proporcionar retroalimentación sobre las relaciones entre noticias y newsletters, ayudando a mejorar continuamente la precisión del algoritmo de IA que determina estas relaciones.

## 🏗️ Arquitectura del Sistema

### Componentes Principales

1. **Frontend (React)**
   - Interfaz de usuario para proporcionar feedback
   - Botones de "Archivar" y "Eliminar" en cada trend
   - Modal de selección de razones para eliminación

2. **Backend (Node.js/Express)**
   - API REST para recibir feedback
   - Servicios de procesamiento de feedback
   - Repositorio de base de datos
   - Sistema de blacklist para evitar repetición de errores

3. **Base de Datos (PostgreSQL)**
   - Tabla `Feedback` para almacenar retroalimentación
   - Tabla `Trends` para los trends analizados

## 🔄 Flujo del Sistema de Feedback

### 1. Proceso de Feedback Positivo (Archivar)

```mermaid
graph TD
    A[Usuario hace clic en "Archivar"] --> B[Frontend envía feedback positivo]
    B --> C[Backend recibe en /api/Feedback]
    C --> D[FeedbackService procesa]
    D --> E[FeedbackRepository guarda en BD]
    E --> F[EventBus notifica a frontend]
    F --> G[Trend se mueve a "Archivados"]
```

**Datos enviados:**
```json
{
  "trendId": 123,
  "action": "archive",
  "reason": "confirmed_correct",
  "feedback": "positive",
  "trendData": { /* objeto trend completo */ },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. Proceso de Feedback Negativo (Eliminar)

```mermaid
graph TD
    A[Usuario hace clic en "Eliminar"] --> B[Modal de selección de razón]
    B --> C[Usuario selecciona razón]
    C --> D[Frontend envía feedback negativo]
    D --> E[Backend procesa feedback]
    E --> F[Se agrega a blacklist si es bad_relation]
    F --> G[Trend se elimina de la tabla]
    G --> H[Se borra de la base de datos]
```

**Razones disponibles:**
- `bad_relation`: Baja calidad de relación
- `api_bad_news`: Mala noticia traída de la API
- `off_topic`: Fuera de tema / No es climatech
- `duplicate`: Duplicado
- `broken_link`: Link roto o inaccesible
- `other`: Otra razón

## 🗄️ Estructura de Base de Datos

### Tabla Feedback

```sql
CREATE TABLE "Feedback" (
    "id" SERIAL PRIMARY KEY,
    "trendId" INTEGER,                    -- ID del trend relacionado
    "action" VARCHAR(50) NOT NULL,        -- 'delete', 'archive'
    "reason" TEXT,                        -- Razón específica del feedback
    "feedback" VARCHAR(50),               -- 'positive', 'negative'
    "trendData" JSONB,                    -- Snapshot completo del trend
    "timestamp" TIMESTAMP,                -- Momento del evento en el frontend
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🧠 Aprendizaje Automático del Sistema

### 1. Sistema de Blacklist

El sistema implementa una blacklist en memoria para evitar repetir errores:

```javascript
// En EventBus.js
addToBlacklist(trendLink, newsletterId) {
  const key = `${trendLink || ''}|${newsletterId ?? 'null'}`;
  this.blacklist.add(key);
}
```

**Criterios para blacklist:**
- **CUALQUIER feedback negativo** con `action: "delete"`
- **TODAS las razones**: `bad_relation`, `off_topic`, `duplicate`, `broken_link`, etc.
- Se bloquea el par `trendLink|newsletterId` para evitar repetición

**IMPORTANTE**: El sistema ahora aprende de TODOS los tipos de feedback negativo, no solo de `bad_relation`.

### 2. Análisis de Patrones Negativos

El sistema analiza feedback negativo para mejorar la IA:

```javascript
// En FeedbackService.js
async buildNegativeTitlePatterns({ limit = 300 } = {}) {
  // Extrae tokens y bigramas de títulos con feedback negativo
  // Identifica patrones comunes en relaciones rechazadas
}

async getNegativeReasonsStats({ limit = 300 } = {}) {
  // Estadísticas de razones negativas más comunes
  // Guía al agente IA sobre qué evitar
}
```

### 3. Embeddings y Similitud

```javascript
// En main.js del agente
async getNegativePairExamples({ limit = 200 } = {}) {
  // Obtiene ejemplos de pares noticia↔newsletter rechazados
  // Se usa para calcular similitud con embeddings
}
```

## 🔧 APIs del Sistema

### POST /api/Feedback

**Endpoint principal para recibir feedback**

```javascript
// Request
{
  "trendId": 123,
  "action": "delete",
  "reason": "bad_relation", 
  "feedback": "negative",
  "trendData": {
    "id": 123,
    "trendTitulo": "Título del trend",
    "trendLink": "https://ejemplo.com/noticia",
    "newsletterTitulo": "Newsletter relacionado",
    "newsletterId": 456
  },
  "timestamp": "2024-01-15T10:30:00Z"
}

// Response
{
  "id": 789,
  "trendId": 123,
  "action": "delete",
  "reason": "bad_relation",
  "feedback": "negative",
  "trendData": { /* objeto completo */ },
  "timestamp": "2024-01-15T10:30:00Z",
  "createdAt": "2024-01-15T10:30:01Z"
}
```

## 🎯 Impacto en el Algoritmo de IA

### 1. Filtrado Preventivo

Antes de crear nuevas relaciones, el sistema verifica:

```javascript
// En main.js del agente
const skipPair = await feedbackSvc.hasNegativeForLinkOrPair({ 
  trendLink: url, 
  newsletterId: nl.id 
});
if (skipPair) {
  console.log('⛔ Feedback negativo previo → saltando relación');
  continue;
}
```

### 2. Penalización por Similitud

```javascript
// Penalización previa por similitud con negativos
let prePenalty = 0;
if (negVecs.length) {
  const nlVec = await getEmbeddingCached(textoDoc);
  if (nlVec) {
    let maxSim = 0;
    for (const nv of negVecs) { 
      maxSim = Math.max(maxSim, cosSim(nlVec, nv)); 
    }
    if (maxSim > 0.83) prePenalty = 12; 
    else if (maxSim > 0.78) prePenalty = 8; 
    else if (maxSim > 0.73) prePenalty = 4;
  }
}
```

### 3. Contexto Histórico en Prompts

```javascript
// Se incluye contexto de feedback negativo en prompts de IA
let feedbackHints = '';
try {
  const { topReasons } = await feedbackSvc.getNegativeReasonsStats({ limit: 300 });
  const razonesTop = (topReasons || []).slice(0, 3).map(r => r.reason).join(', ');
  if (razonesTop) {
    feedbackHints = `\n\nContexto histórico: Evita falsos positivos similares a razones previas: ${razonesTop}.`;
  }
} catch {}
```

## 📊 Métricas y Monitoreo

### 1. Estadísticas de Feedback

El sistema puede generar reportes sobre:

- **Razones más comunes de eliminación**
- **Patrones en títulos rechazados**
- **Efectividad del sistema de blacklist**
- **Tendencia de mejora en el tiempo**

### 2. Logs del Sistema

```javascript
// Ejemplos de logs importantes
console.log('⛔ Feedback negativo previo para par link|newsletter → saltando relación');
console.log('📊 [FILTRO POR NOTICIA] Seleccionados top X newsletters para análisis IA');
console.log('🎯 Newsletters relacionados encontrados: X');
```

## 🚀 Mejoras Futuras

### 1. Análisis Avanzado
- Machine learning para detectar patrones automáticamente
- Clustering de feedback negativo por similitud semántica
- Predicción proactiva de relaciones problemáticas

### 2. Interfaz Mejorada
- Dashboard de métricas de feedback
- Visualización de patrones de error
- Sistema de notificaciones para tendencias problemáticas

### 3. Integración con IA
- Fine-tuning de modelos basado en feedback
- A/B testing de diferentes algoritmos
- Feedback loop automatizado

## 🔒 Consideraciones de Seguridad

1. **Validación de datos**: Todos los inputs se validan y sanitizan
2. **Rate limiting**: Prevención de spam en feedback
3. **Autenticación**: Solo usuarios autenticados pueden dar feedback
4. **Auditoría**: Log completo de todas las acciones de feedback

## 📝 Uso del Sistema

### Para Desarrolladores

1. **Monitorear feedback**: Revisar logs para identificar patrones
2. **Ajustar umbrales**: Modificar penalizaciones según efectividad
3. **Actualizar razones**: Agregar nuevas categorías según necesidades

### Para Usuarios

1. **Archivar trends correctos**: Confirma que la relación es válida
2. **Eliminar trends incorrectos**: Proporciona razón específica
3. **Ser consistente**: Usar las mismas razones para casos similares

## 🛠️ Mantenimiento

### Problemas Comunes y Soluciones

#### Error de Restricción de Clave Foránea

**Problema:** Error `foreign key constraint "Feedback_trendId_fkey" on table "Feedback"`

**Causa:** La tabla `Feedback` tiene una restricción de clave foránea hacia `Trends`, pero no está configurada para eliminación en cascada.

**Solución:**
1. **REINICIAR EL SERVIDOR** (IMPORTANTE):
```bash
# En Windows
backend/restart-server.bat

# O manualmente
taskkill /f /im node.exe
npm start
```

2. Ejecutar el script de corrección:
```bash
psql -U postgres -d climatetech_db -f backend/fix-foreign-key-constraint.sql
```

3. El sistema ya maneja automáticamente la eliminación en cascada en el código:
```javascript
// En TrendsRepository.deleteAsync()
// Primero elimina feedback asociado, luego el trend
const deleteFeedbackSql = `DELETE FROM "Feedback" WHERE "trendId" = $1;`;
await client.query(deleteFeedbackSql, [id]);
```

#### Feedback Limitado a "bad_relation"

**Problema:** El sistema solo guardaba feedback para `bad_relation`, ignorando otros tipos de feedback negativo.

**Causa:** El código original solo procesaba `bad_relation` para la blacklist.

**Solución:** Modificado para procesar TODOS los tipos de feedback negativo:
- `bad_relation`: Baja calidad de relación
- `off_topic`: Fuera de tema / No es climatech  
- `duplicate`: Duplicado
- `broken_link`: Link roto o inaccesible
- `api_bad_news`: Mala noticia traída de la API
- `other`: Otra razón

**Resultado:** La IA ahora aprende de TODOS los tipos de feedback negativo para mejorar su precisión.

#### Feedback No Se Guarda en Base de Datos

**Problema:** El feedback no se está guardando en la base de datos, independientemente del tipo.

**Causa:** 
1. Error en consulta SQL con operador JSON `->>`
2. Falta de logging detallado para debugging
3. Validaciones que pueden estar bloqueando el guardado

**Solución Implementada:**
1. **Consulta SQL corregida**:
```sql
-- Antes (incorrecto)
WHERE lower(COALESCE(("trendData"->>'trendLink'), '')) = lower($1)

-- Después (correcto)  
WHERE lower(COALESCE("trendData"->>'trendLink', '')) = lower($1)
```

2. **Logging detallado agregado** en todas las capas:
   - Controller: Log del payload recibido
   - Service: Log del procesamiento
   - Repository: Log de la inserción en BD

3. **Validación mejorada**: Solo requiere `action`, acepta cualquier tipo de feedback

4. **Script de prueba**: `backend/test-feedback.js` para verificar funcionamiento

**Solución Final Aplicada:**
✅ **Base de datos corregida**: Se eliminó la restricción de clave foránea que impedía guardar feedback
✅ **trendId NULL permitido**: Ahora se puede guardar feedback incluso para trends eliminados
✅ **Feedback funciona**: Todos los tipos de feedback se guardan correctamente

**Estado Actual:**
- ✅ Feedback negativo: `bad_relation`, `off_topic`, `duplicate`, `broken_link`, `api_bad_news`, `other`
- ✅ Feedback positivo: `archive`, `confirmed_correct`
- ✅ Base de datos: Configurada correctamente
- ✅ IA: Aprende de TODOS los tipos de feedback

### Limpieza de Datos

```sql
-- Eliminar feedback muy antiguo (opcional)
DELETE FROM "Feedback" 
WHERE "createdAt" < NOW() - INTERVAL '6 months';

-- Limpiar blacklist en memoria (reinicio del servidor)
-- Se reconstruye automáticamente desde feedback reciente
```

### Monitoreo de Performance

- **Tiempo de respuesta**: < 200ms para feedback
- **Precisión**: Monitorear tasa de falsos positivos/negativos
- **Cobertura**: % de trends que reciben feedback

---

Este sistema de feedback es fundamental para la mejora continua de ANTOMIA, permitiendo que la IA aprenda de los errores humanos y mejore su precisión en la identificación de relaciones relevantes entre noticias y newsletters de climatech.
