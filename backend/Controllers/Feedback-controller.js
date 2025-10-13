import { Router } from 'express';
import FeedbackService from '../Services/Feedback-service.js';
import eventBus from '../EventBus.js';

const router = Router();
const svc = new FeedbackService();

router.post('', async (req, res) => {
  try {
    const payload = req.body || {};
    const created = await svc.createAsync(payload);

    // Notificar al frontend/otros consumidores
    try {
      eventBus.broadcast({ type: 'feedback', data: created });
    } catch {}

    // Si es feedback negativo por mala relación, bloquear futuras apariciones del par
    try {
      const isDelete = String(created?.action || '').toLowerCase() === 'delete';
      const isBadRelation = String(created?.reason || '').toLowerCase() === 'bad_relation';
      const link = payload?.trendData?.trendLink || null;
      const newsletterId = payload?.trendData?.newsletterId ?? null;
      if (isDelete && isBadRelation && link) {
        eventBus.addToBlacklist(link, newsletterId);
      }
    } catch {}
    res.status(201).json(created);
  } catch (e) {
    console.error('Error creando Feedback:', e);
    res.status(400).json({ error: e?.message || 'Error creando feedback' });
  }
});

export default router;


