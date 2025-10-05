import DBConfig from '../DBConfig.js';
import pkg from 'pg';
const { Client } = pkg;

export default class FuentesRepository {
  async ensureTableAsync(client) {
    // La tabla ya existe con estructura diferente, no intentar crearla
    // Solo verificar que existe
    try {
      const exists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'Fuentes'
        );
      `);
      if (!exists.rows[0].exists) {
        console.log('⚠️ La tabla Fuentes no existe, pero no la crearemos para evitar conflictos');
      }
    } catch (e) {
      console.error('Error verificando tabla Fuentes:', e);
    }
  }

  async listAsync() {
    const client = new Client(DBConfig);
    try {
      await client.connect();
      await this.ensureTableAsync(client);
      // Detectar columnas existentes y construir SELECT compatible
      const colsRes = await client.query(`
        SELECT lower(column_name) AS col
        FROM information_schema.columns
        WHERE lower(table_name) = 'fuentes'
      `);
      const cols = new Set((colsRes.rows || []).map(r => r.col));

      function pickCol(candidates, defaultExpr) {
        for (const c of candidates) {
          const lc = c.toLowerCase();
          if (cols.has(lc)) {
            return `"${c}"`;
          }
        }
        return defaultExpr; // fallback literal/expression
      }

      const dominioExpr = pickCol(['fuente','Fuente','dominio','Dominio','domain','Domain'], `''`);
      const categoriaExpr = pickCol(['Categoria','categoria','categoría','Categoría'], `''`);

      const sql = `
        SELECT 
          ${dominioExpr} as dominio,
          ${categoriaExpr} as categoria,
          true as activo
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
        SET "Categoria" = COALESCE(NULLIF($2, ''), "Categoria")
        WHERE lower("fuente") = $1 OR lower("Fuente") = $1 OR lower("dominio") = $1 OR lower("Dominio") = $1
        RETURNING "fuente" as dominio, COALESCE("Categoria", '') AS categoria;
      `;
      const upd = await client.query(updateSql, [cleanDominio, cleanCategoria]);
      if (upd.rowCount > 0) {
        const row = upd.rows[0];
        return { dominio: row?.dominio || cleanDominio, categoria: row?.categoria || cleanCategoria, activo: true };
      }

      // Insertar si no existía previamente
      const insertSql = `
        INSERT INTO "Fuentes" ("fuente", "Categoria")
        VALUES ($1, NULLIF($2, ''))
        RETURNING "fuente" as dominio, COALESCE("Categoria", '') AS categoria;
      `;
      try {
        const ins = await client.query(insertSql, [cleanDominio, cleanCategoria]);
        const row = ins.rows?.[0];
        return { dominio: row?.dominio || cleanDominio, categoria: row?.categoria || cleanCategoria, activo: true };
      } catch (e) {
        // Si falla por duplicado (por índice/constraint), reintentar como update
        if (e && e.code === '23505') {
          const upd2 = await client.query(updateSql, [cleanDominio, cleanCategoria]);
          const row = upd2.rows?.[0];
          return { dominio: row?.dominio || cleanDominio, categoria: row?.categoria || cleanCategoria, activo: true };
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
      // Como no hay columna activo, "desactivar" significa eliminar el registro
      const sql = `
        DELETE FROM "Fuentes" WHERE lower("fuente") = $1 OR lower("Fuente") = $1 OR lower("dominio") = $1 OR lower("Dominio") = $1 RETURNING "fuente" as dominio;
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


