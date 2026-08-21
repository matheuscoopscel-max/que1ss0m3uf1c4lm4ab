-- FILE: backend/migrations/013_create_content_sources.sql
-- Governança de plugins/repositórios: sai do modelo "usuário instala o que quiser"
-- e passa a ser curado exclusivamente pelo admin. Usuários comuns só consomem o
-- catálogo já aprovado; não adicionam repositórios nem ativam plugins individuais.

-- ── Tabela: repositories (fontes de índice index.json aprovadas pelo admin) ────
CREATE TABLE IF NOT EXISTS repositories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  url         TEXT        NOT NULL UNIQUE,
  name        TEXT,
  description TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  added_by    UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_repositories_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_repositories_updated_at ON repositories;
CREATE TRIGGER trg_repositories_updated_at
  BEFORE UPDATE ON repositories FOR EACH ROW EXECUTE FUNCTION set_repositories_updated_at();

-- ── Tabela: plugin_activations (quais slugs, dentro dos repositórios aprovados, ──
--    estão de fato ligados para todos os usuários) ─────────────────────────────
-- Ausência de linha (ou is_active = false) = plugin invisível na plataforma,
-- mesmo que apareça no index.json do repositório. Opt-in explícito do admin.
CREATE TABLE IF NOT EXISTS plugin_activations (
  slug         VARCHAR(100) PRIMARY KEY,
  name         TEXT,
  source_url   TEXT,        -- última URL de repositório onde esse slug foi visto (informativo)
  is_active    BOOLEAN      NOT NULL DEFAULT false,
  activated_by UUID         REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_plugin_activations_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_plugin_activations_updated_at ON plugin_activations;
CREATE TRIGGER trg_plugin_activations_updated_at
  BEFORE UPDATE ON plugin_activations FOR EACH ROW EXECUTE FUNCTION set_plugin_activations_updated_at();

-- ── Seed: repositório oficial da comunidade, já aprovado ────────────────────────
INSERT INTO repositories (url, name, description, is_active) VALUES
  (
    'https://raw.githubusercontent.com/matheuscoopscel-max/que1ss0m3uf1c4lm4ab/main/frontend/public/community-repo/index.json',
    'Repositório Oficial OmniMedia',
    'Plugins mantidos pela comunidade OmniMedia.',
    true
  )
ON CONFLICT (url) DO NOTHING;

-- ── Seed: plugins de fonte aberta/oficial já ativados por padrão ────────────────
-- MangaDex (API oficial) e Project Gutenberg (domínio público) mantêm o app
-- funcional para todo mundo logo após a migration rodar. Qualquer outro plugin
-- do catálogo (incluindo os de conteúdo adulto) fica OFF até o admin ativar
-- manualmente pelo painel — decisão dele, não automatizada aqui.
INSERT INTO plugin_activations (slug, name, source_url, is_active) VALUES
  ('mangadex-reader',  'MangaDex Reader',    'https://raw.githubusercontent.com/matheuscoopscel-max/que1ss0m3uf1c4lm4ab/main/frontend/public/community-repo/index.json', true),
  ('gutenberg-reader', 'Project Gutenberg',  'https://raw.githubusercontent.com/matheuscoopscel-max/que1ss0m3uf1c4lm4ab/main/frontend/public/community-repo/index.json', true)
ON CONFLICT (slug) DO NOTHING;
