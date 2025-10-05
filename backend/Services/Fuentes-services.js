import FuentesRepository from '../Repostories/Fuentes-repostory.js';

export default class FuentesService {
  constructor() {
    this.repo = new FuentesRepository();
  }

  async getTrustedDomainsAsync() {
    try {
      const rows = await this.repo.listAsync();
      const domains = rows.filter(r => r.activo === true).map(r => r.dominio).filter(Boolean);
      if (!Array.isArray(domains) || domains.length === 0) {
        return [
          'reuters.com', 'bloomberg.com', 'ft.com', 'wsj.com', 'bbc.com',
          'techcrunch.com', 'wired.com', 'theverge.com', 'mit.edu', 'nature.com', 'science.org',
          'elpais.com', 'elconfidencial.com', 'infobae.com'
        ];
      }
      return domains;
    } catch (e) {
      // Fallback si la tabla aún no existe o hay un esquema distinto
      return [
        'reuters.com', 'bloomberg.com', 'ft.com', 'wsj.com', 'bbc.com',
        'techcrunch.com', 'wired.com', 'theverge.com', 'mit.edu', 'nature.com', 'science.org',
        'elpais.com', 'elconfidencial.com', 'infobae.com'
      ];
    }
  }

  async listAsync() {
    try {
      return await this.repo.listAsync();
    } catch (e) {
      // Si falla (tabla ausente/permiso), devolver lista vacía para no romper el frontend
      return [];
    }
  }

  async addAsync({ dominio, categoria }) {
    return await this.repo.addAsync({ dominio, categoria });
  }

  async deactivateAsync(dominio) {
    return await this.repo.deactivateAsync(dominio);
  }
}


