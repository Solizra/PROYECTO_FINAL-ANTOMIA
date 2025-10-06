import { Router } from 'express';
import TrendsService from '../Services/Trends-services.js';
import eventBus from '../EventBus.js';

const router = Router();
const svc = new TrendsService();

router.post('', async (req, res) => {
  try {
    // Coaccionar tipos básicos por seguridad
    const b = req.body || {};
    const norm = {
      id_newsletter: b.id_newsletter,
      Título_del_Trend: b.Título_del_Trend,
      Link_del_Trend: b.Link_del_Trend,
      Nombre_Newsletter_Relacionado: b.Nombre_Newsletter_Relacionado,
      Fecha_Relación: b.Fecha_Relación,
      Relacionado: b.Relacionado,
      Analisis_relacion: b.Analisis_relacion
    };
    const created = await svc.createAsync(norm);
    res.status(201).json(created);
  } catch (e) {
    console.error('Error creando Trend:', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const data = await svc.getByIdAsync(req.params.id);
    if (!data) return res.status(404).json({ error: 'No encontrado' });
    res.status(200).json(data);
  } catch (e) {
    console.error('Error obteniendo Trend:', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.get('', async (req, res) => {
  try {
    const data = await svc.listAsync(req.query);
    res.status(200).json(data);
  } catch (e) {
    console.error('Error listando Trends:', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    // Antes de borrar, recuperar el trend para registrar blacklist
    const trend = await svc.getByIdAsync(req.params.id);
    const deleted = await svc.deleteAsync(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'No encontrado' });
    // Registrar en blacklist para no volver a mostrarlo por SSE ni en UI
    try {
      if (trend) {
        eventBus.addToBlacklist(trend?.Link_del_Trend || '', trend?.id_newsletter ?? null);
      }
    } catch {}
    res.status(200).json({ message: 'Trend eliminado' });
  } catch (e) {
    console.error('Error eliminando Trend:', e);
    res.status(500).json({ error: 'Error interno' });
  }
});



export default router;


