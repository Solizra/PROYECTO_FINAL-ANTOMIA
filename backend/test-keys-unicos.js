// test-keys-unicos.js
// Script para probar que no haya keys duplicados en los trends

import TrendsService from './Services/Trends-services.js';

console.log('🔑 PROBANDO KEYS ÚNICOS EN TRENDS');
console.log('==================================');

async function verificarKeysUnicos() {
  try {
    const trendsSvc = new TrendsService();
    
    // Obtener todos los trends
    console.log('📥 Obteniendo todos los trends de la base de datos...');
    const trends = await trendsSvc.getAllAsync();
    
    if (!trends || trends.length === 0) {
      console.log('ℹ️ No hay trends en la base de datos');
      return;
    }
    
    console.log(`📊 Total de trends encontrados: ${trends.length}`);
    
    // Verificar IDs únicos
    const ids = trends.map(t => t.id).filter(id => id != null);
    const idsUnicos = new Set(ids);
    
    console.log(`🔍 IDs únicos: ${idsUnicos.size}/${ids.length}`);
    
    if (ids.length !== idsUnicos.size) {
      console.error('❌ HAY IDs DUPLICADOS!');
      const duplicados = ids.filter((id, index) => ids.indexOf(id) !== index);
      console.error('IDs duplicados:', duplicados);
    } else {
      console.log('✅ Todos los IDs son únicos');
    }
    
    // Verificar URLs únicas
    const urls = trends.map(t => t.trendLink || t.Link_del_Trend).filter(url => url);
    const urlsUnicas = new Set(urls);
    
    console.log(`🔗 URLs únicas: ${urlsUnicas.size}/${urls.length}`);
    
    if (urls.length !== urlsUnicas.size) {
      console.warn('⚠️ HAY URLs DUPLICADAS (esto es normal si hay múltiples newsletters relacionados)');
      const duplicados = urls.filter((url, index) => urls.indexOf(url) !== index);
      console.warn('URLs duplicadas:', duplicados.slice(0, 5)); // Mostrar solo las primeras 5
    } else {
      console.log('✅ Todas las URLs son únicas');
    }
    
    // Verificar que cada trend tenga un ID único para React
    console.log('\n🔑 GENERANDO KEYS PARA REACT...');
    
    const keys = trends.map((trend, index) => {
      if (trend.id) {
        return `trend-${trend.id}`;
      } else {
        return `trend-${index}-${trend.trendLink || trend.Link_del_Trend || 'no-url'}`;
      }
    });
    
    const keysUnicas = new Set(keys);
    
    console.log(`🔑 Keys únicas para React: ${keysUnicas.size}/${keys.length}`);
    
    if (keys.length !== keysUnicas.size) {
      console.error('❌ HAY KEYS DUPLICADAS PARA REACT!');
      const duplicados = keys.filter((key, index) => keys.indexOf(key) !== index);
      console.error('Keys duplicadas:', duplicados);
    } else {
      console.log('✅ Todas las keys para React son únicas');
    }
    
    // Mostrar algunos ejemplos de trends
    console.log('\n📋 EJEMPLOS DE TRENDS:');
    trends.slice(0, 3).forEach((trend, index) => {
      console.log(`${index + 1}. ID: ${trend.id || 'SIN ID'}`);
      console.log(`   Título: ${trend.trendTitulo || trend.Título_del_Trend || 'Sin título'}`);
      console.log(`   URL: ${trend.trendLink || trend.Link_del_Trend || 'Sin URL'}`);
      console.log(`   Key React: ${keys[index]}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error verificando keys únicos:', error);
  }
}

// Ejecutar la verificación
verificarKeysUnicos();
