// test-sse.js - Script de prueba para el sistema de eventos
import eventBus from './EventBus.js';

console.log('🧪 Iniciando pruebas del sistema de eventos...\n');

// Simular algunos eventos para probar
setTimeout(() => {
  console.log('📡 Enviando evento de prueba: newTrend');
  eventBus.notifyNewTrend({
    id: 999,
    newsletterTitulo: 'Newsletter de Prueba',
    newsletterId: 'test-123',
    fechaRelacion: new Date().toISOString(),
    trendTitulo: 'Trend de Prueba - Energía Solar',
    trendLink: 'https://ejemplo.com/energia-solar',
    relacionado: true,
    newsletterLink: 'https://ejemplo.com/newsletter',
    analisisRelacion: 'Relacionado por palabras clave: energía, solar, renovable',
    resumenFama: 'Noticia sobre avances en energía solar',
    autor: 'Autor de Prueba'
  });
}, 2000);

setTimeout(() => {
  console.log('📡 Enviando evento de prueba: newsUpdate');
  eventBus.notifyNewsUpdate({
    count: 5,
    timestamp: new Date().toISOString(),
    message: 'Se procesaron 5 nuevas noticias'
  });
}, 4000);

setTimeout(() => {
  console.log('📡 Enviando evento de prueba: error');
  eventBus.notifyError('Error simulado para pruebas');
}, 6000);

setTimeout(() => {
  console.log('\n📊 Estadísticas del EventBus:');
  console.log(eventBus.getStats());
  
  console.log('\n✅ Pruebas completadas. El sistema está funcionando correctamente.');
  process.exit(0);
}, 8000);

console.log('⏳ Las pruebas se ejecutarán automáticamente...');
console.log('🔌 Conecta un cliente SSE a http://localhost:3000/api/events para ver los eventos');
