// FILE: backend/src/models/Ranking.js

import { query, queryOne } from "../db/pool.js";

// ── XP e Níveis ───────────────────────────────────────────────────────────────

export async function getUserXP(userId) {
  const row = await queryOne(
    "SELECT * FROM user_xp WHERE user_id = $1",
    [userId]
  );
  if (!row) return { totalXp: 0, level: 1 };

  // Calcula progresso para o próximo nível
  const xpForNext = row.level * 100;
  // XP acumulado no nível atual
  let xpUsed = 0;
  for (let l = 1; l < row.level; l++) xpUsed += l * 100;
  const xpInLevel = row.total_xp - xpUsed;

  return {
    totalXp:    row.total_xp,
    level:      row.level,
    xpInLevel,
    xpForNext,
    progress:   Math.min(100, Math.round((xpInLevel / xpForNext) * 100)),
  };
}

export async function earnXP(userId, amount, reason) {
  const row = await queryOne(
    "SELECT earn_xp($1, $2, $3) AS result",
    [userId, amount, reason]
  );
  return row?.result ?? null;
}

// ── Conquistas ────────────────────────────────────────────────────────────────

export async function listAchievements(userId = null) {
  const rows = await query(
    `SELECT a.*,
            (ua.user_id IS NOT NULL) AS unlocked,
            ua.unlocked_at
     FROM achievements a
     LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = $1
     ORDER BY a.sort_order`,
    [userId]
  );
  return rows.map((r) => ({
    id:           r.id,
    slug:         r.slug,
    name:         r.name,
    description:  r.description,
    icon:         r.icon,
    xpReward:     r.xp_reward,
    coinsReward:  r.coins_reward,
    criteriaType: r.criteria_type,
    criteriaValue:r.criteria_value,
    unlocked:     r.unlocked ?? false,
    unlockedAt:   r.unlocked_at,
  }));
}

export async function unlockAchievement(userId, slug) {
  const ach = await queryOne("SELECT * FROM achievements WHERE slug = $1", [slug]);
  if (!ach) return null;

  const already = await queryOne(
    "SELECT 1 FROM user_achievements WHERE user_id = $1 AND achievement_id = $2",
    [userId, ach.id]
  );
  if (already) return null; // Já tem

  await query(
    "INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [userId, ach.id]
  );

  // Recompensas
  if (ach.xp_reward > 0) {
    await earnXP(userId, ach.xp_reward, `achievement_${slug}`);
  }
  if (ach.coins_reward > 0) {
    await query("SELECT earn_omnicoins($1, $2, $3)", [userId, ach.coins_reward, `achievement_${slug}`]);
  }

  return { slug, name: ach.name, icon: ach.icon, xpReward: ach.xp_reward, coinsReward: ach.coins_reward };
}

/**
 * Verifica e desbloqueia conquistas automaticamente com base nas stats do usuário.
 * Chamado após ações relevantes (ler capítulo, completar obra, postar, etc.)
 */
export async function checkAndUnlockAchievements(userId) {
  const stats = await queryOne(
    "SELECT * FROM user_stats WHERE user_id = $1",
    [userId]
  );
  if (!stats) return [];

  const postCount = await queryOne(
    "SELECT COUNT(*)::int AS count FROM posts WHERE user_id = $1 AND is_hidden = false",
    [userId]
  );

  const pluginCount = await queryOne(
    "SELECT COUNT(*)::int AS count FROM user_installations WHERE user_id = $1",
    [userId]
  );

  const userStats = {
    chapters_read:    stats.total_chapters_read ?? 0,
    titles_completed: stats.completed_items ?? 0,
    posts_created:    postCount?.count ?? 0,
    plugins_installed:pluginCount?.count ?? 0,
  };

  // Busca conquistas ainda não desbloqueadas com critério numérico
  const candidates = await query(
    `SELECT a.slug, a.criteria_type, a.criteria_value
     FROM achievements a
     WHERE a.criteria_type IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM user_achievements ua
         WHERE ua.user_id = $1 AND ua.achievement_id = a.id
       )`,
    [userId]
  );

  const unlocked = [];
  for (const ach of candidates) {
    const current = userStats[ach.criteria_type] ?? 0;
    if (current >= ach.criteria_value) {
      const result = await unlockAchievement(userId, ach.slug);
      if (result) unlocked.push(result);
    }
  }

  return unlocked;
}

// ── Ranking ───────────────────────────────────────────────────────────────────

export async function getGlobalRanking({ limit = 50, offset = 0 } = {}) {
  const rows = await query(
    `SELECT * FROM ranking_global LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows.map((r) => ({
    rank:           r.rank,
    userId:         r.user_id,
    username:       r.username,
    avatarUrl:      r.avatar_url,
    totalXp:        r.total_xp,
    level:          r.level,
    titlesCompleted:r.titles_completed,
    chaptersRead:   r.chapters_read,
    postsCreated:   r.posts_created,
  }));
}

export async function getUserRank(userId) {
  const row = await queryOne(
    "SELECT rank FROM ranking_global WHERE user_id = $1",
    [userId]
  );
  return row?.rank ?? null;
}
