import 'dotenv/config';

console.log('🔧 Configuración de Base de Datos:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_DATABASE:', process.env.DB_DATABASE);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PORT:', process.env.DB_PORT);

const DBConfig = {
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_DATABASE || 'climatetech_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'tu_password',
  port: parseInt(process.env.DB_PORT) || 5432
};

export default DBConfig;
