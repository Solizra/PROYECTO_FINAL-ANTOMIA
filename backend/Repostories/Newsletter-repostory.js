import DBConfig from '../DBConfig.js';
import pkg from 'pg';
const { Client } = pkg;

export default class NewsletterRepository {
  getAllAsync = async ({ id, link, Resumen, titulo, page, limit }) => {
    let newsletters = [];
    const client = new Client(DBConfig);
    const offset = (page - 1) * (limit || 1);

    try {
      await client.connect();
      let sql = `
        SELECT id, link, "Resumen", titulo
        FROM "Newsletter"
        WHERE 1=1
      `;
      const params = [];

      if (id) {
        sql += ` AND id = $${params.length + 1}`;
        params.push(id);
      }
      if (link) {
        sql += ` AND link ILIKE $${params.length + 1}`;
        params.push(`%${link}%`);
      }
      if (Resumen) {
        sql += ` AND resumen ILIKE $${params.length + 1}`;
        params.push(`%${Resumen}%`);
      }
      if (titulo) {
        sql += ` AND titulo ILIKE $${params.length + 1}`;
        params.push(`%${titulo}%`);
      }

      sql += ` ORDER BY id DESC`;
      
      // CAMBIADO: Solo aplicar LIMIT y OFFSET si limit no es null
      if (limit !== null) {
        sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
      }

      const result = await client.query(sql, params);
      newsletters = result.rows;
    } catch (err) {
      console.error('Error al obtener newsletters:', err);
      throw err; // Re-lanzar el error para que el servicio lo maneje
    } finally {
      await client.end();
    }

    return newsletters;
  };
}
