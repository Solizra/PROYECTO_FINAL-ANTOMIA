import NewsletterRepostory from '../Repostories/Newsletter-repostory.js'; 

export default class NewsletterService {
  getAllAsync = async (query) => {
    try {
      const repo = new NewsletterRepostory();
      // CAMBIADO: limit = null para traer TODOS los newsletters por defecto
      const { id, link, Resumen, titulo, page = 1, limit = null } = query;
      const events = await repo.getAllAsync({ id, link, Resumen, titulo, page, limit });
      return events;
    } catch (error) {
      console.error('Error en NewsletterService.getAllAsync:', error);
      throw error;
    }
  };

  createOrIgnoreAsync = async ({ link, Resumen, titulo }) => {
    try {
      const repo = new NewsletterRepostory();
      if (!link || typeof link !== 'string') {
        throw new Error('link requerido');
      }
      const created = await repo.createOrIgnoreAsync({ link, Resumen, titulo });
      return created;
    } catch (error) {
      console.error('Error en NewsletterService.createOrIgnoreAsync:', error);
      throw error;
    }
  };
}