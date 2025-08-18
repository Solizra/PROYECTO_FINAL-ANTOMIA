import { Router } from 'express';
import TrendsService from '../Services/Trends-services.js';

const router = Router();
const svc = new TrendsService();

router.post('', async (req, res) => {
  try {
    const created = await svc.createAsync(req.body || {});
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
    const deleted = await svc.deleteAsync(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'No encontrado' });
    res.status(200).json({ message: 'Trend eliminado' });
  } catch (e) {
    console.error('Error eliminando Trend:', e);
    res.status(500).json({ error: 'Error interno' });
  }
});



export default router;


