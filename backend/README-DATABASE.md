# Configuración de Base de Datos - Proyecto ANTOMIA

## Problema Identificado

El sistema está obteniendo 0 newsletters porque:
1. **PostgreSQL no está instalado** o no está ejecutándose
2. **Las variables de entorno no se están cargando** correctamente
3. **La base de datos no existe** o las tablas no están creadas

## Solución Paso a Paso

### 1. Instalar PostgreSQL

#### Opción A: Instalación Automática (Recomendada)
1. Ejecuta el script `setup-database.bat` como administrador
2. Sigue las instrucciones en pantalla

#### Opción B: Instalación Manual
1. Ve a [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. Descarga PostgreSQL para Windows (versión 15 o superior)
3. Ejecuta el instalador como administrador
4. **IMPORTANTE**: Anota la contraseña del usuario `postgres`
5. Completa la instalación

### 2. Configurar Variables de Entorno

1. Copia el archivo `env.example` a `.env`:
   ```bash
   copy env.example .env
   ```

2. Edita el archivo `.env` con tu configuración:
   ```env
   DB_HOST=localhost
   DB_DATABASE=climatetech_db
   DB_USER=postgres
   DB_PASSWORD=TU_CONTRASEÑA_AQUI
   DB_PORT=5432
   PORT=3000
   NODE_ENV=development
   ```

### 3. Crear Base de Datos y Tablas

#### Opción A: Script Automático
1. Ejecuta `setup-database.bat` como administrador
2. El script creará automáticamente la base de datos y tablas

#### Opción B: Manual
1. Abre Command Prompt como administrador
2. Ejecuta:
   ```bash
   psql -U postgres
   ```
3. Ingresa tu contraseña cuando se solicite
4. Ejecuta el script SQL:
   ```sql
   \i database-setup.sql
   ```

### 4. Verificar la Configuración

1. Verifica que PostgreSQL esté ejecutándose:
   ```bash
   netstat -an | findstr :5432
   ```

2. Verifica que las variables de entorno se carguen:
   ```bash
   node -e "console.log('DB_HOST:', process.env.DB_HOST)"
   ```

3. Verifica la conexión a la base de datos:
   ```bash
   psql -U postgres -d climatetech_db -c "SELECT * FROM \"Newsletter\";"
   ```

### 5. Iniciar el Sistema

1. Instala las dependencias:
   ```bash
   npm install
   ```

2. Inicia el servidor:
   ```bash
   npm start
   ```

## Estructura de la Base de Datos

### Tabla Newsletter
- `id`: Identificador único (SERIAL)
- `link`: URL del newsletter (VARCHAR)
- `Resumen`: Resumen del contenido (TEXT)
- `titulo`: Título del newsletter (VARCHAR)
- `fecha_creacion`: Fecha de creación (TIMESTAMP)

### Tabla Trends
- `id`: Identificador único (SERIAL)
- `id_newsletter`: Referencia al newsletter (INTEGER)
- `Título_del_Trend`: Título del trend (VARCHAR)
- `Link_del_Trend`: URL del trend (VARCHAR)
- `Nombre_Newsletter_Relacionado`: Nombre del newsletter relacionado (VARCHAR)
- `Fecha_Relación`: Fecha de la relación (TIMESTAMP)
- `Relacionado`: Si está relacionado (BOOLEAN)
- `Analisis_relacion`: Análisis de la relación (TEXT)
- `fecha_creacion`: Fecha de creación (TIMESTAMP)

## Solución de Problemas Comunes

### Error: ECONNREFUSED
- PostgreSQL no está ejecutándose
- Verifica que el servicio esté activo: `sc query postgresql-x64-15`

### Error: Variables de entorno undefined
- El archivo `.env` no existe o está mal configurado
- Verifica que el archivo `.env` esté en la carpeta `backend`

### Error: Base de datos no existe
- Ejecuta el script `database-setup.sql`
- Verifica que la base de datos `climatetech_db` exista

### Error: Tabla no existe
- Ejecuta el script `database-setup.sql`
- Verifica que las tablas `Newsletter` y `Trends` existan

## Comandos Útiles

```bash
# Verificar estado de PostgreSQL
sc query postgresql-x64-15

# Iniciar servicio PostgreSQL
net start postgresql-x64-15

# Detener servicio PostgreSQL
net stop postgresql-x64-15

# Conectar a PostgreSQL
psql -U postgres

# Listar bases de datos
\l

# Conectar a una base de datos
\c climatetech_db

# Listar tablas
\dt

# Ver estructura de una tabla
\d "Newsletter"
```

## Contacto

Si tienes problemas con la configuración, verifica:
1. Que PostgreSQL esté instalado y ejecutándose
2. Que el archivo `.env` esté configurado correctamente
3. Que la base de datos y tablas existan
4. Que tengas permisos de administrador para ejecutar los scripts
