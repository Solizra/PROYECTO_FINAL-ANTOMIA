#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🔧 INSTALACIÓN DEL CLIMATECH NEWS ANALYZER');
console.log('===========================================\n');

// Función para ejecutar comandos de forma segura
function ejecutarComando(comando, descripcion) {
  try {
    console.log(`📦 ${descripcion}...`);
    execSync(comando, { stdio: 'inherit' });
    console.log(`✅ ${descripcion} completado`);
    return true;
  } catch (error) {
    console.error(`❌ Error en ${descripcion}:`, error.message);
    return false;
  }
}

// Función para crear archivo .env si no existe
function crearArchivoEnv() {
  const envPath = '.env';
  if (!fs.existsSync(envPath)) {
    console.log('📝 Creando archivo .env...');
    const envContent = `# Configuración de Base de Datos PostgreSQL
DB_HOST=localhost
DB_DATABASE=climatech_db
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_PORT=5432

# Configuración del Backend
BACKEND_URL=http://localhost:3000

# Configuración del Agente
DEBUG=false
TEMPERATURE=0.3
TIMEOUT=240000
`;
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Archivo .env creado');
    console.log('⚠️  IMPORTANTE: Edita el archivo .env con tus credenciales de base de datos');
  } else {
    console.log('✅ Archivo .env ya existe');
  }
}

// Función principal de instalación
async function instalar() {
  console.log('🚀 Iniciando instalación...\n');

  // Verificar Node.js
  console.log('🔍 Verificando Node.js...');
  const nodeVersion = process.version;
  const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (nodeMajor < 18) {
    console.error('❌ Se requiere Node.js versión 18 o superior');
    console.error(`   Versión actual: ${nodeVersion}`);
    process.exit(1);
  }
  console.log(`✅ Node.js ${nodeVersion} detectado`);

  // Instalar dependencias
  const instalacionExitosa = ejecutarComando('npm install', 'Instalando dependencias');

  if (!instalacionExitosa) {
    console.error('❌ Error instalando dependencias');
    process.exit(1);
  }

  // Crear archivo .env
  crearArchivoEnv();

  // Verificar Ollama
  console.log('\n🔍 Verificando Ollama...');
  try {
    const ollamaOutput = execSync('ollama list', { encoding: 'utf8' });
    if (ollamaOutput.includes('qwen3:1.7b')) {
      console.log('✅ Modelo qwen3:1.7b encontrado en Ollama');
    } else {
      console.log('⚠️  Modelo qwen3:1.7b no encontrado');
      console.log('💡 Ejecuta: ollama pull qwen3:1.7b');
    }
  } catch (error) {
    console.log('❌ Ollama no está instalado o no está en el PATH');
    console.log('💡 Instala Ollama desde: https://ollama.ai');
  }

  console.log('\n🎉 INSTALACIÓN COMPLETADA');
  console.log('==========================');
  console.log('\n📋 Próximos pasos:');
  console.log('1. Edita el archivo .env con tus credenciales de base de datos');
  console.log('2. Asegúrate de que el backend esté ejecutándose en http://localhost:3000');
  console.log('3. Ejecuta las pruebas: npm test');
  console.log('4. Inicia el agente: npm start');
  console.log('\n💡 Para verificar la configuración: npm run setup');
}

// Ejecutar instalación
instalar().catch(console.error);
