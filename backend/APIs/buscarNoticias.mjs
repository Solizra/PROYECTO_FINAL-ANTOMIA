// buscarNoticias.mjs
import fetch from 'node-fetch';
import fs from 'fs';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import path from 'path';
import { procesarUrlsYPersistir } from '../Agent/main.js';
import FuentesService from '../Services/Fuentes-services.js';

// 🔐 Pegá tu clave acá
const API_KEY = '5cd26781b7d64a329de50c8899fc5eaa'; 

function restarDias(fecha, dias) {
  const nuevaFecha = new Date(fecha);
  nuevaFecha.setDate(nuevaFecha.getDate() - dias);
  return nuevaFecha;
}

// 🔍 Query ampliada para incluir climatech, medio ambiente y startups del rubro
const query = `(
  "medio ambiente" OR "impacto ambiental" OR "cambio climático" OR "eficiencia energética" OR sostenibilidad OR "energía renovable" OR cleantech OR "tecnología ambiental" OR "hidrógeno verde" OR "movilidad eléctrica" OR "economía circular" OR "captura de carbono" OR IA OR "IA climática" OR "transición energética" OR ESG OR biodiversidad OR "gestión del agua" OR sequía OR "minería sostenible" OR litio OR baterías OR "energía limpia" OR "economía verde"
)`;

// 📰 Medios confiables (dominios) para restringir resultados - MEJORADOS para climatech
const trustedDomains = [
  // Fuentes internacionales premium de climatech
  'techcrunch.com',
  'wired.com',
  'theverge.com',
  'arstechnica.com',
  'mit.edu',
  'nature.com',
  'science.org',
  'reuters.com',
  'bloomberg.com',
  'ft.com',
  'wsj.com',
  'cnn.com',
  'bbc.com',
  
  // Fuentes especializadas en climatech
  'cleantechnica.com',
  'greentechmedia.com',
  'carbonbrief.org',
  'insideclimatenews.org',
  'climatechreview.com',
  
  // Fuentes especializadas en medio ambiente y sostenibilidad (NUEVAS)
  'mongabay.com',
  'ensia.com',
  'grist.org',
  'treehugger.com',
  'ecowatch.com',
  'scientificamerican.com',
  'nationalgeographic.com',
  'audubon.org',
  'wwf.org',
  'conservation.org',
  'nature.org',
  'iucn.org',
  'unep.org',
  'ipcc.ch',
  
  // Fuentes en español confiables
  'elpais.com',
  'elconfidencial.com',
  'nationalgeographic.com',
  'ambito.com',
  'infobae.com'
];

const sortBy = 'relevancy';
const language = 'es';
// Palabras clave para filtrar temática - ampliadas para climatech, medio ambiente y startups
const TOPIC_KEYWORDS = [
  // Términos trending en climatech
  'climate tech funding', 'climate tech investment', 'climate tech startup',
  'carbon capture', 'carbon removal', 'direct air capture',
  'green hydrogen', 'clean hydrogen', 'hydrogen economy',
  'battery breakthrough', 'energy storage', 'grid storage',
  'renewable energy', 'solar innovation', 'wind power',
  'electric vehicles', 'EV charging', 'battery technology',
  'sustainable aviation', 'clean shipping', 'green transport',
  'circular economy', 'waste reduction', 'recycling innovation',
  'AI climate', 'machine learning climate', 'climate AI solutions',
  'carbon credits', 'carbon trading', 'climate finance',
  'net zero', 'carbon neutral', 'climate positive',
  
  // Términos en español
  'tecnología climática', 'inversión climática', 'startup climática',
  'captura de carbono', 'hidrógeno verde', 'economía del hidrógeno',
  'baterías innovación', 'almacenamiento energético', 'energía renovable',
  'vehículos eléctricos', 'economía circular', 'reducción de residuos',
  'inteligencia artificial clima', 'finanzas climáticas', 'carbono neutral',
  
  // Términos ambientales y de sostenibilidad (NUEVOS)
  'medio ambiente', 'impacto ambiental', 'conservación ambiental',
  'sostenibilidad', 'desarrollo sostenible', 'biodiversidad',
  'ecosistemas', 'humedales', 'conservación natural',
  'recursos naturales', 'protección ambiental', 'gestión ambiental',
  'minería sostenible', 'minería verde', 'minería responsable',
  'litio', 'baterías', 'energía limpia', 'transición energética',
  'cambio climático', 'adaptación climática', 'mitigación climática',
  'energías alternativas', 'tecnología verde', 'innovación ambiental',
  'agua', 'gestión hídrica', 'sequía', 'desertificación',
  'agricultura sostenible', 'agroecología', 'permacultura',
  'construcción verde', 'edificios sostenibles', 'arquitectura bioclimática',
  'movilidad sostenible', 'transporte limpio', 'logística verde',
  'industria 4.0', 'tecnología limpia', 'innovación sostenible',
  'economía verde', 'empleos verdes', 'inversión responsable',
  'ESG', 'criterios ambientales', 'finanzas verdes',
  'política ambiental', 'regulación climática', 'acuerdos ambientales',
  
  // Startups y ecosistema emprendedor del rubro
  'startup climate', 'climate startup', 'climatech startup', 'cleantech startup',
  'startup climática', 'startup verde', 'startup sostenible', 'emprendimiento verde',
  'ronda de inversión', 'serie A', 'serie B', 'seed', 'capital de riesgo',
  'venture capital', 'VC', 'aceleradora', 'incubadora', 'financiación', 'inversión',
  'pitch', 'demo day'
];

function removeDiacriticsLocal(str) {
  try { return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch { return String(str || ''); }
}

// Sistema de scoring para priorizar noticias más relevantes
function calculateNewsScore(article, trustedDomains) {
  let score = 0;
  
  try {
    // 1. Score por fuente (dominio)
    const urlObj = new URL(article.url || '');
    const hostname = urlObj.hostname.toLowerCase();
    
    // Fuentes premium (máxima puntuación)
    if (['techcrunch.com', 'wired.com', 'theverge.com', 'mit.edu', 'nature.com', 'science.org'].includes(hostname)) {
      score += 20;
    }
    // Fuentes especializadas en climatech
    else if (['cleantechnica.com', 'greentechmedia.com', 'carbonbrief.org', 'insideclimatenews.org'].includes(hostname)) {
      score += 18;
    }
    // Fuentes confiables generales
    else if (['reuters.com', 'bloomberg.com', 'ft.com', 'wsj.com', 'bbc.com'].includes(hostname)) {
      score += 15;
    }
    // Fuentes en español confiables
    else if (['elpais.com', 'elmundo.es', 'elconfidencial.com'].includes(hostname)) {
      score += 12;
    }
    // Otras fuentes confiables
    else if (Array.isArray(trustedDomains) && trustedDomains.some(d => hostname.includes(d))) {
      score += 8;
    }
    
    // 2. Score por relevancia del contenido
    const textNorm = removeDiacriticsLocal(`${article.title || ''} ${article.description || ''}`.toLowerCase());
    let keywordHits = 0;
    let trendingKeywordHits = 0;
    
    // Palabras clave trending (más peso)
    const trendingKeywords = [
      'climate tech funding', 'climate tech investment', 'carbon capture', 'green hydrogen',
      'battery breakthrough', 'AI climate', 'net zero', 'carbon neutral',
      'environmental impact', 'sustainability', 'biodiversity', 'ecosystems',
      'sustainable mining', 'lithium mining', 'battery materials', 'clean energy',
      'climate change', 'water management', 'green technology', 'ESG',
      // Startups/financiación
      'climate startup', 'cleantech startup', 'funding round', 'series a', 'series b', 'seed round', 'venture capital', 'vc'
    ];
    
    for (const keyword of trendingKeywords) {
      const kNorm = removeDiacriticsLocal(keyword.toLowerCase());
      if (textNorm.includes(kNorm)) {
        trendingKeywordHits++;
        score += 5; // Más peso para términos trending
      }
    }
    
    // Palabras clave generales
    for (const keyword of TOPIC_KEYWORDS) {
      const kNorm = removeDiacriticsLocal(keyword.toLowerCase());
      if (textNorm.includes(kNorm)) {
        keywordHits++;
        score += 2;
      }
    }
    
    // Bonus por múltiples coincidencias
    if (keywordHits >= 3) score += 5;
    if (trendingKeywordHits >= 2) score += 10;
    
    // 3. Score por recencia
    if (article.publishedAt) {
      const publishedDate = new Date(article.publishedAt);
      const now = new Date();
      const hoursDiff = (now - publishedDate) / (1000 * 60 * 60);
      
      if (hoursDiff <= 24) score += 15;      // Últimas 24h
      else if (hoursDiff <= 72) score += 10; // Últimos 3 días
      else if (hoursDiff <= 168) score += 5; // Última semana
    }
    
    // 4. Score por calidad del título
    if (article.title) {
      const title = article.title.toLowerCase();
      // Bonus por títulos que mencionan innovación, breakthrough, etc.
      if (title.includes('breakthrough') || title.includes('innovation') || title.includes('funding') || 
          title.includes('investment') || title.includes('startup') || title.includes('funding')) {
        score += 8;
      }
    }
    
  } catch (error) {
    console.error('Error calculando score:', error);
    score = 0;
  }
  
  return score;
}

// Ruta absoluta al archivo de salida para asegurar escritura en la misma carpeta del módulo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const noticiasFilePath = path.join(__dirname, 'noticias.json');

// maxResults: máximo de resultados a devolver (1..100). Por defecto 3
async function buscarNoticias(maxResults = 3) { // limitado a 3 noticias máximo
  try {
    // Cargar dominios desde la base de datos (con fallback dentro del service)
    const fuentesSvc = new FuentesService();
    const trustedDomains = await fuentesSvc.getTrustedDomainsAsync();
    // Calcular el rango de fechas en cada ejecución (ventana móvil)
    const fechaActual = new Date();
    const fromDate = restarDias(fechaActual, 30);
    const pageSize = Math.min(Math.max(parseInt(maxResults, 10) || 3, 1), 100);
    const fromDateISO = (fromDate instanceof Date ? fromDate : new Date(fromDate))
      .toISOString()
      .split('T')[0]; // usar solo la fecha para mayor compatibilidad

    
    const url = `https://newsapi.org/v2/everything?` +
      `q=${encodeURIComponent(query.replace(/\s+/g, ' '))}` +
      `&searchIn=title,description,content` +
      `&from=${fromDate}` +
      `&language=${language}` +
      `&sortBy=${sortBy}` +
      `&pageSize=${pageSize}` +
      `&page=1` +
      // Restringir a dominios confiables desde la propia API
      `&domains=${encodeURIComponent((trustedDomains || []).join(','))}` +
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
        return Array.isArray(trustedDomains) && trustedDomains.some(d => urlObj.hostname.includes(d));
      } catch {
        return false;
      }
    });
    
    // Aplicar sistema de scoring y ordenar por relevancia
    const scoredArticles = filtered.map(article => ({
      ...article,
      score: calculateNewsScore(article, trustedDomains)
    }));
    
    // Ordenar por score (más alto primero) y luego por fecha
    scoredArticles.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score; // Score más alto primero
      }
      // Si tienen el mismo score, ordenar por fecha (más reciente primero)
      return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
    });
    
    // Filtro temático adicional por título/descripción con puntuación mínima
    const topical = scoredArticles.filter(a => {
      const textNorm = removeDiacriticsLocal(`${a.title || ''} ${a.description || ''}`.toLowerCase());
      let hits = 0;
      for (const k of TOPIC_KEYWORDS) {
        const kNorm = removeDiacriticsLocal(k.toLowerCase());
        if (textNorm.includes(kNorm)) hits++;
        if (hits >= 2) break;
      }
      // Mantener inclusivo para ambiente/startups: basta 1 keyword si el score es >= 10
      return hits >= 1 && a.score >= 10;
    });
    
    const chosen = topical.length > 0 ? topical : scoredArticles.filter(a => a.score >= 8); // Bajado de 10 a 8
    const articles = chosen.slice(0, pageSize);
    
    // Estadísticas de calidad
    const avgScore = articles.reduce((sum, a) => sum + a.score, 0) / articles.length;
    const highQualityCount = articles.filter(a => a.score >= 20).length;
    const premiumSourceCount = articles.filter(a => {
      const hostname = new URL(a.url).hostname.toLowerCase();
      return ['techcrunch.com', 'wired.com', 'theverge.com', 'mit.edu', 'nature.com', 'science.org'].includes(hostname);
    }).length;
      

    // Normalizar a un formato mínimo solo con datos necesarios para el agente/front
    const minimal = articles.map(a => ({
      title: a.title || '',
      url: a.url || '',
      publishedAt: a.publishedAt || '',
      source: a.source?.name || ''
    })).filter(a => a.url);

    // Guardar en archivo JSON dentro de esta carpeta
    fs.writeFileSync(noticiasFilePath, JSON.stringify(minimal, null, 2));


    // Mostrar las noticias que trajo la API
    console.log(`📰 Noticias obtenidas de la API (${minimal.length}):`);
    minimal.forEach((noticia, index) => {
      console.log(`  ${index + 1}. ${noticia.title} (${noticia.source}) - ${noticia.url}`);
    });
    console.log('');

    // Enviar URLs al agente para analizar y (si corresponde) persistir en Trends.
    // Si hubo errores de extracción, el agente responderá con esClimatech=false y no se insertará.
    try {
      const resultados = await procesarUrlsYPersistir(minimal);
      
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
        } else {
          // Si no se crearon trends, notificar como "noticias procesadas"
          eventBus.default.notifyNewsUpdate({
            count: resultados.length,
            timestamp: new Date().toISOString(),
            message: `Se procesaron ${resultados.length} noticias (sin trends nuevos)`,
            tipo: 'noticiasProcesadas',
            resultados: resultados
          });
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
  
  
  // Esperar 10 segundos para que el frontend se conecte al SSE
  console.log('⏳ Esperando 10 segundos para que el frontend se conecte...');
  setTimeout(() => {
    buscarNoticias();
  }, 10000);
  
  // Programar ejecución cada 30 minutos (cambiado de cada minuto para evitar spam)
  const cronExpression = '*/30 * * * *'; // Cada 30 minutos
  
  // Nota: evitamos especificar timezone para mayor compatibilidad en Windows
  // y entornos sin ICU completo. Para expresiones por minuto no es necesario.
  cron.schedule(cronExpression, () => {
    buscarNoticias(); // refresca solo las URLs para el agente/front
  }, {
    scheduled: true
  });
  
  console.log(`⏰ Programación configurada: ejecutando cada 30 minutos`);
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
