import fetch from 'node-fetch';

async function testManualAnalysis() {
  console.log('🧪 Probando análisis manual...');
  
  const testUrl = 'https://www.bbva.com/es/sostenibilidad/que-son-las-tecnologias-climaticas-o-climatech-cuando-la-innovacion-busca-combatir-el-cambio-climatico/';
  
  try {
    console.log('📝 Enviando URL para análisis:', testUrl);
    
    const response = await fetch('http://localhost:3000/api/Newsletter/analizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: testUrl })
    });
    
    if (!response.ok) {
      console.error('❌ Error en la respuesta:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('📊 Resultado del análisis:');
    console.log('  - esClimatech:', data.esClimatech);
    console.log('  - titulo:', data.titulo);
    console.log('  - url:', data.url);
    console.log('  - newslettersRelacionados:', data.newslettersRelacionados?.length || 0);
    console.log('  - inserts:', data.inserts?.length || 0);
    
    if (data.inserts && data.inserts.length > 0) {
      console.log('✅ Trends insertados:');
      data.inserts.forEach((insert, index) => {
        console.log(`  ${index + 1}. ID: ${insert.id} - ${insert.Título_del_Trend}`);
        console.log(`     Relacionado: ${insert.Relacionado}, Newsletter ID: ${insert.id_newsletter}`);
      });
    } else {
      console.log('❌ No se insertaron trends');
      if (data.esClimatech) {
        console.log('   - Es climatech pero no se insertó (posible duplicado)');
      } else {
        console.log('   - No es climatech');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testManualAnalysis();
