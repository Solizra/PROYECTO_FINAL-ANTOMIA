// buscarNoticias.mjs
import fetch from 'node-fetch';
import fs from 'fs';
import cron from 'node-cron';

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
 'climatech')`;

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

//NLP (categorizar por lenguaje natural)
const categorias = {
  ia: ['ia', 'inteligencia artificial', 'ai', 'machine learning', 'aprendizaje automático'],
  agua: ['agua', 'hídrica', 'hidrica', 'hídrico', 'hidrico', 'water', 'recurso hídrico'],
  energia: ['energía', 'energia', 'renovable', 'renovables', 'energías renovables', 'solar', 'eólica', 'hidroeléctrica', 'hidroelectrica', 'geotérmica', 'geotermica'],
  carbono: ['carbono', 'co2', 'captura de carbono', 'secuestro de carbono', 'emisiones', 'neutralidad de carbono'],
  movilidad: ['vehículo eléctrico', 'vehiculos eléctricos', 'coche eléctrico', 'movilidad sostenible', 'transporte limpio'],
  agricultura: ['agricultura sostenible', 'agricultura regenerativa', 'permacultura', 'cultivo orgánico', 'agtech'],
  biodiversidad: ['biodiversidad', 'créditos de biodiversidad', 'conservación', 'conservacion'],
  hidrogeno: ['hidrógeno', 'hidrogeno', 'h2', 'hidrógeno verde', 'hidrogeno verde'],
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
  } catch (error) {
    console.error('❌ Error durante la búsqueda de noticias:', error);
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
  
  const cronExpression = '*/30 * * * *'; // Cada 30 minutos
  
  cron.schedule(cronExpression, () => {
    buscarNoticias(); // usa el valor por defecto o ajusta si querés otro límite
  }, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires" // Ajusta a tu zona horaria
  });
  
  console.log(`⏰ Programación configurada: ejecutando cada 30 minutos`);
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
