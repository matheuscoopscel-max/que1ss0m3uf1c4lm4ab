// FILE: backend/src/models/Profile.js
// DAL para perfis de usuário e estatísticas.

import { query, queryOne } from "../db/pool.js";

function toApiShape(row) {
  if (!row) return null;
  return {
    userId:      row.user_id,
    username:    row.username,
    displayName: row.display_name,
    bio:         row.bio,
    avatarUrl:   row.avatar_url,
    bannerUrl:   row.banner_url,
    websiteUrl:  row.website_url,
    isPublic:    row.is_public,
    avatarFrame: row.avatar_frame,
    badgeSlug:   row.badge_slug,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

/**
 * Busca o perfil de um usuário pelo username (join com users).
 * Retorna null se não encontrado ou se perfil for privado.
 * @param {string} username
 * @param {boolean} includePrivate — true apenas para o próprio usuário
 */
export async function findProfileByUsername(username, includePrivate = false) {
  const row = await queryOne(
    `SELECT p.*, u.username
     FROM profiles p
     JOIN users u ON u.id = p.user_id
     WHERE u.username = $1
       AND u.is_active = true
       AND ($2 OR p.is_public = true)`,
    [username.toLowerCase(), includePrivate]
  );
  return toApiShape(row);
}

/**
 * Busca perfil pelo user_id (para edição do próprio perfil).
 */
export async function findProfileByUserId(userId) {
  const row = await queryOne(
    `SELECT p.*, u.username
     FROM profiles p
     JOIN users u ON u.id = p.user_id
     WHERE p.user_id = $1`,
    [userId]
  );
  return toApiShape(row);
}

/**
 * Cria um perfil vazio para um novo usuário.
 * Chamado após o registro.
 */
export async function createProfile(userId) {
  return queryOne(
    "INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING RETURNING *",
    [userId]
  );
}

/**
 * Atualiza o perfil do usuário.
 */
export async function updateProfile(userId, {
  displayName, bio, avatarUrl, bannerUrl, websiteUrl,
  isPublic, avatarFrame, badgeSlug,
}) {
  const row = await queryOne(
    `UPDATE profiles SET
       display_name = COALESCE($2, display_name),
       bio          = COALESCE($3, bio),
       avatar_url   = COALESCE($4, avatar_url),
       banner_url   = COALESCE($5, banner_url),
       website_url  = COALESCE($6, website_url),
       is_public    = COALESCE($7, is_public),
       avatar_frame = COALESCE($8, avatar_frame),
       badge_slug   = COALESCE($9, badge_slug),
       updated_at   = NOW()
     WHERE user_id = $1
     RETURNING *`,
    [userId, displayName, bio, avatarUrl, bannerUrl, websiteUrl, isPublic, avatarFrame, badgeSlug]
  );
  return toApiShape(row);
}

/**
 * Busca estatísticas de um usuário via view user_stats.
 * @param {string} userId
 */
export async function getUserStats(userId) {
  const row = await queryOne(
    "SELECT * FROM user_stats WHERE user_id = $1",
    [userId]
  );
  if (!row) return null;
  return {
    totalItems:      row.total_items      ?? 0,
    completedItems:  row.completed_items  ?? 0,
    favoriteItems:   row.favorite_items   ?? 0,
    totalChaptersRead: row.total_chapters_read ?? 0,
    pluginsInstalled:  row.plugins_installed  ?? 0,
    lastActivity:    row.last_activity,
  };
}

/**
 * Retorna a atividade recente (últimos N itens atualizados na biblioteca).
 */
export async function getRecentActivity(userId, limit = 10) {
  const rows = await query(
    `SELECT plugin_slug, item_id, item_title, item_cover_url, item_media_type,
            status, current_chapter_title, current_chapter_num, updated_at
     FROM user_library
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows.map((r) => ({
    pluginSlug:         r.plugin_slug,
    itemId:             r.item_id,
    itemTitle:          r.item_title,
    itemCoverUrl:       r.item_cover_url,
    itemMediaType:      r.item_media_type,
    status:             r.status,
    currentChapterTitle: r.current_chapter_title,
    currentChapterNum:  r.current_chapter_num,
    updatedAt:          r.updated_at,
  }));
}
