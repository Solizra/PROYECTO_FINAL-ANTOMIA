import { createInterface } from "readline";

function imprimirMensaje(mensaje) {
  console.log(mensaje);
}

// Formateador de respuestas mejorado
function formatResponse(response) {
  // Si la respuesta es un objeto con estructura específica
  if (response && typeof response === 'object' && response.mensaje) {
    return response.mensaje;
  }
  
  // Si la respuesta es un string directo
  if (typeof response === 'string') {
    return response;
  }
  
  // Si la respuesta tiene la estructura data.result
  if (response && response.data && response.data.result) {
    return `📝 Respuesta:\n${response.data.result}`;
  }
  
  // Respuesta por defecto
  return `📝 Respuesta:\n${JSON.stringify(response, null, 2)}`;
}

const mensajeBienvenidaDefault = `
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
`

async function empezarChat(elAgente, mensajeBienvenida = ''){
  try {
    imprimirMensaje(mensajeBienvenida || mensajeBienvenidaDefault);
    
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout
      });

    for await (const pregunta of rl) {
      if (pregunta.toLowerCase() === 'exit') {
        imprimirMensaje("\n👋 ¡Chau! ¡Gracias por usar el asistente!");
        rl.close();
        process.exit(0);
      }

      if (pregunta.trim() === '') {
        imprimirMensaje("\n❓ Por favor, ingresa un link de noticia o escribe 'exit' para salir.");
        continue;
      }

      const start = Date.now();
      
      try {
        const respuesta = await elAgente.run(pregunta);
        const end = Date.now();

        imprimirMensaje(formatResponse(respuesta));
        imprimirMensaje(`\n⏱️  Tiempo de respuesta: ${((end - start) / 1000).toFixed(2)} segundos`);
        imprimirMensaje("\n❓ ¿Qué más querés saber?");
      } catch (error) {
        console.error("\n❌ Error procesando la solicitud:", error.message);
        imprimirMensaje("\n💡 Intenta con otro link o escribe 'exit' para salir.");
      }
    }
  } catch (error) {
    console.error("\n❌ Ups, algo salió mal:", error);
    process.exit(1);
  }
}

export { empezarChat };
