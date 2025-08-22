// test-completo.js - Prueba completa del sistema
import { procesarUrlsYPersistir } from './Agent/main.js';
import eventBus from './EventBus.js';

console.log('🧪 Iniciando prueba completa del sistema...\n');

// Simular noticias que vienen de la API
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

console.log(`📰 Procesando ${noticiasSimuladas.length} noticias simuladas...`);

// Procesar las noticias como lo haría el sistema real
async function probarSistemaCompleto() {
  try {
    console.log('🤖 Enviando noticias al agente para análisis...');
    
    const resultados = await procesarUrlsYPersistir(noticiasSimuladas);
    
    console.log(`✅ Procesamiento completado. Resultados: ${resultados.length}`);
    
    // Mostrar estadísticas
    if (resultados.length > 0) {
      const climatechCount = resultados.filter(r => r.resultado?.esClimatech).length;
      const noClimatechCount = resultados.length - climatechCount;
      
      console.log(`📊 Estadísticas:`);
      console.log(`   - Total procesadas: ${resultados.length}`);
      console.log(`   - Climatech: ${climatechCount}`);
      console.log(`   - No Climatech: ${noClimatechCount}`);
      
      // Mostrar detalles de las noticias climatech
      const climatechResults = resultados.filter(r => r.resultado?.esClimatech);
      if (climatechResults.length > 0) {
        console.log(`\n🌱 Noticias Climatech encontradas:`);
        climatechResults.forEach((r, i) => {
          console.log(`   ${i + 1}. ${r.resultado.titulo}`);
          console.log(`      URL: ${r.url}`);
          console.log(`      Newsletters relacionados: ${r.resultado.newslettersRelacionados?.length || 0}`);
        });
      }
    }
    
    // Notificar al EventBus (como lo haría buscarNoticias.mjs)
    console.log('\n📡 Notificando al EventBus...');
    eventBus.notifyNewsUpdate({
      count: resultados.length,
      timestamp: new Date().toISOString(),
      message: `Se procesaron ${resultados.length} noticias`,
      resultados: resultados
    });
    
    console.log('\n📊 Estadísticas del EventBus:');
    console.log(eventBus.getStats());
    
    console.log('\n✅ Prueba completa finalizada exitosamente!');
    console.log('\n💡 Para ver las actualizaciones en tiempo real:');
    console.log('   1. Abre el frontend en el navegador');
    console.log('   2. Abre DevTools → Console');
    console.log('   3. Deberías ver los eventos SSE llegando');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar la prueba
probarSistemaCompleto();
