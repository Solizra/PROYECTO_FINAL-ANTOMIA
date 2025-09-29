// ESTE ERA EL MAIN2.JS QUE AHORA ES MAIN PARA QUE USE ESTE

import https from 'https';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import readline from 'readline';
import { fileURLToPath } from 'url';
import TrendsService from '../Services/Trends-services.js';
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

<<<<<<< HEAD
=======
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

>>>>>>> 4a8a0a29a4e26ff3091c5e8fa71320702ddca5fc
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
   console.log(`Entre a: extraerContenidoNoticia`);
    
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
    
   console.log(`✅ Contenido extraído: ${contenido.length} caracteres`);
    
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

// Función para generar resumen usando Chat Completions de OpenAI
async function generarResumenIA(contenido) { //de donde sale el contenido?? ()
  try {
<<<<<<< HEAD
    console.log("entre a generarResumenIA");
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Eres un asistente que resume noticias." },
        { role: "user", content: `Resume esta noticia en 5 frases:\n\n${contenido}` }
      ]
    });
    return resp?.choices?.[0]?.message?.content?.trim?.() || "";
  } catch (err) {
    if (err?.cause?.code === 'SELF_SIGNED_CERT_IN_CHAIN' || err?.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
      try {
        const resp2 = await insecureClient.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Eres un asistente que resume noticias." },
            { role: "user", content: `Resume esta noticia en 5 frases:\n\n${contenido}` }
          ]
        });
        return resp2?.choices?.[0]?.message?.content?.trim?.() || "";
      } catch (err2) {
        console.error("Error al generar resumen IA (retry inseguro):", err2);
      }
    }
    console.error("Error al generar resumen IA:", err);
    return "⚠️ No se pudo generar resumen con IA.";
=======
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
>>>>>>> 4a8a0a29a4e26ff3091c5e8fa71320702ddca5fc
  }
}

// Función para determinar si es Climatech usando un modelo heurístico ponderado
async function esClimatechIA(contenido) {
  try {
    console.log("Entre a esClimatechIA");
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Eres un experto en sostenibilidad y tecnologías climáticas." },
        { role: "user", content: `Tu tarea es decidir si una noticia está relacionada con CLIMATECH. 
      CLIMATECH se define como cualquier conjunto de tecnologías e innovaciones que buscan combatir el cambio climático, reducir emisiones de gases de efecto invernadero, mitigar impactos ambientales o promover la adaptación a nuevas condiciones climáticas.
      
      ⚠️ Además, considera como CLIMATECH cualquier artículo que hable de la relación entre TECNOLOGÍA (de cualquier tipo, incluso digital, IA, telecomunicaciones, etc.) y el MEDIO AMBIENTE o el CAMBIO CLIMÁTICO. 
      Ejemplo: una noticia sobre "La sed de ChatGPT: la IA consume una cantidad de agua alarmante" debe considerarse CLIMATECH porque conecta el impacto ambiental con una tecnología.
      
      Instrucciones:
      1. Si la noticia cumple con esta definición, responde con "SI".
      2. Si no cumple, responde con "NO".
      3. Luego, independientemente de si tu respuesta es 'SI' o 'NO', da una breve explicación (1-3 frases) justificando tu decisión.
      
      Noticia a evaluar:
      ${contenido}` }
      ]
    });
    const salida = resp?.choices?.[0]?.message?.content?.trim?.() || "";
    const esClimatech = salida.toLowerCase().startsWith("si");
    return { esClimatech, razon: salida };
  } catch (err) {
    if (err?.cause?.code === 'SELF_SIGNED_CERT_IN_CHAIN' || err?.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
      try {
        const resp2 = await insecureClient.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Eres un experto en sostenibilidad y tecnologías climáticas." },
            { role: "user", content: `Tu tarea es decidir si una noticia está relacionada con CLIMATECH. 
      CLIMATECH se define como cualquier conjunto de tecnologías e innovaciones que buscan combatir el cambio climático, reducir emisiones de gases de efecto invernadero, mitigar impactos ambientales o promover la adaptación a nuevas condiciones climáticas.
      
      ⚠️ Además, considera como CLIMATECH cualquier artículo que hable de la relación entre TECNOLOGÍA (de cualquier tipo, incluso digital, IA, telecomunicaciones, etc.) y el MEDIO AMBIENTE o el CAMBIO CLIMÁTICO. 
      Ejemplo: una noticia sobre "La sed de ChatGPT: la IA consume una cantidad de agua alarmante" debe considerarse CLIMATECH porque conecta el impacto ambiental con una tecnología.
      
      Instrucciones:
      1. Si la noticia cumple con esta definición, responde con "SI".
      2. Si no cumple, responde con "NO".
      3. Luego, independientemente de si tu respuesta es 'SI' o 'NO', da una breve explicación (1-3 frases) justificando tu decisión.
      
      Noticia a evaluar:
      ${contenido}` }
          ]
        });
        const salida2 = resp2?.choices?.[0]?.message?.content?.trim?.() || "";
        const esClimatech2 = salida2.toLowerCase().startsWith("si");
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
      
      // Log adicional para confirmar que se obtuvieron todos
      if (newsletters.length > 0) {
        console.log(`📊 Primer newsletter: ${newsletters[0].titulo || 'Sin título'}`);
        console.log(`📊 Último newsletter: ${newsletters[newsletters.length - 1].titulo || 'Sin título'}`);
        
      } else {
        console.log(`⚠️ No se encontraron newsletters en la base de datos`);
      }
      
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

// Función para comparar noticia con newsletters usando IA (Chat)
async function compararConNewslettersLocal(resumenNoticia, newsletters, urlNoticia = '') {
  try {
    const resumen = typeof resumenNoticia === 'string' ? resumenNoticia : String(resumenNoticia || '');

    if (!Array.isArray(newsletters) || newsletters.length === 0) {
      console.log(`⚠️ No hay newsletters en la base de datos para comparar`);
      return { relacionados: [], motivoSinRelacion: 'No hay newsletters disponibles para comparar.' };
    }

    console.log(`📊 Procesando todos los ${newsletters.length} newsletters para encontrar coincidencias... SE TIENE QUE HACER CON CHAT`);

    const relacionados = [];
    const noRelacionRazones = [];
    for (let i = 0; i < newsletters.length; i++) {
      const nl = newsletters[i];
      const textoDoc = `${nl.titulo || ''}\n\n${nl.Resumen || ''}`.trim();
      const prompt = `Debes decidir si el resumen de una noticia está relacionado con el resumen de un newsletter. Responde SOLO con JSON válido con estas claves: relacionado (\"SI\" o \"NO\"), razon (máx 2 frases, breve), score (0-100, opcional).\n\nResumen de noticia:\n${resumen}\n\nNewsletter:\n${textoDoc}`;

      try {
        console.log(`\n🧪 Evaluando newsletter ${i + 1}/${newsletters.length}: ${nl.titulo || 'Sin título'}`);
        const content = await chatCompletionJSON([
          { role: "system", content: "Responde solo con JSON válido. Ejemplo: {\\\"relacionado\\\":\\\"SI\\\",\\\"razon\\\":\\\"Comparten tema de energía solar\\\",\\\"score\\\":82}" },
          { role: "user", content: prompt }
        ]);
        console.log(`🔎 Respuesta RAW del modelo: ${content}`);
        let parsed = null;
        try { parsed = JSON.parse(content); } catch { parsed = null; }
        console.log(`🧩 Parsed:`, parsed);
        const score = Math.max(0, Math.min(100, Number(parsed?.score ?? 0)));
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

    console.log(`\n📊 Resultado final - relacionados: ${topRelacionados.length}`);
    topRelacionados.forEach((nl, idx) => {
      console.log(`   ${idx + 1}. ${nl.titulo} (puntuación: ${nl.puntuacion ?? 'N/D'}) | Motivo: ${nl.analisisRelacion || ''}`);
    });
    if (topRelacionados.length === 0 && motivoSinRelacion) {
      console.log(`ℹ️ Motivo sin relación: ${motivoSinRelacion}`);
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
  console.log ("entre a:  analizarNoticiaEstructurada (verificar que es)")
  const extraido = await extraerContenidoNoticia(url);
  if (!extraido) return null;

<<<<<<< HEAD
  const textoNoticia = extraido.contenido || '';
=======
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
>>>>>>> 4a8a0a29a4e26ff3091c5e8fa71320702ddca5fc

  // IA
  const resumen = await generarResumenIA(textoNoticia);
  const clasificacion = await esClimatechIA(textoNoticia);

<<<<<<< HEAD
  // BD
  const newsletters = await obtenerNewslettersBDD();

  // Comparación local: obtener top relacionados desde el comparador
  const { relacionados, motivoSinRelacion } = Array.isArray(newsletters)
    ? await compararConNewslettersLocal(typeof resumen === 'string' ? resumen : textoNoticia, newsletters, url)
    : { relacionados: [], motivoSinRelacion: 'No hay newsletters para comparar.' };

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
=======
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
>>>>>>> 4a8a0a29a4e26ff3091c5e8fa71320702ddca5fc
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


