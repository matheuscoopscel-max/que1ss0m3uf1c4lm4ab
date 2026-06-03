// FILE: backend/src/models/Notifications.js

import { query, queryOne } from "../db/pool.js";

function shape(r) {
  if (!r) return null;
  return {
    id:         r.id,
    type:       r.type,
    actorId:    r.actor_id,
    username:   r.username,
    avatarUrl:  r.avatar_url,
    postId:     r.post_id,
    commentId:  r.comment_id,
    message:    r.message,
    isRead:     r.is_read,
    createdAt:  r.created_at,
  };
}

export async function getNotifications(userId, { limit = 30, unreadOnly = false } = {}) {
  const where = unreadOnly ? "AND n.is_read = false" : "";
  const rows = await query(
    `SELECT n.*, u.username, pr.avatar_url
     FROM notifications n
     LEFT JOIN users u    ON u.id = n.actor_id
     LEFT JOIN profiles pr ON pr.user_id = n.actor_id
     WHERE n.user_id = $1 ${where}
     ORDER BY n.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows.map(shape);
}

export async function getUnreadCount(userId) {
  const row = await queryOne(
    "SELECT COUNT(*)::int as count FROM notifications WHERE user_id = $1 AND is_read = false",
    [userId]
  );
  return row?.count ?? 0;
}

export async function markAllRead(userId) {
  await query("UPDATE notifications SET is_read = true WHERE user_id = $1", [userId]);
}

export async function markRead(userId, notificationId) {
  await query(
    "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2",
    [notificationId, userId]
  );
}
