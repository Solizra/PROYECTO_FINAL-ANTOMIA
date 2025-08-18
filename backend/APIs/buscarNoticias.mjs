// buscarNoticias.mjs
import fetch from 'node-fetch';
import fs from 'fs';
import cron from 'node-cron';
import { analizarNoticiaEstructurada } from '../Agent/main.js';
import TrendsService from '../Services/Trends-services.js';

// 🔐 Pegá tu clave acá
const API_KEY = '5cd26781b7d64a329de50c8899fc5eaa'; // 👈 reemplazar

const fechaActual = new Date(Date.now());
function restarDias(fecha, dias) {
  const nuevaFecha = new Date(fecha);
  nuevaFecha.setDate(nuevaFecha.getDate() - dias);
  return nuevaFecha;
}

// 🔍 Término que querés buscar
const query = 'AI OR climatech OR "inteligencia artificial" OR chatGPT OR MetaAI OR Antom.la';
const fromDate = restarDias(fechaActual, 7); //resta 7 dias a la fecha actual
const sortBy = 'relevancy';
const language = 'es';

//NLP (categorizar por lenguaje natural)
const categorias = {
  inversion: ['financiación', 'inversión', 'capital', 'funding', 'venture', 'startup'],
  innovacion: ['nuevo', 'innovación', 'desarrollo', 'patente', 'tecnología', 'avance'],
  legislacion: ['ley', 'decreto', 'regulación', 'normativa', 'gobierno', 'política']
};

function categorizarNoticia(texto) {
  texto = texto.toLowerCase();

  for (const [categoria, palabras] of Object.entries(categorias)) {
    for (const palabra of palabras) {
      if (texto.includes(palabra)) {
        return categoria;
      }
    }
  }
  return 'sin_categoria';
}

// maxResults: máximo de resultados a devolver (1..100). Por defecto 20
async function buscarNoticias(maxResults = 5) { // Cambia este número por el que quieras
  try {
    const pageSize = Math.min(Math.max(parseInt(maxResults, 10) || 20, 1), 100);
    const fromDateISO = (fromDate instanceof Date ? fromDate : new Date(fromDate))
      .toISOString()
      .split('T')[0]; // usar solo la fecha para mayor compatibilidad

    console.log(`🕐 [${new Date().toLocaleString()}] Iniciando búsqueda de noticias... (máx: ${pageSize})`);
    
    const url = `https://newsapi.org/v2/everything?` +
      `qInTitle=${encodeURIComponent(query)}` +
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

    const articles = (data.articles || []).slice(0, pageSize);

    console.log(`📰 Últimas noticias sobre "${query}":\n`);

    articles.forEach((articulo, i) => {
      const textoParaClasificar = (articulo.title || '') + ' ' + (articulo.description || '');
      const categoria = categorizarNoticia(textoParaClasificar);

      console.log(`🗞️ ${i + 1}. ${articulo.title}`);
      console.log(`📅 Fecha: ${articulo.publishedAt}`);
      console.log(`🔗 Link: ${articulo.url}`);
      console.log(`🏷️ Categoría: ${categoria}`);
      console.log('---');
    });

    // Guardar en archivo JSON (opcional)
    fs.writeFileSync('noticias.json', JSON.stringify(articles, null, 2));
    console.log('✅ Noticias guardadas en "noticias.json"');
    console.log(`🕐 [${new Date().toLocaleString()}] Búsqueda completada exitosamente\n`);

    return articles;
  } catch (error) {
    console.error('❌ Error durante la búsqueda de noticias:', error);
    return [];
  }
}

// Procesar con el AGENTE y persistir en Trends
async function procesarArticulosConAgente(articles = []) {
  if (!Array.isArray(articles) || articles.length === 0) return;

  const trendsSvc = new TrendsService();

  for (const articulo of articles) {
    const url = articulo?.url;
    const tituloTrend = articulo?.title || articulo?.titulo || 'Sin título';
    if (!url) continue;

    try {
      console.log(`🤖 Analizando con agente: ${url}`);
      const resultado = await analizarNoticiaEstructurada(url);

      if (!resultado?.esClimatech) {
        console.log('⏭️ No es Climatech, se omite guardado en Trends');
        continue;
      }

      const relacionados = Array.isArray(resultado.newslettersRelacionados)
        ? resultado.newslettersRelacionados
        : [];

      if (relacionados.length === 0) {
        console.log('ℹ️ Es Climatech pero sin newsletters relacionados; no se crea Trend');
        continue;
      }

      for (const nl of relacionados) {
        try {
          const payload = {
            id_newsletter: nl.id ?? null,
            Título_del_Trend: resultado.titulo || tituloTrend,
            Link_del_Trend: url,
            Nombre_Newsletter_Relacionado: nl.titulo || '',
            Fecha_Relación: nl.fechaRelacion || new Date().toISOString(),
            Relacionado: true,
            Analisis_relacion: nl.analisisRelacion || ''
          };
          const created = await trendsSvc.createAsync(payload);
          console.log(`💾 Trend creado id=${created?.id} para URL ${url}`);
        } catch (e) {
          console.error('❌ Error creando Trend:', e?.message || e);
        }
      }
    } catch (e) {
      console.error('❌ Error analizando artículo con agente:', e?.message || e);
    }
  }
}

// Helper: buscar y procesar en una sola llamada
async function buscarYProcesarNoticias(maxResults = 5) {
  const articles = await buscarNoticias(maxResults);
  await procesarArticulosConAgente(articles);
}

// Función para iniciar la programación automática
function iniciarProgramacionAutomatica() {
  console.log('🚀 Iniciando programación automática de búsqueda de noticias...');
  
  // Ejecutar inmediatamente al iniciar con valor por defecto
  buscarYProcesarNoticias();
  
  // Programar ejecución cada 30 minutos (puedes cambiar este intervalo)
  // Formato cron: '*/30 * * * *' = cada 30 minutos
  // Otros ejemplos:
  // '0 */1 * * *' = cada hora
  // '0 */6 * * *' = cada 6 horas
  // '0 9 * * *' = todos los días a las 9:00 AM
  // '0 9,18 * * *' = todos los días a las 9:00 AM y 6:00 PM
  
  const cronExpression = '*/30 * * * *'; // Cada 30 minutos
  
  cron.schedule(cronExpression, () => {
    buscarYProcesarNoticias(); // usa el valor por defecto o ajusta si querés otro límite
  }, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires" // Ajusta a tu zona horaria
  });
  
  console.log(`⏰ Programación configurada: ejecutando cada 30 minutos`);
  console.log(`📅 Próxima ejecución programada según cron: ${cronExpression}`);
}

// Función para ejecutar una sola vez (comportamiento original)
function ejecutarUnaVez(maxResults) {
  buscarYProcesarNoticias(maxResults);
}

// Exportar funciones para uso externo
export { buscarNoticias, iniciarProgramacionAutomatica, ejecutarUnaVez, buscarYProcesarNoticias, procesarArticulosConAgente };

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
