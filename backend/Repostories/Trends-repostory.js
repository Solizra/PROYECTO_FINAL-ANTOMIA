import DBConfig from '../DBConfig.js';
import pkg from 'pg';
const { Client } = pkg;

export default class TrendsRepository {
  async createAsync(record) {
    const client = new Client(DBConfig);
    try {
      await client.connect();
      // Completar nombre de newsletter si viene vacío pero hay id_newsletter
      if ((!record.Nombre_Newsletter_Relacionado || record.Nombre_Newsletter_Relacionado.trim() === '') && record.id_newsletter != null) {
        try {
          const nlRes = await client.query('SELECT "titulo" FROM "Newsletter" WHERE "id" = $1 LIMIT 1', [record.id_newsletter]);
          const t = nlRes.rows?.[0]?.titulo;
          if (t) record.Nombre_Newsletter_Relacionado = t;
        } catch (e) {
          console.error('Error obteniendo titulo de Newsletter para completar nombre relacionado:', e);
        }
      }
      // Chequeo de duplicados: misma noticia (Link_del_Trend) y mismo newsletter (id_newsletter) y mismo flag Relacionado
      try {
        const checkSql = `
          SELECT "id"
          FROM "Trends"
          WHERE "Link_del_Trend" = $1::text
            AND ("Relacionado" = $4::boolean)
            AND (
              ($2::int IS NOT NULL AND "id_newsletter" = $2::int)
              OR (
                $2::int IS NULL AND $3::text <> '' AND lower(COALESCE("Nombre_Newsletter_Relacionado", '')) = lower($3::text)
              )
              OR (
                $2::int IS NULL AND $3::text = '' AND "id_newsletter" IS NULL AND COALESCE("Nombre_Newsletter_Relacionado", '') = ''
              )
            )
          LIMIT 1;
        `;
        const checkParams = [
          (record.Link_del_Trend ?? '').trim(),
          record.id_newsletter ?? null,
          (record.Nombre_Newsletter_Relacionado ?? '').trim(),
          record.Relacionado === true
        ];
        const existing = await client.query(checkSql, checkParams);
        if (existing.rows.length > 0) {
          return { id: existing.rows[0].id, duplicated: true };
        }
      } catch (dupErr) {
        console.error('Error comprobando duplicados en Trends:', dupErr);
      }
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
      // Devolver solo una fila por par (Link_del_Trend, id_newsletter), priorizando la más reciente
      // y excluir pares que estén en la blacklist de EventBus (si existe en proceso)
      const sql = `
        SELECT DISTINCT ON (t."Link_del_Trend", COALESCE(t."id_newsletter", -1))
               t."id", t."id_newsletter", t."Título_del_Trend", t."Link_del_Trend",
               t."Nombre_Newsletter_Relacionado", t."Fecha_Relación", t."Relacionado", t."Analisis_relacion"
        FROM "Trends" t
        ORDER BY t."Link_del_Trend", COALESCE(t."id_newsletter", -1), t."id" DESC
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


