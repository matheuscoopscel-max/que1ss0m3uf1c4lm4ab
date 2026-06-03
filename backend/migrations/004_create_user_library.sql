-- FILE: backend/migrations/004_create_user_library.sql
-- Biblioteca pessoal: tracking de leitura/assistência por usuário.

-- ── Enum: library_status ──────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE library_status AS ENUM (
    'reading',    -- lendo (image-series / ebook)
    'watching',   -- assistindo (video-stream)
    'completed',  -- concluído
    'saved',      -- salvo para depois
    'favorite',   -- favorito (pode acumular com outros status)
    'dropped'     -- largado / abandonado
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Tabela principal: user_library ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_library (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plugin_slug     VARCHAR(100) NOT NULL,
  item_id         VARCHAR(255) NOT NULL,  -- id do item no escopo do plugin
  item_title      VARCHAR(500),
  item_cover_url  TEXT,
  item_media_type VARCHAR(30),            -- image-series | ebook | video-stream
  repository_url  TEXT,

  -- Status de leitura/assistência
  status          library_status NOT NULL DEFAULT 'saved',
  is_favorite     BOOLEAN        NOT NULL DEFAULT false,  -- favorito é independente do status

  -- Progresso
  current_chapter_id    VARCHAR(255),   -- id do capítulo/episódio atual
  current_chapter_title VARCHAR(500),
  current_chapter_num   INTEGER,
  total_chapters        INTEGER,        -- null = desconhecido

  -- Timestamps
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, plugin_slug, item_id)
);

-- ── Índices ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_library_user        ON user_library(user_id);
CREATE INDEX IF NOT EXISTS idx_user_library_status      ON user_library(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_library_favorite    ON user_library(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_user_library_updated     ON user_library(user_id, updated_at DESC);

-- ── Trigger updated_at ────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_user_library_updated_at ON user_library;
CREATE TRIGGER trg_user_library_updated_at
  BEFORE UPDATE ON user_library
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
