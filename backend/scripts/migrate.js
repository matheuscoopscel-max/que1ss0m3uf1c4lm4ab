// FILE: backend/scripts/migrate.js
// Executa todas as migrations em ordem numérica.
// Cria a tabela schema_migrations para rastrear quais já foram aplicadas.

import { readdir, readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const __dir = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dir, "../migrations");

async function getClient() {
  const client = new pg.Client(
    process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : {
          host: process.env.DB_HOST ?? "localhost",
          port: parseInt(process.env.DB_PORT ?? "5432", 10),
          database: process.env.DB_NAME ?? "omnimedia_db",
          user: process.env.DB_USER ?? "omnimedia",
          password: process.env.DB_PASSWORD ?? "omnimedia_pass",
        }
  );
  await client.connect();
  return client;
}

async function run() {
  const client = await getClient();

  try {
    // Cria tabela de controle de migrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Lê e ordena os arquivos de migration
    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        "SELECT 1 FROM schema_migrations WHERE filename = $1",
        [file]
      );
      if (rows.length > 0) {
        console.log(`[migrate] Já aplicada: ${file}`);
        continue;
      }

      console.log(`[migrate] Aplicando: ${file}…`);
      const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1)",
        [file]
      );
      console.log(`[migrate] ✓ ${file}`);
    }

    console.log("[migrate] Todas as migrations aplicadas com sucesso.");
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("[migrate] ERRO:", err.message);
  process.exit(1);
});
