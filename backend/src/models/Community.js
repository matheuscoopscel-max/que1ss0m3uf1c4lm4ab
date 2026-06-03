// FILE: backend/src/models/Community.js — Patch #21
// Corrigido: listPosts e listGroups sem subquery com parâmetro inválido.

import { query, queryOne } from "../db/pool.js";

// ── Posts ─────────────────────────────────────────────────────────────────────

function postShape(r) {
  if (!r) return null;
  return {
    id:             r.id,
    userId:         r.user_id,
    username:       r.username,
    avatarUrl:      r.avatar_url,
    groupId:        r.group_id,
    content:        r.content,
    imageUrl:       r.image_url,
    itemId:         r.item_id,
    itemTitle:      r.item_title,
    itemCoverUrl:   r.item_cover_url,
    itemPluginSlug: r.item_plugin_slug,
    likesCount:     r.likes_count,
    commentsCount:  r.comments_count,
    userReaction:   r.user_reaction ?? null,
    isPinned:       r.is_pinned,
    createdAt:      r.created_at,
    updatedAt:      r.updated_at,
  };
}

export async function listPosts({ groupId, userId, requesterId, limit = 20, offset = 0 }) {
  const conditions = ["p.is_hidden = false"];
  const params     = [limit, offset];

  if (groupId) {
    params.push(groupId);
    conditions.push(`p.group_id = $${params.length}`);
  } else {
    conditions.push("p.group_id IS NULL");
  }

  if (userId) {
    params.push(userId);
    conditions.push(`p.user_id = $${params.length}`);
  }

  // Se tiver requesterId, faz LEFT JOIN para pegar a reação do usuário
  let reactionJoin  = "";
  let reactionField = "NULL::text AS user_reaction";

  if (requesterId) {
    params.push(requesterId);
    const rIdx = params.length;
    reactionJoin  = `LEFT JOIN post_reactions pr2 ON pr2.post_id = p.id AND pr2.user_id = $${rIdx}`;
    reactionField = "pr2.reaction::text AS user_reaction";
  }

  const rows = await query(
    `SELECT p.*, u.username, pr.avatar_url, ${reactionField}
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN profiles pr ON pr.user_id = p.user_id
     ${reactionJoin}
     WHERE ${conditions.join(" AND ")}
     ORDER BY p.is_pinned DESC, p.created_at DESC
     LIMIT $1 OFFSET $2`,
    params
  );
  return rows.map(postShape);
}

export async function createPost({ userId, groupId, content, imageUrl, itemId, itemTitle, itemCoverUrl, itemPluginSlug }) {
  const row = await queryOne(
    `INSERT INTO posts (user_id, group_id, content, image_url, item_id, item_title, item_cover_url, item_plugin_slug)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [userId, groupId ?? null, content, imageUrl ?? null, itemId ?? null, itemTitle ?? null, itemCoverUrl ?? null, itemPluginSlug ?? null]
  );
  await query("SELECT earn_omnicoins($1, 5, 'post_created')", [userId]);
  return postShape(row);
}

export async function toggleReaction(postId, userId, reaction = "like") {
  const existing = await queryOne(
    "SELECT reaction FROM post_reactions WHERE post_id = $1 AND user_id = $2",
    [postId, userId]
  );
  if (existing) {
    await query("DELETE FROM post_reactions WHERE post_id = $1 AND user_id = $2", [postId, userId]);
    await query("UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1", [postId]);
    return null;
  }
  await query(
    "INSERT INTO post_reactions (post_id, user_id, reaction) VALUES ($1,$2,$3) ON CONFLICT (post_id, user_id) DO UPDATE SET reaction = $3",
    [postId, userId, reaction]
  );
  await query("UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1", [postId]);
  await query("SELECT notify_post_reaction($1, $2, $3)", [postId, userId, reaction]).catch(() => {});
  return reaction;
}

// ── Comments ──────────────────────────────────────────────────────────────────

function commentShape(r) {
  if (!r) return null;
  return {
    id:         r.id,
    postId:     r.post_id,
    userId:     r.user_id,
    username:   r.username,
    avatarUrl:  r.avatar_url,
    parentId:   r.parent_id,
    content:    r.content,
    likesCount: r.likes_count,
    createdAt:  r.created_at,
  };
}

export async function listComments(postId) {
  const rows = await query(
    `SELECT c.*, u.username, pr.avatar_url
     FROM comments c
     JOIN users u ON u.id = c.user_id
     LEFT JOIN profiles pr ON pr.user_id = c.user_id
     WHERE c.post_id = $1 AND c.is_hidden = false
     ORDER BY c.created_at ASC`,
    [postId]
  );
  return rows.map(commentShape);
}

export async function createComment({ postId, userId, parentId, content }) {
  const row = await queryOne(
    "INSERT INTO comments (post_id, user_id, parent_id, content) VALUES ($1,$2,$3,$4) RETURNING *",
    [postId, userId, parentId ?? null, content]
  );
  await query("UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1", [postId]);
  await query("SELECT earn_omnicoins($1, 2, 'comment_created')", [userId]);
  // Notifica dono do post e dono do comentário pai
  await query("SELECT notify_post_comment($1, $2, $3)", [postId, row.id, userId]).catch(() => {});
  if (parentId) await query("SELECT notify_comment_reply($1, $2, $3, $4)", [parentId, row.id, userId, postId]).catch(() => {});
  return commentShape(row);
}

// ── Groups ────────────────────────────────────────────────────────────────────

function groupShape(r) {
  if (!r) return null;
  return {
    id:          r.id,
    slug:        r.slug,
    name:        r.name,
    description: r.description,
    coverUrl:    r.cover_url,
    genre:       r.genre,
    ownerId:     r.owner_id,
    isPublic:    r.is_public,
    memberCount: r.member_count,
    userRole:    r.user_role ?? null,
    createdAt:   r.created_at,
  };
}

export async function listGroups({ genre, requesterId, limit = 20, offset = 0 }) {
  const conditions = ["g.is_public = true"];
  const params     = [limit, offset];

  if (genre) {
    params.push(genre);
    conditions.push(`g.genre = $${params.length}`);
  }

  // Checa se o usuário é membro via LEFT JOIN
  let memberJoin  = "";
  let memberField = "NULL::text AS user_role";

  if (requesterId) {
    params.push(requesterId);
    const rIdx = params.length;
    memberJoin  = `LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $${rIdx}`;
    memberField = "gm.role::text AS user_role";
  }

  const rows = await query(
    `SELECT g.*, ${memberField}
     FROM groups g
     ${memberJoin}
     WHERE ${conditions.join(" AND ")}
     ORDER BY g.member_count DESC
     LIMIT $1 OFFSET $2`,
    params
  );
  return rows.map(groupShape);
}

export async function createGroup({ ownerId, slug, name, description, genre, coverUrl, isPublic }) {
  const taken = await queryOne("SELECT 1 FROM groups WHERE slug = $1", [slug]);
  if (taken) throw Object.assign(new Error("Slug já em uso."), { status: 409 });

  const row = await queryOne(
    "INSERT INTO groups (owner_id,slug,name,description,genre,cover_url,is_public) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
    [ownerId, slug, name, description ?? null, genre ?? null, coverUrl ?? null, isPublic ?? true]
  );
  await query("INSERT INTO group_members (group_id,user_id,role) VALUES ($1,$2,'owner')", [row.id, ownerId]);
  return groupShape(row);
}

export async function joinGroup(groupId, userId) {
  await queryOne(
    "INSERT INTO group_members (group_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING *",
    [groupId, userId]
  );
  await query("UPDATE groups SET member_count = member_count + 1 WHERE id = $1", [groupId]);
}

export async function leaveGroup(groupId, userId) {
  const r = await queryOne("DELETE FROM group_members WHERE group_id=$1 AND user_id=$2 RETURNING *", [groupId, userId]);
  if (r) await query("UPDATE groups SET member_count = GREATEST(0, member_count - 1) WHERE id = $1", [groupId]);
}

// ── Trending ──────────────────────────────────────────────────────────────────
export async function getTrendingPosts({ limit = 10 } = {}) {
  const rows = await query(
    `SELECT p.*, u.username, pr.avatar_url
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN profiles pr ON pr.user_id = p.user_id
     WHERE p.is_hidden = false
       AND p.created_at > NOW() - INTERVAL '48 hours'
     ORDER BY (p.likes_count * 3 + p.comments_count * 2) DESC, p.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows.map(postShape);
}
