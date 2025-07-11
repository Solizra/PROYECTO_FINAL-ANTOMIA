import { Router } from 'express';
import NewsletterService from '../Services/Newsletter-services.js';
const router = Router();
const svc = new NewsletterService();

router.get('', async (req, res) => {
  try {
    const data = await svc.getAllAsync(req.query);
    res.status(200).json(data);
  } catch (e) {
    console.log(e);
    res.status(500).send('Error interno.');
  }
});


export default router;