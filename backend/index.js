import 'dotenv/config';
import express from "express";
import cors from "cors";
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import NewsletterRouter from './Controllers/Newsletter-controller.js'
import TrendsRouter from './Controllers/Trends-controller.js'
import { analizarNoticiaEstructurada } from './Agent/main.js';
import { iniciarProgramacionAutomatica } from './APIs/buscarNoticias.mjs';
const app = express();
const port = process.env.PORT || 3000;

// Ruta absoluta al archivo de URLs de noticias
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const noticiasFilePath = path.join(__dirname, 'APIs', 'noticias.json');

app.use(cors());
app.use(express.json());

// Definición de rutas principales (cada una con su controlador y servicio detrás)
app.use('/api/Newsletter', NewsletterRouter); // http://localhost:3000/api/Newsletter
app.use('/api/Trends', TrendsRouter); // http://localhost:3000/api/Trends

// Endpoint para obtener las últimas URLs de noticias guardadas por el scheduler
app.get('/api/news/latest', (req, res) => {
  try {
    if (!fs.existsSync(noticiasFilePath)) return res.status(200).json([]);
    const raw = fs.readFileSync(noticiasFilePath, 'utf8');
    const data = raw ? JSON.parse(raw) : [];
    res.status(200).json(data);
  } catch (e) {
    console.error('Error leyendo últimas noticias:', e);
    res.status(500).json({ error: 'Error leyendo últimas noticias' });
  }
});

// Ruta directa para análisis (redundante con el router, pero asegura disponibilidad)
app.post('/api/Newsletter/analizar', async (req, res) => {
  try {
    const { input } = req.body || {};
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'Falta el campo "input" (URL o texto) en el body.' });
    }
    const resultado = await analizarNoticiaEstructurada(input);
    res.status(200).json(resultado);
  } catch (e) {
    console.error('Error en /api/Newsletter/analizar (index):', e);
    res.status(500).json({ error: e?.message || 'Error interno.' });
  }
});

// SSE deshabilitado para evitar errores; el frontend actualiza por intervalo de 60s

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  // Iniciar scheduler que busca noticias y las procesa con el agente automáticamente
  try {
    iniciarProgramacionAutomatica();
  } catch (e) {
    console.error('Error iniciando la programación automática:', e);
  }
});
