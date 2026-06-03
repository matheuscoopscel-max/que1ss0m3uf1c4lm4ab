-- FILE: backend/migrations/005_create_profiles.sql
-- Perfis públicos de usuário: bio, avatar, banner, cosmetics, stats agregadas.

-- ── Tabela: profiles ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- Dados públicos
  display_name    VARCHAR(100),
  bio             TEXT,
  avatar_url      TEXT,           -- path local ou URL externa
  banner_url      TEXT,
  website_url     TEXT,
  is_public       BOOLEAN     NOT NULL DEFAULT true,

  -- Cosméticos (preparação para Patch #17)
  avatar_frame    VARCHAR(100),   -- slug do frame equipado
  badge_slug      VARCHAR(100),   -- badge de destaque

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- ── View: stats por usuário (calculada em tempo real) ──────────────────────────
-- Usada por GET /api/me/stats e GET /api/profiles/:username
CREATE OR REPLACE VIEW user_stats AS
SELECT
  u.id                                          AS user_id,
  u.username,
  -- Total de itens únicos na biblioteca
  COUNT(DISTINCT ul.id)                         AS total_items,
  -- Itens concluídos
  COUNT(DISTINCT CASE WHEN ul.status = 'completed' THEN ul.id END) AS completed_items,
  -- Favoritos
  COUNT(DISTINCT CASE WHEN ul.is_favorite = true  THEN ul.id END) AS favorite_items,
  -- Capítulo mais alto atingido (proxy de leitura)
  COALESCE(SUM(ul.current_chapter_num), 0)      AS total_chapters_read,
  -- Extensões instaladas
  COUNT(DISTINCT ui.plugin_slug)                AS plugins_installed,
  -- Última atividade
  MAX(ul.updated_at)                            AS last_activity
FROM users u
LEFT JOIN user_library      ul ON ul.user_id = u.id
LEFT JOIN user_installations ui ON ui.user_id = u.id
GROUP BY u.id, u.username;

-- ── Trigger updated_at ─────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Cria perfil vazio para usuários existentes ─────────────────────────────────
INSERT INTO profiles (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;
