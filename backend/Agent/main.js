import https from 'https';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import readline from 'readline';
import { fileURLToPath } from 'url';

// Configuración
const DEBUG = false;

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Palabras clave para detectar Climatech
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
  'ambiental', 'sustentable', 'climatech', 'cleantech'
];

// Función para extraer contenido de noticias desde URLs
async function extraerContenidoNoticia(url) {
  try {
    console.log(`🔗 Extrayendo contenido de: ${url}`);
    
    const res = await fetch(url, { agent: httpsAgent });
    if (!res.ok) throw new Error(`Error HTTP: ${res.status} ${res.statusText}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    // Extraer título
    let titulo = $('title').text().trim() || 
                 $('h1').first().text().trim() || 
                 $('meta[property="og:title"]').attr('content') || 
                 'Sin título';

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
      url: url
    };
  } catch (error) {
    console.error(`❌ Error extrayendo contenido: ${error.message}`);
    return {
      titulo: 'Error al extraer título',
      contenido: 'No se pudo extraer el contenido de la noticia.',
      url: url
    };
  }
}

// Función para generar resumen usando análisis de texto local
function generarResumenLocal(contenido) {
  try {
    console.log(`📝 Generando resumen local...`);
    
    // Dividir en oraciones
    const oraciones = contenido.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    // Seleccionar las primeras 3 oraciones más relevantes
    const resumen = oraciones.slice(0, 3).join('. ').trim();
    
    console.log(`✅ Resumen generado: ${resumen.length} caracteres`);
    
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
    
    const esClimatech = puntuacion >= 3 || densidad >= 2; // Al menos 3 palabras clave o densidad alta
    
    console.log(`✅ Evaluación local: ${esClimatech ? 'SÍ es Climatech' : 'NO es Climatech'}`);
    console.log(`📊 Puntuación: ${puntuacion} palabras clave encontradas`);
    console.log(`🔍 Palabras encontradas: ${palabrasEncontradas.join(', ')}`);
    
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
function compararConNewslettersLocal(resumenNoticia, newsletters) {
  try {
    console.log(`🔍 Comparando noticia con ${newsletters.length} newsletters (análisis local)...`);
    
    if (newsletters.length === 0) {
      console.log(`⚠️ No hay newsletters en la base de datos para comparar`);
      return [];
    }

    const resumenLower = resumenNoticia.toLowerCase();
    const newslettersRelacionados = [];
    
    newsletters.forEach((newsletter, index) => {
      let puntuacion = 0;
      const tituloLower = newsletter.titulo.toLowerCase();
      const resumenNewsletter = (newsletter.Resumen || '').toLowerCase();
      
      // Comparar palabras clave entre el resumen de la noticia y el newsletter
      CLIMATECH_KEYWORDS.forEach(keyword => {
        const keywordLower = keyword.toLowerCase();
        if (resumenLower.includes(keywordLower) && 
            (tituloLower.includes(keywordLower) || resumenNewsletter.includes(keywordLower))) {
          puntuacion += 2; // Coincidencia doble
        } else if (resumenLower.includes(keywordLower) || 
                   tituloLower.includes(keywordLower) || 
                   resumenNewsletter.includes(keywordLower)) {
          puntuacion += 1; // Coincidencia simple
        }
      });
      
      // Si hay al menos 2 coincidencias, considerar relacionado
      if (puntuacion >= 2) {
        newslettersRelacionados.push({
          ...newsletter,
          puntuacion: puntuacion
        });
      }
    });
    
    // Ordenar por puntuación y tomar los mejores
    newslettersRelacionados.sort((a, b) => b.puntuacion - a.puntuacion);
    
    console.log(`✅ Se encontraron ${newslettersRelacionados.length} newsletters relacionados`);
    
    return newslettersRelacionados.slice(0, 5); // Máximo 5 resultados
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
    
    // PASO 1: Extraer contenido desde URL o usar texto directo
    if (input.startsWith('http')) {
      const resultadoExtraccion = await extraerContenidoNoticia(input);
      contenido = resultadoExtraccion.contenido;
      titulo = resultadoExtraccion.titulo;
    } else {
      contenido = input;
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
    if (input.startsWith('http')) {
      const resultadoExtraccion = await extraerContenidoNoticia(input);
      contenido = resultadoExtraccion.contenido;
      titulo = resultadoExtraccion.titulo;
      url = input;
    } else {
      contenido = input;
      titulo = 'Texto proporcionado';
    }

    const resumen = generarResumenLocal(contenido);
    const esClimatech = determinarSiEsClimatechLocal(contenido);
    let newsletters = [];
    let relacionados = [];
    if (esClimatech) {
      newsletters = await obtenerNewslettersBDD();
      relacionados = compararConNewslettersLocal(resumen, newsletters);
    }

    return {
      esClimatech,
      titulo,
      resumen: esClimatech ? resumen : null,
      url,
      newslettersRelacionados: relacionados.map(nl => ({
        id: nl.id,
        titulo: nl.titulo,
        Resumen: nl.Resumen || '',
        link: nl.link || '',
        puntuacion: nl.puntuacion || 0,
      })),
    };
  } catch (error) {
    return {
      esClimatech: false,
      titulo: 'Error',
      resumen: null,
      url: '',
      newslettersRelacionados: [],
      error: error.message || String(error),
    };
  }
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


