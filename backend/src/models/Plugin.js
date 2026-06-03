// FILE: backend/src/models/Plugin.js
// Camada de acesso a dados para a tabela `extensions`.
// Todas as queries do banco passam por aqui — o router nunca acessa o pool diretamente.

import { query, queryOne } from "../db/pool.js";

/**
 * Mapeia uma linha do banco para o formato de resposta da API.
 * Garante camelCase e remove campos internos (submitter_ip, etc).
 */
function toApiShape(row) {
  if (!row) return null;
  return {
    id:              row.id,
    slug:            row.slug,
    name:            row.name,
    version:         row.version,
    author:          row.author,
    description:     row.description,
    category:        row.category,
    contentRating:   row.content_rating,
    mediaTypes:      row.media_types ?? [],
    iconUrl:         row.icon_url ?? null,
    repositoryUrl:   row.repository_url ?? null,
    scriptUrl:       row.script_url,
    homologated:     row.homologated,
    installCount:    row.install_count,
    tags:            row.tags ?? [],
    status:          row.status,
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
  };
}

/**
 * Lista plugins aprovados com filtros opcionais.
 *
 * @param {{
 *   includeRestricted?: boolean,
 *   category?: string,
 *   q?: string,
 *   limit?: number,
 *   offset?: number
 * }} opts
 * @returns {Promise<{ plugins: object[], total: number }>}
 */
export async function listPlugins({
  includeRestricted = false,
  category,
  q,
  limit = 50,
  offset = 0,
} = {}) {
  const conditions = ["status = 'approved'"];
  const params = [];

  if (!includeRestricted) {
    params.push("general");
    conditions.push(`content_rating = $${params.length}`);
  }

  if (category) {
    params.push(category.toLowerCase());
    conditions.push(`category = $${params.length}`);
  }

  if (q) {
    params.push(q);
    conditions.push(
      `to_tsvector('portuguese', coalesce(name,'') || ' ' || coalesce(description,'')) @@ plainto_tsquery('portuguese', $${params.length})`
    );
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  params.push(limit, offset);
  const dataRows = await query(
    `SELECT * FROM extensions ${where}
     ORDER BY install_count DESC, name ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  // Contagem total (sem LIMIT/OFFSET, sem os params de paginação)
  const countParams = params.slice(0, params.length - 2);
  const countRows = await query(
    `SELECT COUNT(*)::int AS total FROM extensions ${where}`,
    countParams
  );

  return {
    plugins: dataRows.map(toApiShape),
    total: countRows[0]?.total ?? 0,
  };
}

/**
 * Busca um plugin pelo slug. Retorna null se não encontrado.
 * @param {string} slug
 * @returns {Promise<object|null>}
 */
export async function findBySlug(slug) {
  const row = await queryOne(
    "SELECT * FROM extensions WHERE slug = $1 AND status = 'approved'",
    [slug]
  );
  return toApiShape(row);
}

/**
 * Cria uma submissão comunitária com status 'pending'.
 * @param {{
 *   slug: string,
 *   name: string,
 *   version: string,
 *   author: string,
 *   description: string,
 *   category: string,
 *   contentRating: string,
 *   mediaTypes: string[],
 *   repositoryUrl: string,
 *   scriptUrl: string,
 *   tags: string[],
 *   submitterIp: string
 * }} data
 * @returns {Promise<object>}
 */
export async function createSubmission(data) {
  const row = await queryOne(
    `INSERT INTO extensions (
       slug, name, version, author, description, category,
       content_rating, media_types, repository_url, script_url,
       tags, status, homologated, submitter_ip
     ) VALUES (
       $1, $2, $3, $4, $5, $6,
       $7, $8::media_type[], $9, $10,
       $11, 'pending', false, $12
     )
     RETURNING *`,
    [
      data.slug,
      data.name,
      data.version ?? "0.0.1",
      data.author ?? "community",
      data.description ?? "",
      data.category,
      data.contentRating ?? "general",
      data.mediaTypes,
      data.repositoryUrl ?? null,
      data.scriptUrl,
      data.tags ?? [],
      data.submitterIp ?? null,
    ]
  );
  return toApiShape(row);
}

/**
 * Incrementa o contador de instalações de um plugin.
 * @param {string} slug
 */
export async function incrementInstallCount(slug) {
  await query(
    "UPDATE extensions SET install_count = install_count + 1 WHERE slug = $1",
    [slug]
  );
}
