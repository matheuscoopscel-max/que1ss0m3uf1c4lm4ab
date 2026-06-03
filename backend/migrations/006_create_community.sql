-- FILE: backend/migrations/006_create_community.sql
-- Comunidade: posts, comentários, reações, grupos, loja de cosméticos e OmniCoins.

-- ── OmniCoins: saldo de moeda virtual por usuário ─────────────────────────────
CREATE TABLE IF NOT EXISTS omnicoins (
  user_id     UUID   PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance     INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabela: posts ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id    UUID,                        -- null = feed global
  content     TEXT        NOT NULL,
  image_url   TEXT,
  -- Referência a uma obra (opcional)
  item_id         VARCHAR(255),
  item_title      VARCHAR(500),
  item_cover_url  TEXT,
  item_plugin_slug VARCHAR(100),
  -- Moderação
  is_pinned   BOOLEAN     NOT NULL DEFAULT false,
  is_hidden   BOOLEAN     NOT NULL DEFAULT false,
  -- Counters (desnormalizados para performance)
  likes_count    INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id    ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_group_id   ON posts(group_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- ── Tabela: post_reactions (likes e outras reações) ───────────────────────────
DO $$ BEGIN
  CREATE TYPE reaction_type AS ENUM ('like','love','fire','laugh','sad');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS post_reactions (
  post_id     UUID          NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction    reaction_type NOT NULL DEFAULT 'like',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

-- ── Tabela: comments ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id   UUID        REFERENCES comments(id) ON DELETE CASCADE,  -- respostas aninhadas
  content     TEXT        NOT NULL,
  likes_count INTEGER     NOT NULL DEFAULT 0,
  is_hidden   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id, created_at);

-- ── Tabela: groups ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS groups (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         VARCHAR(100) NOT NULL UNIQUE,
  name         VARCHAR(200) NOT NULL,
  description  TEXT,
  cover_url    TEXT,
  genre        VARCHAR(100),
  owner_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_public    BOOLEAN     NOT NULL DEFAULT true,
  member_count INTEGER     NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_slug      ON groups(slug);
CREATE INDEX IF NOT EXISTS idx_groups_genre     ON groups(genre);
CREATE INDEX IF NOT EXISTS idx_groups_members   ON groups(member_count DESC);

-- ── Tabela: group_members ─────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE group_role AS ENUM ('member','moderator','owner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS group_members (
  group_id   UUID       NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    UUID       NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  role       group_role NOT NULL DEFAULT 'member',
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- ── Tabela: shop_items (catálogo da loja) ─────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE shop_item_type AS ENUM ('avatar_frame','banner','badge','title_decoration');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS shop_items (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         VARCHAR(100)   NOT NULL UNIQUE,
  name         VARCHAR(200)   NOT NULL,
  description  TEXT,
  type         shop_item_type NOT NULL,
  price_coins  INTEGER        NOT NULL DEFAULT 0,
  preview_url  TEXT,           -- imagem de preview do cosmético
  css_class    VARCHAR(200),   -- classe CSS para aplicar o efeito
  is_available BOOLEAN        NOT NULL DEFAULT true,
  is_limited   BOOLEAN        NOT NULL DEFAULT false,
  sort_order   INTEGER        NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ── Tabela: user_inventory ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_inventory (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id      UUID        NOT NULL REFERENCES shop_items(id),
  is_equipped  BOOLEAN     NOT NULL DEFAULT false,
  acquired_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_user ON user_inventory(user_id);

-- ── Tabela: transactions (histórico de OmniCoins) ────────────────────────────
DO $$ BEGIN
  CREATE TYPE tx_type AS ENUM ('earn','spend','refund','admin_grant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS transactions (
  id          UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        tx_type  NOT NULL,
  amount      INTEGER  NOT NULL,
  reason      VARCHAR(200),
  item_id     UUID     REFERENCES shop_items(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id, created_at DESC);

-- ── Seed: itens iniciais da loja ──────────────────────────────────────────────
INSERT INTO shop_items (slug, name, description, type, price_coins, preview_url, css_class, sort_order) VALUES
  ('frame-gold',      'Frame Dourado',     'Moldura dourada premium para seu avatar.',  'avatar_frame', 500,  NULL, 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-om-bg',   1),
  ('frame-oni',       'Frame Oni',         'Moldura temática com a máscara Oni.',       'avatar_frame', 800,  NULL, 'ring-2 ring-om-accent ring-offset-2 ring-offset-om-bg shadow-om-accent/50 shadow-lg', 2),
  ('frame-blue',      'Frame Neon Blue',   'Moldura azul neon vibrante.',               'avatar_frame', 300,  NULL, 'ring-2 ring-sky-400 ring-offset-2 ring-offset-om-bg',      3),
  ('badge-early',     'Early Supporter',   'Badge exclusiva de apoiador inicial.',      'badge',        0,    NULL, NULL, 10),
  ('badge-reader',    'Leitor Dedicado',   'Ganho ao concluir 10 títulos.',             'badge',        0,    NULL, NULL, 11),
  ('banner-gradient', 'Banner Gradiente',  'Banner com gradiente de cores do OmniMedia.','banner',      200,  NULL, 'bg-gradient-to-r from-om-accent/40 via-violet-500/40 to-sky-500/40', 20)
ON CONFLICT (slug) DO NOTHING;

-- ── Função: creditar OmniCoins ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION earn_omnicoins(p_user_id UUID, p_amount INTEGER, p_reason VARCHAR)
RETURNS INTEGER AS $$
DECLARE v_balance INTEGER;
BEGIN
  INSERT INTO omnicoins (user_id, balance, total_earned)
    VALUES (p_user_id, p_amount, p_amount)
    ON CONFLICT (user_id) DO UPDATE SET
      balance      = omnicoins.balance      + p_amount,
      total_earned = omnicoins.total_earned + p_amount,
      updated_at   = NOW();
  INSERT INTO transactions (user_id, type, amount, reason)
    VALUES (p_user_id, 'earn', p_amount, p_reason);
  SELECT balance INTO v_balance FROM omnicoins WHERE user_id = p_user_id;
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- ── Triggers updated_at ────────────────────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['posts','comments','groups'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- Cria saldo inicial de OmniCoins para usuários existentes
INSERT INTO omnicoins (user_id) SELECT id FROM users ON CONFLICT (user_id) DO NOTHING;
