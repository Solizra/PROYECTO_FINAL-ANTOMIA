import DBConfig from '../DBConfig.js';
import pkg from 'pg';
const { Client } = pkg;

export default class TrendsRepository {
  async createAsync(record) {
    const client = new Client(DBConfig);
    try {
      await client.connect();
      // Normalización y coerción de payload para evitar valores incorrectos en BDD
      const coerceBoolean = (v) => {
        if (typeof v === 'boolean') return v;
        if (typeof v === 'number') return v !== 0;
        const s = String(v || '').trim().toLowerCase();
        return s === 'true' || s === '1' || s === 'si' || s === 'sí' || s === 'yes';
      };
      const coerceIntOrNull = (v) => {
        const n = Number(v);
        return Number.isInteger(n) ? n : null;
      };
      const safeText = (v) => String(v ?? '').trim();
      const safeDateISO = (v) => {
        try {
          const d = v ? new Date(v) : new Date();
          const t = d.getTime();
          if (Number.isFinite(t)) return new Date(t).toISOString();
          return new Date().toISOString();
        } catch {
          return new Date().toISOString();
        }
      };

      // Construir un registro saneado para uso interno
      const clean = {
        id_newsletter: coerceIntOrNull(record.id_newsletter),
        Título_del_Trend: safeText(record.Título_del_Trend),
        Link_del_Trend: safeText(record.Link_del_Trend),
        Nombre_Newsletter_Relacionado: safeText(record.Nombre_Newsletter_Relacionado),
        Fecha_Relación: safeDateISO(record.Fecha_Relación),
        Relacionado: coerceBoolean(record.Relacionado),
        Analisis_relacion: safeText(record.Analisis_relacion)
      };
      // Completar nombre de newsletter si viene vacío pero hay id_newsletter
      if ((!clean.Nombre_Newsletter_Relacionado || clean.Nombre_Newsletter_Relacionado.trim() === '') && clean.id_newsletter != null) {
        try {
          const nlRes = await client.query('SELECT "titulo" FROM "Newsletter" WHERE "id" = $1 LIMIT 1', [clean.id_newsletter]);
          const t = nlRes.rows?.[0]?.titulo;
          if (t) clean.Nombre_Newsletter_Relacionado = t;
        } catch (e) {
          console.error('Error obteniendo titulo de Newsletter para completar nombre relacionado:', e);
        }
      }
      // Chequeo de duplicados: misma noticia (Link_del_Trend) y mismo newsletter (id_newsletter o nombre relacionado)
      // Nota: NO consideramos el flag "Relacionado" para evitar duplicados con distinto valor del flag
      try {
        const checkSql = `
          SELECT "id"
          FROM "Trends"
          WHERE lower("Link_del_Trend") = lower($1::text)
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
          clean.Link_del_Trend,
          clean.id_newsletter,
          clean.Nombre_Newsletter_Relacionado
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
        RETURNING "id", "id_newsletter", "Título_del_Trend", "Link_del_Trend", "Nombre_Newsletter_Relacionado", "Fecha_Relación", "Relacionado", "Analisis_relacion";
      `;
      const params = [
        clean.id_newsletter,
        clean.Título_del_Trend,
        clean.Link_del_Trend,
        clean.Nombre_Newsletter_Relacionado,
        clean.Fecha_Relación,
        clean.Relacionado,
        clean.Analisis_relacion
      ];
      const result = await client.query(sql, params);
      // Devolver el registro completo insertado (útil para front y validación)
      return result.rows[0] || { id: null };
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


