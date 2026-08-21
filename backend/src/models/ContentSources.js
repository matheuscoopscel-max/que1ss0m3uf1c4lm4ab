// FILE: backend/src/models/ContentSources.js
// DAL para repositories (fontes index.json aprovadas) e plugin_activations
// (quais slugs estão ligados para todos os usuários). Curadoria é 100% admin —
// não existe mais "usuário adiciona repositório" ou "usuário instala plugin".

import { query, queryOne } from "../db/pool.js";

// ── Repositórios ──────────────────────────────────────────────────────────────

/**
 * @param {{ activeOnly?: boolean }} opts
 */
export async function listRepositories({ activeOnly = false } = {}) {
  return query(
    activeOnly
      ? "SELECT * FROM repositories WHERE is_active = true ORDER BY created_at ASC"
      : "SELECT * FROM repositories ORDER BY created_at ASC"
  );
}

export async function createRepository({ url, name, description, addedBy }) {
  return queryOne(
    `INSERT INTO repositories (url, name, description, added_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (url) DO UPDATE SET name = COALESCE($2, repositories.name), description = COALESCE($3, repositories.description)
     RETURNING *`,
    [url.trim(), name ?? null, description ?? null, addedBy]
  );
}

export async function updateRepository(id, { name, description, isActive }) {
  const fields = [];
  const params = [];
  if (name        !== undefined) { params.push(name);        fields.push(`name = $${params.length}`); }
  if (description !== undefined) { params.push(description); fields.push(`description = $${params.length}`); }
  if (isActive    !== undefined) { params.push(isActive);     fields.push(`is_active = $${params.length}`); }
  if (!fields.length) return queryOne("SELECT * FROM repositories WHERE id = $1", [id]);

  params.push(id);
  return queryOne(
    `UPDATE repositories SET ${fields.join(", ")} WHERE id = $${params.length} RETURNING *`,
    params
  );
}

export async function deleteRepository(id) {
  await query("DELETE FROM repositories WHERE id = $1", [id]);
}

// ── Ativação de plugins ──────────────────────────────────────────────────────

export async function listPluginActivations() {
  return query("SELECT * FROM plugin_activations ORDER BY slug ASC");
}

export async function listActivePluginSlugs() {
  const rows = await query("SELECT slug FROM plugin_activations WHERE is_active = true");
  return rows.map((r) => r.slug);
}

/**
 * Ativa/desativa (ou cria) um plugin pelo slug. Sempre exige ação explícita do admin.
 * @param {string} slug
 * @param {{ name?: string, sourceUrl?: string, isActive: boolean, activatedBy: string }} data
 */
export async function setPluginActivation(slug, { name, sourceUrl, isActive, activatedBy }) {
  return queryOne(
    `INSERT INTO plugin_activations (slug, name, source_url, is_active, activated_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (slug) DO UPDATE SET
       name         = COALESCE($2, plugin_activations.name),
       source_url   = COALESCE($3, plugin_activations.source_url),
       is_active    = $4,
       activated_by = $5
     RETURNING *`,
    [slug, name ?? null, sourceUrl ?? null, isActive, activatedBy]
  );
}
