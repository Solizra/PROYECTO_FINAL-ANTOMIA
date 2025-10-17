import { Router } from 'express';
import NewsletterService from '../Services/Newsletter-services.js';
import { extraerContenidoNoticia, generarResumenIA } from '../Agent/main.js';
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

router.put('/:id/resumen', async (req, res) => {
  try {
    const { id } = req.params;
    const { Resumen } = req.body || {};
    if (Resumen !== null && Resumen !== undefined && typeof Resumen !== 'string') {
      return res.status(400).json({ error: '"Resumen" debe ser string o null' });
    }
    const updated = await svc.updateResumenByIdOrLinkAsync({ id, Resumen: Resumen ?? null });
    if (!updated) return res.status(404).json({ error: 'Newsletter no encontrado' });
    res.status(200).json({ message: '✅ Resumen actualizado', data: updated });
  } catch (e) {
    console.error('❌ Error actualizando resumen:', e);
    res.status(500).json({ error: 'Error interno del servidor', details: e.message });
  }
});

// Alternativa con query: PUT /api/Newsletter/resumen?id=123
router.put('/resumen', async (req, res) => {
  try {
    const { id, link } = req.query || {};
    const { Resumen } = req.body || {};
    if (!id && !link) return res.status(400).json({ error: 'Parámetro "id" o "link" requerido' });
    if (Resumen !== null && Resumen !== undefined && typeof Resumen !== 'string') {
      return res.status(400).json({ error: '"Resumen" debe ser string o null' });
    }
    const updated = await svc.updateResumenByIdOrLinkAsync({ id, link, Resumen: Resumen ?? null });
    if (!updated) return res.status(404).json({ error: 'Newsletter no encontrado' });
    res.status(200).json({ message: '✅ Resumen actualizado', data: updated });
  } catch (e) {
    console.error('❌ Error actualizando resumen (query):', e);
    res.status(500).json({ error: 'Error interno del servidor', details: e.message });
  }
});

router.post('', async (req, res) => {
  try {
    const { link } = req.body || {};
    if (!link || typeof link !== 'string') {
      return res.status(400).json({ error: 'Falta el campo "link" en el body.' });
    }
    const ALLOWED_PREFIX = 'https://pulsobyantom.substack.com/p';
    if (!link.startsWith(ALLOWED_PREFIX)) {
      return res.status(400).json({ error: `El link debe ser un newsletter válido de Pulso by Antom (${ALLOWED_PREFIX}...)` });
    }
    // Chequear duplicado exacto
    const exists = await svc.existsByLink(link);
    if (exists) {
      return res.status(409).json({ message: '⛔ El newsletter ya existe', data: exists });
    }
    // Usar funciones ligeras del agente: extraer HTML y resumir (sin clasificación ni comparación)
    let titulo = '';
    let Resumen = '';
    try {
      const extraido = await extraerContenidoNoticia(link);
      titulo = extraido?.titulo || '';
      const contenido = extraido?.contenido || '';
      Resumen = contenido ? await generarResumenIA(contenido) : '';
    } catch (agentErr) {
      console.warn('⚠️ No se pudo extraer título/resumen con funciones ligeras:', agentErr?.message || agentErr);
    }

    const created = await svc.createAsync({ link, titulo, Resumen });
    // Si el repositorio igualmente devuelve duplicated por carrera
    if (created && created.duplicated) {
      return res.status(409).json({ message: '⛔ El newsletter ya existe', data: created.data });
    }
    return res.status(201).json({ message: '✅ Newsletter agregado', data: created });
  } catch (e) {
    console.error('❌ Error en Newsletter-controller.createAsync:', e);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: e.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ok = await svc.deleteAsync(id);
    if (!ok) return res.status(404).json({ error: 'Newsletter no encontrado' });
    return res.status(200).json({ message: '🗑️ Newsletter eliminado' });
  } catch (e) {
    console.error('❌ Error en Newsletter-controller.deleteAsync:', e);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: e.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.delete('', async (req, res) => {
  try {
    const { id, link } = req.query || {};
    if (!id && !link) return res.status(400).json({ error: 'Parámetro "id" o "link" requerido' });
    const ok = await svc.deleteByIdOrLink({ id, link });
    if (!ok) return res.status(404).json({ error: 'Newsletter no encontrado' });
    return res.status(200).json({ message: '🗑️ Newsletter eliminado' });
  } catch (e) {
    console.error('❌ Error en Newsletter-controller.deleteAsync (query):', e);
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
    console.log('🔍 Resultado del análisis:', {
      esClimatech: resultado.esClimatech,
      url: resultado.url,
      titulo: resultado.titulo,
      newslettersRelacionados: resultado.newslettersRelacionados?.length || 0,
      motivoSinRelacion: resultado.motivoSinRelacion
    });

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
        const created = await trendsSvc.createAsync(payload); // devuelve fila completa o { duplicated: true }
        if (!created?.duplicated) {
          // Preferir valores devueltos por BDD (normalizados) si existen
          inserts.push({
            id: created?.id,
            id_newsletter: created?.id_newsletter ?? payload.id_newsletter,
            Título_del_Trend: created?.['Título_del_Trend'] ?? payload.Título_del_Trend,
            Link_del_Trend: created?.['Link_del_Trend'] ?? payload.Link_del_Trend,
            Nombre_Newsletter_Relacionado: created?.['Nombre_Newsletter_Relacionado'] ?? payload.Nombre_Newsletter_Relacionado,
            Fecha_Relación: created?.['Fecha_Relación'] ?? payload.Fecha_Relación,
            Relacionado: created?.['Relacionado'] ?? payload.Relacionado,
            Analisis_relacion: created?.['Analisis_relacion'] ?? payload.Analisis_relacion,
            newsletterLink: nl.link || ''
          });
        } else {
          console.log('⛔ Relación duplicada evitada (controller):', payload.Link_del_Trend, payload.id_newsletter, payload.Nombre_Newsletter_Relacionado);
        }
      }
    } else if (resultado.esClimatech && tieneLinkValido) {
      const payload = {
        id_newsletter: null,
        Título_del_Trend: resultado.titulo || '',
        Link_del_Trend: resultado.url || '',
        Nombre_Newsletter_Relacionado: '',
        Fecha_Relación: new Date().toISOString(),
        Relacionado: false,
        Analisis_relacion: (resultado.motivoSinRelacion || '').trim() || 'Sin newsletter relacionado, pero clasificado como Climatech',
      };
      console.log('📝 Insert payload (relacionado=false):', payload);
      const created = await trendsSvc.createAsync(payload); // devuelve fila completa
      inserts.push({
        id: created?.id,
        id_newsletter: created?.id_newsletter ?? payload.id_newsletter,
        Título_del_Trend: created?.['Título_del_Trend'] ?? payload.Título_del_Trend,
        Link_del_Trend: created?.['Link_del_Trend'] ?? payload.Link_del_Trend,
        Nombre_Newsletter_Relacionado: created?.['Nombre_Newsletter_Relacionado'] ?? payload.Nombre_Newsletter_Relacionado,
        Fecha_Relación: created?.['Fecha_Relación'] ?? payload.Fecha_Relación,
        Relacionado: created?.['Relacionado'] ?? payload.Relacionado,
        Analisis_relacion: created?.['Analisis_relacion'] ?? payload.Analisis_relacion,
        newsletterLink: ''
      });
    }

    console.log('📊 Resultado final del controller:', {
      insertsCount: inserts.length,
      inserts: inserts.map(i => ({ id: i.id, titulo: i.Título_del_Trend, relacionado: i.Relacionado }))
    });

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