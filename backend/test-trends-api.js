import 'dotenv/config';
import DBConfig from './DBConfig.js';
import pkg from 'pg';
const { Client } = pkg;

async function testTrendsAPI() {
  console.log('🧪 Probando API de Trends...');
  
  const client = new Client(DBConfig);
  
  try {
    await client.connect();
    console.log('✅ Conexión a la base de datos exitosa');
    
    // Probar consulta directa
    console.log('\n📊 Consultando trends directamente desde la base de datos...');
    const result = await client.query(`
      SELECT "id", "id_newsletter", "Título_del_Trend", "Link_del_Trend",
             "Nombre_Newsletter_Relacionado", "Fecha_Relación", "Relacionado", "Analisis_relacion"
      FROM "Trends"
      ORDER BY "id" DESC
      LIMIT 5
    `);
    
    console.log(`📈 Encontrados ${result.rows.length} trends:`);
    result.rows.forEach((trend, index) => {
      console.log(`\n${index + 1}. ID: ${trend.id}`);
      console.log(`   Título: ${trend['Título_del_Trend']}`);
      console.log(`   Link: ${trend['Link_del_Trend']}`);
      console.log(`   Newsletter ID: ${trend.id_newsletter}`);
      console.log(`   Newsletter Nombre: ${trend['Nombre_Newsletter_Relacionado']}`);
      console.log(`   Relacionado: ${trend.Relacionado}`);
      console.log(`   Análisis: ${trend['Analisis_relacion']?.substring(0, 100)}...`);
    });
    
    // Probar inserción
    console.log('\n🧪 Probando inserción de trend...');
    const testTrend = {
      id_newsletter: null,
      Título_del_Trend: 'Test API Trends - ' + new Date().toISOString(),
      Link_del_Trend: 'https://test-api.com',
      Nombre_Newsletter_Relacionado: '',
      Fecha_Relación: new Date().toISOString(),
      Relacionado: false,
      Analisis_relacion: 'Prueba de inserción desde test API'
    };
    
    const insertResult = await client.query(`
      INSERT INTO "Trends" (
        "id_newsletter", "Título_del_Trend", "Link_del_Trend", 
        "Nombre_Newsletter_Relacionado", "Fecha_Relación", "Relacionado", "Analisis_relacion"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING "id", "Título_del_Trend", "Relacionado"
    `, [
      testTrend.id_newsletter,
      testTrend.Título_del_Trend,
      testTrend.Link_del_Trend,
      testTrend.Nombre_Newsletter_Relacionado,
      testTrend.Fecha_Relación,
      testTrend.Relacionado,
      testTrend.Analisis_relacion
    ]);
    
    console.log('✅ Inserción exitosa:', insertResult.rows[0]);
    
    // Limpiar
    await client.query('DELETE FROM "Trends" WHERE "id" = $1', [insertResult.rows[0].id]);
    console.log('🧹 Registro de prueba eliminado');
    
    console.log('\n🎉 ¡API de Trends funcionando correctamente!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('🔍 Detalles:', error);
  } finally {
    await client.end();
  }
}

// Ejecutar la prueba
testTrendsAPI();
