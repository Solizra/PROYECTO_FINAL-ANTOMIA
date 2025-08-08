#!/usr/bin/env node

import { execSync } from 'child_process';
import { Ollama } from "@llamaindex/ollama";

console.log('🔍 VERIFICACIÓN DE OLLAMA');
console.log('=========================\n');

// Función para verificar si Ollama está ejecutándose
async function verificarOllamaEjecutandose() {
  try {
    console.log('🔍 Verificando si Ollama está ejecutándose...');
    
    // Intentar hacer una petición simple a Ollama
    const ollama = new Ollama({
      model: "qwen3:1.7b",
      temperature: 0.1,
      timeout: 10000, // 10 segundos para la prueba
    });

    const respuesta = await ollama.complete({
      prompt: "Responde solo con 'OK'",
    });

    console.log('✅ Ollama está ejecutándose correctamente');
    return true;
  } catch (error) {
    console.log('❌ Ollama no está ejecutándose o no responde');
    console.log('💡 Ejecuta: ollama serve');
    return false;
  }
}

// Función para verificar modelos disponibles
function verificarModelos() {
  try {
    console.log('🔍 Verificando modelos disponibles...');
    
    const output = execSync('ollama list', { encoding: 'utf8' });
    console.log('📋 Modelos disponibles:');
    console.log(output);
    
    if (output.includes('qwen3:1.7b')) {
      console.log('✅ Modelo qwen3:1.7b encontrado');
      return true;
    } else {
      console.log('⚠️  Modelo qwen3:1.7b no encontrado');
      return false;
    }
  } catch (error) {
    console.log('❌ Error verificando modelos:', error.message);
    return false;
  }
}

// Función para descargar el modelo si no está
async function descargarModelo() {
  try {
    console.log('📥 Descargando modelo qwen3:1.7b...');
    console.log('⏳ Esto puede tomar varios minutos...');
    
    execSync('ollama pull qwen3:1.7b', { stdio: 'inherit' });
    
    console.log('✅ Modelo descargado exitosamente');
    return true;
  } catch (error) {
    console.log('❌ Error descargando modelo:', error.message);
    return false;
  }
}

// Función para probar el modelo
async function probarModelo() {
  try {
    console.log('🧪 Probando el modelo...');
    
    const ollama = new Ollama({
      model: "qwen3:1.7b",
      temperature: 0.1,
      timeout: 30000, // 30 segundos para la prueba
    });

    const respuesta = await ollama.complete({
      prompt: "Responde únicamente con 'SÍ' o 'NO': ¿Es el sol una estrella?",
    });

    console.log('✅ Modelo responde correctamente');
    console.log(`🧠 Respuesta de prueba: "${respuesta}"`);
    return true;
  } catch (error) {
    console.log('❌ Error probando modelo:', error.message);
    return false;
  }
}

// Función principal
async function verificarOllama() {
  console.log('🚀 Iniciando verificación completa de Ollama...\n');

  // Verificar si Ollama está ejecutándose
  const ollamaEjecutandose = await verificarOllamaEjecutandose();
  
  if (!ollamaEjecutandose) {
    console.log('\n❌ Ollama no está ejecutándose');
    console.log('💡 Soluciones:');
    console.log('1. Ejecuta: ollama serve');
    console.log('2. Verifica que Ollama esté instalado');
    console.log('3. Reinicia el servicio si es necesario');
    return;
  }

  // Verificar modelos
  const modeloDisponible = verificarModelos();
  
  if (!modeloDisponible) {
    console.log('\n📥 Descargando modelo...');
    const descargaExitosa = await descargarModelo();
    
    if (!descargaExitosa) {
      console.log('❌ No se pudo descargar el modelo');
      return;
    }
  }

  // Probar el modelo
  console.log('\n🧪 Probando funcionalidad...');
  const pruebaExitosa = await probarModelo();
  
  if (!pruebaExitosa) {
    console.log('❌ El modelo no responde correctamente');
    console.log('💡 Intenta reiniciar Ollama: ollama serve');
    return;
  }

  console.log('\n🎉 VERIFICACIÓN COMPLETADA');
  console.log('==========================');
  console.log('✅ Ollama está funcionando correctamente');
  console.log('✅ Modelo qwen3:1.7b está disponible');
  console.log('✅ El modelo responde correctamente');
  console.log('\n💡 Ahora puedes ejecutar el agente: npm start');
}

// Ejecutar verificación
verificarOllama().catch(console.error);
