// FILE: backend/src/models/Library.js
// DAL para a tabela user_library.

import { query, queryOne } from "../db/pool.js";

function toApiShape(row) {
  if (!row) return null;
  return {
    id:                  row.id,
    pluginSlug:          row.plugin_slug,
    itemId:              row.item_id,
    itemTitle:           row.item_title,
    itemCoverUrl:        row.item_cover_url,
    itemMediaType:       row.item_media_type,
    repositoryUrl:       row.repository_url,
    status:              row.status,
    isFavorite:          row.is_favorite,
    currentChapterId:    row.current_chapter_id,
    currentChapterTitle: row.current_chapter_title,
    currentChapterNum:   row.current_chapter_num,
    totalChapters:       row.total_chapters,
    startedAt:           row.started_at,
    completedAt:         row.completed_at,
    createdAt:           row.created_at,
    updatedAt:           row.updated_at,
  };
}

/**
 * Lista itens da biblioteca de um usuário.
 * @param {string} userId
 * @param {{ status?: string, isFavorite?: boolean, limit?: number, offset?: number }} opts
 */
export async function listLibrary(userId, { status, isFavorite, limit = 50, offset = 0 } = {}) {
  const conditions = ["user_id = $1"];
  const params     = [userId];

  if (status && status !== "all") {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  if (isFavorite === true) {
    conditions.push("is_favorite = true");
  }

  params.push(limit, offset);

  const rows = await query(
    `SELECT * FROM user_library
     WHERE ${conditions.join(" AND ")}
     ORDER BY updated_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return rows.map(toApiShape);
}

/**
 * Busca um item específico da biblioteca.
 * @param {string} userId
 * @param {string} pluginSlug
 * @param {string} itemId
 */
export async function findLibraryItem(userId, pluginSlug, itemId) {
  const row = await queryOne(
    "SELECT * FROM user_library WHERE user_id = $1 AND plugin_slug = $2 AND item_id = $3",
    [userId, pluginSlug, itemId]
  );
  return toApiShape(row);
}

/**
 * Cria ou atualiza um item na biblioteca (upsert).
 */
export async function upsertLibraryItem({
  userId, pluginSlug, itemId,
  itemTitle, itemCoverUrl, itemMediaType, repositoryUrl,
  status, isFavorite,
}) {
  // Determina started_at: seta quando muda para reading/watching
  const setStarted = status === "reading" || status === "watching";
  const setCompleted = status === "completed";

  const row = await queryOne(
    `INSERT INTO user_library (
       user_id, plugin_slug, item_id,
       item_title, item_cover_url, item_media_type, repository_url,
       status, is_favorite,
       started_at, completed_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (user_id, plugin_slug, item_id) DO UPDATE SET
       item_title      = COALESCE(EXCLUDED.item_title, user_library.item_title),
       item_cover_url  = COALESCE(EXCLUDED.item_cover_url, user_library.item_cover_url),
       -- Auto-add: só muda para reading/watching se ainda não tem status ativo
       status          = CASE
         WHEN EXCLUDED.status IN ('reading','watching')
              AND user_library.status IN ('saved', 'dropped') -- não regride completed
         THEN EXCLUDED.status
         WHEN EXCLUDED.status IN ('reading','watching')
              AND user_library.status IS NULL
         THEN EXCLUDED.status
         WHEN EXCLUDED.status NOT IN ('reading','watching') -- mudança manual sempre aplica
         THEN EXCLUDED.status
         ELSE user_library.status -- mantém status existente (completed, etc)
       END,
       is_favorite     = EXCLUDED.is_favorite,
       started_at      = CASE
         WHEN EXCLUDED.status IN ('reading','watching') AND user_library.started_at IS NULL
         THEN NOW() ELSE user_library.started_at END,
       completed_at    = CASE
         WHEN EXCLUDED.status = 'completed' THEN NOW()
         ELSE user_library.completed_at END,
       updated_at      = NOW()
     RETURNING *`,
    [
      userId, pluginSlug, itemId,
      itemTitle ?? null, itemCoverUrl ?? null, itemMediaType ?? null, repositoryUrl ?? null,
      status ?? "saved",
      isFavorite ?? false,
      setStarted  ? new Date() : null,
      setCompleted ? new Date() : null,
    ]
  );
  return toApiShape(row);
}

/**
 * Atualiza apenas o progresso (capítulo atual) de um item.
 */
export async function updateProgress(userId, pluginSlug, itemId, {
  chapterId, chapterTitle, chapterNum, totalChapters,
}) {
  const row = await queryOne(
    `UPDATE user_library SET
       current_chapter_id    = $4,
       current_chapter_title = $5,
       current_chapter_num   = $6,
       total_chapters        = COALESCE($7, total_chapters),
       updated_at            = NOW()
     WHERE user_id = $1 AND plugin_slug = $2 AND item_id = $3
     RETURNING *`,
    [userId, pluginSlug, itemId, chapterId, chapterTitle ?? null, chapterNum ?? null, totalChapters ?? null]
  );
  return toApiShape(row);
}

/**
 * Alterna o favorito de um item (toggle).
 */
export async function toggleFavorite(userId, pluginSlug, itemId) {
  const row = await queryOne(
    `UPDATE user_library SET is_favorite = NOT is_favorite, updated_at = NOW()
     WHERE user_id = $1 AND plugin_slug = $2 AND item_id = $3
     RETURNING *`,
    [userId, pluginSlug, itemId]
  );
  return toApiShape(row);
}

/**
 * Remove um item da biblioteca.
 */
export async function removeLibraryItem(userId, pluginSlug, itemId) {
  await query(
    "DELETE FROM user_library WHERE user_id = $1 AND plugin_slug = $2 AND item_id = $3",
    [userId, pluginSlug, itemId]
  );
}

/**
 * Contagem por status para o usuário (para badges nas abas).
 * @param {string} userId
 * @returns {Promise<Record<string, number>>}
 */
export async function getStatusCounts(userId) {
  const rows = await query(
    `SELECT status, COUNT(*)::int as count FROM user_library
     WHERE user_id = $1 GROUP BY status`,
    [userId]
  );
  const counts = { reading: 0, watching: 0, completed: 0, saved: 0, dropped: 0, favorite: 0 };
  rows.forEach((r) => { counts[r.status] = r.count; });
  // Favoritos é independente — conta separado
  const [favRow] = await query(
    "SELECT COUNT(*)::int as count FROM user_library WHERE user_id = $1 AND is_favorite = true",
    [userId]
  );
  counts.favorite = favRow?.count ?? 0;
  return counts;
}

// ── getLibraryItem (Patch #26) ────────────────────────────────────────────────
export async function getLibraryItem(userId, pluginSlug, itemId) {
  return queryOne(
    "SELECT * FROM user_library WHERE user_id = $1 AND plugin_slug = $2 AND item_id = $3",
    [userId, pluginSlug, itemId]
  );
}
