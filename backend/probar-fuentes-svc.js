// Script para probar directamente el servicio de Fuentes
import FuentesService from './Services/Fuentes-services.js';

async function probarServicioFuentes() {
  console.log('🧪 PROBANDO SERVICIO DE FUENTES');
  console.log('===============================\n');

  try {
    const svc = new FuentesService();
    
    console.log('1️⃣ Llamando a svc.listAsync()...');
    const fuentes = await svc.listAsync();
    
    console.log('📊 Resultado del servicio:');
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

probarServicioFuentes();
