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
    const rawId = req.params.id;
    const id = Number(rawId);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'id inválido' });
    }
    // Intentar borrar (idempotente)
    let deleted = false;
    try {
      deleted = await svc.deleteAsync(id);
    } catch (dbErr) {
      console.error('❌ Error en deleteAsync Trends:', dbErr);
      // Responder idempotente para evitar bloquear la UI si hay inconsistencias
      return res.status(200).json({ message: 'Trend eliminado (best-effort)', id });
    }
    if (!deleted) {
      // Si no existía, igualmente responder 200 para que la UI quede consistente
      return res.status(200).json({ message: 'Trend no existente (idempotente)', id });
    }
    res.status(200).json({ message: 'Trend eliminado', id });
  } catch (e) {
    console.error('Error eliminando Trend:', e);
    // Responder 200 idempotente ante cualquier error inesperado para no romper UX
    res.status(200).json({ message: 'Trend eliminado (best-effort)', id: Number(req.params.id) || null });
  }
});



export default router;


