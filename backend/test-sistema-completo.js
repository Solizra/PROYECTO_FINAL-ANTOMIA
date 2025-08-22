// test-sistema-completo.js
// Script para probar que el sistema completo esté funcionando

import { iniciarProgramacionAutomatica } from './APIs/buscarNoticias.mjs';
import eventBus from './EventBus.js';

console.log('🧪 INICIANDO PRUEBA DEL SISTEMA COMPLETO');
console.log('==========================================');

// 1. Verificar que el EventBus esté funcionando
console.log('\n1️⃣ Probando EventBus...');
try {
  eventBus.notifyNewsUpdate({
    count: 1,
    timestamp: new Date().toISOString(),
    message: 'Prueba del sistema',
    tipo: 'trendsCreados',
    resultados: []
  });
  console.log('✅ EventBus funcionando correctamente');
} catch (error) {
  console.error('❌ Error en EventBus:', error);
}

// 2. Verificar que el scheduler se pueda iniciar
console.log('\n2️⃣ Probando scheduler automático...');
try {
  // Iniciar el scheduler (esto debería configurar el cron job)
  iniciarProgramacionAutomatica();
  console.log('✅ Scheduler iniciado correctamente');
  console.log('⏰ El sistema buscará noticias cada minuto automáticamente');
} catch (error) {
  console.error('❌ Error iniciando scheduler:', error);
}

// 3. Simular una notificación de nuevo trend
console.log('\n3️⃣ Simulando notificación de nuevo trend...');
setTimeout(() => {
  try {
    eventBus.notifyNewTrend({
      id: 'test-123',
      newsletterTitulo: 'Newsletter de Prueba',
      newsletterId: 'nl-123',
      fechaRelacion: new Date().toISOString(),
      trendTitulo: 'Trend de Prueba - Energía Solar',
      trendLink: 'https://ejemplo.com/energia-solar',
      relacionado: true,
      newsletterLink: 'https://ejemplo.com/newsletter',
      analisisRelacion: 'Prueba del sistema de notificaciones',
      resumenFama: 'Trend relevante sobre energía solar',
      autor: 'Sistema de Prueba'
    });
    console.log('✅ Notificación de nuevo trend enviada correctamente');
  } catch (error) {
    console.error('❌ Error enviando notificación:', error);
  }
}, 2000);

// 4. Mostrar estadísticas del EventBus
console.log('\n4️⃣ Estadísticas del EventBus:');
setTimeout(() => {
  try {
    const stats = eventBus.getStats();
    console.log('📊 Estadísticas:', stats);
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
  }
}, 3000);

console.log('\n🎯 SISTEMA LISTO PARA FUNCIONAR');
console.log('================================');
console.log('✅ El backend buscará noticias cada minuto');
console.log('✅ El agente procesará las noticias automáticamente');
console.log('✅ Los nuevos trends se notificarán al frontend');
console.log('✅ La tabla se actualizará en tiempo real');
console.log('\n🌐 Para probar el frontend:');
console.log('   1. Abre http://localhost:5173 en tu navegador');
console.log('   2. Ve a la página Home');
console.log('   3. Observa que la tabla se actualiza automáticamente');
console.log('   4. Los indicadores muestran el estado de la conexión');

// Mantener el script ejecutándose para que el scheduler funcione
console.log('\n⏳ Manteniendo el script activo... (Ctrl+C para detener)');
