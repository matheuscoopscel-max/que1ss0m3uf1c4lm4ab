// FILE: backend/scripts/seed.js
// Executa apenas a migration de seed (002_seed_extensions.sql).
// Usa INSERT ... ON CONFLICT DO UPDATE — seguro para rodar múltiplas vezes.

import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const __dir = dirname(fileURLToPath(import.meta.url));

async function run() {
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

  try {
    const sql = await readFile(
      join(__dir, "../migrations/002_seed_extensions.sql"),
      "utf8"
    );
    await client.query(sql);
    console.log("[seed] ✓ Dados iniciais inseridos/atualizados com sucesso.");
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("[seed] ERRO:", err.message);
  process.exit(1);
});
