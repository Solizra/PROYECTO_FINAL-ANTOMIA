import DBConfig from '../DBConfig.js';
import pkg from 'pg';
const { Client } = pkg;

export default class NewsletterRepository {
  getAllAsync = async ({ id, link, Resumen, titulo, page, limit }) => {
    let newsletters = [];
    const client = new Client(DBConfig);
    
    // Si el límite es muy alto (>1000), ignorar paginación y traer todos
    const usePagination = limit && limit <= 1000;
    const offset = usePagination ? (page - 1) * limit : 0;

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
        // Columna tiene comillas mayúsculas en el esquema: "Resumen"
        sql += ` AND "Resumen" ILIKE $${params.length + 1}`;
        params.push(`%${Resumen}%`);
      }
      if (titulo) {
        sql += ` AND titulo ILIKE $${params.length + 1}`;
        params.push(`%${titulo}%`);
      }

      sql += ` ORDER BY id DESC`;
      
      // Solo aplicar LIMIT y OFFSET si se usa paginación
      if (usePagination) {
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

  existsByLinkExact = async (link) => {
    const client = new Client(DBConfig);
    try {
      await client.connect();
      const sql = `
        SELECT id, link, "Resumen", titulo
        FROM "Newsletter"
        WHERE link = $1
        LIMIT 1
      `;
      const result = await client.query(sql, [link]);
      return result.rows?.[0] || null;
    } catch (err) {
      console.error('Error comprobando existencia de newsletter por link:', err);
      throw err;
    } finally {
      await client.end();
    }
  };

  createAsync = async ({ link }) => {
    if (!link || typeof link !== 'string') {
      throw new Error('El campo "link" es obligatorio');
    }

    const client = new Client(DBConfig);
    try {
      await client.connect();
      // Verificar duplicado exacto antes de insertar
      const existing = await client.query(
        'SELECT id, link, "Resumen", titulo FROM "Newsletter" WHERE link = $1 LIMIT 1',
        [link]
      );
      if (existing.rows && existing.rows.length > 0) {
        return { duplicated: true, data: existing.rows[0] };
      }
      const sql = `
        INSERT INTO "Newsletter" (link)
        VALUES ($1)
        RETURNING id, link, "Resumen", titulo
      `;
      const params = [link];
      const result = await client.query(sql, params);
      return result.rows?.[0] || null;
    } catch (err) {
      console.error('Error al crear newsletter:', err);
      throw err;
    } finally {
      await client.end();
    }
  };
}
