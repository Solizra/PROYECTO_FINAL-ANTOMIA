# 🌱 CLIMATECH NEWS ANALYZER

## Descripción

El **Climatech News Analyzer** es un agente inteligente que analiza noticias para determinar si están relacionadas con Climatech (tecnologías climáticas) y encuentra newsletters relacionados en la base de datos.

## Funcionalidades

### 🔄 Flujo de Procesamiento

El agente sigue un proceso estructurado de 6 pasos:

1. **📥 Extracción de Contenido**: Extrae el link de la noticia y su contenido
2. **📝 Generación de Resumen**: Crea un resumen claro y conciso de la noticia
3. **🔍 Evaluación Climatech**: Determina si la noticia está relacionada con Climatech
4. **📊 Consulta BDD**: Trae los newsletters de la empresa desde la base de datos
5. **🔗 Comparación**: Compara la noticia ingresada con los newsletters de la BDD
6. **💾 Almacenamiento**: Guarda en un array los newsletters que coinciden con el tema

### 🎯 Criterios de Climatech

El agente considera como Climatech las noticias relacionadas con:

- **Energías renovables** (solar, eólica, hidroeléctrica, etc.)
- **Eficiencia energética**
- **Captura y almacenamiento de carbono**
- **Movilidad sostenible** (vehículos eléctricos, transporte público)
- **Agricultura sostenible**
- **Tecnologías de monitoreo ambiental**
- **Políticas climáticas y regulaciones ambientales**
- **Innovación en materiales sostenibles**
- **Economía circular**

## 🚀 Instalación y Uso

### Prerrequisitos

1. **Ollama instalado** con el modelo `qwen3:1.7b`
2. **Backend funcionando** en `http://localhost:3000`
3. **Base de datos PostgreSQL** configurada con newsletters

### Configuración

1. **Variables de entorno** (archivo `.env`):
```env
DB_HOST=localhost
DB_DATABASE=tu_base_de_datos
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_PORT=5432
```

2. **Dependencias**:
```bash
cd backend/Agent
npm install
```

### Ejecución

#### Modo Interactivo
```bash
cd backend/Agent
node main.js
```

#### Modo de Prueba
```bash
cd backend/Agent
node test-agent.js
```

## 📋 Uso del Agente

### Entrada
- **URL de noticia**: Pega el link de cualquier noticia
- **Comando exit**: Para salir del programa

### Salida

#### Si es Climatech:
```
✅ Esta noticia SÍ está relacionada con Climatech.

📰 Título: [Título de la noticia]
📝 Resumen: [Resumen generado]

📧 Newsletters relacionados encontrados:
1. [Título del newsletter relacionado]
2. [Otro newsletter relacionado]
```

#### Si NO es Climatech:
```
❌ Esta noticia NO está relacionada con Climatech.

📰 Título: [Título de la noticia]
📋 Tema principal: [Tema identificado]

💡 Tip: Las noticias sobre Climatech incluyen energías renovables, 
eficiencia energética, captura de carbono, movilidad sostenible, 
agricultura sostenible, tecnologías ambientales, políticas climáticas, etc.
```

## 🧪 Pruebas

El archivo `test-agent.js` incluye pruebas automatizadas que verifican:

1. **Clasificación correcta** de noticias Climatech vs no-Climatech
2. **Generación de resúmenes** claros y concisos
3. **Conexión con la base de datos** para obtener newsletters
4. **Comparación inteligente** entre noticias y newsletters
5. **Identificación de coincidencias** temáticas

### Ejecutar Pruebas
```bash
node test-agent.js
```

## 🔧 Arquitectura

### Archivos Principales

- **`main.js`**: Agente principal con todas las funciones
- **`cli-chat.js`**: Interfaz de línea de comandos
- **`test-agent.js`**: Pruebas automatizadas
- **`README.md`**: Documentación

### Funciones Clave

- `extraerContenidoNoticia(url)`: Extrae contenido desde URLs
- `generarResumen(contenido)`: Crea resúmenes usando LLM
- `determinarSiEsClimatech(contenido)`: Clasifica noticias
- `obtenerNewslettersBDD()`: Consulta la base de datos
- `compararConNewsletters(resumen, newsletters)`: Encuentra coincidencias

## 🛠️ Tecnologías

- **Node.js**: Runtime de JavaScript
- **Ollama**: Modelo de lenguaje local (qwen3:1.7b)
- **PostgreSQL**: Base de datos
- **Express**: Backend API
- **Cheerio**: Web scraping
- **Node-fetch**: Peticiones HTTP

## 📊 Métricas

El agente proporciona métricas en tiempo real:

- ⏱️ **Tiempo de respuesta**: Duración del análisis
- 📊 **Newsletters encontrados**: Cantidad de coincidencias
- ✅ **Precisión de clasificación**: Climatech vs no-Climatech

## 🔍 Troubleshooting

### Problemas Comunes

1. **Error de conexión a BDD**:
   - Verificar variables de entorno
   - Comprobar que PostgreSQL esté ejecutándose

2. **Error de Ollama**:
   - Verificar que Ollama esté instalado
   - Comprobar que el modelo `qwen3:1.7b` esté descargado

3. **Error de extracción de contenido**:
   - Verificar que la URL sea accesible
   - Comprobar conectividad a internet

### Logs

El agente proporciona logs detallados con emojis para facilitar el debugging:

- 🔗 Extracción de contenido
- 📝 Generación de resúmenes
- 🔍 Evaluación Climatech
- 📥 Consultas a BDD
- 🔗 Comparaciones
- ✅ Resultados finales

## 🤝 Contribución

Para contribuir al proyecto:

1. Fork el repositorio
2. Crea una rama para tu feature
3. Implementa los cambios
4. Ejecuta las pruebas
5. Envía un pull request

## 📄 Licencia

Este proyecto está bajo la licencia MIT.
