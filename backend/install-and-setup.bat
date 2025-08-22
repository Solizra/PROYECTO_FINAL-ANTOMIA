@echo off
echo ========================================
echo INSTALACION Y CONFIGURACION COMPLETA
echo PROYECTO ANTOMIA - BASE DE DATOS
echo ========================================
echo.

echo 1. Verificando dependencias de Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado.
    echo Descarga e instala Node.js desde: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js encontrado.

echo.
echo 2. Instalando dependencias de npm...
npm install
if %errorlevel% neq 0 (
    echo ERROR: No se pudieron instalar las dependencias.
    pause
    exit /b 1
)
echo ✅ Dependencias instaladas.

echo.
echo 3. Verificando si PostgreSQL esta instalado...
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ⚠️  PostgreSQL no esta instalado.
    echo.
    echo Para instalar PostgreSQL:
    echo 1. Ve a https://www.postgresql.org/download/windows/
    echo 2. Descarga PostgreSQL para Windows (version 15 o superior)
    echo 3. Ejecuta el instalador como administrador
    echo 4. IMPORTANTE: Anota la contraseña del usuario 'postgres'
    echo 5. Completa la instalacion
    echo 6. Ejecuta este script nuevamente
    echo.
    pause
    exit /b 1
)

echo ✅ PostgreSQL encontrado.

echo.
echo 4. Verificando si el servicio PostgreSQL esta ejecutandose...
sc query postgresql-x64-15 >nul 2>&1
if %errorlevel% neq 0 (
    echo Iniciando servicio PostgreSQL...
    net start postgresql-x64-15
    if %errorlevel% neq 0 (
        echo ERROR: No se pudo iniciar el servicio PostgreSQL
        echo Verifica que PostgreSQL este instalado correctamente
        pause
        exit /b 1
    )
)

echo ✅ Servicio PostgreSQL ejecutandose.

echo.
echo 5. Creando archivo .env...
if not exist .env (
    copy env.example .env
    echo ✅ Archivo .env creado.
    echo.
    echo ⚠️  IMPORTANTE: Edita el archivo .env con tu contraseña de PostgreSQL
    echo    Cambia 'tu_password' por la contraseña real del usuario postgres
    echo.
    echo Presiona cualquier tecla para abrir el archivo .env...
    pause >nul
    notepad .env
) else (
    echo ✅ Archivo .env ya existe.
)

echo.
echo 6. Probando conexion a la base de datos...
node test-db-connection.js
if %errorlevel% neq 0 (
    echo.
    echo ⚠️  Error en la conexion a la base de datos.
    echo Verifica que:
    echo 1. PostgreSQL este instalado y ejecutandose
    echo 2. El archivo .env tenga la contraseña correcta
    echo 3. Tengas permisos de administrador
    echo.
    pause
    exit /b 1
)

echo.
echo 7. Creando base de datos y tablas...
echo Ejecutando script SQL...
psql -U postgres -f database-setup.sql

if %errorlevel% neq 0 (
    echo.
    echo ⚠️  No se pudo ejecutar el script SQL automaticamente.
    echo Para ejecutar manualmente:
    echo 1. Abre Command Prompt como administrador
    echo 2. Ejecuta: psql -U postgres -f database-setup.sql
    echo 3. Ingresa tu contraseña cuando se solicite
    echo.
    pause
)

echo.
echo 8. Verificando configuracion final...
node test-db-connection.js

echo.
echo ========================================
echo INSTALACION COMPLETADA
echo ========================================
echo.
echo Ahora puedes:
echo 1. Ejecutar: npm start
echo 2. El servidor estara disponible en: http://localhost:3000
echo 3. Las APIs estaran en: http://localhost:3000/api/Newsletter
echo.
echo Para verificar que todo funciona:
echo 1. Abre tu navegador
echo 2. Ve a: http://localhost:3000/api/Newsletter
echo 3. Deberias ver los newsletters de ejemplo
echo.
pause
