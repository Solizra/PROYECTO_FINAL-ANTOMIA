import { Router } from 'express';
import FuentesService from '../Services/Fuentes-services.js';

const router = Router();
const svc = new FuentesService();

router.get('', async (req, res) => {
  try {
    const rows = await svc.listAsync();
    res.status(200).json(rows);
  } catch (e) {
    console.error('Error obteniendo Fuentes:', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.post('', async (req, res) => {
  try {
    const { dominio, categoria } = req.body || {};
    if (!dominio || typeof dominio !== 'string') {
      return res.status(400).json({ error: 'Campo "dominio" requerido' });
    }
    const row = await svc.addAsync({ dominio, categoria });
    res.status(201).json(row);
  } catch (e) {
    console.error('Error agregando Fuente:', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.delete('', async (req, res) => {
  try {
    const { dominio } = req.query || {};
    if (!dominio || typeof dominio !== 'string') {
      return res.status(400).json({ error: 'Parámetro "dominio" requerido' });
    }
    const ok = await svc.deactivateAsync(dominio);
    if (!ok) return res.status(404).json({ error: 'No encontrado' });
    res.status(200).json({ message: 'Fuente desactivada' });
  } catch (e) {
    console.error('Error desactivando Fuente:', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;


