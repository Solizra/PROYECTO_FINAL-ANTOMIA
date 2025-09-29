import { Router } from 'express';
import NewsletterService from '../Services/Newsletter-services.js';
import { analizarNoticiaEstructurada } from '../Agent/main.js';
import TrendsService from '../Services/Trends-services.js';
const router = Router();
const svc = new NewsletterService();

router.get('', async (req, res) => {
  try {
    const data = await svc.getAllAsync(req.query);
    console.log(`📧 Newsletters obtenidos: ${data.length}`);
    res.status(200).json(data);
  } catch (e) {
    console.error('❌ Error en Newsletter-controller.getAllAsync:', e);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: e.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Analizar noticia con el agente (sin LLM)
router.post('/analizar', async (req, res) => {
  try {
    const { input } = req.body || {};
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'Falta el campo "input" (URL o texto) en el body.' });
    }
    const resultado = await analizarNoticiaEstructurada(input);

    // Guardado en BDD:
    // - Si esClimatech y link válido y hay relacionados -> guardar cada relación
    // - Si esClimatech y link válido y NO hay relacionados -> guardar una fila con Relacionado=false
    const trendsSvc = new TrendsService();
    const inserts = [];
    const tieneLinkValido = resultado.url && /^https?:\/\//i.test(resultado.url);
    if (resultado.esClimatech && tieneLinkValido && Array.isArray(resultado.newslettersRelacionados) && resultado.newslettersRelacionados.length > 0) {
      console.log(`📦 Preparando inserciones de relaciones (${resultado.newslettersRelacionados.length})`);
      for (const nl of resultado.newslettersRelacionados) {
        const payload = {
          id_newsletter: nl.id || null,
          Título_del_Trend: resultado.titulo || '',
          Link_del_Trend: resultado.url || '',
          Nombre_Newsletter_Relacionado: nl.titulo || '',
          Fecha_Relación: nl.fechaRelacion || new Date().toISOString(),
          Relacionado: true,
          Analisis_relacion: nl.analisisRelacion || '',
        };
        console.log('📝 Insert payload (relacionado=true):', payload);
        const created = await trendsSvc.createAsync(payload);
        inserts.push({ ...payload, id: created?.id, newsletterLink: nl.link || '' });
      }
    } else if (resultado.esClimatech && tieneLinkValido) {
      const payload = {
        id_newsletter: null,
        Título_del_Trend: resultado.titulo || '',
        Link_del_Trend: resultado.url || '',
        Nombre_Newsletter_Relacionado: '',
        Fecha_Relación: new Date().toISOString(),
        Relacionado: false,
        Analisis_relacion: resultado.analisisSinRelacion || 'Sin newsletter relacionado, pero clasificado como Climatech',
      };
      console.log('📝 Insert payload (relacionado=false):', payload);
      const created = await trendsSvc.createAsync(payload);
      inserts.push({ ...payload, id: created?.id, newsletterLink: '' });
    }

    res.status(200).json({
      ...resultado,
      inserts
    });
  } catch (e) {
    console.error('Error en /api/Newsletter/analizar:', e);
    res.status(500).json({ error: e?.message || 'Error interno.' });
  }
});


export default router;