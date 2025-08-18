// buscarNoticias.mjs
import fetch from 'node-fetch';
import fs from 'fs';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import path from 'path';

// 🔐 Pegá tu clave acá
const API_KEY = '5cd26781b7d64a329de50c8899fc5eaa'; // 👈 reemplazar

const fechaActual = new Date(Date.now());
function restarDias(fecha, dias) {
  const nuevaFecha = new Date(fecha);
  nuevaFecha.setDate(nuevaFecha.getDate() - dias);
  return nuevaFecha;
}

// 🔍 Término que querés buscar (enfocado en Climatech y energía/sostenibilidad, con exclusiones)
const query = `(
 'medio ambiente')`;

// 📰 Medios confiables (dominios) para restringir resultados
const trustedDomains = [
  'elpais.com',
  'bbc.com',
  'pagina12.com.ar',
  'elcronista.com',
  'elperiodico.com',
  'lanacion.com.ar',
  'clarin.com',
  'nationalgeographic.com',
  'eltiempo.com',
];
const fromDate = restarDias(fechaActual, 7); //resta 7 dias a la fecha actual
const sortBy = 'relevancy';
const language = 'es';

// Ruta absoluta al archivo de salida para asegurar escritura en la misma carpeta del módulo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const noticiasFilePath = path.join(__dirname, 'noticias.json');

// maxResults: máximo de resultados a devolver (1..100). Por defecto 20
async function buscarNoticias(maxResults = 5) { // Cambia este número por el que quieras
  try {
    const pageSize = Math.min(Math.max(parseInt(maxResults, 10) || 20, 1), 100);
    const fromDateISO = (fromDate instanceof Date ? fromDate : new Date(fromDate))
      .toISOString()
      .split('T')[0]; // usar solo la fecha para mayor compatibilidad

    console.log(`🕐 [${new Date().toLocaleString()}] Iniciando búsqueda de noticias... (máx: ${pageSize})`);
    
    const url = `https://newsapi.org/v2/everything?` +
      `q=${encodeURIComponent(query.replace(/\s+/g, ' '))}` +
      `&searchIn=title,description` +
      `&domains=${encodeURIComponent(trustedDomains.join(','))}` +
      `&from=${fromDateISO}` +
      `&language=${language}` +
      `&sortBy=${sortBy}` +
      `&pageSize=${pageSize}` +
      `&page=1` +
      `&apiKey=${API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "ok") {
      console.error("❌ Error al buscar noticias:", data);
      return;
    }


    // Filtrado adicional por dominio confiable (por si el API retorna algo fuera de la lista)
    const articles = (data.articles || [])
      .filter(a => {
        try {
          const urlObj = new URL(a.url || '');
          return trustedDomains.some(d => urlObj.hostname.includes(d));
        } catch {
          return false;
        }
      })
      .slice(0, pageSize);

      

    // Normalizar a un formato mínimo solo con datos necesarios para el agente/front
    const minimal = articles.map(a => ({
      title: a.title || '',
      url: a.url || '',
      publishedAt: a.publishedAt || '',
      source: a.source?.name || ''
    })).filter(a => a.url);

    // Guardar en archivo JSON dentro de esta carpeta
    fs.writeFileSync(noticiasFilePath, JSON.stringify(minimal, null, 2));
    console.log(`✅ URLs guardadas en "${noticiasFilePath}"`);
    console.log(`🕐 [${new Date().toLocaleString()}] Búsqueda completada exitosamente\n`);

    return articles;
  } catch (error) {
    console.error('❌ Error durante la búsqueda de noticias:', error);
    return [];
  }
  
}

// Función para iniciar la programación automática
function iniciarProgramacionAutomatica() {
  console.log('🚀 Iniciando programación automática de búsqueda de noticias...');
  
  // Ejecutar inmediatamente al iniciar con valor por defecto
  buscarNoticias();
  
  // Programar ejecución cada 30 minutos (puedes cambiar este intervalo)
  // Formato cron: '*/30 * * * *' = cada 30 minutos
  // Otros ejemplos:
  // '0 */1 * * *' = cada hora
  // '0 */6 * * *' = cada 6 horas
  // '0 9 * * *' = todos los días a las 9:00 AM
  // '0 9,18 * * *' = todos los días a las 9:00 AM y 6:00 PM
  
  const cronExpression = '*/1 * * * *'; // Cada minuto
  
  cron.schedule(cronExpression, () => {
    buscarNoticias(); // refresca solo las URLs para el agente/front
  }, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires" // Ajusta a tu zona horaria
  });
  
  console.log(`⏰ Programación configurada: ejecutando cada minuto`);
  console.log(`📅 Próxima ejecución programada según cron: ${cronExpression}`);
}

// Función para ejecutar una sola vez (comportamiento original)
function ejecutarUnaVez(maxResults) {
  buscarNoticias(maxResults);
}

// Exportar funciones para uso externo
export { buscarNoticias, iniciarProgramacionAutomatica, ejecutarUnaVez };

// Si se ejecuta directamente este archivo, iniciar la programación automática
if (process.argv[1] && process.argv[1].includes('buscarNoticias.mjs')) {
  // Permitir un argumento --limit=N opcional
  const limitArg = process.argv.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

  // Verificar si se pasa un argumento para ejecutar una sola vez
  if (process.argv.includes('--once')) {
    console.log('🔄 Ejecutando búsqueda una sola vez...');
    ejecutarUnaVez(limit);
  } else {
    iniciarProgramacionAutomatica();
  }
}
