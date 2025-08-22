import NewsletterRepostory from '../Repostories/Newsletter-repostory.js'; 

export default class NewsletterService {
  getAllAsync = async (query) => {
    try {
      const repo = new NewsletterRepostory();
      const { id, link, Resumen, titulo, page = 1, limit = 10 } = query;
      const events = await repo.getAllAsync({ id, link, Resumen, titulo, page, limit });
      return events;
    } catch (error) {
      console.error('Error en NewsletterService.getAllAsync:', error);
      throw error;
    }
  };
}