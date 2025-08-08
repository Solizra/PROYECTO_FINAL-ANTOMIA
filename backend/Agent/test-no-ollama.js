import fetch from 'node-fetch';

// Palabras clave para detectar Climatech (copiadas del archivo principal)
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
    console.log('Newsletters disponibles:', newsletters.map(nl => nl.titulo));
    
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

// Test principal
async function testAgenteSinOllama() {
  console.log('🧪 INICIANDO PRUEBA DEL AGENTE (SIN OLLAMA)');
  console.log('=============================================\n');

  // Test 1: Noticia sobre Climatech
  console.log('📰 TEST 1: Noticia sobre energías renovables');
  const noticiaClimatech = `
  Tesla ha anunciado una nueva inversión de $2.5 mil millones en una planta de baterías solares en Texas. 
  La instalación producirá baterías de litio para vehículos eléctricos y sistemas de almacenamiento de energía renovable. 
  Esta inversión creará 3,000 empleos y ayudará a acelerar la transición hacia energías limpias en Estados Unidos.
  La empresa también implementará tecnologías de eficiencia energética y reducirá significativamente la huella de carbono.
  `;

  console.log('Contenido de la noticia:', noticiaClimatech);

  // PASO 1: Determinar si es Climatech
  const esClimatech = determinarSiEsClimatechLocal(noticiaClimatech);
  
  if (esClimatech) {
    // PASO 2: Generar resumen
    const resumen = generarResumenLocal(noticiaClimatech);
    
    // PASO 3: Obtener newsletters de BDD
    const newsletters = await obtenerNewslettersBDD();
    
    // PASO 4: Comparar y encontrar coincidencias
    const newslettersRelacionados = compararConNewslettersLocal(resumen, newsletters);
    
    console.log('\n📊 RESULTADOS DEL TEST 1:');
    console.log('==========================');
    console.log(`✅ Es Climatech: ${esClimatech}`);
    console.log(`📝 Resumen: ${resumen}`);
    console.log(`📧 Newsletters relacionados: ${newslettersRelacionados.length}`);
    newslettersRelacionados.forEach((nl, index) => {
      console.log(`   ${index + 1}. ${nl.titulo} (puntuación: ${nl.puntuacion})`);
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
  El delantero ha marcado 15 goles en su primera temporada con el equipo.
  `;

  console.log('Contenido de la noticia:', noticiaNoClimatech);

  const esClimatech2 = determinarSiEsClimatechLocal(noticiaNoClimatech);
  const temaPrincipal = determinarTemaPrincipalLocal(noticiaNoClimatech);
  console.log(`\n📊 RESULTADO TEST 2: ${esClimatech2 ? 'SÍ es Climatech' : 'NO es Climatech'}`);
  console.log(`📋 Tema principal: ${temaPrincipal}`);

  console.log('\n✅ PRUEBA COMPLETADA');
  console.log('\n🎯 VENTAJAS DE LA VERSIÓN SIN OLLAMA:');
  console.log('- ⚡ Respuesta instantánea (sin timeouts)');
  console.log('- 🔒 No requiere Ollama instalado');
  console.log('- 💰 Gratis (sin costos de API)');
  console.log('- 🛡️ Funciona offline');
  console.log('- 📊 Análisis transparente con puntuaciones');
}

// Ejecutar test
testAgenteSinOllama().catch(console.error);
