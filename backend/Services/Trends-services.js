import TrendsRepository from '../Repostories/Trends-repostory.js';

export default class TrendsService {
  constructor() {
    this.repo = new TrendsRepository();
  }

  async createAsync(payload) {
    return await this.repo.createAsync(payload);
  }

  async getByIdAsync(id) {
    return await this.repo.getByIdAsync(id);
  }

  async listAsync(query = {}) {
    const { page = 1, limit = 20 } = query;
    return await this.repo.listAsync({ page, limit });
  }
}


