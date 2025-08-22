// test-flujo-completo.js - Prueba del flujo completo del sistema
import { procesarUrlsYPersistir } from './Agent/main.js';
import eventBus from './EventBus.js';

console.log('🧪 Iniciando prueba del flujo completo...\n');

// Simular noticias que vienen de la API (como en buscarNoticias.mjs)
const noticiasSimuladas = [
  {
    title: 'Nueva tecnología solar revoluciona la industria energética',
    url: 'https://ejemplo.com/tecnologia-solar',
    publishedAt: new Date().toISOString(),
    source: 'TechNews'
  },
  {
    title: 'Empresa desarrolla baterías de hidrógeno verde',
    url: 'https://ejemplo.com/baterias-hidrogeno',
    publishedAt: new Date().toISOString(),
    source: 'GreenTech'
  },
  {
    title: 'Noticia de deportes que no es climatech',
    url: 'https://ejemplo.com/deportes',
    publishedAt: new Date().toISOString(),
    source: 'SportsNews'
  }
];

console.log('📰 Noticias simuladas:', noticiasSimuladas.length);
noticiasSimuladas.forEach((n, i) => {
  console.log(`  ${i + 1}. ${n.title}`);
});

console.log('\n🤖 Enviando al agente para procesamiento...');

// Simular el procesamiento que hace buscarNoticias.mjs
(async () => {
  try {
    const resultados = await procesarUrlsYPersistir(noticiasSimuladas);
    
    console.log('\n📊 Resultados del procesamiento:');
    console.log(`Total procesados: ${resultados.length}`);
    
    // Contar trends creados
    const trendsCreados = resultados.filter(r => r.insertado === true).length;
    const totalTrends = resultados.reduce((sum, r) => sum + (r.trendsCreados || 0), 0);
    
    console.log(`Trends insertados: ${trendsCreados}`);
    console.log(`Total de trends creados: ${totalTrends}`);
    
    // Simular la notificación al EventBus (como en buscarNoticias.mjs)
    if (trendsCreados > 0) {
      console.log('\n📡 Notificando trends creados al EventBus...');
      eventBus.notifyNewsUpdate({
        count: trendsCreados,
        timestamp: new Date().toISOString(),
        message: `Se crearon ${trendsCreados} nuevos trends`,
        tipo: 'trendsCreados',
        resultados: resultados
      });
    } else {
      console.log('\n📡 Notificando noticias procesadas al EventBus...');
      eventBus.notifyNewsUpdate({
        count: resultados.length,
        timestamp: new Date().toISOString(),
        message: `Se procesaron ${resultados.length} noticias (sin trends nuevos)`,
        tipo: 'noticiasProcesadas',
        resultados: resultados
      });
    }
    
    console.log('\n✅ Flujo completo simulado exitosamente');
    console.log('\n📋 Resumen:');
    console.log(`- Noticias procesadas: ${resultados.length}`);
    console.log(`- Trends creados: ${totalTrends}`);
    console.log(`- Notificaciones enviadas: ${trendsCreados > 0 ? 'trendsCreados' : 'noticiasProcesadas'}`);
    
  } catch (error) {
    console.error('❌ Error en el flujo:', error);
  }
})();

// Mantener el proceso vivo para ver las notificaciones
setTimeout(() => {
  console.log('\n📊 Estadísticas del EventBus:');
  console.log(eventBus.getStats());
  process.exit(0);
}, 5000);
