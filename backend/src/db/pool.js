// FILE: backend/src/db/pool.js
// Pool de conexões PostgreSQL.
// Lê DATABASE_URL se disponível, senão monta a string das variáveis individuais.

import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

function buildConnectionConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    };
  }

  return {
    host: process.env.DB_HOST ?? "localhost",
    port: parseInt(process.env.DB_PORT ?? "5432", 10),
    database: process.env.DB_NAME ?? "omnimedia_db",
    user: process.env.DB_USER ?? "omnimedia",
    password: process.env.DB_PASSWORD ?? "omnimedia_pass",
  };
}

export const pool = new Pool(buildConnectionConfig());

// Log de erros inesperados no pool (sem derrubar o processo)
pool.on("error", (err) => {
  console.error("[DB Pool] Erro inesperado no cliente idle:", err.message);
});

/**
 * Executa uma query com parâmetros e retorna as linhas.
 * @template T
 * @param {string} sql
 * @param {any[]} [params]
 * @returns {Promise<T[]>}
 */
export async function query(sql, params = []) {
  const start = Date.now();
  const result = await pool.query(sql, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === "development") {
    console.debug(`[DB] ${duration}ms → ${sql.slice(0, 80).replace(/\s+/g, " ")}`);
  }
  return result.rows;
}

/**
 * Executa uma query e retorna a primeira linha ou null.
 * @template T
 * @param {string} sql
 * @param {any[]} [params]
 * @returns {Promise<T|null>}
 */
export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

/**
 * Testa a conexão com o banco. Útil no healthcheck.
 * @returns {Promise<boolean>}
 */
export async function testConnection() {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
