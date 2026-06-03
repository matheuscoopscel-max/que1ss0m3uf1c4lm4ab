-- FILE: backend/migrations/003_create_users.sql
-- Sistema de contas: users, sessions (refresh tokens), user_installations.

-- ── Tabela: users ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(320) NOT NULL UNIQUE,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  is_verified   BOOLEAN      NOT NULL DEFAULT false,
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ── Tabela: sessions (refresh tokens) ─────────────────────────────────────
-- Cada login gera um refresh token armazenado aqui.
-- Permite logout de dispositivos específicos e detecção de roubo de token.
CREATE TABLE IF NOT EXISTS sessions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT        NOT NULL UNIQUE,
  user_agent    TEXT,
  ip_address    INET,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id       ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at    ON sessions(expires_at);

-- ── Tabela: user_installations (plugins por conta) ──────────────────────────
CREATE TABLE IF NOT EXISTS user_installations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plugin_slug   VARCHAR(100) NOT NULL,
  repository_url TEXT       NOT NULL,
  plugin_name   VARCHAR(200),
  plugin_version VARCHAR(30),
  installed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, plugin_slug)
);

CREATE INDEX IF NOT EXISTS idx_user_installations_user ON user_installations(user_id);

-- ── Trigger updated_at em users ────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Job de limpeza de sessões expiradas (chamado manualmente ou via cron) ──
-- Execute: SELECT cleanup_expired_sessions();
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
