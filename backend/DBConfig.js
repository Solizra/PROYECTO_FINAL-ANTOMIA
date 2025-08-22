import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import fs from 'fs';

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Intentar cargar .env desde múltiples ubicaciones
const possiblePaths = [
  join(__dirname, '.env'),           // backend/.env
  join(__dirname, '..', '.env'),     // raíz del proyecto/.env
  join(process.cwd(), '.env')        // directorio de trabajo actual/.env
];

console.log('🔍 Buscando archivo .env en las siguientes rutas:');
possiblePaths.forEach(path => {
  const exists = fs.existsSync(path);
  console.log(`${exists ? '✅' : '❌'} ${path}`);
});

// Cargar el primer archivo .env que exista
let envLoaded = false;
for (const path of possiblePaths) {
  if (fs.existsSync(path)) {
    console.log(`📁 Cargando .env desde: ${path}`);
    config({ path });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.log('⚠️  No se encontró archivo .env, usando valores por defecto');
}

console.log('🔧 Configuración de Base de Datos:');
console.log('📁 Directorio actual:', __dirname);
console.log('🔍 Variables de entorno:');
console.log('  DB_HOST:', process.env.DB_HOST || 'NO DEFINIDO');
console.log('  DB_DATABASE:', process.env.DB_DATABASE || 'NO DEFINIDO');
console.log('  DB_USER:', process.env.DB_USER || 'NO DEFINIDO');
console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '***DEFINIDO***' : 'NO DEFINIDO');
console.log('  DB_PORT:', process.env.DB_PORT || 'NO DEFINIDO');

const DBConfig = {
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_DATABASE || 'climatetech_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'tu_password',
  port: parseInt(process.env.DB_PORT) || 5432
};

console.log('🎯 Configuración final:', {
  host: DBConfig.host,
  database: DBConfig.database,
  user: DBConfig.user,
  password: DBConfig.password ? '***CONFIGURADO***' : 'NO CONFIGURADO',
  port: DBConfig.port
});

export default DBConfig;
