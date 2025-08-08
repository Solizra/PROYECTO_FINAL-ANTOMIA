import { Ollama } from "@llamaindex/ollama";
import fetch from 'node-fetch';

// Configuración del LLM
const ollamaLLM = new Ollama({
  model: "qwen3:1.7b",
  temperature: 0.3,
  timeout: 4 * 60 * 1000,
});

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
    console.log('Newsletters disponibles:', newsletters.map(nl => nl.titulo));
    
    return newsletters;
  } catch (error) {
    console.error(`❌ Error obteniendo newsletters: ${error.message}`);
    return [];
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

    const respuesta = await ollamaLLM.complete({
      prompt: prompt,
      temperature: 0.1,
    });

    const respuestaProcesada = procesarRespuestaLLM(respuesta);
    const esClimatech = respuestaProcesada.toLowerCase().includes('sí') || 
                       respuestaProcesada.toLowerCase().includes('si') ||
                       respuestaProcesada.toLowerCase().includes('yes');
    
    console.log(`✅ Evaluación: ${esClimatech ? 'SÍ es Climatech' : 'NO es Climatech'}`);
    console.log(`🧠 Respuesta del modelo: "${respuestaProcesada}"`);
    
    return esClimatech;
  } catch (error) {
    console.error(`❌ Error evaluando Climatech: ${error.message}`);
    return false;
  }
}

// Función para generar resumen
async function generarResumen(contenido) {
  try {
    console.log(`📝 Generando resumen...`);
    
    const prompt = `
Analiza el siguiente contenido de una noticia y genera un resumen claro y conciso en máximo 3 líneas:

${contenido}

Resumen:`;

    const respuesta = await ollamaLLM.complete({
      prompt: prompt,
      temperature: 0.2,
    });

    const resumen = procesarRespuestaLLM(respuesta);
    console.log(`✅ Resumen generado: ${resumen}`);
    
    return resumen;
  } catch (error) {
    console.error(`❌ Error generando resumen: ${error.message}`);
    return 'No se pudo generar el resumen.';
  }
}

// Función para comparar con newsletters
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

    const respuesta = await ollamaLLM.complete({
      prompt: prompt,
      temperature: 0.1,
    });

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

// Test principal
async function testAgente() {
  console.log('🧪 INICIANDO PRUEBA DEL AGENTE');
  console.log('================================\n');

  // Test 1: Noticia sobre Climatech
  console.log('📰 TEST 1: Noticia sobre energías renovables');
  const noticiaClimatech = `
  Tesla ha anunciado una nueva inversión de $2.5 mil millones en una planta de baterías solares en Texas. 
  La instalación producirá baterías de litio para vehículos eléctricos y sistemas de almacenamiento de energía renovable. 
  Esta inversión creará 3,000 empleos y ayudará a acelerar la transición hacia energías limpias en Estados Unidos.
  `;

  console.log('Contenido de la noticia:', noticiaClimatech);

  // PASO 1: Determinar si es Climatech
  const esClimatech = await determinarSiEsClimatech(noticiaClimatech);
  
  if (esClimatech) {
    // PASO 2: Generar resumen
    const resumen = await generarResumen(noticiaClimatech);
    
    // PASO 3: Obtener newsletters de BDD
    const newsletters = await obtenerNewslettersBDD();
    
    // PASO 4: Comparar y encontrar coincidencias
    const newslettersRelacionados = await compararConNewsletters(resumen, newsletters);
    
    console.log('\n📊 RESULTADOS DEL TEST 1:');
    console.log('==========================');
    console.log(`✅ Es Climatech: ${esClimatech}`);
    console.log(`📝 Resumen: ${resumen}`);
    console.log(`📧 Newsletters relacionados: ${newslettersRelacionados.length}`);
    newslettersRelacionados.forEach((nl, index) => {
      console.log(`   ${index + 1}. ${nl.titulo}`);
    });
  } else {
    console.log('\n❌ La noticia no fue clasificada como Climatech');
  }

  console.log('\n' + '='.repeat(50));
  
  // Test 2: Noticia NO sobre Climatech
  console.log('\n📰 TEST 2: Noticia sobre deportes');
  const noticiaNoClimatech = `
  Lionel Messi ha firmado un nuevo contrato con el Inter Miami por $50 millones anuales. 
  El jugador argentino continuará en la MLS por dos temporadas más, con opción de extensión. 
  Esta renovación confirma su compromiso con el proyecto deportivo del club estadounidense.
  `;

  console.log('Contenido de la noticia:', noticiaNoClimatech);

  const esClimatech2 = await determinarSiEsClimatech(noticiaNoClimatech);
  console.log(`\n📊 RESULTADO TEST 2: ${esClimatech2 ? 'SÍ es Climatech' : 'NO es Climatech'}`);

  console.log('\n✅ PRUEBA COMPLETADA');
}

// Ejecutar test
testAgente().catch(console.error);
