// test-eventbus.js - Prueba simple del EventBus
import eventBus from './EventBus.js';

console.log('🧪 Probando EventBus...');

// Simular un nuevo trend
const testTrend = {
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
};

console.log('📡 Enviando evento newTrend...');
eventBus.notifyNewTrend(testTrend);

console.log('📊 Estadísticas del EventBus:');
console.log(eventBus.getStats());

console.log('✅ Prueba completada');
