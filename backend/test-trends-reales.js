// test-trends-reales.js - Simula la creación real de trends
import { procesarUrlsYPersistir } from './Agent/main.js';
import eventBus from './EventBus.js';

console.log('🧪 Simulando creación real de trends...\n');

// Simular noticias reales que podrían venir de la API
const noticiasReales = [
  {
    title: 'Nueva planta solar de 500MW inaugurada en España',
    url: 'https://ejemplo.com/planta-solar-espana',
    publishedAt: new Date().toISOString(),
    source: 'El País'
  },
  {
    title: 'Tesla anuncia baterías de hidrógeno para vehículos comerciales',
    url: 'https://ejemplo.com/tesla-baterias-hidrogeno',
    publishedAt: new Date().toISOString(),
    source: 'TechCrunch'
  },
  {
    title: 'Empresa argentina desarrolla tecnología de captura de CO2',
    url: 'https://ejemplo.com/captura-co2-argentina',
    publishedAt: new Date().toISOString(),
    source: 'Clarín'
  }
];

console.log(`📰 Procesando ${noticiasReales.length} noticias reales...`);

async function simularProcesamientoReal() {
  try {
    console.log('🤖 Enviando noticias al agente para análisis...');
    
    // Procesar las noticias como lo haría el sistema real
    const resultados = await procesarUrlsYPersistir(noticiasReales);
    
    console.log(`✅ Procesamiento completado. Resultados: ${resultados.length}`);
    
    // Mostrar estadísticas detalladas
    if (resultados.length > 0) {
      const climatechCount = resultados.filter(r => r.resultado?.esClimatech).length;
      const noClimatechCount = resultados.length - climatechCount;
      const trendsCreados = resultados.filter(r => r.resultado?.esClimatech && r.resultado?.newslettersRelacionados?.length > 0);
      
      console.log(`\n📊 Estadísticas del procesamiento:`);
      console.log(`   - Total noticias procesadas: ${resultados.length}`);
      console.log(`   - Noticias climatech: ${climatechCount}`);
      console.log(`   - Noticias no climatech: ${noClimatechCount}`);
      console.log(`   - Trends creados en BDD: ${trendsCreados.length}`);
      
      // Mostrar detalles de cada noticia
      console.log(`\n📰 Detalle de cada noticia:`);
      resultados.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.resultado?.titulo || 'Sin título'}`);
        console.log(`      URL: ${r.url}`);
        console.log(`      Es climatech: ${r.resultado?.esClimatech ? '✅ SÍ' : '❌ NO'}`);
        if (r.resultado?.esClimatech) {
          console.log(`      Newsletters relacionados: ${r.resultado.newslettersRelacionados?.length || 0}`);
          if (r.resultado.newslettersRelacionados?.length > 0) {
            console.log(`      ✅ TREND CREADO EN BDD`);
          } else {
            console.log(`      ⚠️ No se creó trend (sin newsletters relacionados)`);
          }
        }
        console.log('');
      });
      
      // Notificar al EventBus como lo haría buscarNoticias.mjs
      if (trendsCreados.length > 0) {
        console.log('📡 Notificando creación de trends al EventBus...');
        eventBus.notifyNewsUpdate({
          count: trendsCreados.length,
          timestamp: new Date().toISOString(),
          message: `Se crearon ${trendsCreados.length} nuevos trends en la base de datos`,
          resultados: trendsCreados,
          tipo: 'trendsCreados'
        });
        console.log('✅ Notificación enviada al EventBus');
      } else {
        console.log('📡 Notificando procesamiento de noticias al EventBus...');
        eventBus.notifyNewsUpdate({
          count: resultados.length,
          timestamp: new Date().toISOString(),
          message: `Se procesaron ${resultados.length} noticias (sin trends nuevos)`,
          resultados: resultados,
          tipo: 'noticiasProcesadas'
        });
        console.log('✅ Notificación enviada al EventBus');
      }
    }
    
    console.log('\n📊 Estadísticas del EventBus:');
    console.log(eventBus.getStats());
    
    console.log('\n✅ Simulación completada exitosamente!');
    console.log('\n💡 Para verificar que funcionó:');
    console.log('   1. Revisa la base de datos para ver si se crearon trends');
    console.log('   2. Abre el frontend y verifica que la tabla se actualice');
    console.log('   3. Deberías ver el indicador azul "¡Se crearon X nuevos trends!"');
    
  } catch (error) {
    console.error('❌ Error en la simulación:', error);
  }
}

// Ejecutar la simulación
simularProcesamientoReal();
