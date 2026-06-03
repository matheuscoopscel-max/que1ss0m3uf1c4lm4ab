-- FILE: backend/migrations/011_create_ranking.sql
-- Sistema de XP, níveis, conquistas e ranking global.

-- ── Tabela: user_xp ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_xp (
  user_id      UUID    PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_xp     INTEGER NOT NULL DEFAULT 0,
  level        INTEGER NOT NULL DEFAULT 1,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabela: xp_history (histórico de ganhos) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS xp_history (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount     INTEGER     NOT NULL,
  reason     VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_history_user ON xp_history(user_id, created_at DESC);

-- ── Tabela: achievements (catálogo de conquistas) ────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(100) NOT NULL UNIQUE,
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  icon        VARCHAR(10),  -- emoji
  xp_reward   INTEGER NOT NULL DEFAULT 0,
  coins_reward INTEGER NOT NULL DEFAULT 0,
  -- Critério (checado em código)
  criteria_type  VARCHAR(50),  -- 'chapters_read','titles_completed','posts_created','login_streak', etc.
  criteria_value INTEGER,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ── Tabela: user_achievements ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_achievements (
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id),
  unlocked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements ON user_achievements(user_id);

-- ── Seed: conquistas iniciais ─────────────────────────────────────────────────
INSERT INTO achievements (slug, name, description, icon, xp_reward, coins_reward, criteria_type, criteria_value, sort_order) VALUES
  ('first_read',        'Primeira Leitura',       'Leu o primeiro capítulo',            '📖', 50,  10, 'chapters_read',    1,   1),
  ('reader_10',         'Leitor Dedicado',         'Leu 10 capítulos',                  '📚', 100, 20, 'chapters_read',    10,  2),
  ('reader_100',        'Leitor Voraz',            'Leu 100 capítulos',                 '🔥', 300, 50, 'chapters_read',    100, 3),
  ('reader_500',        'Maratonista',             'Leu 500 capítulos',                 '⚡', 750, 100,'chapters_read',    500, 4),
  ('first_complete',    'Obra Completa',           'Concluiu a primeira obra',           '🏆', 100, 25, 'titles_completed', 1,   5),
  ('complete_5',        'Colecionador',            'Concluiu 5 obras',                  '🎯', 250, 50, 'titles_completed', 5,   6),
  ('first_post',        'Primeiro Post',           'Publicou no feed da comunidade',    '💬', 30,  5,  'posts_created',    1,   7),
  ('poster_10',         'Membro Ativo',            'Fez 10 posts',                      '📣', 100, 20, 'posts_created',    10,  8),
  ('first_plugin',      'Explorador',              'Instalou a primeira extensão',       '🧩', 50,  10, 'plugins_installed',1,   9),
  ('early_supporter',   'Early Supporter',         'Criou conta no lançamento',         '⭐', 200, 50, NULL,               NULL,10)
ON CONFLICT (slug) DO NOTHING;

-- ── Cria registro de XP para usuários existentes ─────────────────────────────
INSERT INTO user_xp (user_id)
SELECT id FROM users ON CONFLICT (user_id) DO NOTHING;

-- ── XP retroativo baseado em atividade existente ─────────────────────────────
-- Capítulos lidos (estimativa baseada no progresso salvo)
UPDATE user_xp ux SET
  total_xp = total_xp + COALESCE(stats.chapter_xp, 0),
  updated_at = NOW()
FROM (
  SELECT user_id,
    COALESCE(SUM(last_chapter_read), 0) * 10 AS chapter_xp
  FROM user_library
  GROUP BY user_id
) stats
WHERE ux.user_id = stats.user_id;

-- Recalcula níveis após XP retroativo
UPDATE user_xp SET level = xp_to_level(total_xp);

-- Early Supporter: todos que já tinham conta desbloqueiam automaticamente
INSERT INTO user_achievements (user_id, achievement_id)
SELECT u.id, a.id
FROM users u
CROSS JOIN achievements a
WHERE a.slug = 'early_supporter'
ON CONFLICT DO NOTHING;

-- ── Função: calcula nível a partir do XP ─────────────────────────────────────
-- Fórmula: cada nível requer level * 100 XP
-- Nível 1: 0 XP, Nível 2: 100 XP, Nível 3: 300 XP, Nível 4: 600 XP...
CREATE OR REPLACE FUNCTION xp_to_level(p_xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_level INTEGER := 1;
  v_required INTEGER := 0;
BEGIN
  LOOP
    v_required := v_required + (v_level * 100);
    IF p_xp < v_required THEN
      RETURN v_level;
    END IF;
    v_level := v_level + 1;
    IF v_level > 100 THEN RETURN 100; END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- XP necessário para chegar ao próximo nível
CREATE OR REPLACE FUNCTION xp_for_next_level(p_current_level INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN p_current_level * 100;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ── Função: credita XP e atualiza nível ──────────────────────────────────────
CREATE OR REPLACE FUNCTION earn_xp(p_user_id UUID, p_amount INTEGER, p_reason VARCHAR)
RETURNS JSONB AS $$
DECLARE
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_total_xp  INTEGER;
BEGIN
  -- Garante registro
  INSERT INTO user_xp (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;

  -- Registra no histórico
  INSERT INTO xp_history (user_id, amount, reason) VALUES (p_user_id, p_amount, p_reason);

  -- Atualiza total e nível
  SELECT level INTO v_old_level FROM user_xp WHERE user_id = p_user_id;

  UPDATE user_xp SET
    total_xp   = total_xp + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING total_xp INTO v_total_xp;

  v_new_level := xp_to_level(v_total_xp);

  UPDATE user_xp SET level = v_new_level WHERE user_id = p_user_id;

  -- Bônus de nível ao subir
  IF v_new_level > v_old_level THEN
    PERFORM earn_omnicoins(p_user_id, v_new_level * 10, 'level_up_bonus');
  END IF;

  RETURN jsonb_build_object(
    'xp', v_total_xp,
    'level', v_new_level,
    'leveled_up', v_new_level > v_old_level,
    'old_level', v_old_level
  );
END;
$$ LANGUAGE plpgsql;

-- ── View: ranking global ──────────────────────────────────────────────────────
CREATE OR REPLACE VIEW ranking_global AS
SELECT
  ROW_NUMBER() OVER (ORDER BY ux.total_xp DESC) AS rank,
  u.id          AS user_id,
  u.username,
  pr.avatar_url,
  ux.total_xp,
  ux.level,
  COALESCE(stats.total_items, 0)      AS titles_in_library,
  COALESCE(stats.completed_items, 0)  AS titles_completed,
  COALESCE(stats.total_chapters_read, 0) AS chapters_read,
  COALESCE(pc.post_count, 0)          AS posts_created
FROM users u
JOIN user_xp ux ON ux.user_id = u.id
LEFT JOIN profiles pr ON pr.user_id = u.id
LEFT JOIN user_stats stats ON stats.user_id = u.id
LEFT JOIN (
  SELECT user_id, COUNT(*)::int AS post_count
  FROM posts WHERE is_hidden = false
  GROUP BY user_id
) pc ON pc.user_id = u.id
WHERE u.is_active = true
ORDER BY ux.total_xp DESC;
