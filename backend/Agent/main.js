// ESTE ERA EL MAIN2.JS QUE AHORA ES MAIN PARA QUE USE ESTE

import https from 'https';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import readline from 'readline';
import { fileURLToPath } from 'url';
import TrendsService from '../Services/Trends-services.js';
import FeedbackService from '../Services/Feedback-service.js';
import eventBus from '../EventBus.js';

import OpenAI from "openai";
// Configuración
const DEBUG = false;
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Si estás detrás de un proxy con certificado self-signed, puedes habilitar
// ALLOW_INSECURE_OPENAI=1 para que el SDK use el mismo httpsAgent permisivo
const allowInsecureOpenAI = process.env.ALLOW_INSECURE_OPENAI === '1';
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  fetch: allowInsecureOpenAI ? (url, init = {}) => fetch(url, { ...init, agent: httpsAgent }) : undefined
});
// Cliente inseguro para retry puntual si se detecta SELF_SIGNED_CERT_IN_CHAIN
const insecureClient = allowInsecureOpenAI ? client : new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  fetch: (url, init = {}) => fetch(url, { ...init, agent: httpsAgent })
});

// (httpsAgent ya fue definido antes)


// Utilidad: espera asíncrona
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// -------------------- EMBEDDING CACHE (disco + memoria) --------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EMBEDDING_CACHE_FILE = path.join(__dirname, 'embeddings-cache.json');
let embeddingCache = new Map(); // key -> array<number>
let saveTimeout = null;

function simpleHash(text) {
  try {
    let h = 2166136261;
    const s = String(text || '');
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return (h >>> 0).toString(16);
  } catch {
    return String(text || '').slice(0, 64);
  }
}

function loadEmbeddingCache() {
  try {
    if (fs.existsSync(EMBEDDING_CACHE_FILE)) {
      const raw = fs.readFileSync(EMBEDDING_CACHE_FILE, 'utf8');
      const obj = raw ? JSON.parse(raw) : {};
      embeddingCache = new Map(Object.entries(obj));
    }
  } catch (e) {
    console.log('⚠️ No se pudo cargar caché de embeddings:', e?.message || e);
    embeddingCache = new Map();
  }
}

function scheduleSaveEmbeddingCache() {
  try {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      try {
        const obj = Object.fromEntries(embeddingCache);
        fs.writeFileSync(EMBEDDING_CACHE_FILE, JSON.stringify(obj));
      } catch (e) {
        console.log('⚠️ No se pudo guardar caché de embeddings:', e?.message || e);
      }
    }, 500);
  } catch {}
}

async function getEmbeddingCached(text) {
  try {
    if (!client) return null;
    const key = simpleHash(text);
    if (embeddingCache.has(key)) {
      const arr = embeddingCache.get(key);
      return Array.isArray(arr) ? arr : null;
    }
    const resp = await client.embeddings.create({ model: 'text-embedding-3-small', input: text });
    const vec = resp?.data?.[0]?.embedding || null;
    if (vec) {
      embeddingCache.set(key, vec);
      if (embeddingCache.size > 5000) {
        // recorte simple: mantener últimos ~5000
        const keys = [...embeddingCache.keys()];
        const toDelete = keys.slice(0, Math.floor(keys.length * 0.2));
        for (const k of toDelete) embeddingCache.delete(k);
      }
      scheduleSaveEmbeddingCache();
    }
    return vec;
  } catch (e) {
    return null;
  }
}

loadEmbeddingCache();

// Helper robusto para llamadas a Chat con reintentos y fallback a cliente inseguro
async function chatCompletionJSON(messages, { model = "gpt-4o-mini", maxRetries = 3 } = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const useInsecure = attempt > 1; // probar cliente inseguro desde el segundo intento
    try {
      const cli = useInsecure ? insecureClient : client;
      const resp = await cli.chat.completions.create({ model, messages });
      const content = resp?.choices?.[0]?.message?.content?.trim?.() || "";
      if (typeof content === 'string' && content.length > 0) {
        return content;
      }
      lastError = new Error('Respuesta vacía del modelo');
    } catch (err) {
      lastError = err;
      const msg = String(err?.message || err || '');
      const isConn = msg.includes('Connection error') || msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') || msg.includes('ENOTFOUND') || msg.includes('SELF_SIGNED_CERT_IN_CHAIN');
      if (!isConn && attempt === maxRetries) break;
    }
    // backoff exponencial simple
    await sleep(400 * attempt);
  }
  throw lastError || new Error('Fallo desconocido en chatCompletionJSON');
}


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
  'ESG', 'criterios ambientales', 'finanzas verdes', 'incendio forestal',
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
  console.log("Entré a la función: generarResumenFamaTrend" );

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
export async function extraerContenidoNoticia(url) {
  try {
    console.log(`🔗 Extrayendo contenido de: ${url}`);
    
    const res = await fetch(url, { 
      agent: httpsAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!res.ok) throw new Error(`Error HTTP: ${res.status} ${res.statusText}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    // Limpiar elementos no deseados
    $('script, style, noscript, iframe, img, video, audio, form, nav, header, footer, aside, .ad, .advertisement, .social, .share, .comments, .related, .sidebar').remove();

    // Extraer título con múltiples estrategias
    let titulo = '';
    
    // 1. Meta tags de Open Graph
    titulo = $('meta[property="og:title"]').attr('content') || 
             $('meta[name="twitter:title"]').attr('content') || '';
    
    // 2. Meta tags estándar
    if (!titulo) {
      titulo = $('meta[name="title"]').attr('content') || 
               $('title').text().trim() || '';
    }
    
    // 3. H1 principal
    if (!titulo) {
      titulo = $('h1').first().text().trim() || '';
    }
    
    // 4. H2 si no hay H1
    if (!titulo) {
      titulo = $('h2').first().text().trim() || '';
    }

    // Limpiar título
    titulo = titulo.replace(/\s+/g, ' ').trim();
    if (titulo.length > 200) titulo = titulo.substring(0, 200) + '...';

    // Metadatos
    const siteName = $('meta[property="og:site_name"]').attr('content') || 
                     $('meta[name="application-name"]').attr('content') || 
                     $('meta[name="publisher"]').attr('content') || '';
    
    const author = $('meta[name="author"]').attr('content') || 
                   $('meta[property="article:author"]').attr('content') || 
                   $('meta[name="byline"]').attr('content') || 
                   $('.author, .byline, [class*="author"], [class*="byline"]').first().text().trim() || '';
    
    const published = $('meta[property="article:published_time"]').attr('content') || 
                      $('meta[name="date"]').attr('content') || 
                      $('meta[itemprop="datePublished"]').attr('content') || 
                      $('meta[name="publish_date"]').attr('content') || '';

    // Estrategia mejorada para extraer contenido principal
    let contenido = '';
    let parrafos = [];

    // Helper: detectar si un elemento está dentro de bloques de relacionados/recomendados
    function estaEnBloqueRelacionado(el) {
      try {
        const parents = $(el).parents().toArray();
        for (const p of parents) {
          const attrs = $(p).attr() || {};
          const joined = [attrs.class, attrs.id, Object.values(attrs).join(' ')].join(' ').toLowerCase();
          if (/related|recomend|recommend|sidebar|more|te\s+puede\s+interesar|mir[aá]\s+tambi[ée]n|seg[uú]i\s+leyendo/.test(joined)) {
            return true;
          }
        }
      } catch {}
      return false;
    }

    // Helper: filtrar texto no deseado (cta, políticas, copys de módulos)
    function textoNoDeseado(texto) {
      const t = (texto || '').toLowerCase();
      if (t.length <= 30) return false; // permitir títulos internos razonables
      return (
        t.includes('cookie') ||
        t.includes('privacy') ||
        t.includes('advertisement') ||
        t.includes('subscribe') ||
        t.includes('newsletter') ||
        t.includes('follow us') ||
        t.includes('share this') ||
        t.includes('comment') ||
        t.includes('©') ||
        t.includes('all rights reserved') ||
        t.includes('terms of service') ||
        t.includes('privacy policy') ||
        /^mir[aá]\s+tambi[ée]n/.test(t) ||
        t.includes('te puede interesar') ||
        t.includes('seguí leyendo') ||
        t.includes('segui leyendo')
      );
    }

    // Detectar host para aplicar selectores específicos
    let hostname = '';
    try { hostname = (new URL(url)).hostname.toLowerCase(); } catch {}

    // Estrategia 1: Buscar en contenedores específicos de artículos
    const articleSelectors = (
      hostname.includes('lanacion.com.ar')
        ? [
            // Selectores típicos de cuerpo de nota en La Nación
            '.com-article__content',
            '.com-article__body',
            'article .com-paragraph',
            'article'
          ]
        : [
            'article',
            '.article',
            '.post',
            '.entry',
            '.content',
            '.story',
            '.news',
            '.main-content',
            '.post-content',
            '.article-content',
            '.entry-content',
            '.story-content',
            '.news-content',
            '[role="main"]',
            'main'
          ]
    );

    for (const selector of articleSelectors) {
      const article = $(selector);
      if (article.length > 0) {
        console.log(`📰 Encontrado contenedor: ${selector}`);
        
        // Extraer párrafos del artículo (sin li para evitar listas de relacionados)
        const articleParrafos = article.find('p, h2, h3, h4, h5, h6, blockquote')
          .map((_, el) => {
            const texto = $(el).text().trim();
            if (!texto || textoNoDeseado(texto)) return '';
            if (estaEnBloqueRelacionado(el)) return '';
            return texto;
          })
          .get()
          .filter(texto => texto && texto.length > 30);
        
        if (articleParrafos.length > 0) {
          parrafos = articleParrafos;
          break;
        }
      }
    }

    // Estrategia 2: Si no se encontró en contenedores específicos, buscar en todo el body
    if (parrafos.length === 0) {
      console.log(`🔍 Buscando en todo el body...`);
      
      parrafos = $('body p, body h2, body h3, body h4, body h5, body h6, body blockquote')
        .map((_, el) => {
          const texto = $(el).text().trim();
          if (!texto || textoNoDeseado(texto)) return '';
          if (estaEnBloqueRelacionado(el)) return '';
          return texto;
        })
        .get()
        .filter(texto => texto && texto.length > 30);
    }

    // Estrategia 3: Si aún no hay contenido, buscar en cualquier párrafo largo
    if (parrafos.length === 0) {
      console.log(`🔍 Último recurso: buscando párrafos largos...`);
      
      parrafos = $('p')
        .map((_, el) => {
          const texto = $(el).text().trim();
          return texto;
        })
        .get()
        .filter(texto => texto.length > 50);
    }

    // Filtrar y limpiar párrafos
    parrafos = parrafos
      .filter(texto => {
        // Eliminar texto que parece ser CSS, JavaScript o HTML
        const hasCSS = /[{}\s]*[a-z-]+:\s*[^;]+;/.test(texto);
        const hasJS = /function|var|let|const|console\.|document\.|window\./.test(texto);
        const hasHTML = /<[^>]+>/.test(texto);
        const hasURL = /https?:\/\/[^\s]+/.test(texto);
        const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(texto);
        
        return !hasCSS && !hasJS && !hasHTML && !hasURL && !hasEmail;
      })
      .map(texto => {
        // Limpiar texto
        return texto
          .replace(/\s+/g, ' ')  // Normalizar espacios
          .replace(/[^\w\s.,!?;:()áéíóúñüÁÉÍÓÚÑÜ]/g, '')  // Solo texto y puntuación básica
          .trim();
      })
      .filter(texto => texto.length > 20);  // Solo párrafos significativos

    if (parrafos.length === 0) {
      throw new Error('No se pudo extraer contenido útil de la página');
    }

    // Unir párrafos (sin recortar para maximizar contexto)
    contenido = parrafos.join('\n\n');
    
    console.log(`✅ Contenido extraído: ${contenido.length} caracteres`);
    console.log(`📝 Primeros 200 caracteres: "${contenido.substring(0, 200)}..."`);
    
    return {
      titulo: titulo || 'Sin título',
      contenido: contenido,
      url: url,
      sitio: siteName || (new URL(url)).hostname,
      autor: author,
      fechaPublicacion: published
    };
  } catch (error) {
    console.error(`❌ Error extrayendo contenido: ${error.message}`);
    throw error;
  }
}

// Función para generar resumen usando Chat Completions de OpenAI
export async function generarResumenIA(contenido) { //de donde sale el contenido?? ()
  try {
    console.log(`📝 Generando resumen inteligente de toda la noticia...`);
    
    // Limpiar contenido
    const contenidoLimpio = contenido
      .replace(/\s+/g, ' ')  // Normalizar espacios
      .replace(/[^\w\s.,!?;:()áéíóúñüÁÉÍÓÚÑÜ]/g, '')  // Solo texto y puntuación
      .trim();
    
    // Dividir en oraciones usando múltiples delimitadores
    const oraciones = contenidoLimpio
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 1000);  // Oraciones de longitud razonable
    
    if (oraciones.length === 0) {
      console.log(`⚠️ No se pudieron dividir oraciones, usando texto completo`);
      return contenidoLimpio.substring(0, 500) + '...';
    }
    
    console.log(`📊 Total de oraciones encontradas: ${oraciones.length}`);
    
    // Estrategia de resumen inteligente: seleccionar oraciones clave de diferentes partes
    let resumen = '';
    
    if (oraciones.length <= 3) {
      // Si hay pocas oraciones, usar todas
      resumen = oraciones.join('. ');
    } else {
      // Estrategia inteligente: primera + media + última + algunas del medio
      const oracionesSeleccionadas = [];
      
      // 1. Siempre incluir la primera oración (introducción/título)
      oracionesSeleccionadas.push(oraciones[0]);
      
      // 2. Incluir oraciones del medio (contenido principal)
      const medio = Math.floor(oraciones.length / 2);
      const rangoMedio = Math.floor(oraciones.length * 0.3); // 30% del medio
      
      for (let i = Math.max(1, medio - rangoMedio); i < Math.min(oraciones.length - 1, medio + rangoMedio); i++) {
        if (oraciones[i].length > 30) { // Solo oraciones significativas
          oracionesSeleccionadas.push(oraciones[i]);
        }
      }
      
      // 3. Incluir la última oración (conclusión)
      if (oraciones.length > 1) {
        oracionesSeleccionadas.push(oraciones[oraciones.length - 1]);
      }
      
      // 4. Si aún no alcanzamos 500 caracteres, agregar más oraciones del medio
      let caracteresAcumulados = oracionesSeleccionadas.reduce((sum, oracion) => sum + oracion.length, 0);
      
      if (caracteresAcumulados < 500) {
        // Agregar oraciones del medio que no estén ya incluidas
        for (let i = 1; i < oraciones.length - 1; i++) {
          if (caracteresAcumulados >= 500) break;
          
          const oracion = oraciones[i];
          if (oracion.length > 30 && !oracionesSeleccionadas.includes(oracion)) {
            oracionesSeleccionadas.push(oracion);
            caracteresAcumulados += oracion.length;
          }
        }
      }
      
      // 5. Ordenar las oraciones por su posición original para mantener coherencia
      oracionesSeleccionadas.sort((a, b) => {
        const indexA = oraciones.indexOf(a);
        const indexB = oraciones.indexOf(b);
        return indexA - indexB;
      });
      
      resumen = oracionesSeleccionadas.join('. ');
    }
    
    // Limpiar y formatear resumen
    resumen = resumen
      .replace(/\s+/g, ' ')
      .trim();
    
    // Asegurar que termine con punto
    if (!resumen.endsWith('.')) {
      resumen += '.';
    }
    
    // Garantizar mínimo de 500 caracteres
    if (resumen.length < 500) {
      console.log(`⚠️ Resumen muy corto (${resumen.length} chars), expandiendo...`);
      
      // Agregar más contenido del medio de la noticia
      const oracionesRestantes = oraciones.filter(o => !resumen.includes(o));
      for (const oracion of oracionesRestantes) {
        if (resumen.length >= 500) break;
        if (oracion.length > 30) {
          resumen += ' ' + oracion;
        }
      }
      
      resumen = resumen.replace(/\s+/g, ' ').trim();
      
      if (!resumen.endsWith('.')) {
        resumen += '.';
      }
    }
    
    // No limitar la longitud del resumen para evitar cortes
    
    console.log(`✅ Resumen inteligente generado: ${resumen.length} caracteres (mínimo 500)`);
    console.log(`📝 Resumen: "${resumen}"`);
    
    return resumen;
  } catch (error) {
    console.error(`❌ Error generando resumen: ${error.message}`);
    // Fallback: usar los primeros 500+ caracteres del contenido
    return contenido.substring(0, 500) + '...';
  }
}

// Función para determinar si es Climatech usando análisis de palabras clave
function determinarSiEsClimatechLocal(contenido) {
  try {
    console.log(`🔍 Evaluando si es Climatech (análisis local)...`);
    
    const contenidoLower = contenido.toLowerCase();
    let puntuacion = 0;
    const palabrasEncontradas = [];
    
    // Contar coincidencias de palabras clave
    CLIMATECH_KEYWORDS.forEach(keyword => {
      if (contenidoLower.includes(keyword.toLowerCase())) {
        puntuacion += 1;
        palabrasEncontradas.push(keyword);
      }
    });
    return puntuacion > 0;
  } catch (error) {
    console.error(`❌ Error determinando si es Climatech: ${error.message}`);
    return false;
  }
}

// Función para determinar si es Climatech usando un modelo heurístico ponderado
async function esClimatechIA(contenido) {
  try {
    console.log("Entre a esClimatechIA");
    const textoAnalisis = typeof contenido === 'string' ? contenido : String(contenido || '');
    const previewEntrada = textoAnalisis.substring(0, 220) + (textoAnalisis.length > 220 ? '…' : '');
    console.log(`[esClimatechIA] Longitud del texto a evaluar: ${textoAnalisis.length}`);
    console.log(`[esClimatechIA] Preview del texto a evaluar: ${previewEntrada}`);

    const messages = [
      { role: "system", content: "Eres un experto en sostenibilidad, medio ambiente y tecnologías/climatech." },
      { role: "user", content: `Tu tarea es decidir si una noticia está relacionada con CLIMATECH.
      
      Definición ampliada (clasificar como CLIMATECH si cumple AL MENOS uno):
      1) Relación entre TECNOLOGÍA (cualquier tipo: digital, IA, telecomunicaciones, producción/almacenamiento de energía, sensores, satélites, materiales, etc.) y MEDIO AMBIENTE o CAMBIO CLIMÁTICO.
      2) Temas SOLO de MEDIO AMBIENTE/CLIMA/SOSTENIBILIDAD con impacto relevante (p.ej.: transición energética, conservación, biodiversidad, agua, emisiones, políticas/regulación climática, economía circular, incendios/mitigación/adaptación).
      3) Startups/empresas/emprendimientos del rubro climático/cleantech (incluye rondas de inversión, aceleradoras/incubadoras, lanzamientos) aunque no se mencione explícitamente una tecnología.
      
      Ejemplos que SON CLIMATECH:
      - "La IA aumenta el consumo de agua en data centers" (tecnología + ambiente)
      - "Nueva ronda Serie A para startup de captura de carbono" (startup climática)
      - "Conservación de humedales clave para la mitigación" (tema ambiental relevante)
      
      Instrucciones:
      1. Si cumple la definición ampliada, responde con "SI".
      2. Si no cumple, responde con "NO".
      3. Luego, independientemente de 'SI' o 'NO', da una breve explicación (1-3 frases) justificando.
      
      Noticia a evaluar:
      ${textoAnalisis}` }
    ];

    console.log(`[esClimatechIA] Enviando prompt al modelo (gpt-4o-mini).`);
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages
    });
    const salida = resp?.choices?.[0]?.message?.content?.trim?.() || "";
    console.log(`[esClimatechIA] Respuesta RAW del modelo: ${salida}`);
    const esClimatech = salida.toLowerCase().startsWith("si");
    console.log(`[esClimatechIA] Decisión calculada: ${esClimatech ? 'SI' : 'NO'}`);
    return { esClimatech, razon: salida };
  } catch (err) {
    if (err?.cause?.code === 'SELF_SIGNED_CERT_IN_CHAIN' || err?.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
      try {
        console.log('[esClimatechIA] Reintentando con cliente inseguro debido a SELF_SIGNED_CERT_IN_CHAIN');
        const resp2 = await insecureClient.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Eres un experto en sostenibilidad, medio ambiente y tecnologías/climatech." },
            { role: "user", content: `Tu tarea es decidir si una noticia está relacionada con CLIMATECH.
      
      Definición ampliada (clasificar como CLIMATECH si cumple AL MENOS uno):
      1) Relación entre TECNOLOGÍA (cualquier tipo: digital, IA, telecomunicaciones, producción/almacenamiento de energía, sensores, satélites, materiales, etc.) y MEDIO AMBIENTE o CAMBIO CLIMÁTICO.
      2) Temas SOLO de MEDIO AMBIENTE/CLIMA/SOSTENIBILIDAD con impacto relevante (p.ej.: transición energética, conservación, biodiversidad, agua, emisiones, políticas/regulación climática, economía circular, incendios/mitigación/adaptación).
      3) Startups/empresas/emprendimientos del rubro climático/cleantech (incluye rondas de inversión, aceleradoras/incubadoras, lanzamientos) aunque no se mencione explícitamente una tecnología.
      
      Ejemplos que SON CLIMATECH:
      - "La IA aumenta el consumo de agua en data centers" (tecnología + ambiente)
      - "Nueva ronda Serie A para startup de captura de carbono" (startup climática)
      - "Conservación de humedales clave para la mitigación" (tema ambiental relevante)
      
      Instrucciones:
      1. Si cumple la definición ampliada, responde con "SI".
      2. Si no cumple, responde con "NO".
      3. Luego, independientemente de 'SI' o 'NO', da una breve explicación (1-3 frases) justificando.
      
      Noticia a evaluar:
      ${typeof contenido === 'string' ? contenido : String(contenido || '')}` }
          ]
        });
        const salida2 = resp2?.choices?.[0]?.message?.content?.trim?.() || "";
        console.log(`[esClimatechIA] Respuesta RAW del modelo (retry): ${salida2}`);
        const esClimatech2 = salida2.toLowerCase().startsWith("si");
        console.log(`[esClimatechIA] Decisión calculada (retry): ${esClimatech2 ? 'SI' : 'NO'}`);
        return { esClimatech: esClimatech2, razon: salida2 };
      } catch (err2) {
        console.error("Error en clasificación IA (retry inseguro):", err2);
      }
    }
    console.error("Error al clasificar climatec hIA:", err);
    return { esClimatech: false, razon: "⚠️ Error en clasificación IA" };
  }
}


async function explicarRelacionIA(noticia, newsletter) {
  try {
    console.log("Entre a: explicarRelacionIA");
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Eres un analista que encuentra similitudes." },
        { role: "user", content: `Noticia:\n${noticia}\n\nNewsletter:\n${newsletter}\n\n
           Explica en 3 frases por qué están relacionados.` }
      ]
    });
    return { explicacion: resp?.choices?.[0]?.message?.content?.trim?.() || "" };
  } catch (err) {
    if (err?.cause?.code === 'SELF_SIGNED_CERT_IN_CHAIN' || err?.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
      try {
        const resp2 = await insecureClient.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Eres un analista que encuentra similitudes." },
            { role: "user", content: `Noticia:\n${noticia}\n\nNewsletter:\n${newsletter}\n\n
            Explica en 3 frases por qué están relacionados.` }
          ]
        });
        return { explicacion: resp2?.choices?.[0]?.message?.content?.trim?.() || "" };
      } catch (err2) {
        console.error("Error en explicación IA (retry inseguro):", err2);
      }
    }
    console.error("Error en explicación IA:", err);
    return { explicacion: "⚠️ No se pudo generar explicación con IA." };
  }
}


// Función para obtener newsletters de la base de datos
export async function obtenerNewslettersBDD() {
  try {
    console.log(`Entre a: obtenerNewslettersBDD de main2.js`);
    
    // Verificar si el servidor está disponible
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos de timeout
    
    try {
      // Solicitar todos los newsletters sin límite de paginación
      const response = await fetch('http://localhost:3000/api/Newsletter?limit=10000&page=1', {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
      }
      
      const newsletters = await response.json();
      
      // Verificar que newsletters sea un array
      if (!Array.isArray(newsletters)) {
        console.error(`❌ Error: La respuesta no es un array. Tipo recibido: ${typeof newsletters}`);
        console.error(`❌ Contenido de la respuesta:`, newsletters);
        return [];
      }
      
      console.log(`✅ Se obtuvieron ${newsletters.length} newsletters de la BDD`);
          
      return newsletters;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.error(`❌ Error obteniendo newsletters: ${error.message}`);
    console.log(`💡 Asegúrate de que el servidor backend esté ejecutándose en http://localhost:3000`);
    console.log(`💡 Verifica que la base de datos tenga newsletters registrados`);
    return [];
  }
}

// Función para filtrar newsletters por palabras clave antes del análisis de IA
function filtrarNewslettersPorPalabrasClave(resumenNoticia, newsletters, opciones = {}) {
  try {
    console.log(`🔍 [FILTRO POR NOTICIA] Filtrando newsletters por palabras clave antes del análisis de IA...`);
    
    if (!Array.isArray(newsletters) || newsletters.length === 0) {
      return [];
    }

    const resumen = typeof resumenNoticia === 'string' ? resumenNoticia : String(resumenNoticia || '');
    const resumenNormalizado = removeDiacritics(resumen.toLowerCase());
    const limite = Math.max(1, Math.min(Number(opciones?.limiteTop) || 20, 100));
    
    // Extraer tokens del resumen de la noticia
    const tokensNoticia = tokenize(resumen);
    const tokensNoticiaSet = new Set(tokensNoticia);
    
    const candidatos = [];
    
    for (const newsletter of newsletters) {
      const textoNewsletter = `${newsletter.titulo || ''}\n\n${newsletter.Resumen || ''}`.trim();
      const tokensNewsletter = tokenize(textoNewsletter);
      const tokensNewsletterSet = new Set(tokensNewsletter);
      
      // Calcular coincidencias de tokens
      const coincidenciasTokens = [...tokensNoticiaSet].filter(token => tokensNewsletterSet.has(token));
      
      // Calcular coincidencias de palabras clave específicas de climatech
      let coincidenciasClave = 0;
      for (const keyword of CLIMATECH_KEYWORDS) {
        const keywordNormalizado = removeDiacritics(keyword.toLowerCase());
        if (resumenNormalizado.includes(keywordNormalizado) && 
            removeDiacritics(textoNewsletter.toLowerCase()).includes(keywordNormalizado)) {
          coincidenciasClave++;
        }
      }
      
      // Calcular score de similitud usando Jaccard
      const similitudJaccard = jaccard(tokensNoticiaSet, tokensNewsletterSet);
      
      // Score compuesto para ranking rápido
      const scoreFiltro = (
        coincidenciasTokens.length * 1.0 +       // importancia media
        coincidenciasClave * 2.5 +               // darle más peso a keywords climatech
        (similitudJaccard * 100) * 0.6           // convertir a escala similar y ponderar
      );

      // Criterios mínimos para ser candidato
      const esCandidato = coincidenciasTokens.length >= 3 || coincidenciasClave >= 1 || similitudJaccard >= 0.08;

      if (esCandidato) {
        candidatos.push({
          ...newsletter,
          _scoreFiltro: {
            coincidenciasTokens: coincidenciasTokens.length,
            coincidenciasClave,
            similitudJaccard: Math.round(similitudJaccard * 100) / 100,
            score: Math.round(scoreFiltro)
          }
        });

        console.log(`✅ Candidato: ${newsletter.titulo} (score: ${Math.round(scoreFiltro)}, tokens: ${coincidenciasTokens.length}, claves: ${coincidenciasClave}, jaccard: ${Math.round(similitudJaccard * 100) / 100})`);
      } else {
        console.log(`❌ Newsletter descartado: ${newsletter.titulo} (tokens: ${coincidenciasTokens.length}, claves: ${coincidenciasClave}, jaccard: ${Math.round(similitudJaccard * 100) / 100})`);
      }
    }
    
    // Ordenar por score descendente y limitar al top N
    const ordenados = candidatos.sort((a,b) => (b?._scoreFiltro?.score || 0) - (a?._scoreFiltro?.score || 0));
    const top = ordenados.slice(0, limite);

    console.log(`📊 [FILTRO POR NOTICIA] Seleccionados top ${top.length}/${newsletters.length} newsletters (límite=${limite}) para análisis IA`);
    return top;
    
  } catch (error) {
    console.error(`❌ Error en filtro de palabras clave: ${error.message}`);
    // Si hay error en el filtro, devolver todos los newsletters para que la IA los procese
    return newsletters;
  }
}

// Función para comparar noticia con newsletters usando IA (Chat)
async function compararConNewslettersLocal(resumenNoticia, newsletters, urlNoticia = '') {
  try {
    const resumen = typeof resumenNoticia === 'string' ? resumenNoticia : String(resumenNoticia || '');

    if (!Array.isArray(newsletters) || newsletters.length === 0) {
      console.log(`⚠️ No hay newsletters en la base de datos para comparar`);
      return { relacionados: [], motivoSinRelacion: 'No hay newsletters disponibles para comparar.' };
    }

    // APLICAR FILTRO DE PALABRAS CLAVE ANTES DEL ANÁLISIS DE IA
    const newslettersFiltrados = filtrarNewslettersPorPalabrasClave(resumen, newsletters, { limiteTop: 25 });
    
    if (newslettersFiltrados.length === 0) {
      console.log(`⚠️ Ningún newsletter pasó el filtro de palabras clave`);
      return { relacionados: [], motivoSinRelacion: 'No hay newsletters con palabras clave relevantes para esta noticia.' };
    }

    console.log(`📊 [ANÁLISIS IA POR NOTICIA] Procesando ${newslettersFiltrados.length} newsletters filtrados (de ${newsletters.length} total) con IA para esta noticia...`);

    // Embeddings: recopilar ejemplos negativos para penalización previa
    let negExamples = [];
    try {
      const fbSvcTmp = new FeedbackService();
      negExamples = await fbSvcTmp.getNegativePairExamples({ limit: 100 });
    } catch {}
    const negVecs = [];
    try {
      if (Array.isArray(negExamples) && negExamples.length > 0) {
        const batch = [resumen, ...negExamples.slice(0, 20)];
        for (let idx = 0; idx < batch.length; idx++) {
          const vec = await getEmbeddingCached(batch[idx]);
          if (idx > 0 && vec) negVecs.push(vec);
        }
      }
    } catch (e) {
      console.log('⚠️ Embeddings no disponibles, se continúa sin penalización previa');
    }

    const cosSim = (a, b) => {
      if (!a || !b || a.length !== b.length) return 0;
      let dot = 0, na = 0, nb = 0;
      for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
      if (!na || !nb) return 0;
      return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
    };

    const relacionados = [];
    const noRelacionRazones = [];
    for (let i = 0; i < newslettersFiltrados.length; i++) {
      const nl = newslettersFiltrados[i];
      const textoDoc = `${nl.titulo || ''}\n\n${nl.Resumen || ''}`.trim();
      // Incluir pistas del feedback negativo para ayudar a no repetir errores de relación
      let feedbackHints = '';
      try {
        const { topReasons } = await (new FeedbackService()).getNegativeReasonsStats({ limit: 300 });
        const razonesTop = (topReasons || []).slice(0, 3).map(r => r.reason).join(', ');
        if (razonesTop) {
          feedbackHints = `\n\nContexto histórico: Evita falsos positivos similares a razones previas: ${razonesTop}.`;
        }
      } catch {}

      const prompt = `Debes decidir si el resumen de una noticia está relacionado con el resumen de un newsletter. Responde SOLO con JSON válido con estas claves: relacionado (\"SI\" o \"NO\"), razon (explicación específica y personalizada de 3 a 6 oraciones, mencionando entidades/temas/indicadores concretos y por qué encajan o no), score (0-100, opcional).${feedbackHints}\n\nResumen de noticia:\n${resumen}\n\nNewsletter:\n${textoDoc}`;

      try {
        console.log(`\n🧪 [EVALUACIÓN IA] Evaluando newsletter ${i + 1}/${newslettersFiltrados.length} para esta noticia: ${nl.titulo || 'Sin título'}`);
        // Penalización previa por similitud con negativos
        let prePenalty = 0;
        if (negVecs.length) {
          try {
            const nlVec = await getEmbeddingCached(textoDoc);
            if (nlVec) {
              let maxSim = 0;
              for (const nv of negVecs) { if (!nv) continue; maxSim = Math.max(maxSim, cosSim(nlVec, nv)); }
              if (maxSim > 0.83) prePenalty = 12; else if (maxSim > 0.78) prePenalty = 8; else if (maxSim > 0.73) prePenalty = 4;
            }
          } catch {}
        }
        const content = await chatCompletionJSON([
          { role: "system", content: "Responde solo con JSON válido. Ejemplo: {\\\"relacionado\\\":\\\"SI\\\",\\\"razon\\\":\\\"Comparten tema de energía solar\\\",\\\"score\\\":82}" },
          { role: "user", content: prompt }
        ]);
        console.log(`🔎 Respuesta RAW del modelo: ${content}`);
        let parsed = null;
        try { parsed = JSON.parse(content); } catch { parsed = null; }
        let score = Math.max(0, Math.min(100, Number(parsed?.score ?? 0)));
        if (prePenalty > 0) score = Math.max(0, score - prePenalty);
        const razon = typeof parsed?.razon === 'string' ? parsed.razon : '';
        const relacionado = String(parsed?.relacionado || '').toUpperCase() === 'SI';
        if (relacionado) {
          relacionados.push({ ...nl, puntuacion: isNaN(score) ? undefined : Math.round(score), analisisRelacion: razon, Relacionado: true });
          console.log(`✅ Relacionado (score=${isNaN(score) ? 'N/D' : Math.round(score)}): ${razon}`);
        } else {
          noRelacionRazones.push(razon || 'No comparten tema/entidades clave.');
          console.log(`❌ No relacionado: ${razon || 'Sin motivo'}`);
        }
      } catch (err) {
        noRelacionRazones.push('No se pudo evaluar relación con IA.');
        console.log(`⚠️ Error evaluando relación con IA: ${err?.message || err}`);
      }
    }

    const topRelacionados = relacionados
      .sort((a, b) => (typeof b.puntuacion === 'number' ? b.puntuacion : -1) - (typeof a.puntuacion === 'number' ? a.puntuacion : -1))
      .slice(0, 3);

    const motivoSinRelacion = topRelacionados.length === 0
      ? (noRelacionRazones[0] || 'No hay coincidencias temáticas claras entre la noticia y los newsletters.')
      : '';

    console.log(`\n📊 [RESULTADO FINAL POR NOTICIA] Newsletter relacionados encontrados: ${topRelacionados.length}`);
    topRelacionados.forEach((nl, idx) => {
      console.log(`   ${idx + 1}. ${nl.titulo} (puntuación: ${nl.puntuacion ?? 'N/D'}) | Motivo: ${nl.analisisRelacion || ''}`);
    });
    if (topRelacionados.length === 0 && motivoSinRelacion) {
      console.log(`ℹ️ [RESULTADO POR NOTICIA] Motivo sin relación: ${motivoSinRelacion}`);
    }

    return { relacionados: topRelacionados, motivoSinRelacion };
  } catch (error) {
    console.error(`❌ Error comparando newsletters (chat): ${error.message}`);
    return { relacionados: [], motivoSinRelacion: 'Error al comparar con IA.' };
  }
}

// Función para determinar tema principal usando análisis de texto
function determinarTemaPrincipalLocal(contenido) {
  try {
    console.log(`📋 Determinando tema principal (análisis local)... MODIFICAR: CREO QUE NO HACE FALTA LA FUNCION (determinarTemaPrincipalLocal)`);
    
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
  console.log(`🚀 Entre a : (analizarNoticia)`);
  
  try {
    let contenido, titulo;
    const cleaned = (typeof input === 'string') ? input.trim().replace(/^[@\s]+/, '') : input;
    
    // PASO 1: Extraer contenido desde URL o usar texto directo
    if (typeof cleaned === 'string' && cleaned.startsWith('http')) {
      console.log("PASO 1: Entrar a extraerContenidoNoticia")
      const resultadoExtraccion = await extraerContenidoNoticia(cleaned);
        contenido = resultadoExtraccion.contenido;
        titulo = resultadoExtraccion.titulo;
    } else {
      contenido = cleaned;
      titulo = 'Texto proporcionado';
      }

      // PASO 2: Generar resumen
      console.log("PASO 2: Entrar a generarResumenIA")
    const resumen = await generarResumenIA(contenido);

      // PASO 3: Determinar si es Climatech
      console.log("PASO 3: Entrar a esClimatechIA")
    const esClimatech = await esClimatechIA(contenido);

      if (!esClimatech.esClimatech) {
        // PASO 3.1: Si no es Climatech, informar tema principal
        console.log("PASO 3.1: Entrar a determinarTemaPrincipalLocal por si no es climatech")
      const temaPrincipal = determinarTemaPrincipalLocal(contenido);

      return `❌ Esta noticia NO está relacionada con Climatech.

📰 Título: ${titulo}
📋 Tema principal: ${temaPrincipal}
📝 Razón: ${esClimatech.razon}

💡 Tip: Las noticias sobre Climatech incluyen energías renovables, eficiencia energética, captura de carbono, movilidad sostenible, agricultura sostenible, tecnologías ambientales, políticas climáticas, etc.`;
      }

      // PASO 4: Obtener newsletters de la BDD
      console.log(`\n PASO 4: entrar a obtenerNewslettersBDD`);
      const newsletters = await obtenerNewslettersBDD();

      // PASO 5: Comparar noticia con newsletters
      console.log(`\n🔍 PASO 5: Entrar a: compararConNewslettersLocal (el resumen  se esta mandando de una linea de abajo pero no de la funcion que genera el resumen)`);
      console.log(`📊 Total de newsletters obtenidos: ${newsletters.length}`);
      console.log(`🔗 URL a comparar: ${input}`);
      console.log(`📝 Resumen a comparar: ${typeof resumen === 'string' ? resumen.substring(0, 150) + (resumen.length > 150 ? '...' : '') : 'Resumen no disponible'}`);
      
      const { relacionados: newslettersRelacionados, motivoSinRelacion } = await compararConNewslettersLocal(typeof resumen === 'string' ? resumen : 'Resumen no disponible', newsletters, input);

      // PASO 6: Preparar respuesta final
      console.log(`\n📋 PASO 6: Preparando respuesta final...`);
      console.log(`🎯 Newsletters relacionados encontrados: ${newslettersRelacionados.length}`);
      if (newslettersRelacionados.length === 0 && motivoSinRelacion) {
        console.log(`ℹ️ Motivo: ${motivoSinRelacion}`);
      }
      
      let mensaje = `✅ Esta noticia SÍ está relacionada con Climatech.

📰 Título: ${titulo}
📝 Resumen: ${resumen}

`;

      if (newslettersRelacionados.length > 0) {
      mensaje += `📧 Newsletters relacionados encontrados:
`;
        newslettersRelacionados.forEach((nl, index) => {
        mensaje += `${index + 1}. ${nl.titulo} (puntuación: ${nl.puntuacion ?? 'N/D'})\n   📌 Motivo: ${nl.analisisRelacion || ''}
`;
        });
      } else {
        mensaje += `⚠️ No se encontraron newsletters con temática similar en la base de datos.\n   📌 Motivo: ${motivoSinRelacion || 'No hay coincidencias temáticas claras.'}`;
      }

    return mensaje;

    } catch (error) {
      console.error(`❌ Error en análisis completo: ${error.message}`);
    return `❌ Error durante el análisis: ${error.message}`;
  }
}

// Función para analizar noticia y devolver estructura para API
export async function analizarNoticiaEstructurada(url) {
  console.log(`\n🔍 INICIANDO ANÁLISIS INDIVIDUAL DE NOTICIA: ${url}`);
  
  const extraido = await extraerContenidoNoticia(url);
  if (!extraido) return null;

  const textoNoticia = extraido.contenido || '';

  console.log(`📝 Título extraído: ${extraido.titulo || 'Sin título'}`);
  console.log(`📄 Contenido extraído: ${textoNoticia.length} caracteres`);

  // IA
  console.log(`\n🤖 GENERANDO RESUMEN CON IA...`);
  const resumen = await generarResumenIA(textoNoticia);
  console.log(`✅ Resumen generado: ${typeof resumen === 'string' ? resumen.substring(0, 100) + '...' : 'No disponible'}`);

  console.log(`\n🌱 CLASIFICANDO SI ES CLIMATECH CON IA...`);
  const clasificacion = await esClimatechIA(textoNoticia);
  console.log(`✅ Clasificación: ${clasificacion.esClimatech ? 'SÍ es Climatech' : 'NO es Climatech'}`);
  if (!clasificacion.esClimatech) {
    console.log(`📋 Motivo: ${clasificacion.razon || 'Sin motivo'}`);
    return {
      url,
      titulo: extraido.titulo || '',
      autor: extraido.autor || '',
      resumen,
      esClimatech: false,
      razonClimatech: clasificacion.razon || '',
      newslettersRelacionados: [],
      motivoSinRelacion: 'No es Climatech'
    };
  }

  // BD
  console.log(`\n📊 OBTENIENDO NEWSLETTERS DE LA BASE DE DATOS...`);
  const newsletters = await obtenerNewslettersBDD();

  // Comparación local: obtener top relacionados desde el comparador
  console.log(`\n🔍 INICIANDO FILTRADO DE PALABRAS CLAVE + ANÁLISIS IA PARA ESTA NOTICIA...`);
  const { relacionados, motivoSinRelacion } = Array.isArray(newsletters)
    ? await compararConNewslettersLocal(typeof resumen === 'string' ? resumen : textoNoticia, newsletters, url)
    : { relacionados: [], motivoSinRelacion: 'No hay newsletters para comparar.' };

  console.log(`\n✅ ANÁLISIS COMPLETADO PARA ESTA NOTICIA`);
  console.log(`📊 Newsletters relacionados encontrados: ${relacionados.length}`);

  // Adaptar salida a lo que esperan los consumidores aguas abajo
  return {
    url,
    titulo: extraido.titulo || '',
    autor: extraido.autor || '',
    resumen,
    esClimatech: !!clasificacion?.esClimatech,
    razonClimatech: clasificacion?.razon || '',
    newslettersRelacionados: Array.isArray(relacionados) ? relacionados.map(nl => ({
      id: nl.id ?? null,
      titulo: nl.titulo || '',
      link: nl.link || nl._linkDoc || '',
      puntuacion: nl.puntuacion ?? null,
      analisisRelacion: nl.analisisRelacion || '',
    })) : [],
    motivoSinRelacion
  };
}

// Procesar un conjunto de URLs: analizar y persistir en Trends si corresponde
export async function procesarUrlsYPersistir(items = []) {
  console.log(`🚀 INICIANDO PROCESAMIENTO DE URLS:`);
  console.log(`📊 Total de items recibidos: ${items.length}`);
  console.log(`📋 Items:`, items);
  
  if (!Array.isArray(items) || items.length === 0) {
    console.log(`❌ No hay items para procesar`);
    return [];
  }

  console.log(`\n🚀 INICIANDO PROCESAMIENTO DE ${items.length} NOTICIAS INDIVIDUALMENTE`);
  console.log(`📋 Cada noticia será analizada por separado con filtrado de palabras clave + IA\n`);

  const trendsSvc = new TrendsService();
  const feedbackSvc = new FeedbackService();
  const resultados = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`\n🔄 PROCESANDO ITEM ${i + 1}/${items.length}:`, item);
    
    const url = (typeof item === 'string') ? item : (item?.url || '');
    const tituloTrend = (typeof item === 'object') ? (item?.title || item?.titulo || 'Sin título') : 'Sin título';
    
    console.log(`🔗 URL extraída: ${url}`);
    console.log(`📝 Título extraído: ${tituloTrend}`);
    
    if (!url) {
      console.log(`❌ No se pudo extraer URL del item, saltando...`);
      continue;
    }

    console.log(`\n📰 PROCESANDO NOTICIA ${i + 1}/${items.length}: ${tituloTrend}`);
    console.log(`🔗 URL: ${url}`);

    try {
      // Nota: no saltamos la URL completa por feedback; solo controlamos a nivel relación más abajo
      console.log(`🔍 Analizando noticia: ${url}`);
      const resultado = await analizarNoticiaEstructurada(url);
      
      console.log(`✅ Análisis completado para: ${url}`);
      console.log(`📊 Resultado del análisis:`, {
        esClimatech: resultado?.esClimatech,
        titulo: resultado?.titulo,
        resumen: resultado?.resumen ? `${resultado.resumen.substring(0, 100)}...` : 'Sin resumen',
        newslettersRelacionados: resultado?.newslettersRelacionados?.length || 0
      });
      
      // Inicializar el resultado con información básica
      const resultadoItem = { 
        url, 
        resultado, 
        insertado: false, 
        trendsCreados: 0 
      };
      
      if (!resultado?.esClimatech) {
        console.log(`❌ Noticia NO es Climatech, saltando...`);
        resultados.push(resultadoItem);
        continue;
      }

      console.log(`✅ Noticia SÍ es Climatech, procesando...`);
      const relacionados = Array.isArray(resultado.newslettersRelacionados)
        ? resultado.newslettersRelacionados
        : [];
      
      console.log(`📧 Newsletters relacionados encontrados: ${relacionados.length}`);
      
      // Crear trends para TODAS las noticias climatech, tengan o no newsletters relacionados
      let trendsInsertados = 0;
      
      if (relacionados.length > 0) {
        // Si hay newsletters relacionados, crear trends con esas relaciones
        for (const nl of relacionados) {
        try {
            // Saltar relación specifica si hay feedback negativo previo para el par link|newsletter
            try {
              const skipPair = await feedbackSvc.hasNegativeForLinkOrPair({ trendLink: url, newsletterId: nl.id ?? null });
              if (skipPair) {
                console.log(`⛔ Feedback negativo previo para par link|newsletter → saltando relación con NL ${nl.id}`);
                continue;
              }
            } catch {}
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
            
            if (createdTrend && createdTrend.id) {
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
            Analisis_relacion: (resultado.motivoSinRelacion || '').trim() || 'Noticia climatech sin newsletters relacionados'
          };
          const createdTrend = await trendsSvc.createAsync(payload);
          
          if (createdTrend && createdTrend.id) {
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
      
      console.log(`✅ Item ${i + 1} procesado completamente. Trends creados: ${trendsInsertados}`);
      
    } catch (e) {
      console.error(`❌ Error procesando ${url}:`, e?.message || e);
      console.error(`🔍 Stack trace completo:`, e?.stack || 'No disponible');
      // continuar con el siguiente sin romper el flujo
      resultados.push({
        url,
        resultado: null,
        insertado: false,
        trendsCreados: 0,
        error: e?.message || String(e)
      });
    }
  }

  console.log(`\n🎯 PROCESAMIENTO COMPLETADO:`);
  console.log(`📊 Total de items procesados: ${items.length}`);
  console.log(`✅ Items exitosos: ${resultados.filter(r => r.insertado).length}`);
  console.log(`❌ Items fallidos: ${resultados.filter(r => !r.insertado).length}`);
  console.log(`📈 Total de trends creados: ${resultados.reduce((sum, r) => sum + r.trendsCreados, 0)}`);

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
