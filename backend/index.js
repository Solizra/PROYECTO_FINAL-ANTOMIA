import 'dotenv/config';
import express from "express";
import cors from "cors";
import NewsletterRouter from './Controllers/Newsletter-controller.js'
import { analizarNoticiaEstructurada } from './Agent/main.js';
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Definición de rutas principales (cada una con su controlador y servicio detrás)
app.use('/api/Newsletter', NewsletterRouter); // http://localhost:3000/api/Newsletter

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

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
