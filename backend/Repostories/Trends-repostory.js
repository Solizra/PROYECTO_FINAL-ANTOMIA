import DBConfig from '../DBConfig.js';
import pkg from 'pg';
const { Client } = pkg;

export default class TrendsRepository {
  async createAsync(record) {
    const client = new Client(DBConfig);
    try {
      await client.connect();
      const sql = `
        INSERT INTO "Trends" (
          "id_newsletter",
          "Título_del_Trend",
          "Link_del_Trend",
          "Nombre_Newsletter_Relacionado",
          "Fecha_Relación",
          "Relacionado",
          "Analisis_relacion"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING "id";
      `;
      const params = [
        record.id_newsletter ?? null,
        record.Título_del_Trend ?? '',
        record.Link_del_Trend ?? '',
        record.Nombre_Newsletter_Relacionado ?? '',
        record.Fecha_Relación ?? new Date().toISOString(),
        record.Relacionado === true,
        record.Analisis_relacion ?? ''
      ];
      const result = await client.query(sql, params);
      return { id: result.rows[0]?.id };
    } catch (err) {
      console.error('Error insertando en Trends:', err);
      throw err;
    } finally {
      await client.end();
    }
  }

  async getByIdAsync(id) {
    const client = new Client(DBConfig);
    try {
      await client.connect();
      const sql = `
        SELECT "id", "id_newsletter", "Título_del_Trend", "Link_del_Trend",
               "Nombre_Newsletter_Relacionado", "Fecha_Relación", "Relacionado", "Analisis_relacion"
        FROM "Trends"
        WHERE "id" = $1
      `;
      const result = await client.query(sql, [id]);
      return result.rows[0] || null;
    } catch (err) {
      console.error('Error obteniendo Trend por id:', err);
      throw err;
    } finally {
      await client.end();
    }
  }

  async listAsync({ page = 1, limit = 20 } = {}) {
    const client = new Client(DBConfig);
    const offset = (page - 1) * limit;
    try {
      await client.connect();
      const sql = `
        SELECT "id", "id_newsletter", "Título_del_Trend", "Link_del_Trend",
               "Nombre_Newsletter_Relacionado", "Fecha_Relación", "Relacionado", "Analisis_relacion"
        FROM "Trends"
        ORDER BY "id" DESC
        LIMIT $1 OFFSET $2
      `;
      const result = await client.query(sql, [limit, offset]);
      return result.rows;
    } catch (err) {
      console.error('Error listando Trends:', err);
      throw err;
    } finally {
      await client.end();
    }
  }

  async deleteAsync(id) {
    const client = new Client(DBConfig);
    try {
      await client.connect();
      const sql = `DELETE FROM "Trends" WHERE "id" = $1 RETURNING "id";`;
      const result = await client.query(sql, [id]);
      return result.rowCount > 0; // true si se borró, false si no existía
    } catch (err) {
      console.error('Error eliminando Trend:', err);
      throw err;
    } finally {
      await client.end();
    }
  }
  
  
}


