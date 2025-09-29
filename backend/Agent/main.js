import https from 'https';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import readline from 'readline';
import { fileURLToPath } from 'url';
import TrendsService from '../Services/Trends-services.js';
import eventBus from '../EventBus.js';

// Configuración
const DEBUG = false;
const httpsAgent = new https.Agent({ rejectUnauthorized: false });


// Palabras clave para detectar Climatech - MEJORADAS y sincronizadas
const CLIMATECH_KEYWORDS = [
  // Energías renovables
  'solar', 'eólica', 'hidroeléctrica', 'renovable', 'energía limpia', 'paneles solares',
  'turbinas eólicas', 'energía verde', 'sostenible', 'sustentable',
  
  // Eficiencia energética
  'eficiencia energética', 'ahorro energético', 'consumo energético', 'optimización',
  'edificios verdes', 'certificación energética',
  
  // Captura de carbono
  'carbono', 'CO2', 'emisiones', 'captura', 'secuestro', 'neutralidad',
  'huella de carbono', 'compensación', 'reducción emisiones',
  
  // Movilidad sostenible
  'vehículo eléctrico', 'coche eléctrico', 'transporte público', 'bicicleta',
  'movilidad sostenible', 'transporte limpio', 'autobús eléctrico',
  
  // Agricultura sostenible
  'agricultura sostenible', 'agricultura orgánica', 'permacultura',
  'agricultura regenerativa', 'cultivo orgánico',
  
  // Tecnologías ambientales
  'monitoreo ambiental', 'sensores', 'IoT ambiental', 'tecnología verde',
  'innovación ambiental', 'tech climático',
  
  // Políticas climáticas
  'cambio climático', 'política climática', 'acuerdo de parís', 'COP',
  'regulación ambiental', 'normativa verde', 'impuestos verdes',
  
  // Materiales sostenibles
  'materiales sostenibles', 'biodegradable', 'reciclable', 'economía circular',
  'reutilización', 'sostenibilidad', 'materiales verdes',
  
  // Términos generales
  'clima', 'medio ambiente', 'sostenibilidad', 'verde', 'ecológico',
  'ambiental', 'sustentable', 'climatech', 'cleantech',
  
  // NUEVOS: Términos ambientales y de sostenibilidad
  'impacto ambiental', 'conservación ambiental', 'desarrollo sostenible',
  'biodiversidad', 'ecosistemas', 'humedales', 'conservación natural',
  'recursos naturales', 'protección ambiental', 'gestión ambiental',
  'minería sostenible', 'minería verde', 'minería responsable',
  'litio', 'baterías', 'energía limpia', 'transición energética',
  'adaptación climática', 'mitigación climática', 'energías alternativas',
  'agua', 'gestión hídrica', 'sequía', 'desertificación',
  'construcción verde', 'edificios sostenibles', 'arquitectura bioclimática',
  'logística verde', 'industria 4.0', 'tecnología limpia',
  'economía verde', 'empleos verdes', 'inversión responsable',
  'ESG', 'criterios ambientales', 'finanzas verdes',
  'política ambiental', 'regulación climática', 'acuerdos ambientales'
];

// Stopwords básicas en español para mejorar la similitud
const STOPWORDS_ES = new Set([
  'a','acá','ahi','al','algo','algunas','algunos','allá','alli','allí','ambos','ante','antes','aquel','aquella','aquellas','aquello','aquellos','aqui','aquí','arriba','asi','aun','aunque','bajo','bastante','bien','cada','casi','como','cómo','con','contra','cual','cuales','cualquier','cualquiera','cualquieras','cuan','cuando','cuanta','cuantas','cuanto','cuantos','de','dejar','del','demasiado','demás','dentro','desde','donde','dos','el','él','ella','ellas','ellos','empleais','emplean','emplear','empleas','en','encima','entonces','entre','era','eramos','eran','eras','eres','es','esa','esas','ese','eso','esos','esta','estaba','estaban','estado','estais','estamos','estan','estar','estas','este','esto','estos','estoy','fin','fue','fueron','fui','fuimos','gueno','ha','hace','haceis','hacemos','hacen','hacer','haces','hacia','hasta','incluso','intenta','intentais','intentamos','intentan','intentar','intentas','ir','jamás','junto','juntos','la','lado','las','le','les','lo','los','luego','mal','mas','más','me','menos','mi','mia','mias','mientras','mio','mios','mis','misma','mismas','mismo','mismos','modo','mucha','muchas','muchísima','muchísimas','muchísimo','muchísimos','mucho','muchos','muy','nada','ni','ninguna','ningunas','ninguno','ningunos','no','nos','nosotras','nosotros','nuestra','nuestras','nuestro','nuestros','nunca','os','otra','otras','otro','otros','para','parecer','pero','poca','pocas','poco','pocos','por','porque','primero','puede','pueden','pues','que','qué','querer','quien','quién','quienes','quiénes','quiza','quizas','sabe','sabeis','sabemos','saben','saber','sabes','se','segun','ser','si','sí','siempre','siendo','sin','sino','so','sobre','sois','solamente','solo','somos','son','soy','su','sus','suya','suyas','suyo','suyos','tal','también','tampoco','tan','tanta','tantas','tanto','tantos','te','teneis','tenemos','tener','tengo','ti','tiempo','tiene','tienen','toda','todas','todavia','todavía','todo','todos','tomar','trabaja','trabajais','trabajamos','trabajan','trabajar','trabajas','tras','tu','tus','tuya','tuyas','tuyo','tuyos','un','una','unas','uno','unos','usa','usais','usamos','usan','usar','usas','usted','ustedes','va','vais','valor','vamos','van','varias','varios','vaya','verdad','verdadera','verdadero','vosotras','vosotros','voy','yo'
]);

function removeDiacritics(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function tokenize(text) {
  const clean = removeDiacritics(String(text || '').toLowerCase())
    .replace(/[^a-z0-9áéíóúñü\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const tokens = clean.split(' ').filter(t => t.length > 1 && !STOPWORDS_ES.has(t));
  return tokens;
}

function buildTermFreq(tokens) {
  const tf = new Map();
  for (const tok of tokens) {
    tf.set(tok, (tf.get(tok) || 0) + 1);
  }
  return tf;
}

function cosineSimilarity(tfA, tfB) { //COMPARA LOS TEXTOS
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [term, val] of tfA.entries()) {
    normA += val * val;
    if (tfB.has(term)) dot += val * (tfB.get(term) || 0);
  }
  for (const val of tfB.values()) normB += val * val;
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) + 1e-9) / (Math.sqrt(normB) + 1e-9);
}

function bigrams(tokens) {
  const res = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    res.push(tokens[i] + ' ' + tokens[i + 1]);
  }
  return res;
}

function trigrams(tokens) {
  const res = [];
  for (let i = 0; i < tokens.length - 2; i++) {
    res.push(tokens[i] + ' ' + tokens[i + 1] + ' ' + tokens[i + 2]);
  }
  return res;
}

function jaccard(setA, setB) { //COMPARA LA SIMILUTUD
  const inter = new Set([...setA].filter(x => setB.has(x))).size;
  const uni = new Set([...setA, ...setB]).size;
  if (uni === 0) return 0;
  return inter / uni;
}

// Detectar plataforma a partir del host
function detectarPlataforma(urlString) {
  try {
    const url = new URL(urlString);
    const host = url.hostname.toLowerCase();
    if (host.includes('twitter.com') || host.includes('x.com')) return 'Twitter/X';
    if (host.includes('instagram.com')) return 'Instagram';
    if (host.includes('tiktok.com')) return 'TikTok';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'YouTube';
    if (host.includes('facebook.com')) return 'Facebook';
    return host;
  } catch {
    return '';
  }
}

// Generar breve resumen de por qué el trend es relevante/famoso
function generarResumenFamaTrend(contenido, sitio, autor, plataforma) {
  const tokens = tokenize(contenido);
  const tf = buildTermFreq(tokens);
  const top = [...tf.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([t])=>t).join(', ');
  const partes = [];
  if (top) partes.push(`Tema destacado: ${top}`);
  if (plataforma) partes.push(`Difundido en ${plataforma}`);
  else if (sitio) partes.push(`Publicado en ${sitio}`);
  if (autor) partes.push(`Autor/Perfil: ${autor}`);
  return partes.length ? partes.join(' | ') : 'Trend relevante por su contenido y difusión.';
}

// Generar un resumen breve (2-3 frases, <= 300 caracteres)
function generarResumenBreve(contenido, titulo = '') {
  try {
    const texto = String(contenido || '').replace(/\s+/g, ' ').trim();
    if (!texto) return titulo || 'Resumen no disponible.';

    const oraciones = texto
      .split(/[.!?]+\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const candidatas = [];
    for (const s of oraciones) {
      if (/\b(sostenibil|clima|energ|carbon|agua|ambien|emision|renov|IA|inteligencia|tecnolog)/i.test(s)) {
        candidatas.push(s);
      }
      if (candidatas.length >= 3) break;
    }
    if (candidatas.length === 0) {
      candidatas.push(oraciones[0] || texto.slice(0, 200));
    }
    const combinado = candidatas.slice(0, 3).join('. ') + '.';
    let breve = combinado.slice(0, 300);
    if (combinado.length > 300) breve = breve.replace(/[,;:]?\s*\w*?$/, '...');
    return breve;
  } catch {
    return titulo || 'Resumen no disponible.';
  }
}

// Generar razonamiento de relación entre trend y newsletter
function generarAnalisisRelacionTexto({ matchedTags = [], matchedTop = [], sitio = '', autor = '', plataforma = '', newsletterTitulo = '' }) {
  const secciones = [];
  if (newsletterTitulo) secciones.push(`Relación con "${newsletterTitulo}"`);
  if (matchedTags.length) secciones.push(`Temas comunes: ${matchedTags.join(', ')}`);
  if (matchedTop.length) secciones.push(`Palabras clave coincidentes: ${matchedTop.join(', ')}`);
  if (plataforma) secciones.push(`Fuente: ${plataforma}`);
  else if (sitio) secciones.push(`Fuente: ${sitio}`);
  if (autor) secciones.push(`Publicado por: ${autor}`);
  return secciones.join(' | ') || 'Relacionado por similitud temática y de palabras clave.';
}

// Justificar por qué no hubo relación con newsletters
function generarJustificacionSinRelacion({ resumenTexto = '', totalNewsletters = 0 }) {
  try {
    const tokens = tokenize(resumenTexto);
    const tf = buildTermFreq(tokens);
    const top = [...tf.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([t])=>t);
    const tags = [...extractThematicTags(resumenTexto)];
    const partes = [];
    partes.push('No se alcanzaron los umbrales mínimos de similitud con ningún newsletter.');
    if (tags.length) partes.push(`Temática detectada: ${tags.join(', ')}`);
    if (top.length) partes.push(`Tópicos principales del artículo: ${top.join(', ')}`);
    if (totalNewsletters) partes.push(`Se evaluaron ${totalNewsletters} newsletters.`);
    partes.push('Criterios aplicados: ≥1 palabra clave compartida, ≥10% de superposición de tags, y n-gramas coherentes. Ningún documento superó simultáneamente estos filtros.');
    return partes.join(' ');
  } catch {
    return 'No se encontraron coincidencias suficientes con los newsletters disponibles.';
  }
}

// Mapa de temas y sinónimos para mejorar coincidencias semánticas
const THEMATIC_SYNONYMS = {
  ia: ['ia', 'inteligencia artificial', 'ai', 'machine learning', 'aprendizaje automático'],
  agua: ['agua', 'hídrica', 'hidrica', 'hídrico', 'hidrico', 'water', 'recurso hídrico', 'huella hídrica', 'huella hidrica', 'consumo de agua', 'refrigeración', 'refrigeracion', 'enfriamiento', 'torres de enfriamiento', 'torres de refrigeración', 'torres de refrigeracion'],
  energia: ['energía', 'energia', 'renovable', 'renovables', 'energías renovables', 'solar', 'eólica', 'hidroeléctrica', 'hidroelectrica', 'geotérmica', 'geotermica'],
  carbono: ['carbono', 'co2', 'captura de carbono', 'secuestro de carbono', 'emisiones', 'neutralidad de carbono'],
  movilidad: ['vehículo eléctrico', 'vehiculos eléctricos', 'coche eléctrico', 'movilidad sostenible', 'transporte limpio'],
  agricultura: ['agricultura sostenible', 'agricultura regenerativa', 'permacultura', 'cultivo orgánico', 'agtech'],
  biodiversidad: ['biodiversidad', 'créditos de biodiversidad', 'conservación', 'conservacion'],
  hidrogeno: ['hidrógeno', 'hidrogeno', 'h2', 'hidrógeno verde', 'hidrogeno verde'],
};

function normalizeText(text) {
  return removeDiacritics(String(text || '').toLowerCase());
}

function extractThematicTags(text) {
  const norm = normalizeText(text);
  const tags = new Set();
  for (const [tag, synonyms] of Object.entries(THEMATIC_SYNONYMS)) {
    for (const syn of synonyms) {
      const synNorm = normalizeText(syn);
      if (norm.includes(synNorm)) {
        tags.add(tag);
        break;
      }
    }
  }
  return tags;
}

// Extracción muy simple de entidades nombradas (secuencias de palabras capitalizadas)
function extractNamedEntities(text) {
  try {
    const entities = new Set();
    const regex = /(?:\b[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ0-9]+(?:\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ0-9]+){0,3})|\b[A-Z]{2,}[A-Z0-9]*\b/g;
    const matches = String(text || '').match(regex) || [];
    for (const m of matches) {
      const clean = m.trim();
      if (clean.length >= 3 && !/^El|La|Los|Las|Un|Una|Y|De|Del|Al$/.test(clean)) entities.add(clean);
    }
    return entities;
  } catch {
    return new Set();
  }
}

// Conjuntos temáticos para co-ocurrencia IA+Agua/Energía
const AI_TERMS = new Set(['ia','inteligencia artificial','ai','machine learning','chatgpt','modelo de lenguaje','modelos de lenguaje','openai','microsoft','google']);
const WATER_TERMS = new Set(['agua','hídrica','hidrica','huella hídrica','huella hidrica','consumo de agua','refrigeración','refrigeracion','enfriamiento','torres de enfriamiento','torres de refrigeración','torres de refrigeracion','centros de datos','data center']);
const ENERGY_TERMS = new Set(['energía','energia','kwh','electricidad','consumo energético','consumo energetico','centros de datos','data center']);

function hasAnyTerm(normText, termsSet) {
  for (const t of termsSet) { if (normText.includes(t)) return true; }
  return false;
}

// Función para extraer contenido de noticias desde URLs
async function extraerContenidoNoticia(url) {
  try {
   // console.log(`🔗 Extrayendo contenido de: ${url}`);
    
    const res = await fetch(url, { agent: httpsAgent });
    if (!res.ok) throw new Error(`Error HTTP: ${res.status} ${res.statusText}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    // Extraer título
    let titulo = $('title').text().trim() || 
                 $('h1').first().text().trim() || 
                 $('meta[property="og:title"]').attr('content') || 
                 'Sin título';

    // Metadatos
    const siteName = $('meta[property="og:site_name"]').attr('content') || $('meta[name="application-name"]').attr('content') || '';
    const author = $('meta[name="author"]').attr('content') || $('meta[property="article:author"]').attr('content') || '';
    const published = $('meta[property="article:published_time"]').attr('content') || $('meta[name="date"]').attr('content') || $('meta[itemprop="datePublished"]').attr('content') || '';

    // Extraer contenido principal
    const parrafos = $('p, article, .content, .article-content, .post-content')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(texto => texto.length > 20 && !texto.includes('cookie') && !texto.includes('privacy'));

    if (parrafos.length === 0) {
      throw new Error('No se pudo extraer contenido útil de la página');
    }

    const contenido = parrafos.join('\n').slice(0, 3000);
    
   // console.log(`✅ Contenido extraído: ${contenido.length} caracteres`);
    
    return {
      titulo: titulo,
      contenido: contenido,
      url: url,
      sitio: siteName || (new URL(url)).hostname,
      autor: author,
      fechaPublicacion: published
    };
  } catch (error) {
    console.error(`❌ Error extrayendo contenido: ${error.message}`);
    // Propagar error semántico: el caller decidirá no persistir
    throw error;
  }
}

// Función para generar resumen usando análisis de texto local
function generarResumenLocal(contenido) {
  try {
    // Dividir en oraciones básicas
    const oraciones = String(contenido || '')
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);

    let resumenPartes = [];
    let acumulado = 0;

    for (const oracion of oraciones) {
      const pieza = (oracion.endsWith('.') ? oracion : `${oracion}.`);
      resumenPartes.push(pieza);
      acumulado += pieza.length + 1;
      if (acumulado >= 600) break; // recortar tamaño del resumen extenso
    }

    // Si las oraciones no alcanzan 500 chars, completar con un recorte del contenido
    let resumen = resumenPartes.join(' ').trim();
    if (resumen.length < 500) { // objetivo: 3–5 frases ~500 chars
      const faltante = 500 - resumen.length;
      const extra = String(contenido || '')
        .slice(0, Math.min(600, faltante + 200))
        .replace(/\s+/g, ' ')
        .trim();
      resumen = `${resumen} ${extra}`.trim();
    }

    // Cap razonable para no devolver textos excesivamente largos
    if (resumen.length > 900) {
      resumen = resumen.slice(0, 700).trim();
      if (!/[.!?]$/.test(resumen)) resumen += '...';
    }

    // Asegurar punto final
    if (!/[.!?]$/.test(resumen)) resumen += '.';

    console.log(`📝 Resumen generado (${resumen.length} chars)`);
    return resumen;
  } catch (error) {
    console.error(`❌ Error generando resumen: ${error.message}`);
    return 'No se pudo generar el resumen.';
  }
}

// Función para determinar si es Climatech usando un modelo heurístico ponderado
function determinarSiEsClimatechLocal(contenido, titulo = '') {
  try {
    console.log(`🔍 Evaluando si es Climatech (modelo heurístico)...`);

    const texto = String(contenido || '');
    const textoNorm = normalizeText(texto);
    const tituloNorm = normalizeText(String(titulo || ''));

    // 1) Palabras clave ponderadas (fuerte, media, débil)
    const strongKeywords = ['climatech','cleantech','energias renovables','energía renovable','hidrógeno verde','captura de carbono','secuestro de carbono','movilidad sostenible','economia circular','economía circular'];
    const mediumKeywords = ['solar','eolica','eólica','hidroelectrica','hidroeléctrica','geotermica','geotérmica','vehiculo electrico','coche electrico','paneles solares','turbinas eolicas','turbinas eólicas','emisiones','neutralidad de carbono'];
    const weakKeywords = ['sostenible','sustentable','verde','ambiental','medio ambiente','transicion energetica','transición energética','esg'];

    let kwScoreRaw = 0;
    const foundKeywords = [];
    for (const kw of strongKeywords) { if (textoNorm.includes(kw)) { kwScoreRaw += 3; foundKeywords.push(kw); } }
    for (const kw of mediumKeywords) { if (textoNorm.includes(kw)) { kwScoreRaw += 2; foundKeywords.push(kw); } }
    for (const kw of weakKeywords) { if (textoNorm.includes(kw)) { kwScoreRaw += 1; foundKeywords.push(kw); } }

    // 2) Densidad de palabras climatech por cada 100 palabras
    const totalWords = Math.max(1, texto.split(/\s+/).length);
    const densityPer100 = (foundKeywords.length) / (totalWords / 100);

    // 3) Tags temáticos (usando sinónimos definidos)
    const tags = extractThematicTags(texto);
    const tagCount = tags.size; // 0..N

    // 4) Co-ocurrencias fuertes: IA + (agua o energía)
    const hasAI = hasAnyTerm(textoNorm, AI_TERMS);
    const hasWater = hasAnyTerm(textoNorm, WATER_TERMS);
    const hasEnergy = hasAnyTerm(textoNorm, ENERGY_TERMS);
    const cooccurBonus = (hasAI && (hasWater || hasEnergy)) ? 0.2 : 0;

    // 5) Presencia en el título
    let titleBonus = 0;
    if (tituloNorm) {
      if (strongKeywords.some(k => tituloNorm.includes(k))) titleBonus = 0.2;
      else if (mediumKeywords.some(k => tituloNorm.includes(k))) titleBonus = 0.1;
      else if (weakKeywords.some(k => tituloNorm.includes(k))) titleBonus = 0.05;
    }

    // 6) Normalizaciones de puntajes parciales
    const kwScore = Math.min(1, kwScoreRaw / 10); // saturación a partir de ~10 puntos
    const densityScore = Math.min(1, densityPer100 / 3); // 3 ocurrencias por 100 palabras ~ 1.0
    const tagScore = Math.min(1, tagCount / 3); // 3+ tags temáticos ~ 1.0

    // 7) Score final
    let finalScore = 0.5 * kwScore + 0.25 * densityScore + 0.25 * tagScore + cooccurBonus + titleBonus;
    finalScore = Math.min(finalScore, 1);

    // 8) Reglas adicionales (evitar falsos positivos):
    const passesRules = (
      (tagCount >= 1 || (hasWater || hasEnergy)) && // Al menos un tag o pertenecer a agua/energía
      (foundKeywords.length >= 2 || densityPer100 >= 1.0) // Mínimo 2 keywords o densidad razonable
    );

    const threshold = 0.45; // umbral base
    const esClimatech = (finalScore >= threshold) && passesRules;

    console.log(`📊 Score climatech: ${(finalScore * 100).toFixed(1)}% | tags=${tagCount} | kwFound=${foundKeywords.length} | dens=${densityPer100.toFixed(2)} /100`);
    if (hasAI) console.log('🤖 Co-ocurrencia: IA detectada');
    if (hasWater) console.log('💧 Co-ocurrencia: Agua detectada');
    if (hasEnergy) console.log('⚡ Co-ocurrencia: Energía detectada');
    if (titleBonus > 0) console.log(`📰 Bonus por título: +${(titleBonus*100).toFixed(0)} puntos`);
    if (cooccurBonus > 0) console.log(`➕ Bonus por co-ocurrencia IA+agua/energía: +${(cooccurBonus*100).toFixed(0)} puntos`);
    console.log(`🔍 Palabras detectadas: ${foundKeywords.join(', ')}`);
    console.log(`🏷️ Tags: ${[...tags].join(', ')}`);
    console.log(`✅ Evaluación final: ${esClimatech ? 'SÍ' : 'NO'}`);

    return esClimatech;
  } catch (error) {
    console.error(`❌ Error evaluando Climatech: ${error.message}`);
    return false;
  }
}

// Función para obtener newsletters de la base de datos
export async function obtenerNewslettersBDD() {
  try {
    console.log(`📥 Obteniendo newsletters de la base de datos...`);
    
    // Solicitar todos los newsletters sin límite de paginación
    const response = await fetch('http://localhost:3000/api/Newsletter?limit=10000&page=1');
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
    }
    
    const newsletters = await response.json();
    console.log(`✅ Se obtuvieron ${newsletters.length} newsletters de la BDD`);
    
    // Log adicional para confirmar que se obtuvieron todos
    if (newsletters.length > 0) {
      console.log(`📊 Primer newsletter: ${newsletters[0].titulo}`);
      console.log(`📊 Último newsletter: ${newsletters[newsletters.length - 1].titulo}`);
    }
    
    return newsletters;
  } catch (error) {
    console.error(`❌ Error obteniendo newsletters: ${error.message}`);
    return [];
  }
}

// Función para comparar noticia con newsletters usando similitud de texto
function compararConNewslettersLocal(resumenNoticia, newsletters, urlNoticia = '') {
  try {
    console.log(`🔍 Comparando noticia con ${newsletters.length} newsletters (análisis local mejorado)...`);
    console.log(`🔗 URL de la noticia: ${urlNoticia || 'No disponible'}`);
    console.log(`📝 Resumen de la noticia: ${resumenNoticia.substring(0, 2000)}${resumenNoticia.length > 1500 ? '...' : ''}`);
    
    if (newsletters.length === 0) {
      console.log(`⚠️ No hay newsletters en la base de datos para comparar`);
      return [];
    }

    // Log adicional para confirmar que se procesan todos los newsletters
    console.log(`📊 Procesando todos los ${newsletters.length} newsletters para encontrar coincidencias...`);

    const tokensResumen = tokenize(resumenNoticia);
    const bigramResumen = bigrams(tokensResumen);
    const trigramResumen = trigrams(tokensResumen);
    const tfResumen = buildTermFreq(tokensResumen);
    const tagsResumen = extractThematicTags(resumenNoticia);
    const entitiesResumen = extractNamedEntities(resumenNoticia);

    const getHost = (u) => { try { return (new URL(u)).hostname.replace(/^www\./,'').toLowerCase(); } catch { return ''; } };
    const hostNoticia = getHost(urlNoticia);

    // Palabras clave del resumen (top 10 por frecuencia)
    const topKeywords = [...tfResumen.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term]) => term);
    const topKeywordSet = new Set(topKeywords);
    
    console.log(`🔑 Palabras clave extraídas del resumen (top 10): ${topKeywords.join(', ')}`);
    console.log(`🏷️ Tags temáticos detectados: ${[...tagsResumen].join(', ')}`);
    console.log(`\n📊 Iniciando comparación detallada con cada newsletter...\n`);

    const scoredAll = newsletters.map((newsletter, index) => {
      const textoDoc = `${newsletter.titulo || ''} ${newsletter.Resumen || ''}`;
      const linkDoc = newsletter.link || newsletter.url || '';
      const isExactUrlMatch = linkDoc && urlNoticia && (linkDoc === urlNoticia);
      const sameHost = hostNoticia && linkDoc && (getHost(linkDoc) === hostNoticia);
      
      // Log detallado para cada newsletter
      console.log(`\n📧 Newsletter ${index + 1}/${newsletters.length}:`);
      console.log(`   📰 Título: ${newsletter.titulo || 'Sin título'}`);
      console.log(`   🔗 Link: ${linkDoc || 'No disponible'}`);
      console.log(`   🆔 ID: ${newsletter.id}`);

      if (isExactUrlMatch) {
        console.log(`   ✅ COINCIDENCIA EXACTA DE URL - Score: 100%`);
        return { ...newsletter, _score: 1, _matchesTop: 10, _tagOverlap: 1, _triJacc: 1, _bigJacc: 1, _cos: 1, _entityOverlapCount: 3, _forced: true };
      }
      const tokensDoc = tokenize(textoDoc);
      const tfDoc = buildTermFreq(tokensDoc);
      const cos = cosineSimilarity(tfResumen, tfDoc);
      const bigramDoc = bigrams(tokensDoc);
      const bigJacc = jaccard(new Set(bigramResumen), new Set(bigramDoc));
      const trigramDoc = trigrams(tokensDoc);
      const triJacc = jaccard(new Set(trigramResumen), new Set(trigramDoc));
      const tagsDoc = extractThematicTags(textoDoc);
      const tagOverlap = jaccard(tagsResumen, tagsDoc);
      const entitiesDoc = extractNamedEntities(textoDoc);
      const entityOverlapCount = new Set([...entitiesResumen].filter(e => entitiesDoc.has(e))).size;

      // Coincidencias mínimas de palabras clave principales
      let matchesTop = 0;
      for (const t of tokensDoc) {
        if (topKeywordSet.has(t)) matchesTop++;
      }

      // Score combinado más estricto: énfasis en n-gramas y similitud, boost si mismo dominio y co-ocurrencias IA+agua/energía
      const normResumen = normalizeText(resumenNoticia);
      const normDoc = normalizeText(textoDoc);
      const resumenAI = hasAnyTerm(normResumen, AI_TERMS);
      const docAI = hasAnyTerm(normDoc, AI_TERMS);
      const resumenWater = hasAnyTerm(normResumen, WATER_TERMS);
      const docWater = hasAnyTerm(normDoc, WATER_TERMS);
      const resumenEnergy = hasAnyTerm(normResumen, ENERGY_TERMS);
      const docEnergy = hasAnyTerm(normDoc, ENERGY_TERMS);
      const coAIWater = (resumenAI && docAI && resumenWater && docWater) ? 0.08 : 0;
      const coAIEnergy = (resumenAI && docAI && resumenEnergy && docEnergy) ? 0.06 : 0;

      const baseScore = 0.3 * cos + 0.1 * bigJacc + 0.6 * Math.min(tagOverlap, 1);
      //const baseScore = 0.4 * cos + 0.3 * bigJacc + 0.2 * Math.min(triJacc * 2, 1) + 0.1 * Math.min(tagOverlap, 1);
      const score = Math.min(baseScore + (sameHost ? 0.12 : 0) + coAIWater + coAIEnergy, 1);

      // Guardar detalles de coincidencias
      const matchedTopArr = topKeywords.filter(t => tokensDoc.includes(t));
      const matchedTagsArr = [...tagsResumen].filter(t => extractThematicTags(textoDoc).has(t));

      // Log detallado de métricas de similitud
      console.log(`   📊 Métricas de similitud:`);
      console.log(`      🏷️ Overlap de tags: ${(tagOverlap * 100).toFixed(1)}%`);
      console.log(`      🔑 Palabras clave coincidentes: ${matchesTop}/${topKeywords.length}`);
      
      if (matchedTopArr.length > 0) {
        console.log(`      🎯 Palabras clave coincidentes: ${matchedTopArr.join(', ')}`);
      }
      if (matchedTagsArr.length > 0) {
        console.log(`      🏷️ Tags temáticos coincidentes: ${matchedTagsArr.join(', ')}`);
      }

      return { ...newsletter, _score: score, _matchesTop: matchesTop, _tagOverlap: tagOverlap, _triJacc: triJacc, _bigJacc: bigJacc, _cos: cos, _entityOverlapCount: entityOverlapCount, _matchedTopArr: matchedTopArr, _matchedTagsArr: matchedTagsArr, _sameHost: sameHost, _linkDoc: linkDoc };
    });

    const passesGating = (nl) => (
      nl._forced === true || (
        nl._matchesTop >= 1 &&
        (nl._bigJacc >= 0.01) &&
        nl._tagOverlap >= 0.10
      )
    );

    // Log de rechazados con motivo
    const rejected = scoredAll.filter(nl => !passesGating(nl));
    if (rejected.length > 0) {
      console.log(`\n🚫 Newsletters rechazados por el gating: ${rejected.length}`);
      rejected.slice(0, 10).forEach((nl, idx) => {
        const reasons = [];
        if (!(nl._sameHost ? nl._score >= 0.10 : nl._score >= 0.12)) reasons.push(`score=${(nl._score*100).toFixed(1)}%`);
        if (!(nl._matchesTop >= 1)) reasons.push(`matchesTop=${nl._matchesTop}`);
        if (!((nl._bigJacc >= 0.03) || (nl._triJacc >= 0.01))) reasons.push(`ngrams big=${(nl._bigJacc*100).toFixed(1)}% tri=${(nl._triJacc*100).toFixed(1)}%`);
        if (!(nl._tagOverlap >= 0.10)) reasons.push(`tagOverlap=${(nl._tagOverlap*100).toFixed(1)}%`);
        console.log(`   [${idx+1}] ${nl.titulo || 'Sin título'} | link=${nl._linkDoc || ''} | motivos: ${reasons.join(' | ')}`);
      });
      if (rejected.length > 10) console.log(`   ... y ${rejected.length - 10} más`);
    }

    const newslettersScored = scoredAll
      .filter(passesGating)
      .sort((a, b) => b._score - a._score)
      .slice(0, 3)
      .map(nl => ({ ...nl, puntuacion: Math.round(nl._score * 100) }));

    console.log(`\n🎯 RESULTADOS DEL FILTRADO:`);
    console.log(`✅ Se encontraron ${newslettersScored.length} newsletters relacionados (filtrados de ${newsletters.length} evaluados)`);
    
    if (newslettersScored.length > 0) {
      console.log(`\n🏆 TOP ${newslettersScored.length} NEWSLETTERS SELECCIONADOS:`);
      newslettersScored.forEach((nl, index) => {
        console.log(`   ${index + 1}. ${nl.titulo} (Score: ${nl.puntuacion}%) id=${nl.id ?? 'null'}`);
        console.log(`      🔗 Link: ${nl.link || nl._linkDoc || 'No disponible'}`);
      });
    }
    if (newslettersScored.length > 0) return newslettersScored;

    // Fallback menos estricto para no perder candidatos
    console.log(`\n🔄 EJECUTANDO FALLBACK (criterios menos estrictos)...`);
    const fallback = newsletters.map((newsletter) => {
      const textoDoc = `${newsletter.titulo || ''} ${newsletter.Resumen || ''}`;
      const tokensDoc = tokenize(textoDoc);
      const tri = jaccard(new Set(trigramResumen), new Set(trigrams(tokensDoc)));
      const big = jaccard(new Set(bigramResumen), new Set(bigrams(tokensDoc)));
      let kw = 0;
      for (const kwd of topKeywords) { if (tokensDoc.includes(kwd)) kw++; }
      const entitiesDoc = extractNamedEntities(textoDoc);
      const entitiesOverlap = new Set([...entitiesResumen].filter(e => entitiesDoc.has(e))).size;
      return { ...newsletter, _tri: tri, _big: big, _kw: kw, _ent: entitiesOverlap };
    })
    .filter(nl => (nl._tri >= 0.015 || nl._big >= 0.08) && nl._kw >= 2)
    .sort((a, b) => (b._tri + b._big) - (a._tri + a._big))
    .slice(0, 3)
    .map(nl => ({ ...nl, puntuacion: Math.round((nl._tri + nl._big) * 100) }));

    console.log(`ℹ️ Fallback estricto: ${fallback.length} newsletters (de ${newsletters.length} evaluados)`);
    
    if (fallback.length > 0) {
      console.log(`\n🔄 NEWSLETTERS DEL FALLBACK:`);
      fallback.forEach((nl, index) => {
        console.log(`   ${index + 1}. ${nl.titulo} (Score: ${nl.puntuacion}%)`);
        console.log(`      🔗 Link: ${nl.link || 'No disponible'}`);
      });
    }
    
    if (fallback.length > 0) return fallback;

    // Soft-fallback: elegir el mejor candidato por tags/coseno si nada pasó
    console.log(`\n🟡 SOFT-FALLBACK: seleccionando mejor candidato por tags/coseno...`);
    const soft = scoredAll
      .map(nl => ({ ...nl, _softScore: 0.7 * (nl._tagOverlap || 0) + 0.3 * (nl._cos || 0) }))
      .filter(nl => (nl._matchesTop >= 1) || (nl._tagOverlap >= 0.03))
      .sort((a,b) => b._softScore - a._softScore)
      .slice(0, 1)
      .map(nl => ({ ...nl, puntuacion: Math.round((nl._softScore) * 100), _forcedSoft: true }));

    if (soft.length > 0) {
      const s = soft[0];
      console.log(`   ✅ Soft-related: ${s.titulo} | softScore=${(s._softScore*100).toFixed(1)}% | tagOverlap=${(s._tagOverlap*100).toFixed(1)}% | cos=${(s._cos*100).toFixed(1)}%`);
      return soft;
    }

    console.log(`   ⚪ Ningún candidato razonable encontrado incluso con soft-fallback.`);
    return [];
  } catch (error) {
    console.error(`❌ Error comparando newsletters: ${error.message}`);
    return [];
  }
  
  // Log final del proceso
  console.log(`\n🎉 PROCESO DE COMPARACIÓN COMPLETADO`);
  console.log(`📊 Total de newsletters procesados: ${newsletters.length}`);
  console.log(`🔍 URL analizada: ${urlNoticia || 'No disponible'}`);
  console.log(`📝 Resumen analizado: ${resumenNoticia.substring(0, 100)}${resumenNoticia.length > 100 ? '...' : ''}`);
}

// Función para determinar tema principal usando análisis de texto
function determinarTemaPrincipalLocal(contenido) {
  try {
    console.log(`📋 Determinando tema principal (análisis local)...`);
    
    const contenidoLower = contenido.toLowerCase();
    const temas = {
      'tecnología': ['tecnología', 'tech', 'innovación', 'startup', 'app', 'software', 'digital'],
      'deportes': ['fútbol', 'futbol', 'deportes', 'liga', 'equipo', 'jugador', 'partido', 'gol'],
      'política': ['gobierno', 'política', 'elecciones', 'presidente', 'ministro', 'congreso', 'ley'],
      'economía': ['economía', 'mercado', 'inversión', 'bolsa', 'empresa', 'finanzas', 'dólar'],
      'entretenimiento': ['película', 'pelicula', 'música', 'musica', 'actor', 'actriz', 'cine', 'teatro'],
      'salud': ['salud', 'médico', 'medico', 'hospital', 'enfermedad', 'tratamiento', 'vacuna'],
      'educación': ['educación', 'educacion', 'universidad', 'escuela', 'estudiante', 'profesor', 'académico']
    };
    
    let mejorTema = 'general';
    let mejorPuntuacion = 0;
    
    Object.entries(temas).forEach(([tema, palabras]) => {
      let puntuacion = 0;
      palabras.forEach(palabra => {
        if (contenidoLower.includes(palabra)) {
          puntuacion += 1;
        }
      });
      
      if (puntuacion > mejorPuntuacion) {
        mejorPuntuacion = puntuacion;
        mejorTema = tema;
      }
    });
    
    console.log(`✅ Tema principal detectado: ${mejorTema}`);
    return mejorTema;
  } catch (error) {
    console.error(`❌ Error determinando tema: ${error.message}`);
    return 'general';
  }
}

// Función principal para analizar noticias (devuelve mensaje para CLI)
async function analizarNoticia(input) {
  console.log(`🚀 Iniciando análisis completo de noticia (versión sin LLM)...`);
  
  try {
    let contenido, titulo;
    const cleaned = (typeof input === 'string') ? input.trim().replace(/^[@\s]+/, '') : input;
    
    // PASO 1: Extraer contenido desde URL o usar texto directo
    if (typeof cleaned === 'string' && cleaned.startsWith('http')) {
      const resultadoExtraccion = await extraerContenidoNoticia(cleaned);
        contenido = resultadoExtraccion.contenido;
        titulo = resultadoExtraccion.titulo;
    } else {
      contenido = cleaned;
      titulo = 'Texto proporcionado';
      }

      // PASO 2: Generar resumen
    const resumen = generarResumenLocal(contenido);

      // PASO 3: Determinar si es Climatech
    const esClimatech = determinarSiEsClimatechLocal(contenido);

      if (!esClimatech) {
        // PASO 3.1: Si no es Climatech, informar tema principal
      const temaPrincipal = determinarTemaPrincipalLocal(contenido);

      return `❌ Esta noticia NO está relacionada con Climatech.

📰 Título: ${titulo}
📋 Tema principal: ${temaPrincipal}

💡 Tip: Las noticias sobre Climatech incluyen energías renovables, eficiencia energética, captura de carbono, movilidad sostenible, agricultura sostenible, tecnologías ambientales, políticas climáticas, etc.`;
      }

      // PASO 4: Obtener newsletters de la BDD
      console.log(`\n📥 PASO 4: Obteniendo newsletters de la base de datos...`);
      const newsletters = await obtenerNewslettersBDD();

      // PASO 5: Comparar noticia con newsletters
      console.log(`\n🔍 PASO 5: Comparando noticia con newsletters...`);
      console.log(`📊 Total de newsletters obtenidos: ${newsletters.length}`);
      console.log(`🔗 URL a comparar: ${input}`);
      console.log(`📝 Resumen a comparar: ${resumen.substring(0, 150)}${resumen.length > 150 ? '...' : ''}`);
      
      const newslettersRelacionados = compararConNewslettersLocal(resumen, newsletters, input);

      // PASO 6: Preparar respuesta final
      console.log(`\n📋 PASO 6: Preparando respuesta final...`);
      console.log(`🎯 Newsletters relacionados encontrados: ${newslettersRelacionados.length}`);
      
      let mensaje = `✅ Esta noticia SÍ está relacionada con Climatech.

📰 Título: ${titulo}
📝 Resumen: ${resumen}

`;

      if (newslettersRelacionados.length > 0) {
      mensaje += `📧 Newsletters relacionados encontrados:
`;
        newslettersRelacionados.forEach((nl, index) => {
        mensaje += `${index + 1}. ${nl.titulo} (puntuación: ${nl.puntuacion})
`;
        });
      } else {
        mensaje += `⚠️ No se encontraron newsletters con temática similar en la base de datos.`;
      }

    return mensaje;

    } catch (error) {
      console.error(`❌ Error en análisis completo: ${error.message}`);
    return `❌ Error durante el análisis: ${error.message}`;
  }
}

// Función para analizar noticia y devolver estructura para API
export async function analizarNoticiaEstructurada(input) {
  try {
    let contenido, titulo, url = '';
    let sitio = '';
    let autor = '';
    let fechaPublicacion = '';
    const cleaned = (typeof input === 'string') ? input.trim().replace(/^[@\s]+/, '') : input;
    if (typeof cleaned === 'string' && cleaned.startsWith('http')) {
      const resultadoExtraccion = await extraerContenidoNoticia(cleaned);
      contenido = resultadoExtraccion.contenido;
      titulo = resultadoExtraccion.titulo;
      url = cleaned;
      sitio = resultadoExtraccion.sitio || '';
      autor = resultadoExtraccion.autor || '';
      fechaPublicacion = resultadoExtraccion.fechaPublicacion || '';
    } else {
      contenido = cleaned;
      titulo = 'Texto proporcionado';
    }

    const resumen = generarResumenLocal(contenido);
    const resumenBreve = generarResumenBreve(contenido, titulo);
    const esClimatech = determinarSiEsClimatechLocal(contenido, titulo);
    let newsletters = [];
    let relacionados = [];
    let analisisSinRelacion = '';
    if (esClimatech) {
      console.log(`\n📥 Obteniendo newsletters para comparación...`);
      newsletters = await obtenerNewslettersBDD();
      console.log(`🔍 Comparando con ${newsletters.length} newsletters...`);
      relacionados = compararConNewslettersLocal(resumen, newsletters, url);
      if (!Array.isArray(relacionados) || relacionados.length === 0) {
        analisisSinRelacion = generarJustificacionSinRelacion({ resumenTexto: resumen, totalNewsletters: Array.isArray(newsletters) ? newsletters.length : 0 });
      }
    }

    const fechaRelacion = new Date().toISOString();
    const plataforma = url ? detectarPlataforma(url) : '';
    const resumenFama = generarResumenFamaTrend(contenido, sitio, autor, plataforma);

    return {
      esClimatech,
      titulo,
      resumen: esClimatech ? resumen : null,
      resumenBreve: esClimatech ? resumenBreve : null,
      url,
      sitio,
      autor,
      fechaPublicacion,
      resumenFama,
      analisisSinRelacion,
      newslettersRelacionados: relacionados.map(nl => ({
        id: nl.id ?? (() => {
          try {
            const list = Array.isArray(newsletters) ? newsletters : [];
            const byLink = list.find(x => (String(x.link || x.url || '').trim()) === (String(nl.link || '').trim()));
            if (byLink && byLink.id) return byLink.id;
            const byTitle = list.find(x => (String(x.titulo || '').trim()) === (String(nl.titulo || '').trim()));
            return byTitle?.id ?? null;
          } catch { return null; }
        })(),
        titulo: nl.titulo,
        Resumen: nl.Resumen || '',
        link: nl.link || '',
        puntuacion: nl.puntuacion || 0,
        fechaRelacion,
        analisisRelacion: (() => {
          return generarAnalisisRelacionTexto({
            matchedTags: nl._matchedTagsArr || [],
            matchedTop: nl._matchedTopArr || [],
            sitio,
            autor,
            plataforma,
            newsletterTitulo: nl.titulo || ''
          });
        })()
      })),
      sinRelacion: esClimatech && relacionados.length === 0
    };
  } catch (error) {
    // Si la extracción falla, no forzar inserciones ni marcados falsos
    return {
      esClimatech: false,
      titulo: '',
      resumen: null,
      url: '',
      newslettersRelacionados: [],
      error: error.message || String(error),
    };
  }
}

// Procesar un conjunto de URLs: analizar y persistir en Trends si corresponde
export async function procesarUrlsYPersistir(items = []) {
  if (!Array.isArray(items) || items.length === 0) return [];

  const trendsSvc = new TrendsService();
  const resultados = [];

  for (const item of items) {
    const url = (typeof item === 'string') ? item : (item?.url || '');
    const tituloTrend = (typeof item === 'object') ? (item?.title || item?.titulo || 'Sin título') : 'Sin título';
    if (!url) continue;

    try {
      const resultado = await analizarNoticiaEstructurada(url);
      
      // Inicializar el resultado con información básica
      const resultadoItem = { 
        url, 
        resultado, 
        insertado: false, 
        trendsCreados: 0 
      };
      
      if (!resultado?.esClimatech) {
        resultados.push(resultadoItem);
        continue;
      }

      const relacionados = Array.isArray(resultado.newslettersRelacionados)
        ? resultado.newslettersRelacionados
        : [];
      
      // Crear trends para TODAS las noticias climatech, tengan o no newsletters relacionados
      let trendsInsertados = 0;
      
      if (relacionados.length > 0) {
        // Si hay newsletters relacionados, crear trends con esas relaciones
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
            const createdTrend = await trendsSvc.createAsync(payload);
            
            if (createdTrend && createdTrend.id && !createdTrend.duplicated) {
              trendsInsertados++;
              
              // Notificar nuevo trend agregado a través del EventBus
              const trendData = {
                id: createdTrend.id,
                newsletterTitulo: nl.titulo || '',
                newsletterId: nl.id ?? '',
                fechaRelacion: nl.fechaRelacion || new Date().toISOString(),
                trendTitulo: resultado.titulo || tituloTrend,
                trendLink: url,
                relacionado: true,
                newsletterLink: nl.link || '',
                analisisRelacion: nl.analisisRelacion || '',
                resumenFama: resultado.resumenBreve || resultado.resumenFama || '',
                autor: resultado.autor || '',
              };
              
              try {
                eventBus.notifyNewTrend(trendData);
                console.log(`📡 Nuevo trend notificado: ${trendData.trendTitulo}`);
              } catch (eventError) {
                console.error('Error notificando nuevo trend:', eventError);
              }
            } else if (createdTrend?.duplicated) {
              console.log('⛔ Relación duplicada evitada (auto):', url, payload.id_newsletter, payload.Nombre_Newsletter_Relacionado);
            }
          } catch (e) {
            console.error(`Error creando trend para ${url}:`, e?.message || e);
            // continuar con el siguiente sin romper el flujo
          }
        }
      } else {
        // Si NO hay newsletters relacionados, crear trend SIN relación
        try {
          const payload = {
            id_newsletter: null, // Sin newsletter relacionado
            Título_del_Trend: resultado.titulo || tituloTrend,
            Link_del_Trend: url,
            Nombre_Newsletter_Relacionado: '', // Vacío
            Fecha_Relación: new Date().toISOString(),
            Relacionado: false, // No relacionado
            Analisis_relacion: resultado.analisisSinRelacion || 'Noticia climatech sin newsletters relacionados'
          };
          const createdTrend = await trendsSvc.createAsync(payload);
          
          if (createdTrend && createdTrend.id && !createdTrend.duplicated) {
            trendsInsertados++;
            
            // Notificar nuevo trend agregado a través del EventBus
            const trendData = {
              id: createdTrend.id,
              newsletterTitulo: '', // Sin newsletter
              newsletterId: '', // Sin newsletter
              fechaRelacion: new Date().toISOString(),
              trendTitulo: resultado.titulo || tituloTrend,
              trendLink: url,
              relacionado: false, // No relacionado
              newsletterLink: '',
              analisisRelacion: 'Noticia climatech sin newsletters relacionados',
              resumenFama: resultado.resumenBreve || resultado.resumenFama || '',
              autor: resultado.autor || '',
            };
            
            try {
              eventBus.notifyNewTrend(trendData);
              console.log(`📡 Nuevo trend sin newsletter notificado: ${trendData.trendTitulo}`);
            } catch (eventError) {
              console.error('Error notificando nuevo trend:', eventError);
            }
          } else if (createdTrend?.duplicated) {
            console.log('⛔ Relación duplicada evitada (auto, sin newsletter):', url);
          }
        } catch (e) {
          console.error(`Error creando trend sin newsletter para ${url}:`, e?.message || e);
        }
      }


      
      // Marcar si se insertaron trends y cuántos
      if (trendsInsertados > 0) {
        resultadoItem.insertado = true;
        resultadoItem.trendsCreados = trendsInsertados;
        console.log(`✅ Se crearon ${trendsInsertados} trends para: ${tituloTrend}`);
      }
      
      resultados.push(resultadoItem);
    } catch (e) {
      console.error(`Error procesando ${url}:`, e?.message || e);
      // continuar con el siguiente
    }
  }

  return resultados;
}

// Función para manejar el chat interactivo
async function empezarChat() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

const mensajeBienvenida = `
🌱 CLIMATECH NEWS ANALYZER (SIN LLM)
=====================================

Soy un asistente especializado en analizar noticias sobre Climatech.
Esta versión funciona completamente sin LLM, usando análisis de texto local.

📋 Mi proceso:
1. Extraigo el contenido de la noticia desde el link
2. Genero un resumen usando análisis de texto local
3. Determino si es Climatech usando palabras clave
4. Si es Climatech, busco newsletters relacionados en la base de datos
5. Te muestro los resultados

🔗 Para empezar, pega el link de una noticia.
💡 También puedes escribir 'exit' para salir.

¿Qué noticia quieres analizar?
`;

  console.log(mensajeBienvenida);

  const pregunta = () => {
    rl.question('> ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        console.log('👋 ¡Hasta luego!');
        rl.close();
        return;
      }

      if (input.trim() === '') {
        console.log('💡 Por favor, ingresa un link de noticia o texto para analizar.');
        pregunta();
        return;
      }

      try {
        const resultado = await analizarNoticia(input);
        console.log('\n' + resultado + '\n');
      } catch (error) {
        console.log(`❌ Error procesando la solicitud: ${error.message}`);
        console.log('💡 Intenta con otro link o escribe "exit" para salir.\n');
      }

      pregunta();
    });
  };

  pregunta();
}

// Iniciar el chat
const isDirectRun = (() => {
  try {
    const thisFile = fileURLToPath(import.meta.url);
    return process.argv[1] && (process.argv[1] === thisFile || process.argv[1].endsWith('main.js'));
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  empezarChat();
}


