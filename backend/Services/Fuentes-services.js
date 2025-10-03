import FuentesRepository from '../Repostories/Fuentes-repostory.js';

export default class FuentesService {
  constructor() {
    this.repo = new FuentesRepository();
  }

  async getTrustedDomainsAsync() {
    const rows = await this.repo.listAsync();
    const domains = rows.filter(r => r.activo === true).map(r => r.dominio);
    if (!Array.isArray(domains) || domains.length === 0) {
      return [
        'reuters.com', 'bloomberg.com', 'ft.com', 'wsj.com', 'bbc.com',
        'techcrunch.com', 'wired.com', 'theverge.com', 'mit.edu', 'nature.com', 'science.org',
        'elpais.com', 'elconfidencial.com', 'infobae.com'
      ];
    }
    return domains;
  }

  async listAsync() {
    return await this.repo.listAsync();
  }

  async addAsync({ dominio, categoria }) {
    return await this.repo.addAsync({ dominio, categoria });
  }

  async deactivateAsync(dominio) {
    return await this.repo.deactivateAsync(dominio);
  }
}


