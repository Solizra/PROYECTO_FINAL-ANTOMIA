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

// (eliminado) extractFirstUrl: no se usa

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

function cosineSimilarity(tfA, tfB) {
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

function jaccard(setA, setB) {
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
   // console.log(`📝 Generando resumen local...`);
    
    // Dividir en oraciones
    const oraciones = contenido.split(/[.!?]+/).filter(s => s.trim().length > 10);

    // Seleccionar las primeras 3 oraciones más relevantes
    const resumen = oraciones.slice(0, 3).join('. ').trim();

   // console.log(`✅ Resumen generado: ${resumen.length} caracteres`);
    
    return resumen + '.';
  } catch (error) {
    console.error(`❌ Error generando resumen: ${error.message}`);
    return 'No se pudo generar el resumen.';
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
    
    // Calcular densidad de palabras clave
    const densidad = puntuacion / (contenido.split(' ').length / 100); // palabras por 100
    
    // Criterios más inclusivos para clasificar como climatech
    const esClimatech = puntuacion >= 2 || densidad >= 1.5; // Bajado de 3 a 2 palabras clave
    
    console.log(`✅ Evaluación local: ${esClimatech ? 'SÍ es Climatech' : 'NO es Climatech'}`);
    console.log(`📊 Puntuación: ${puntuacion} palabras clave encontradas`);
    console.log(`🔍 Palabras encontradas: ${palabrasEncontradas.join(', ')}`);
    console.log(`📈 Densidad: ${densidad.toFixed(2)} palabras por 100`);
    
    return esClimatech;
  } catch (error) {
    console.error(`❌ Error evaluando Climatech: ${error.message}`);
    return false;
  }
}

// Función para obtener newsletters de la base de datos
async function obtenerNewslettersBDD() {
  try {
    console.log(`📥 Obteniendo newsletters de la base de datos...`);
    
    const response = await fetch('http://localhost:3000/api/Newsletter');
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
    }
    
    const newsletters = await response.json();
    console.log(`✅ Se obtuvieron ${newsletters.length} newsletters de la BDD`);
    
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
    
    if (newsletters.length === 0) {
      console.log(`⚠️ No hay newsletters en la base de datos para comparar`);
      return [];
    }

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

    const newslettersScored = newsletters.map((newsletter) => {
      const textoDoc = `${newsletter.titulo || ''} ${newsletter.Resumen || ''}`;
      const linkDoc = newsletter.link || newsletter.url || '';
      const isExactUrlMatch = linkDoc && urlNoticia && (linkDoc === urlNoticia);
      const sameHost = hostNoticia && linkDoc && (getHost(linkDoc) === hostNoticia);

      if (isExactUrlMatch) {
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

      const baseScore = 0.4 * cos + 0.3 * bigJacc + 0.2 * Math.min(triJacc * 2, 1) + 0.1 * Math.min(tagOverlap, 1);
      const score = Math.min(baseScore + (sameHost ? 0.12 : 0) + coAIWater + coAIEnergy, 1);

      // Guardar detalles de coincidencias
      const matchedTopArr = topKeywords.filter(t => tokensDoc.includes(t));
      const matchedTagsArr = [...tagsResumen].filter(t => extractThematicTags(textoDoc).has(t));

      return { ...newsletter, _score: score, _matchesTop: matchesTop, _tagOverlap: tagOverlap, _triJacc: triJacc, _bigJacc: bigJacc, _cos: cos, _entityOverlapCount: entityOverlapCount, _matchedTopArr: matchedTopArr, _matchedTagsArr: matchedTagsArr, _sameHost: sameHost };
    })
    // Gating más flexible: baja umbrales para aumentar recall
    .filter(nl => (
      nl._forced === true || (
        (nl._sameHost ? nl._score >= 0.12 : nl._score >= 0.15) &&
        nl._matchesTop >= 2 &&
        (nl._bigJacc >= 0.05 || nl._triJacc >= 0.02) &&
        nl._tagOverlap >= 0.15 &&
        nl._entityOverlapCount >= 0
      )
    ))
    .sort((a, b) => b._score - a._score)
    .slice(0, 3)
    .map(nl => ({ ...nl, puntuacion: Math.round(nl._score * 100) }));

    console.log(`✅ Se encontraron ${newslettersScored.length} newsletters relacionados (filtrados)`);
    if (newslettersScored.length > 0) return newslettersScored;

    // Fallback menos estricto para no perder candidatos
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
    .slice(0, 2)
    .map(nl => ({ ...nl, puntuacion: Math.round((nl._tri + nl._big) * 100) }));

    console.log(`ℹ️ Fallback estricto: ${fallback.length} newsletters`);
    return fallback;
  } catch (error) {
    console.error(`❌ Error comparando newsletters: ${error.message}`);
    return [];
  }
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
      const newsletters = await obtenerNewslettersBDD();

      // PASO 5: Comparar noticia con newsletters
    const newslettersRelacionados = compararConNewslettersLocal(resumen, newsletters);

      // PASO 6: Preparar respuesta final
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
    const esClimatech = determinarSiEsClimatechLocal(contenido);
    let newsletters = [];
    let relacionados = [];
    if (esClimatech) {
      newsletters = await obtenerNewslettersBDD();
      relacionados = compararConNewslettersLocal(resumen, newsletters, url);
    }

    const fechaRelacion = new Date().toISOString();
    const plataforma = url ? detectarPlataforma(url) : '';
    const resumenFama = generarResumenFamaTrend(contenido, sitio, autor, plataforma);

    return {
      esClimatech,
      titulo,
      resumen: esClimatech ? resumen : null,
      url,
      sitio,
      autor,
      fechaPublicacion,
      resumenFama,
      newslettersRelacionados: relacionados.map(nl => ({
        id: nl.id,
        titulo: nl.titulo,
        Resumen: nl.Resumen || '',
        link: nl.link || '',
        puntuacion: nl.puntuacion || 0,
        fechaRelacion,
        analisisRelacion: (() => {
          const tags = (nl._matchedTagsArr || []).join(', ');
          const tops = (nl._matchedTopArr || []).join(', ');
          const partes = [];
          if (tags) partes.push(`Coincidencia temática: ${tags}`);
          if (tops) partes.push(`Palabras clave comunes: ${tops}`);
          if (plataforma) partes.push(`Fuente: ${plataforma}`);
          else if (sitio) partes.push(`Fuente: ${sitio}`);
          if (autor) partes.push(`Autor/Perfil: ${autor}`);
          return partes.length ? partes.join(' | ') : 'Relacionados por similitud de contenido.';
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
                resumenFama: resultado.resumenFama || '',
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
            Analisis_relacion: 'Noticia climatech sin newsletters relacionados'
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
              resumenFama: resultado.resumenFama || '',
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


