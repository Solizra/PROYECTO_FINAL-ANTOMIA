// buscarNoticias.mjs
import fetch from 'node-fetch';
import fs from 'fs';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import path from 'path';
import { procesarUrlsYPersistir } from '../Agent/main.js';

// 🔐 Pegá tu clave acá
const API_KEY = '5cd26781b7d64a329de50c8899fc5eaa'; 

function restarDias(fecha, dias) {
  const nuevaFecha = new Date(fecha);
  nuevaFecha.setDate(nuevaFecha.getDate() - dias);
  return nuevaFecha;
}

// 🔍 Término que querés buscar (enfocado en Climatech y sostenibilidad, más amplio)
const query = `(
  medio ambiente OR climatech OR cleantech OR "energía renovable" OR "energias renovables" OR
  sostenibilidad OR "cambio climático" OR "eficiencia energética" OR "emisiones" OR
  "tecnología ambiental" OR "hidrógeno verde" OR "movilidad eléctrica" OR "economía circular"
)`;

// 📰 Medios confiables (dominios) para restringir resultados
const trustedDomains = [
  'elpais.com',
  'bbc.com',
  'pagina12.com.ar',
  'elcronista.com',
  'lanacion.com.ar',
  'clarin.com',
  'nationalgeographic.com',
  'eltiempo.com',
  'elmundo.es',
  'elconfidencial.com',
  'ambito.com',
  'infobae.com',
  'eldiario.es',
];
const sortBy = 'relevancy';
const language = 'es';
// Palabras clave para filtrar temática si el proveedor devuelve ruido
const TOPIC_KEYWORDS = [
  'climatech', 'cleantech', 'clima', 'medio ambiente', 'ambiental', 'sosten',
  'energ', 'renovabl', 'solar', 'eólic', 'eolic', 'geotérm', 'geoterm', 'hidroeléctr', 'hidroelect',
  'emision', 'emisión', 'co2', 'carbono', 'captura de carbono', 'huella de carbono',
  'hidrógeno', 'hidrogeno', 'movilidad', 'eléctr', 'electric', 'vehículo eléctrico',
  'recicl', 'economía circular', 'economia circular', 'agua', 'biodiversidad'
];

function removeDiacriticsLocal(str) {
  try { return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch { return String(str || ''); }
}

// Ruta absoluta al archivo de salida para asegurar escritura en la misma carpeta del módulo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const noticiasFilePath = path.join(__dirname, 'noticias.json');

// maxResults: máximo de resultados a devolver (1..100). Por defecto 20
async function buscarNoticias(maxResults = 30) { // traer más resultados por defecto
  try {
    // Calcular el rango de fechas en cada ejecución (ventana móvil)
    const fechaActual = new Date();
    const fromDate = restarDias(fechaActual, 7);
    const pageSize = Math.min(Math.max(parseInt(maxResults, 10) || 20, 1), 100);
    const fromDateISO = (fromDate instanceof Date ? fromDate : new Date(fromDate))
      .toISOString()
      .split('T')[0]; // usar solo la fecha para mayor compatibilidad

    console.log(`🕐 [${new Date().toLocaleString()}] Iniciando búsqueda de noticias... (máx: ${pageSize})`);
    
    const url = `https://newsapi.org/v2/everything?` +
      `q=${encodeURIComponent(query.replace(/\s+/g, ' '))}` +
      `&searchIn=title,description,content` +
      `&from=${fromDateISO}` +
      `&language=${language}` +
      `&sortBy=${sortBy}` +
      `&pageSize=${pageSize}` +
      `&page=1` +
      // Restringir a dominios confiables desde la propia API
      `&domains=${encodeURIComponent(trustedDomains.join(','))}` +
      `&apiKey=${API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "ok") {
      console.error("❌ Error al buscar noticias:", data);
      return;
    }


    const allArticles = (data.articles || []);
    // Filtrado adicional por dominio confiable (estricto)
    let filtered = allArticles.filter(a => {
      try {
        const urlObj = new URL(a.url || '');
        return trustedDomains.some(d => urlObj.hostname.includes(d));
      } catch {
        return false;
      }
    });
    // Filtro temático adicional por título/descr (insensible a acentos) con puntuación mínima
    const topical = filtered.filter(a => {
      const textNorm = removeDiacriticsLocal(`${a.title || ''} ${a.description || ''}`.toLowerCase());
      let hits = 0;
      for (const k of TOPIC_KEYWORDS) {
        const kNorm = removeDiacriticsLocal(k.toLowerCase());
        if (textNorm.includes(kNorm)) hits++;
        if (hits >= 2) break;
      }
      return hits >= 1; // exige al menos 1 coincidencia; subir a 2 si se quiere más precisión
    });
    const chosen = topical.length > 0 ? topical : filtered;
    const articles = chosen.slice(0, pageSize);

      

    // Normalizar a un formato mínimo solo con datos necesarios para el agente/front
    const minimal = articles.map(a => ({
      title: a.title || '',
      url: a.url || '',
      publishedAt: a.publishedAt || '',
      source: a.source?.name || ''
    })).filter(a => a.url);

    // Guardar en archivo JSON dentro de esta carpeta
    fs.writeFileSync(noticiasFilePath, JSON.stringify(minimal, null, 2));
    console.log(`✅ URLs guardadas en "${noticiasFilePath}" (${minimal.length} items)`);

    // Enviar URLs al agente para analizar y (si corresponde) persistir en Trends.
    // Si hubo errores de extracción, el agente responderá con esClimatech=false y no se insertará.
    try {
      console.log(`🤖 Enviando ${minimal.length} URLs al agente para análisis...`);
      const resultados = await procesarUrlsYPersistir(minimal);
      console.log('✅ Agente terminó el procesamiento de URLs');
      
      // Verificar cuántos trends se crearon realmente
      let trendsCreados = 0;
      if (resultados && resultados.length > 0) {
        // Contar solo los resultados que realmente se insertaron en la base de datos
        trendsCreados = resultados.filter(r => r.insertado === true).length;
        console.log(`📊 Trends creados en la base de datos: ${trendsCreados}/${resultados.length}`);
      }
      
      // Notificar al EventBus con información específica
      try {
        const eventBus = await import('../EventBus.js');
        
        if (trendsCreados > 0) {
          // Si se crearon trends, notificar como "trendsCreados"
          eventBus.default.notifyNewsUpdate({
            count: trendsCreados,
            timestamp: new Date().toISOString(),
            message: `Se crearon ${trendsCreados} nuevos trends`,
            tipo: 'trendsCreados',
            resultados: resultados
          });
          console.log(`📡 Notificación de trends creados enviada al EventBus: ${trendsCreados} trends`);
        } else {
          // Si no se crearon trends, notificar como "noticias procesadas"
          eventBus.default.notifyNewsUpdate({
            count: resultados.length,
            timestamp: new Date().toISOString(),
            message: `Se procesaron ${resultados.length} noticias (sin trends nuevos)`,
            tipo: 'noticiasProcesadas',
            resultados: resultados
          });
          console.log('📡 Notificación de noticias procesadas enviada al EventBus');
        }
      } catch (eventError) {
        console.error('❌ Error notificando al EventBus:', eventError);
      }
    } catch (e) {
      console.error('❌ Error al procesar URLs con el agente:', e?.message || e);
    }
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
  
  const cronExpression = '*/100 * * * *'; // Cada minuto
  
  // Nota: evitamos especificar timezone para mayor compatibilidad en Windows
  // y entornos sin ICU completo. Para expresiones por minuto no es necesario.
  cron.schedule(cronExpression, () => {
    console.log(`⏱️ Disparador cron: ${new Date().toLocaleString()}`);
    buscarNoticias(); // refresca solo las URLs para el agente/front
  }, {
    scheduled: true
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
