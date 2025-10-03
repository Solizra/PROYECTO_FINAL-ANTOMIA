import DBConfig from '../DBConfig.js';
import pkg from 'pg';
const { Client } = pkg;

export default class FuentesRepository {
  async ensureTableAsync(client) {
    // Crea la tabla Fuentes si no existe, con índice único en dominio
    const ddl = `
      CREATE TABLE IF NOT EXISTS "Fuentes" (
        id SERIAL PRIMARY KEY,
        "dominio" VARCHAR(255) UNIQUE NOT NULL,
        "categoria" VARCHAR(255),
        "activo" BOOLEAN DEFAULT true,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS ux_fuentes_dominio ON "Fuentes"((lower("dominio")));
    `;
    try {
      await client.query(ddl);
    } catch (e) {
      // No bloquear si falla creación de índice; la tabla principal es lo importante
      console.error('Error asegurando tabla Fuentes:', e);
    }
  }

  async listAsync() {
    const client = new Client(DBConfig);
    try {
      await client.connect();
      await this.ensureTableAsync(client);
      // Tabla esperada: Fuentes con columnas: id (serial), dominio (varchar), categoria (varchar opcional), activo (bool)
      // Permitimos variantes de nombre por si la columna está en mayúsculas
      const sql = `
        SELECT 
          COALESCE("dominio", "Dominio", "domain", "Domain") as dominio,
          COALESCE("categoria", "Categoria", "categoría", "Categoría", '') as categoria,
          COALESCE("activo", "Activo", true) as activo
        FROM "Fuentes"
      `;
      const result = await client.query(sql);
      const rows = (result.rows || [])
        .map(r => ({
          dominio: String(r.dominio || '').trim(),
          categoria: String(r.categoria || '').trim(),
          activo: (r.activo === true || r.activo === 't' || r.activo === 1 || r.activo === '1')
        }))
        .filter(r => r.dominio.length > 0);
      return rows;
    } catch (err) {
      console.error('Error listando dominios de Fuentes:', err);
      throw err;
    } finally {
      await client.end();
    }
  }

  async addAsync({ dominio, categoria }) {
    const client = new Client(DBConfig);
    try {
      await client.connect();
      await this.ensureTableAsync(client);
      const cleanDominio = String(dominio || '').trim().toLowerCase();
      const cleanCategoria = String(categoria || '').trim();
      if (!cleanDominio) {
        throw new Error('Dominio requerido');
      }
      // Upsert compatible: primero intentar UPDATE por dominio (case-insensitive); si no afecta filas, hacer INSERT.
      const updateSql = `
        UPDATE "Fuentes"
        SET "activo" = true,
            "categoria" = COALESCE(NULLIF($2, ''), "categoria")
        WHERE lower("dominio") = $1 OR lower("Dominio") = $1
        RETURNING "dominio", COALESCE("categoria", '') AS categoria, "activo";
      `;
      const upd = await client.query(updateSql, [cleanDominio, cleanCategoria]);
      if (upd.rowCount > 0) {
        const row = upd.rows[0];
        return { dominio: row?.dominio || cleanDominio, categoria: row?.categoria || cleanCategoria, activo: row?.activo === true };
      }

      // Insertar si no existía previamente
      const insertSql = `
        INSERT INTO "Fuentes" ("dominio", "categoria", "activo")
        VALUES ($1, NULLIF($2, ''), true)
        RETURNING "dominio", COALESCE("categoria", '') AS categoria, "activo";
      `;
      try {
        const ins = await client.query(insertSql, [cleanDominio, cleanCategoria]);
        const row = ins.rows?.[0];
        return { dominio: row?.dominio || cleanDominio, categoria: row?.categoria || cleanCategoria, activo: row?.activo === true };
      } catch (e) {
        // Si falla por duplicado (por índice/constraint), reintentar como update
        if (e && e.code === '23505') {
          const upd2 = await client.query(updateSql, [cleanDominio, cleanCategoria]);
          const row = upd2.rows?.[0];
          return { dominio: row?.dominio || cleanDominio, categoria: row?.categoria || cleanCategoria, activo: row?.activo === true };
        }
        throw e;
      }
    } catch (err) {
      console.error('Error agregando fuente:', err);
      throw err;
    } finally {
      await client.end();
    }
  }

  async deactivateAsync(dominio) {
    const client = new Client(DBConfig);
    try {
      await client.connect();
      await this.ensureTableAsync(client);
      const cleanDominio = String(dominio || '').trim().toLowerCase();
      if (!cleanDominio) {
        throw new Error('Dominio requerido');
      }
      const sql = `
        UPDATE "Fuentes" SET "activo" = false WHERE lower("dominio") = $1 OR lower("Dominio") = $1 RETURNING "dominio";
      `;
      const result = await client.query(sql, [cleanDominio]);
      return result.rowCount > 0;
    } catch (err) {
      console.error('Error desactivando fuente:', err);
      throw err;
    } finally {
      await client.end();
    }
  }
}


