#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔧 CONFIGURACIÓN DEL CLIMATECH NEWS ANALYZER');
console.log('=============================================\n');

// Verificar Node.js
function checkNodeVersion() {
  try {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0]);
    
    if (major >= 18) {
      console.log('✅ Node.js versión:', version);
      return true;
    } else {
      console.log('❌ Node.js versión:', version, '(se requiere >= 18)');
      return false;
    }
  } catch (error) {
    console.log('❌ Error verificando Node.js:', error.message);
    return false;
  }
}

// Verificar Ollama
async function checkOllama() {
  try {
    const output = execSync('ollama list', { encoding: 'utf8' });
    
    if (output.includes('qwen3:1.7b')) {
      console.log('✅ Ollama con modelo qwen3:1.7b encontrado');
      return true;
    } else {
      console.log('⚠️  Modelo qwen3:1.7b no encontrado en Ollama');
      console.log('💡 Ejecuta: ollama pull qwen3:1.7b');
      return false;
    }
  } catch (error) {
    console.log('❌ Ollama no está instalado o no está en el PATH');
    console.log('💡 Instala Ollama desde: https://ollama.ai');
    return false;
  }
}

// Verificar dependencias
function checkDependencies() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = [
      '@llamaindex/ollama',
      'cheerio',
      'dotenv',
      'llamaindex',
      'node-fetch',
      'pg',
      'zod'
    ];
    
    const missing = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
    
    if (missing.length === 0) {
      console.log('✅ Todas las dependencias están instaladas');
      return true;
    } else {
      console.log('❌ Dependencias faltantes:', missing.join(', '));
      console.log('💡 Ejecuta: npm install');
      return false;
    }
  } catch (error) {
    console.log('❌ Error verificando dependencias:', error.message);
    return false;
  }
}

// Verificar archivo .env
function checkEnvFile() {
  try {
    if (fs.existsSync('.env')) {
      console.log('✅ Archivo .env encontrado');
      return true;
    } else {
      console.log('⚠️  Archivo .env no encontrado');
      console.log('💡 Crea un archivo .env con las variables de base de datos');
      return false;
    }
  } catch (error) {
    console.log('❌ Error verificando archivo .env:', error.message);
    return false;
  }
}

// Verificar backend
async function checkBackend() {
  try {
    const response = await fetch('http://localhost:3000/api/Newsletter');
    if (response.ok) {
      console.log('✅ Backend funcionando en http://localhost:3000');
      return true;
    } else {
      console.log('❌ Backend no responde correctamente');
      return false;
    }
  } catch (error) {
    console.log('❌ Backend no está ejecutándose en http://localhost:3000');
    console.log('💡 Inicia el backend con: cd .. && npm start');
    return false;
  }
}

// Función principal
async function setup() {
  console.log('🔍 Verificando requisitos...\n');
  
  const checks = [
    { name: 'Node.js', check: checkNodeVersion },
    { name: 'Ollama', check: checkOllama },
    { name: 'Dependencias', check: checkDependencies },
    { name: 'Archivo .env', check: checkEnvFile },
    { name: 'Backend', check: checkBackend }
  ];
  
  const results = [];
  
  for (const check of checks) {
    console.log(`🔍 Verificando ${check.name}...`);
    const result = await check.check();
    results.push({ name: check.name, passed: result });
    console.log('');
  }
  
  console.log('📊 RESUMEN DE VERIFICACIÓN');
  console.log('==========================');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
  });
  
  console.log(`\n📈 Resultado: ${passed}/${total} verificaciones pasaron`);
  
  if (passed === total) {
    console.log('\n🎉 ¡Todo está listo! Puedes ejecutar el agente con:');
    console.log('   npm start');
    console.log('\n💡 Para ejecutar las pruebas:');
    console.log('   npm test');
  } else {
    console.log('\n⚠️  Algunas verificaciones fallaron. Revisa los errores arriba.');
    console.log('\n💡 Una vez que todo esté configurado, ejecuta:');
    console.log('   npm start');
  }
}

// Ejecutar configuración
setup().catch(console.error);
