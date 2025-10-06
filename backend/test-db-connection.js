import 'dotenv/config';
import DBConfig from './DBConfig.js';
import pkg from 'pg';
const { Client } = pkg;

async function testDatabaseConnection() {
  console.log('🔍 Probando conexión a la base de datos...');
  console.log('📋 Configuración:', {
    host: DBConfig.host,
    database: DBConfig.database,
    user: DBConfig.user,
    port: DBConfig.port,
    password: DBConfig.password ? '***CONFIGURADO***' : 'NO CONFIGURADO'
  });

  const client = new Client(DBConfig);
  
  try {
    await client.connect();
    console.log('✅ Conexión exitosa a PostgreSQL');
    
    // Probar consultas básicas
    console.log('\n📊 Verificando tablas...');
    
    // Verificar tabla Newsletter
    const newsletterResult = await client.query('SELECT COUNT(*) as count FROM "Newsletter"');
    console.log(`📧 Newsletter: ${newsletterResult.rows[0].count} registros`);
    
    // Verificar tabla Trends
    const trendsResult = await client.query('SELECT COUNT(*) as count FROM "Trends"');
    console.log(`📈 Trends: ${trendsResult.rows[0].count} registros`);
    
    // Verificar tabla Fuentes
    const fuentesResult = await client.query('SELECT COUNT(*) as count FROM "Fuentes"');
    console.log(`🔗 Fuentes: ${fuentesResult.rows[0].count} registros`);
    
    // Probar inserción en Trends
    console.log('\n🧪 Probando inserción en Trends...');
    const testInsert = await client.query(`
      INSERT INTO "Trends" (
        "id_newsletter", "Título_del_Trend", "Link_del_Trend", 
        "Nombre_Newsletter_Relacionado", "Fecha_Relación", "Relacionado", "Analisis_relacion"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING "id", "Título_del_Trend", "Relacionado"
    `, [
      null,
      'Test de conexión a la base de datos',
      'https://test.com',
      '',
      new Date().toISOString(),
      false,
      'Prueba de inserción exitosa'
    ]);
    
    console.log('✅ Inserción exitosa:', testInsert.rows[0]);
    
    // Limpiar el registro de prueba
    await client.query('DELETE FROM "Trends" WHERE "id" = $1', [testInsert.rows[0].id]);
    console.log('🧹 Registro de prueba eliminado');
    
    console.log('\n🎉 ¡Base de datos funcionando correctamente!');
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    console.error('🔍 Detalles:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Soluciones:');
      console.log('1. Verifica que PostgreSQL esté ejecutándose');
      console.log('2. Ejecuta: net start postgresql-x64-15');
      console.log('3. Verifica el puerto 5432');
    } else if (error.code === '28P01') {
      console.log('\n💡 Soluciones:');
      console.log('1. Verifica la contraseña en el archivo .env');
      console.log('2. Asegúrate de que el usuario "postgres" existe');
    } else if (error.code === '3D000') {
      console.log('\n💡 Soluciones:');
      console.log('1. Ejecuta el script database-setup.sql');
      console.log('2. O ejecuta: install-and-setup.bat');
    }
    
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Ejecutar la prueba
testDatabaseConnection();
