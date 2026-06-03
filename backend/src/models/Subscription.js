// FILE: backend/src/models/Subscription.js
// DAL para subscriptions e coin_packages.

import { query, queryOne } from "../db/pool.js";

// ── Subscriptions ─────────────────────────────────────────────────────────────

function subShape(r) {
  if (!r) return null;
  return {
    id:                   r.id,
    userId:               r.user_id,
    stripeCustomerId:     r.stripe_customer_id,
    stripeSubscriptionId: r.stripe_subscription_id,
    status:               r.status,
    currentPeriodStart:   r.current_period_start,
    currentPeriodEnd:     r.current_period_end,
    cancelAtPeriodEnd:    r.cancel_at_period_end,
    canceledAt:           r.canceled_at,
    createdAt:            r.created_at,
  };
}

export async function getSubscription(userId) {
  const row = await queryOne(
    "SELECT * FROM subscriptions WHERE user_id = $1",
    [userId]
  );
  return subShape(row);
}

export async function isVip(userId) {
  const row = await queryOne(
    "SELECT is_user_vip($1) AS vip",
    [userId]
  );
  return row?.vip === true;
}

export async function upsertSubscription({
  userId, stripeCustomerId, stripeSubscriptionId, stripePriceId,
  status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd,
}) {
  const row = await queryOne(
    `INSERT INTO subscriptions (
       user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id,
       status, current_period_start, current_period_end, cancel_at_period_end
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (user_id) DO UPDATE SET
       stripe_customer_id     = EXCLUDED.stripe_customer_id,
       stripe_subscription_id = EXCLUDED.stripe_subscription_id,
       stripe_price_id        = EXCLUDED.stripe_price_id,
       status                 = EXCLUDED.status,
       current_period_start   = EXCLUDED.current_period_start,
       current_period_end     = EXCLUDED.current_period_end,
       cancel_at_period_end   = EXCLUDED.cancel_at_period_end,
       updated_at             = NOW()
     RETURNING *`,
    [userId, stripeCustomerId, stripeSubscriptionId ?? null, stripePriceId ?? null,
     status, currentPeriodStart ?? null, currentPeriodEnd ?? null, cancelAtPeriodEnd ?? false]
  );
  return subShape(row);
}

// ── Coin Packages ─────────────────────────────────────────────────────────────

export async function listCoinPackages() {
  const rows = await query(
    "SELECT * FROM coin_packages WHERE is_active = true ORDER BY sort_order"
  );
  return rows.map((r) => ({
    id:          r.id,
    slug:        r.slug,
    name:        r.name,
    coins:       r.coins,
    bonusCoins:  r.bonus_coins,
    totalCoins:  r.coins + r.bonus_coins,
    priceBrl:    parseFloat(r.price_brl),
    stripePriceId: r.stripe_price_id,
    isFeatured:  r.is_featured,
  }));
}

export async function updatePackageStripePrice(slug, stripePriceId) {
  await query(
    "UPDATE coin_packages SET stripe_price_id = $1 WHERE slug = $2",
    [stripePriceId, slug]
  );
}
