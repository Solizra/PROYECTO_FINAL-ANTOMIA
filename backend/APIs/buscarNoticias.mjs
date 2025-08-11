// buscarNoticias.mjs
import fetch from 'node-fetch';
import fs from 'fs';

// 🔐 Pegá tu clave acá
const API_KEY = '5cd26781b7d64a329de50c8899fc5eaa'; // 👈 reemplazar

// 🔍 Término que querés buscar
const query = 'AI OR climatech OR "inteligencia artificial" OR chatGPT OR MetaAI OR Antom.la';
const fromDate = '2025-08-01'; // hace 7 días
const sortBy = 'relevancy';
const language = 'es';

//NLP (categorizar por lenguaje natural)
const categorias = {
  inversion: ['financiación', 'inversión', 'capital', 'funding', 'venture', 'startup'],
  innovacion: ['nuevo', 'innovación', 'desarrollo', 'patente', 'tecnología', 'avance'],
  legislacion: ['ley', 'decreto', 'regulación', 'normativa', 'gobierno', 'política']
};

function categorizarNoticia(texto) {
  texto = texto.toLowerCase();

  for (const [categoria, palabras] of Object.entries(categorias)) {
    for (const palabra of palabras) {
      if (texto.includes(palabra)) {
        return categoria;
      }
    }
  }
  return 'sin_categoria';
}



async function buscarNoticias() {
  const url = `https://newsapi.org/v2/everything?` +
    `qInTitle=${encodeURIComponent(query)}` +
    `&from=${fromDate}` +
    `&language=${language}` +
    `&sortBy=${sortBy}` +
    `&apiKey=${API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "ok") {
    console.error("❌ Error al buscar noticias:", data);
    return;
  }

  console.log(`📰 Últimas noticias sobre "${query}":\n`);

  data.articles.forEach((articulo, i) => {
    const textoParaClasificar = (articulo.title || '') + ' ' + (articulo.description || '');
    const categoria = categorizarNoticia(textoParaClasificar);

    console.log(`🗞️ ${i + 1}. ${articulo.title}`);
    console.log(`📅 Fecha: ${articulo.publishedAt}`);
    console.log(`🔗 Link: ${articulo.url}`);
    console.log(`🏷️ Categoría: ${categoria}`);
    console.log('---');
  });

  // Guardar en archivo JSON (opcional)
  fs.writeFileSync('noticias.json', JSON.stringify(data.articles, null, 2));
  console.log('✅ Noticias guardadas en "noticias.json"');
}


buscarNoticias();
