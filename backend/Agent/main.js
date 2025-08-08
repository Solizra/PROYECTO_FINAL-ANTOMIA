import { tool, agent } from "llamaindex";
import { Ollama } from "@llamaindex/ollama";
import { z } from "zod";
import { empezarChat } from './cli-chat.js'
import https from 'https';

//import {Bdd} from '../../data/Bdd.js'
//revisar la conexion con base de datos y porque no aparece la respuesta de que si hay algun newsletter relacionado  


// Configuración
const DEBUG = false;


// Instancia de la clase Estudiantes
//const estudiantes = new Estudiantes();
//estudiantes.cargarEstudiantesDesdeJson();


// System prompt básico
const systemPrompt = `
Sos un asistente que analiza noticias para detectar si están relacionadas con Climatech.
Climatech incluye tecnologías que ayudan a combatir el cambio climático, como energías renovables, eficiencia energética, captura de carbono, movilidad sostenible, etc. Pero también son relevantes noticias sobre estos temas sin tecnologías incluidas.


Tu tarea es:
- Leer la noticia que se encuentra en el texto o el link proporcionado.
- Determinar si el contenido tiene relación con Climatech.
- Respondé solo con "Sí" o "No". Si la respuesta es "Sí" genera un breve resmen de la noticia. Si la respuesta es "No" decí cual es el tema principal de la noticia.
- Si es Climatech, comparo los resumenes de la base de dsatos sobre los newsletetr almacenados. Si las tematicas coinciden con la noticia ingresada, devolves los titulos de los newsletter de la base de datos que se relacionan con la noticia relacionada

IMPORTANTE: Para determinar si una noticia está relacionada con Climatech, el asistente cuenta con herramientas como evaluarNoticiaClimatech y extraerTextoDeNoticia. Estas herramientas están diseñadas para realizar análisis automáticos, por lo que el asistente debe usarlas siempre que sea necesario, en lugar de emitir juicios directamente.



`.trim();


const ollamaLLM = new Ollama({
  model: "qwen3:1.7b",
  temperature: 0.75,
    timeout: 4 * 60 * 1000, // Timeout de 2 minutos
});




// TODO: Implementar la Tool para buscar por nombre
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });


async function buscarNewslettersRelacionados(resumenNoticia) {
  console.log("Buscando newsletters relacionados para resumen:", resumenNoticia);
  // 1. Traer los newsletters desde tu backend Express
  const response = await fetch('http://localhost:3000/api/Newsletter');
  const newsletters = await response.json();

  // 2. Armar el prompt para el modelo LLM
  const prompt = `
Tengo un resumen de una noticia sobre Climatech:
"${resumenNoticia}"

Y una lista de newsletters con su título y resumen:
${newsletters.map(n => `- Título: "${n.titulo}", Resumen: ${n.resumen}`).join('\n')}

Compará el resumen de la noticia con los resúmenes de los newsletters.
Si alguno trata una temática similar, respondé solo con una lista de los **títulos exactos** de los newsletters relacionados, uno por línea.
No agregues explicaciones, solo los títulos.
`;
console.log("Los newsletters que voy a comparar son:");
console.log(JSON.stringify(newsletters, null, 2));


  // 3. Consultar al modelo
    // 3. Consultar al modelo
    const completion = await ollamaLLM.complete({
      prompt,
      temperature: 0,
    });
    console.log("DEBUG completion:", completion);
  
    // AJUSTA AQUÍ según lo que veas en el log
    let respuesta = "";
    if (typeof completion === "string") {
      respuesta = completion;
    } else if (completion.completion) {
      respuesta = completion.completion;
    } else if (completion.text) {
      respuesta = completion.text;
    } else if (completion.output) {
      respuesta = completion.output;
    } else {
      respuesta = "";
    }
  
    console.log("🧠 Texto generado por el modelo:\n", respuesta);
  
  

  // 4. Procesar respuesta del modelo
  function normalizarTitulo(titulo) {
    return titulo
      .toLowerCase()
      .replace(/…/g, "") // elimina puntos suspensivos unicode
      .replace(/\.\.\./g, "") // elimina tres puntos
      .replace(/[#¿?!"¡]/g, "") // elimina signos raros
      .replace(/\s+/g, " ") // colapsa espacios
      .trim();
  }
  
  const relacionados = [];
  const idsAgregados = new Set();
  
  const lineas = respuesta
    .split('\n')
    .map(linea => linea.trim())
    .filter(Boolean);
  
  lineas.forEach(tituloRespuesta => {
    const tituloNorm = normalizarTitulo(tituloRespuesta);
  
    const newsletter = newsletters.find(n =>
      normalizarTitulo(n.titulo) === tituloNorm ||
      normalizarTitulo(n.titulo).includes(tituloNorm) ||
      tituloNorm.includes(normalizarTitulo(n.titulo))
    );
    if (newsletter && !idsAgregados.has(newsletter.id)) {
      relacionados.push({
        id: newsletter.id,
        link: newsletter.link,
        titulo: newsletter.titulo,
        resumen: newsletter.Resumen, 
      });
      idsAgregados.add(newsletter.id);
    }
  });

  return relacionados;
}


const extraerTextoDeNoticiaTool = tool({
  name: "extraerTextoDeNoticia",
  description: "Extrae el contenido principal de una noticia desde un link, incluyendo el título y el texto (máximo 3000 caracteres).",
  parameters: z.object({
    url: z.string().describe("El link de la noticia"),
  }),
  execute: async ({ url }) => {
    try {
      const res = await fetch(url, { agent: httpsAgent });
      if (!res.ok) throw new Error(`Error al descargar la página: ${res.statusText}`);

      const html = await res.text();
      const $ = cheerio.load(html);

      // Título de la noticia
     // const titulo = $('title').text().trim() || 'Sin título';
     const titulo = "Sin titulo"

      // Extraer párrafos significativos
      const parrafos = $('p')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(texto => texto.length > 30);

      if (parrafos.length === 0) throw new Error('No se pudo extraer texto útil');

      //const texto = parrafos.join('\n').slice(0, 3000);
      const texto = `
      El artículo “IA: villana ambiental o el arma secreta” expone la paradoja de la inteligencia artificial como fuente de alto impacto ambiental —por su consumo energético, uso de agua, generación de residuos y demanda de minerales críticos— y, a la vez, como herramienta clave para enfrentar el cambio climático, destacando su uso en monitoreo ambiental, eficiencia energética y respuesta ante catástrofes, y proponiendo regulaciones para reducir su huella ecológica.
`
      return {
        titulo,
        texto,
        url,
      };
    } catch (e) {
      console.error('Error en extraerTextoDeNoticiaTool:', e.message);

      return {
        titulo: 'No se pudo extraer el título',
        texto: 'No se pudo extraer el contenido de la noticia.',
        url,
      };
    }
  },
});


const evaluarNoticiaTool = tool({
  name: "evaluarNoticiaClimatech",
  description: "Evalúa si el texto de una noticia está relacionado con Climatech y busca newsletters relacionados",
  parameters: z.object({
    texto: z.string().describe("El contenido textual de la noticia"),
    url: z.string().optional().describe("URL de la noticia para buscar newsletters"),
  }),
  execute: async ({ texto }) => {
    console.log("🔍 evaluarNoticiaTool.execute se llamó");

    // Paso 1: Evaluar si el texto trata sobre Climatech
    const evaluacion = await ollamaLLM.complete({
      prompt: `${systemPrompt}\n\nNoticia:\n${texto}\n\n¿Está relacionada con Climatech?`,
    });

    console.log("🧠 Evaluación cruda del modelo:", evaluacion);

    const respuesta = evaluacion.trim().toLowerCase();
    const esClimatech =
      respuesta.startsWith("sí") ||
      respuesta.includes("✅ es una noticia sobre climatech") ||
      respuesta.includes("sí.") ||
      respuesta.includes("sí,");

    if (esClimatech) {
      // Paso 2: Generar resumen de la noticia
      const resumen = await ollamaLLM.complete({
        prompt: `Leé el siguiente texto de una noticia y escribí un resumen claro en no más de 5 líneas:\n\n${texto}`,
      });

      console.log("📝 Resumen generado:", resumen);

      // Paso 3: Buscar newsletters relacionados
      console.log("📥 Antes de buscar newsletters relacionados");
      const newslettersRelacionados = await buscarNewslettersRelacionados(resumen);
      console.log("📤 Después de buscar newsletters relacionados");

      if (newslettersRelacionados.length > 0) {
        const titulos = newslettersRelacionados.map(nl => `- ${nl.titulo}`).join('\n');
        return `✅ Es una noticia sobre Climatech.\n\n📝 Resumen:\n${resumen}\n\n📧 Newsletters relacionados:\n${titulos}`;
      } else {
        return `✅ Es una noticia sobre Climatech.\n\n📝 Resumen:\n${resumen}\n\n⚠️ No hay ningún newsletter con su misma temática.`;
      }
    } else {
      // Paso 4: Si no es Climatech, indicar el tema principal
      const temaPrincipal = await ollamaLLM.complete({
        prompt: `Leé el siguiente texto de una noticia y decí cuál es su tema principal:\n\n${texto}`
      });

      return `❌ No es una noticia sobre Climatech. Tema principal: ${temaPrincipal}`;
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


// Mensaje de bienvenida
const mensajeBienvenida = `
🌱 Soy un asistente que analiza noticias.
Pegá el link de una noticia y te digo si trata sobre Climatech o no.
Escribí 'exit' para salir.
`;


// Iniciar el chat
empezarChat(elagente, mensajeBienvenida);

// -------------------
// TEST: Ejecutar búsqueda de newsletters manualmente
// -------------------

{/*(async () => {
  const resumenDePrueba = `
  El ministro de Desregulación, Federico Sturzenegger, criticó duramente a los diputados que votaron contra el Gobierno en la Cámara baja, acusándolos de fomentar la corrupción al oponerse a la eliminación de organismos públicos como Vialidad, que, según él, es un foco histórico de irregularidades. Apuntó especialmente contra la Coalición Cívica, aliada del kirchnerismo en esta votación, y cuestionó su postura como incoherente con su lucha contra la corrupción. Afirmó que el presidente Milei busca desmantelar estructuras estatales diseñadas para el robo de fondos públicos, mientras que los legisladores opositores actúan para conservar esos “curros”.

  `;

  const respuesta = await evaluarNoticiaTool.execute({ texto: resumenDePrueba });
  console.log("Respuesta:", respuesta);
  if (respuesta) {
    console.log("🧪 Ejecutando test con resumen de prueba:");
    const relacionados = await buscarNewslettersRelacionados(resumenDePrueba);
  
    console.log("✅ Resultado de buscarNewslettersRelacionados:");
    console.dir(relacionados, { depth: null });
  }
  else{
    console.log("la noticia no es climatech")
  }

})();*/}

//quizas comparar por palbras claves y no solo por resuemen paera que sea mas especifico. 


