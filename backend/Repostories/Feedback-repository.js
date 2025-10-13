import DBConfig from '../DBConfig.js';
import pkg from 'pg';
const { Client } = pkg;

export default class FeedbackRepository {
  async createAsync(record) {
    const client = new Client(DBConfig);
    try {
      await client.connect();
      const sql = `
        INSERT INTO "Feedback" (
          "trendId", "action", "reason", "feedback", "trendData", "timestamp"
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING "id", "trendId", "action", "reason", "feedback", "trendData", "timestamp", "createdAt";
      `;
      const params = [
        record.trendId ?? null,
        String(record.action || '').trim(),
        record.reason ?? null,
        record.feedback ?? null,
        record.trendData ?? null,
        record.timestamp ?? null
      ];
      const result = await client.query(sql, params);
      return result.rows[0];
    } catch (err) {
      console.error('Error insertando Feedback:', err);
      throw err;
    } finally {
      await client.end();
    }
  }

  async hasNegativeForLinkOrPair({ trendLink, newsletterId = null }) {
    if (!trendLink) return false;
    const client = new Client(DBConfig);
    try {
      await client.connect();
      const sql = `
        SELECT 1
        FROM "Feedback"
        WHERE lower(COALESCE((trendData->>'trendLink'), '')) = lower($1)
          AND lower(COALESCE("feedback", '')) = 'negative'
          AND (
            $2::text IS NULL OR COALESCE((trendData->>'newsletterId'),'null') = $2
          )
        LIMIT 1;
      `;
      const result = await client.query(sql, [String(trendLink), newsletterId == null ? null : String(newsletterId)]);
      return result.rows.length > 0;
    } catch (err) {
      console.error('Error consultando Feedback negativo por link/par:', err);
      return false;
    } finally {
      await client.end();
    }
  }

  async getRecentNegatives({ limit = 100 } = {}) {
    const client = new Client(DBConfig);
    try {
      await client.connect();
      const sql = `
        SELECT "id", "action", "reason", "trendData", "createdAt"
        FROM "Feedback"
        WHERE lower(COALESCE("feedback", '')) = 'negative'
        ORDER BY "createdAt" DESC
        LIMIT $1;
      `;
      const result = await client.query(sql, [limit]);
      return result.rows || [];
    } catch (err) {
      console.error('Error obteniendo Feedback negativos recientes:', err);
      return [];
    } finally {
      await client.end();
    }
  }
}


