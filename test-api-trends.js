import fetch from 'node-fetch';

async function testTrendsAPI() {
  console.log('🧪 Probando API de Trends...');
  
  try {
    // Esperar un poco para que el servidor se inicie
    console.log('⏳ Esperando que el servidor se inicie...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const response = await fetch('http://localhost:3000/api/Trends?limit=1000');
    
    if (!response.ok) {
      console.error('❌ Error en la respuesta:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    console.log(`📊 Trends recibidos: ${data.length}`);
    
    if (data.length > 0) {
      console.log('📋 Primer trend:');
      console.log(`   ID: ${data[0].id}`);
      console.log(`   Título: ${data[0]['Título_del_Trend']}`);
      console.log(`   Relacionado: ${data[0].Relacionado}`);
      console.log(`   Newsletter ID: ${data[0].id_newsletter}`);
    }
    
    if (data.length >= 465) {
      console.log('✅ ¡Perfecto! Se están retornando todos los trends');
    } else if (data.length >= 100) {
      console.log('⚠️ Se están retornando muchos trends, pero no todos');
    } else {
      console.log('❌ Solo se están retornando pocos trends');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testTrendsAPI();
