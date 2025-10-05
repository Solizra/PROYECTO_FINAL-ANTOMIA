// Script para probar directamente el repositorio de Fuentes
import FuentesRepository from './Repostories/Fuentes-repostory.js';

async function probarRepositorioFuentes() {
  console.log('🧪 PROBANDO REPOSITORIO DE FUENTES');
  console.log('==================================\n');

  try {
    const repo = new FuentesRepository();
    
    console.log('1️⃣ Llamando a listAsync()...');
    const fuentes = await repo.listAsync();
    
    console.log('📊 Resultado:');
    console.log('   Tipo:', typeof fuentes);
    console.log('   Es array:', Array.isArray(fuentes));
    console.log('   Longitud:', fuentes?.length || 0);
    console.log('   Contenido:', fuentes);
    
    if (fuentes && fuentes.length > 0) {
      console.log('\n📋 Primeras 3 fuentes:');
      fuentes.slice(0, 3).forEach((fuente, index) => {
        console.log(`   ${index + 1}. Dominio: ${fuente.dominio}, Categoría: ${fuente.categoria}, Activo: ${fuente.activo}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('🔍 Stack:', error.stack);
  }
}

probarRepositorioFuentes();
