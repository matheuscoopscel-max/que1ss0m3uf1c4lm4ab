-- FILE: backend/migrations/007_create_admin.sql
-- Painel Admin: flag is_admin em users, app_settings e api_keys criptografadas.

-- ── Flag is_admin em users ─────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- O PRIMEIRO usuário cadastrado vira admin automaticamente via trigger
CREATE OR REPLACE FUNCTION auto_grant_first_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Se ainda não existe nenhum admin, promove o novo usuário
  IF NOT EXISTS (SELECT 1 FROM users WHERE is_admin = true) THEN
    NEW.is_admin := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_grant_first_admin ON users;
CREATE TRIGGER trg_auto_grant_first_admin
  BEFORE INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION auto_grant_first_admin();

-- Retroativo: se já existir usuário e nenhum for admin, promove o mais antigo
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE is_admin = true) THEN
    UPDATE users SET is_admin = true
    WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1);
  END IF;
END $$;

-- ── Tabela: app_settings (configurações gerais chave-valor) ────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT,
  description TEXT,
  is_public   BOOLEAN NOT NULL DEFAULT false,  -- true = frontend pode ler sem auth
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Configurações padrão
INSERT INTO app_settings (key, value, description, is_public) VALUES
  ('site_name',           'OmniMedia',       'Nome do site exibido na interface',        true),
  ('site_description',    'Agregador de mídias open-source', 'Descrição curta do site',  true),
  ('maintenance_mode',    'false',           'Ativa modo de manutenção',                 false),
  ('registration_open',   'true',            'Permite novos cadastros',                  false),
  ('max_post_length',     '2000',            'Tamanho máximo de posts em caracteres',    false),
  ('coins_per_chapter',   '1',               'OmniCoins ganhos por capítulo lido',       false),
  ('coins_login_daily',   '5',               'OmniCoins ganhos por login diário',        false),
  ('vip_price_brl',       '9.90',            'Preço mensal do VIP em BRL',               true),
  ('vip_coins_daily',     '10',              'OmniCoins extras por dia para VIPs',       false)
ON CONFLICT (key) DO NOTHING;

-- ── Tabela: api_keys (chaves externas criptografadas com AES-256-GCM) ──────────
CREATE TABLE IF NOT EXISTS api_keys (
  key         VARCHAR(100) PRIMARY KEY,   -- ex: stripe_secret_key, smtp_password
  value_enc   TEXT,                       -- valor criptografado (AES-256-GCM, base64)
  iv          VARCHAR(32),                -- initialization vector (hex)
  auth_tag    VARCHAR(32),                -- GCM auth tag (hex)
  description TEXT,
  is_sensitive BOOLEAN NOT NULL DEFAULT true,
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- API keys conhecidas (sem valor ainda — admin preenche pelo painel)
INSERT INTO api_keys (key, description, is_sensitive) VALUES
  ('stripe_publishable_key', 'Stripe Publishable Key (pk_...)',     false),
  ('stripe_secret_key',      'Stripe Secret Key (sk_...)',          true),
  ('stripe_webhook_secret',  'Stripe Webhook Signing Secret',       true),
  ('stripe_vip_price_id',    'Stripe Price ID do plano VIP mensal', false),
  ('smtp_host',              'Servidor SMTP para emails',            false),
  ('smtp_port',              'Porta SMTP (ex: 587)',                 false),
  ('smtp_user',              'Usuário SMTP',                         false),
  ('smtp_password',          'Senha SMTP',                          true),
  ('smtp_from',              'Email remetente (ex: noreply@...)',    false)
ON CONFLICT (key) DO NOTHING;

-- Trigger updated_at para app_settings
CREATE OR REPLACE FUNCTION set_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON app_settings;
CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION set_settings_updated_at();
