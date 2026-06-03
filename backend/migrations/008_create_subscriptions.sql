-- FILE: backend/migrations/008_create_subscriptions.sql
-- Assinaturas VIP e pacotes de OmniCoins para integração com Stripe.

-- ── Enum: subscription_status ─────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM (
    'active',      -- assinatura ativa e paga
    'trialing',    -- em período de trial
    'past_due',    -- pagamento atrasado
    'canceled',    -- cancelada pelo usuário (acesso até o fim do período)
    'unpaid',      -- pagamento falhou definitivamente
    'incomplete'   -- criada mas pagamento não confirmado
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Tabela: subscriptions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID              NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id     VARCHAR(100)      NOT NULL,
  stripe_subscription_id VARCHAR(100)      UNIQUE,
  stripe_price_id        VARCHAR(100),
  status                 subscription_status NOT NULL DEFAULT 'incomplete',
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN           NOT NULL DEFAULT false,
  canceled_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user    ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe  ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON subscriptions(status);

-- ── Tabela: coin_packages (pacotes de OmniCoins para compra avulsa) ────────────
CREATE TABLE IF NOT EXISTS coin_packages (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             VARCHAR(50) NOT NULL UNIQUE,
  name             VARCHAR(100) NOT NULL,
  coins            INTEGER NOT NULL,
  bonus_coins      INTEGER NOT NULL DEFAULT 0,
  price_brl        NUMERIC(10,2) NOT NULL,
  stripe_price_id  VARCHAR(100),   -- preenchido via painel Admin após criar no Stripe
  is_active        BOOLEAN NOT NULL DEFAULT true,
  is_featured      BOOLEAN NOT NULL DEFAULT false,
  sort_order       INTEGER NOT NULL DEFAULT 0
);

-- Seed: 3 pacotes padrão
INSERT INTO coin_packages (slug, name, coins, bonus_coins, price_brl, is_featured, sort_order) VALUES
  ('coins-100',  '100 OmniCoins',  100,    0, 2.99, false, 1),
  ('coins-500',  '500 OmniCoins',  500,   50, 9.99, true,  2),
  ('coins-1200', '1200 OmniCoins', 1200, 200, 19.99, false, 3)
ON CONFLICT (slug) DO NOTHING;

-- ── Flag is_vip em users (view calculada) ─────────────────────────────────────
-- Em vez de coluna, usamos uma função que verifica a subscription ativa
CREATE OR REPLACE FUNCTION is_user_vip(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = p_user_id
      AND status IN ('active', 'trialing')
      AND (current_period_end IS NULL OR current_period_end > NOW())
  );
$$ LANGUAGE SQL STABLE;

-- ── Adiciona stripe_customer_id como referência rápida em users ───────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);

-- ── Trigger updated_at ────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── API keys para coin packages (admin preenche os Stripe Price IDs) ──────────
INSERT INTO api_keys (key, description, is_sensitive) VALUES
  ('stripe_price_coins_100',  'Stripe Price ID — Pacote 100 OmniCoins',  false),
  ('stripe_price_coins_500',  'Stripe Price ID — Pacote 500 OmniCoins',  false),
  ('stripe_price_coins_1200', 'Stripe Price ID — Pacote 1200 OmniCoins', false)
ON CONFLICT (key) DO NOTHING;
