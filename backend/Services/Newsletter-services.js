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

  existsByLink = async (link) => {
    try {
      const repo = new NewsletterRepostory();
      if (!link || typeof link !== 'string') return null;
      return await repo.existsByLinkExact(link);
    } catch (error) {
      console.error('Error en NewsletterService.existsByLink:', error);
      throw error;
    }
  };

  createAsync = async (payload) => {
    try {
      const repo = new NewsletterRepostory();
      const { link } = payload || {};
      if (!link || typeof link !== 'string') {
        throw new Error('Falta el campo "link"');
      }
      return await repo.createAsync({ link });
    } catch (error) {
      console.error('Error en NewsletterService.createAsync:', error);
      throw error;
    }
  };
}