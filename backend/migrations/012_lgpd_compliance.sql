-- FILE: backend/migrations/012_lgpd_compliance.sql
-- LGPD: tickets de suporte, consentimento de privacidade,
-- exclusão de conta, retenção de dados e anonimização de IPs.

-- ── Consentimento no cadastro (Art. 8 LGPD) ───────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS privacy_accepted_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS privacy_version      VARCHAR(10),  -- versão da política aceita
  ADD COLUMN IF NOT EXISTS marketing_consent    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS account_delete_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS account_delete_scheduled_at TIMESTAMPTZ;

-- Usuários existentes: retroativo (consideramos que aceitaram ao criar conta)
UPDATE users SET
  privacy_accepted_at = created_at,
  privacy_version     = '1.0'
WHERE privacy_accepted_at IS NULL;

-- ── Tabela: support_tickets ───────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM ('open','in_progress','resolved','closed');
  CREATE TYPE ticket_category AS ENUM (
    'bug',           -- erro / problema técnico
    'feature',       -- sugestão de funcionalidade
    'account',       -- problema com a conta
    'privacy',       -- solicitação LGPD (exclusão, portabilidade)
    'billing',       -- cobrança / VIP
    'plugin',        -- problema com extensão
    'other'          -- outros
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS support_tickets (
  id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID            REFERENCES users(id) ON DELETE SET NULL,
  -- Usuários não logados podem abrir tickets
  guest_email  VARCHAR(320),
  category     ticket_category NOT NULL DEFAULT 'other',
  subject      VARCHAR(200)    NOT NULL,
  message      TEXT            NOT NULL,
  status       ticket_status   NOT NULL DEFAULT 'open',
  -- Resposta do admin
  admin_reply  TEXT,
  replied_by   UUID            REFERENCES users(id) ON DELETE SET NULL,
  replied_at   TIMESTAMPTZ,
  -- Metadados
  ip_address   INET,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_user   ON support_tickets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status, created_at DESC);

DROP TRIGGER IF EXISTS trg_tickets_updated_at ON support_tickets;
CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Anonimização de IPs antigos (Art. 7, §7 LGPD) ────────────────────────────
-- Anonimiza IPs em logs com mais de 90 dias
CREATE OR REPLACE FUNCTION anonymize_old_ips()
RETURNS void AS $$
BEGIN
  -- Sessions expiradas: remove IP e user_agent
  UPDATE sessions SET
    ip_address = NULL,
    user_agent = NULL
  WHERE expires_at < NOW() - INTERVAL '90 days'
    AND ip_address IS NOT NULL;

  -- Security events com mais de 90 dias: mantém evento mas anonimiza IP
  UPDATE security_events SET
    ip_address = '0.0.0.0'::inet,
    user_agent = NULL
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND ip_address != '0.0.0.0'::inet;

  -- CSP violations: deleta (sem valor após 30 dias)
  DELETE FROM csp_violations WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ── Função: exporta todos os dados do usuário (portabilidade - Art. 18, V) ────
CREATE OR REPLACE FUNCTION export_user_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user        JSONB;
  v_profile     JSONB;
  v_library     JSONB;
  v_posts       JSONB;
  v_achievements JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id',         id,
    'email',      email,
    'username',   username,
    'created_at', created_at,
    'is_verified',is_verified,
    'last_login', last_login_at
  ) INTO v_user FROM users WHERE id = p_user_id;

  SELECT row_to_json(p)::jsonb INTO v_profile
  FROM profiles p WHERE user_id = p_user_id;

  SELECT jsonb_agg(row_to_json(l)) INTO v_library
  FROM user_library l WHERE user_id = p_user_id;

  SELECT jsonb_agg(jsonb_build_object(
    'content', content, 'created_at', created_at
  )) INTO v_posts
  FROM posts WHERE user_id = p_user_id AND is_hidden = false;

  SELECT jsonb_agg(jsonb_build_object(
    'achievement', a.name, 'unlocked_at', ua.unlocked_at
  )) INTO v_achievements
  FROM user_achievements ua
  JOIN achievements a ON a.id = ua.achievement_id
  WHERE ua.user_id = p_user_id;

  RETURN jsonb_build_object(
    'exported_at',  NOW(),
    'user',         v_user,
    'profile',      v_profile,
    'library',      COALESCE(v_library, '[]'),
    'posts',        COALESCE(v_posts, '[]'),
    'achievements', COALESCE(v_achievements, '[]')
  );
END;
$$ LANGUAGE plpgsql;

-- ── Função: agenda exclusão de conta (Art. 18, VI) ───────────────────────────
-- Dá 30 dias para o usuário cancelar antes da exclusão definitiva
CREATE OR REPLACE FUNCTION request_account_deletion(p_user_id UUID)
RETURNS TIMESTAMPTZ AS $$
DECLARE v_scheduled TIMESTAMPTZ;
BEGIN
  v_scheduled := NOW() + INTERVAL '30 days';
  UPDATE users SET
    account_delete_requested_at = NOW(),
    account_delete_scheduled_at = v_scheduled,
    is_active = false  -- desativa imediatamente mas mantém dados
  WHERE id = p_user_id;
  RETURN v_scheduled;
END;
$$ LANGUAGE plpgsql;

-- ── Função: executa exclusão definitiva de todos os dados ────────────────────
CREATE OR REPLACE FUNCTION execute_account_deletion(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Anonimiza posts (mantém o conteúdo mas desvincula do usuário)
  UPDATE posts SET user_id = NULL, content = '[conteúdo removido]'
  WHERE user_id = p_user_id;

  -- Deleta dados pessoais em cascata
  DELETE FROM user_library       WHERE user_id = p_user_id;
  DELETE FROM user_achievements  WHERE user_id = p_user_id;
  DELETE FROM user_xp            WHERE user_id = p_user_id;
  DELETE FROM notifications      WHERE user_id = p_user_id;
  DELETE FROM sessions           WHERE user_id = p_user_id;
  DELETE FROM omnicoins          WHERE user_id = p_user_id;
  DELETE FROM subscriptions      WHERE user_id = p_user_id;
  DELETE FROM profiles           WHERE user_id = p_user_id;

  -- Anonimiza o usuário (mantém ID para integridade referencial)
  UPDATE users SET
    email        = 'deleted_' || p_user_id || '@removed.local',
    username     = 'usuario_removido_' || LEFT(p_user_id::text, 8),
    password_hash = '',
    totp_secret  = NULL,
    totp_enabled = false,
    is_active    = false,
    stripe_customer_id = NULL
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;
