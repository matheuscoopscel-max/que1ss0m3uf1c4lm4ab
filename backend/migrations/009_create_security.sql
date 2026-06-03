-- FILE: backend/migrations/009_create_security.sql
-- Segurança: 2FA TOTP, log de eventos de segurança, tentativas de login,
-- rotação de refresh tokens e política de senha.

-- ── 2FA em users ──────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS totp_secret      TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS totp_backup_codes TEXT[], -- códigos de recuperação hasheados
  ADD COLUMN IF NOT EXISTS last_login_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_ip    INET,
  ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until     TIMESTAMPTZ;   -- bloqueio temporário

-- ── Rotação de refresh tokens ─────────────────────────────────────────────────
-- Adiciona token_family para detectar reutilização (token theft detection)
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS token_family     UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS is_revoked       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rotation_count   INTEGER NOT NULL DEFAULT 0;

-- Índice para invalidar toda a família ao detectar roubo
CREATE INDEX IF NOT EXISTS idx_sessions_family ON sessions(token_family);

-- ── Tabela: security_events (audit log imutável) ──────────────────────────────
DO $$ BEGIN
  CREATE TYPE security_event_type AS ENUM (
    'login_success', 'login_failure', 'logout',
    'password_change', 'email_change',
    '2fa_enabled', '2fa_disabled', '2fa_failure',
    'admin_action', 'suspicious_request',
    'rate_limit_hit', 'token_reuse_detected',
    'account_locked', 'account_unlocked',
    'vip_activated', 'vip_canceled',
    'payment_success', 'payment_failure'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS security_events (
  id          UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID                 REFERENCES users(id) ON DELETE SET NULL,
  event_type  security_event_type  NOT NULL,
  ip_address  INET,
  user_agent  TEXT,
  metadata    JSONB,               -- dados extras (ex: admin action details)
  severity    VARCHAR(10)          NOT NULL DEFAULT 'info', -- info, warn, critical
  created_at  TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

-- Índices para queries de auditoria
CREATE INDEX IF NOT EXISTS idx_sec_events_user      ON security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_events_type      ON security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_events_severity  ON security_events(severity, created_at DESC) WHERE severity != 'info';
CREATE INDEX IF NOT EXISTS idx_sec_events_ip        ON security_events(ip_address, created_at DESC);

-- ── Função: registra evento de segurança ──────────────────────────────────────
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id    UUID,
  p_event_type security_event_type,
  p_ip         INET,
  p_ua         TEXT,
  p_metadata   JSONB DEFAULT '{}',
  p_severity   VARCHAR DEFAULT 'info'
) RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO security_events (user_id, event_type, ip_address, user_agent, metadata, severity)
  VALUES (p_user_id, p_event_type, p_ip, p_ua, p_metadata, p_severity)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ── Função: incrementa falhas de login (com lockout automático) ───────────────
CREATE OR REPLACE FUNCTION record_failed_login(p_user_id UUID)
RETURNS BOOLEAN AS $$  -- retorna TRUE se a conta foi bloqueada
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE users SET
    failed_login_count = failed_login_count + 1,
    locked_until = CASE
      WHEN failed_login_count + 1 >= 10 THEN NOW() + INTERVAL '30 minutes'
      WHEN failed_login_count + 1 >= 5  THEN NOW() + INTERVAL '5 minutes'
      ELSE NULL
    END
  WHERE id = p_user_id
  RETURNING failed_login_count INTO v_count;
  RETURN v_count >= 5;
END;
$$ LANGUAGE plpgsql;

-- ── Função: limpa tentativas após login bem-sucedido ─────────────────────────
CREATE OR REPLACE FUNCTION record_successful_login(p_user_id UUID, p_ip INET)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET
    failed_login_count = 0,
    locked_until       = NULL,
    last_login_at      = NOW(),
    last_login_ip      = p_ip
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ── Tabela: csp_violations (log de violações de CSP reportadas pelo browser) ──
CREATE TABLE IF NOT EXISTS csp_violations (
  id              UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  document_uri    TEXT,
  violated_dir    TEXT,
  blocked_uri     TEXT,
  source_file     TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-limpeza: mantém apenas 30 dias
CREATE OR REPLACE FUNCTION cleanup_old_security_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM security_events WHERE created_at < NOW() - INTERVAL '90 days' AND severity = 'info';
  DELETE FROM csp_violations  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
