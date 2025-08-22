import 'dotenv/config';
import DBConfig from './DBConfig.js';
import pkg from 'pg';
const { Client } = pkg;

console.log('🧪 Probando conexión a la base de datos...');
console.log('Configuración:', DBConfig);

async function testConnection() {
  const client = new Client(DBConfig);
  
  try {
    console.log('🔌 Conectando a PostgreSQL...');
    await client.connect();
    console.log('✅ Conexión exitosa!');
    
    // Verificar si la base de datos existe
    const dbResult = await client.query("SELECT datname FROM pg_database WHERE datname = $1", [DBConfig.database]);
    if (dbResult.rows.length === 0) {
      console.log('⚠️  La base de datos no existe. Creando...');
      await client.query(`CREATE DATABASE "${DBConfig.database}"`);
      console.log('✅ Base de datos creada exitosamente');
    } else {
      console.log('✅ Base de datos existe');
    }
    
    // Conectar a la base de datos específica
    await client.end();
    const dbClient = new Client({
      ...DBConfig,
      database: DBConfig.database
    });
    
    await dbClient.connect();
    console.log('✅ Conectado a la base de datos específica');
    
    // Verificar si las tablas existen
    const tableResult = await dbClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('Newsletter', 'Trends')
    `);
    
    console.log('📋 Tablas encontradas:', tableResult.rows.map(r => r.table_name));
    
    if (tableResult.rows.length === 0) {
      console.log('⚠️  No se encontraron tablas. Ejecuta el script database-setup.sql');
    } else {
      // Verificar datos en Newsletter
      const newsletterResult = await dbClient.query('SELECT COUNT(*) as count FROM "Newsletter"');
      console.log(`📧 Newsletters en la base de datos: ${newsletterResult.rows[0].count}`);
      
      // Verificar datos en Trends
      const trendsResult = await dbClient.query('SELECT COUNT(*) as count FROM "Trends"');
      console.log(`📊 Trends en la base de datos: ${trendsResult.rows[0].count}`);
    }
    
    await dbClient.end();
    console.log('✅ Prueba completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 SOLUCIÓN:');
      console.log('1. Instala PostgreSQL desde: https://www.postgresql.org/download/windows/');
      console.log('2. Asegúrate de que el servicio esté ejecutándose');
      console.log('3. Verifica que las credenciales en .env sean correctas');
    } else if (error.code === '28P01') {
      console.log('\n🔧 SOLUCIÓN:');
      console.log('1. Verifica la contraseña del usuario postgres en .env');
      console.log('2. La contraseña debe coincidir con la configurada durante la instalación');
    } else if (error.code === '3D000') {
      console.log('\n🔧 SOLUCIÓN:');
      console.log('1. Ejecuta el script database-setup.sql para crear la base de datos');
      console.log('2. O ejecuta: setup-database.bat como administrador');
    }
    
  }
}

testConnection();
