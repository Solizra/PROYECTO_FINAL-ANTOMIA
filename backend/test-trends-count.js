import 'dotenv/config';
import DBConfig from './DBConfig.js';
import pkg from 'pg';
const { Client } = pkg;

async function testTrendsCount() {
  console.log('🧪 Probando conteo de trends...');
  
  const client = new Client(DBConfig);
  
  try {
    await client.connect();
    console.log('✅ Conexión a la base de datos exitosa');
    
    // Contar total de trends
    const totalResult = await client.query('SELECT COUNT(*) as total FROM "Trends"');
    console.log(`📊 Total de trends en la base de datos: ${totalResult.rows[0].total}`);
    
    // Probar consulta con límite 1000
    const limitedResult = await client.query(`
      SELECT t."id", t."id_newsletter", t."Título_del_Trend", t."Link_del_Trend",
             t."Nombre_Newsletter_Relacionado", t."Fecha_Relación", t."Relacionado", t."Analisis_relacion"
      FROM "Trends" t
      ORDER BY t."Fecha_Relación" DESC, t."id" DESC
      LIMIT 1000
    `);
    
    console.log(`📈 Trends retornados con límite 1000: ${limitedResult.rows.length}`);
    
    // Mostrar algunos ejemplos
    console.log('\n📋 Primeros 3 trends:');
    limitedResult.rows.slice(0, 3).forEach((trend, index) => {
      console.log(`${index + 1}. ID: ${trend.id} - ${trend['Título_del_Trend']}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

testTrendsCount();
