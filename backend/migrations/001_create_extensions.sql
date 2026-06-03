-- FILE: backend/migrations/001_create_extensions.sql
-- Schema inicial do OmniMedia: tabela de extensões/plugins homologados.
-- Executar via: npm run migrate

-- ── Enum: content_rating ───────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE content_rating AS ENUM ('general', 'restricted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Enum: plugin_status ────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE plugin_status AS ENUM ('pending', 'approved', 'rejected', 'deprecated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Enum: media_type ───────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE media_type AS ENUM ('image-series', 'ebook', 'video-stream');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Tabela principal: extensions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS extensions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(100) NOT NULL UNIQUE,
  name            VARCHAR(200) NOT NULL,
  version         VARCHAR(30)  NOT NULL DEFAULT '0.0.1',
  author          VARCHAR(200) NOT NULL DEFAULT 'community',
  description     TEXT,
  category        VARCHAR(50)  NOT NULL,
  content_rating  content_rating NOT NULL DEFAULT 'general',
  media_types     media_type[]   NOT NULL DEFAULT '{}',
  icon_url        TEXT,
  repository_url  TEXT,
  script_url      TEXT         NOT NULL,
  status          plugin_status NOT NULL DEFAULT 'pending',
  homologated     BOOLEAN      NOT NULL DEFAULT false,
  install_count   INTEGER      NOT NULL DEFAULT 0,
  tags            TEXT[]       NOT NULL DEFAULT '{}',
  -- Campos de submissão comunitária
  submitter_ip    INET,
  rejection_reason TEXT,
  -- Timestamps
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Índices ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_extensions_status         ON extensions(status);
CREATE INDEX IF NOT EXISTS idx_extensions_content_rating ON extensions(content_rating);
CREATE INDEX IF NOT EXISTS idx_extensions_category       ON extensions(category);
CREATE INDEX IF NOT EXISTS idx_extensions_homologated    ON extensions(homologated);
-- Busca textual por nome e descrição
CREATE INDEX IF NOT EXISTS idx_extensions_search
  ON extensions USING gin(to_tsvector('portuguese', coalesce(name,'') || ' ' || coalesce(description,'')));

-- ── Trigger: atualiza updated_at automaticamente ──────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_extensions_updated_at ON extensions;
CREATE TRIGGER trg_extensions_updated_at
  BEFORE UPDATE ON extensions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
