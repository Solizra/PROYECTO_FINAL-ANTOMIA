import { tool, agent } from "llamaindex";
import { Ollama } from "@llamaindex/ollama";
import { z } from "zod";
import { empezarChat } from './cli-chat.js'
import https from 'https';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

// Configuración
const DEBUG = false;

// Configuración del LLM con timeout extendido y reintentos
const ollamaLLM = new Ollama({
  model: "qwen3:1.7b",
  temperature: 0.3,
  timeout: 8 * 60 * 1000, // 8 minutos para evitar timeouts
});

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// System prompt mejorado
const systemPrompt = `
Eres un asistente especializado en análisis de noticias sobre Climatech (tecnologías climáticas).
Tu función es analizar noticias y determinar si están relacionadas con Climatech, que incluye:
- Energías renovables (solar, eólica, hidroeléctrica, etc.)
- Eficiencia energética
- Captura y almacenamiento de carbono
- Movilidad sostenible (vehículos eléctricos, transporte público)
- Agricultura sostenible
- Tecnologías de monitoreo ambiental
- Políticas climáticas y regulaciones ambientales
- Innovación en materiales sostenibles
- Economía circular

Responde de manera clara y estructurada siguiendo el formato especificado.
`.trim();

// Función auxiliar para procesar respuestas del LLM
function procesarRespuestaLLM(respuesta) {
  if (typeof respuesta === 'string') {
    return respuesta.trim();
  } else if (respuesta && typeof respuesta === 'object') {
    // Intentar diferentes propiedades comunes
    if (respuesta.text) return respuesta.text.trim();
    if (respuesta.content) return respuesta.content.trim();
    if (respuesta.response) return respuesta.response.trim();
    if (respuesta.message) return respuesta.message.trim();
    if (respuesta.completion) return respuesta.completion.trim();
    if (respuesta.output) return respuesta.output.trim();
    if (respuesta.result) return respuesta.result.trim();
    // Si es un objeto con propiedades, intentar convertirlo a string
    return JSON.stringify(respuesta).trim();
  } else {
    return String(respuesta || '').trim();
  }
}

// Función para llamar al LLM con reintentos
async function llamarLLMConReintentos(prompt, temperature = 0.2, maxReintentos = 3) {
  for (let intento = 1; intento <= maxReintentos; intento++) {
    try {
      console.log(`🧠 Intento ${intento}/${maxReintentos} - Llamando al LLM...`);
      
      const respuesta = await ollamaLLM.complete({
        prompt: prompt,
        temperature: temperature,
      });
      
      console.log(`✅ LLM respondió exitosamente en intento ${intento}`);
      return respuesta;
    } catch (error) {
      console.error(`❌ Error en intento ${intento}: ${error.message}`);
      
      if (intento === maxReintentos) {
        throw new Error(`Falló después de ${maxReintentos} intentos: ${error.message}`);
      }
      
      // Esperar antes del siguiente intento
      const tiempoEspera = intento * 2000; // 2s, 4s, 6s
      console.log(`⏳ Esperando ${tiempoEspera/1000}s antes del siguiente intento...`);
      await new Promise(resolve => setTimeout(resolve, tiempoEspera));
    }
  }
}

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

// Función para generar resumen de la noticia
async function generarResumen(contenido) {
  try {
    console.log(`📝 Generando resumen...`);
    
    const prompt = `
Analiza el siguiente contenido de una noticia y genera un resumen claro y conciso en máximo 3 líneas:

${contenido}

Resumen:`;

    const respuesta = await llamarLLMConReintentos(prompt, 0.2);
    const resumen = procesarRespuestaLLM(respuesta);
    console.log(`✅ Resumen generado: ${resumen.length} caracteres`);
    
    return resumen;
  } catch (error) {
    console.error(`❌ Error generando resumen: ${error.message}`);
    return 'No se pudo generar el resumen debido a un timeout.';
  }
}

// Función para determinar si es Climatech
async function determinarSiEsClimatech(contenido) {
  try {
    console.log(`🔍 Evaluando si es Climatech...`);
    
    const prompt = `
Analiza el siguiente contenido de una noticia y determina si está relacionada con Climatech (tecnologías climáticas).

Climatech incluye:
- Energías renovables (solar, eólica, hidroeléctrica, etc.)
- Eficiencia energética
- Captura y almacenamiento de carbono
- Movilidad sostenible (vehículos eléctricos, transporte público)
- Agricultura sostenible
- Tecnologías de monitoreo ambiental
- Políticas climáticas y regulaciones ambientales
- Innovación en materiales sostenibles
- Economía circular

Contenido de la noticia:
${contenido}

Responde únicamente con "SÍ" si está relacionada con Climatech, o "NO" si no lo está.`;

    const respuesta = await llamarLLMConReintentos(prompt, 0.1);
    const respuestaProcesada = procesarRespuestaLLM(respuesta);
    const esClimatech = respuestaProcesada.toLowerCase().includes('sí') || 
                       respuestaProcesada.toLowerCase().includes('si') ||
                       respuestaProcesada.toLowerCase().includes('yes');
    
    console.log(`✅ Evaluación: ${esClimatech ? 'SÍ es Climatech' : 'NO es Climatech'}`);
    console.log(`🧠 Respuesta del modelo: "${respuestaProcesada}"`);
    
    return esClimatech;
  } catch (error) {
    console.error(`❌ Error evaluando Climatech: ${error.message}`);
    // En caso de error, asumir que no es Climatech para evitar falsos positivos
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

// Función para comparar noticia con newsletters
async function compararConNewsletters(resumenNoticia, newsletters) {
  try {
    console.log(`🔍 Comparando noticia con ${newsletters.length} newsletters...`);
    
    if (newsletters.length === 0) {
      console.log(`⚠️ No hay newsletters en la base de datos para comparar`);
      return [];
    }

    const prompt = `
Compara el siguiente resumen de una noticia sobre Climatech con los newsletters de la base de datos.

RESUMEN DE LA NOTICIA:
${resumenNoticia}

NEWSLETTERS DISPONIBLES:
${newsletters.map((nl, index) => `${index + 1}. Título: "${nl.titulo}"
   Resumen: ${nl.Resumen || 'Sin resumen'}`).join('\n\n')}

INSTRUCCIONES:
- Analiza si algún newsletter trata temas similares a la noticia
- Considera palabras clave, conceptos y temáticas relacionadas
- Responde ÚNICAMENTE con los números de los newsletters relacionados, separados por comas
- Si no hay coincidencias, responde "NINGUNO"

Ejemplo de respuesta: "1, 3, 5" o "NINGUNO"

Newsletters relacionados:`;

    const respuesta = await llamarLLMConReintentos(prompt, 0.1);
    const respuestaProcesada = procesarRespuestaLLM(respuesta);
    console.log(`🧠 Respuesta del modelo: ${respuestaProcesada}`);

    // Procesar respuesta
    if (respuestaProcesada.toLowerCase().includes('ninguno') || respuestaProcesada === '') {
      console.log(`✅ No se encontraron newsletters relacionados`);
      return [];
    }

    // Extraer números de newsletters relacionados
    const numeros = respuestaProcesada
      .split(/[,\s]+/)
      .map(num => parseInt(num.trim()))
      .filter(num => !isNaN(num) && num > 0 && num <= newsletters.length);

    const newslettersRelacionados = numeros.map(num => newsletters[num - 1]);
    
    console.log(`✅ Se encontraron ${newslettersRelacionados.length} newsletters relacionados`);
    
    return newslettersRelacionados;
  } catch (error) {
    console.error(`❌ Error comparando newsletters: ${error.message}`);
    return [];
  }
}

// Tool para extraer texto de noticia
const extraerTextoDeNoticiaTool = tool({
  name: "extraerTextoDeNoticia",
  description: "Extrae el contenido principal de una noticia desde un link, incluyendo el título y el texto.",
  parameters: z.object({
    url: z.string().describe("El link de la noticia"),
  }),
  execute: async ({ url }) => {
    return await extraerContenidoNoticia(url);
  },
});

// Tool principal para evaluar noticias
const evaluarNoticiaTool = tool({
  name: "evaluarNoticiaClimatech",
  description: "Evalúa si el texto de una noticia está relacionado con Climatech y busca newsletters relacionados",
  parameters: z.object({
    texto: z.string().describe("El contenido textual de la noticia"),
    url: z.string().optional().describe("URL de la noticia para contexto"),
  }),
  execute: async ({ texto, url }) => {
    console.log(`🚀 Iniciando análisis completo de noticia...`);
    
    try {
      // PASO 1: Extraer contenido (si no se proporcionó)
      let contenido = texto;
      let titulo = 'Sin título';
      
      if (url && !texto) {
        const resultadoExtraccion = await extraerContenidoNoticia(url);
        contenido = resultadoExtraccion.contenido;
        titulo = resultadoExtraccion.titulo;
      }

      // PASO 2: Generar resumen
      const resumen = await generarResumen(contenido);

      // PASO 3: Determinar si es Climatech
      const esClimatech = await determinarSiEsClimatech(contenido);

      if (!esClimatech) {
        // PASO 3.1: Si no es Climatech, informar tema principal
        try {
          const temaPrincipalRespuesta = await llamarLLMConReintentos(
            `Determina el tema principal de esta noticia en una frase corta:\n\n${contenido}\n\nTema principal:`,
            0.2
          );
          const temaPrincipal = procesarRespuestaLLM(temaPrincipalRespuesta);

          return {
            esClimatech: false,
            mensaje: `❌ Esta noticia NO está relacionada con Climatech.\n\n📰 Título: ${titulo}\n📋 Tema principal: ${temaPrincipal}\n\n💡 Tip: Las noticias sobre Climatech incluyen energías renovables, eficiencia energética, captura de carbono, movilidad sostenible, agricultura sostenible, tecnologías ambientales, políticas climáticas, etc.`,
            resumen: null,
            newslettersRelacionados: []
          };
        } catch (error) {
          return {
            esClimatech: false,
            mensaje: `❌ Esta noticia NO está relacionada con Climatech.\n\n📰 Título: ${titulo}\n📋 Tema principal: No se pudo determinar debido a un timeout\n\n💡 Tip: Las noticias sobre Climatech incluyen energías renovables, eficiencia energética, captura de carbono, movilidad sostenible, agricultura sostenible, tecnologías ambientales, políticas climáticas, etc.`,
            resumen: null,
            newslettersRelacionados: []
          };
        }
      }

      // PASO 4: Obtener newsletters de la BDD
      const newsletters = await obtenerNewslettersBDD();

      // PASO 5: Comparar noticia con newsletters
      const newslettersRelacionados = await compararConNewsletters(resumen, newsletters);

      // PASO 6: Preparar respuesta final
      let mensaje = `✅ Esta noticia SÍ está relacionada con Climatech.\n\n📰 Título: ${titulo}\n📝 Resumen: ${resumen}\n\n`;

      if (newslettersRelacionados.length > 0) {
        mensaje += `📧 Newsletters relacionados encontrados:\n`;
        newslettersRelacionados.forEach((nl, index) => {
          mensaje += `${index + 1}. ${nl.titulo}\n`;
        });
      } else {
        mensaje += `⚠️ No se encontraron newsletters con temática similar en la base de datos.`;
      }

      return {
        esClimatech: true,
        mensaje: mensaje,
        resumen: resumen,
        newslettersRelacionados: newslettersRelacionados
      };

    } catch (error) {
      console.error(`❌ Error en análisis completo: ${error.message}`);
      return {
        esClimatech: false,
        mensaje: `❌ Error durante el análisis: ${error.message}\n\n💡 Verifica que Ollama esté ejecutándose y el modelo qwen3:1.7b esté disponible.`,
        resumen: null,
        newslettersRelacionados: []
      };
    }
  },
});

// Configuración del agente
const elagente = agent({
    tools: [extraerTextoDeNoticiaTool, evaluarNoticiaTool],
    llm: ollamaLLM,
    verbose: DEBUG,
    systemPrompt: systemPrompt,
});

// Mensaje de bienvenida mejorado
const mensajeBienvenida = `
🌱 CLIMATECH NEWS ANALYZER
===========================

Soy un asistente especializado en analizar noticias sobre Climatech.

📋 Mi proceso:
1. Extraigo el contenido de la noticia desde el link
2. Genero un resumen claro
3. Determino si es Climatech o no
4. Si es Climatech, busco newsletters relacionados en la base de datos
5. Te muestro los resultados

🔗 Para empezar, pega el link de una noticia.
💡 También puedes escribir 'exit' para salir.

¿Qué noticia quieres analizar?
`;

// Iniciar el chat
empezarChat(elagente, mensajeBienvenida);


