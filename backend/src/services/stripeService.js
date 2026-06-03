// FILE: backend/src/services/stripeService.js
// Wrapper do Stripe SDK.
// As chaves são lidas do banco (configuradas no Painel Admin do Patch #18)
// e nunca do .env — permitindo rotação sem reiniciar o servidor.

import Stripe from "stripe";
import { getApiKeyValues, getSetting } from "../models/Settings.js";
import { query, queryOne } from "../db/pool.js";

// Cache em memória das chaves (TTL de 5 minutos para não bater no banco em cada req)
let _stripeInstance = null;
let _keysLoadedAt   = 0;
const CACHE_TTL_MS  = 5 * 60 * 1000;

/**
 * Retorna uma instância do Stripe SDK com a secret key do banco.
 * Recria a instância se o cache expirou.
 */
export async function getStripe() {
  const now = Date.now();
  if (_stripeInstance && now - _keysLoadedAt < CACHE_TTL_MS) {
    return _stripeInstance;
  }

  const { stripe_secret_key: secretKey } = await getApiKeyValues(["stripe_secret_key"]);

  if (!secretKey) {
    throw new Error("Stripe secret key não configurada. Acesse o Painel Admin → APIs Externas.");
  }

  _stripeInstance = new Stripe(secretKey, { apiVersion: "2024-06-20" });
  _keysLoadedAt   = now;
  return _stripeInstance;
}

/**
 * Invalida o cache (chamado quando a key é atualizada no admin).
 */
export function invalidateStripeCache() {
  _stripeInstance = null;
  _keysLoadedAt   = 0;
}

// ── Customer ──────────────────────────────────────────────────────────────────

/**
 * Garante que o usuário tem um Stripe Customer. Cria se não existir.
 * @param {{ id: string, email: string, username: string }} user
 * @returns {Promise<string>} stripeCustomerId
 */
export async function ensureCustomer(user) {
  // Verifica se já tem customer_id no banco
  const row = await queryOne(
    "SELECT stripe_customer_id FROM users WHERE id = $1",
    [user.id]
  );

  if (row?.stripe_customer_id) return row.stripe_customer_id;

  // Cria no Stripe
  const stripe   = await getStripe();
  const customer = await stripe.customers.create({
    email:    user.email,
    name:     user.username,
    metadata: { omni_user_id: user.id },
  });

  // Salva no banco
  await query(
    "UPDATE users SET stripe_customer_id = $1 WHERE id = $2",
    [customer.id, user.id]
  );

  return customer.id;
}

// ── Subscription (Plano VIP) ──────────────────────────────────────────────────

/**
 * Cria uma Stripe Checkout Session para o plano VIP.
 * @param {{ id: string, email: string, username: string }} user
 * @param {string} successUrl
 * @param {string} cancelUrl
 */
export async function createSubscriptionCheckout(user, successUrl, cancelUrl) {
  const stripe     = await getStripe();
  const customerId = await ensureCustomer(user);

  const { stripe_vip_price_id: priceId } = await getApiKeyValues(["stripe_vip_price_id"]);
  if (!priceId) throw new Error("Stripe VIP Price ID não configurado no Painel Admin.");

  const session = await stripe.checkout.sessions.create({
    customer:    customerId,
    mode:        "subscription",
    line_items:  [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url:  cancelUrl,
    metadata:    { omni_user_id: user.id, type: "vip_subscription" },
    subscription_data: {
      metadata: { omni_user_id: user.id },
    },
  });

  return session;
}

// ── Payment Intent (Compra avulsa de OmniCoins) ────────────────────────────────

/**
 * Cria uma Checkout Session para compra de um pacote de OmniCoins.
 * @param {{ id: string, email: string, username: string }} user
 * @param {{ slug: string, name: string, coins: number, bonusCoins: number, priceBrl: number, stripePriceId: string }} pkg
 * @param {string} successUrl
 * @param {string} cancelUrl
 */
export async function createCoinPurchaseCheckout(user, pkg, successUrl, cancelUrl) {
  const stripe     = await getStripe();
  const customerId = await ensureCustomer(user);

  if (!pkg.stripePriceId) {
    throw new Error(`Price ID do pacote "${pkg.name}" não configurado no Painel Admin.`);
  }

  const session = await stripe.checkout.sessions.create({
    customer:    customerId,
    mode:        "payment",
    line_items:  [{ price: pkg.stripePriceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url:  cancelUrl,
    metadata: {
      omni_user_id: user.id,
      type:         "coin_purchase",
      pkg_slug:     pkg.slug,
      coins:        String(pkg.coins),
      bonus_coins:  String(pkg.bonusCoins),
    },
  });

  return session;
}

// ── Subscription Management ────────────────────────────────────────────────────

/**
 * Cancela a assinatura ao fim do período atual (não imediatamente).
 * @param {string} userId
 */
export async function cancelSubscription(userId) {
  const sub = await queryOne(
    "SELECT stripe_subscription_id FROM subscriptions WHERE user_id = $1 AND status = 'active'",
    [userId]
  );
  if (!sub?.stripe_subscription_id) throw new Error("Nenhuma assinatura ativa encontrada.");

  const stripe = await getStripe();
  await stripe.subscriptions.update(sub.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  await query(
    "UPDATE subscriptions SET cancel_at_period_end = true WHERE user_id = $1",
    [userId]
  );
}

/**
 * Abre o Stripe Customer Portal para o usuário gerenciar a assinatura.
 * @param {string} userId
 * @param {string} returnUrl
 */
export async function createPortalSession(userId, returnUrl) {
  const row = await queryOne("SELECT stripe_customer_id FROM users WHERE id = $1", [userId]);
  if (!row?.stripe_customer_id) throw new Error("Customer Stripe não encontrado.");

  const stripe  = await getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer:   row.stripe_customer_id,
    return_url: returnUrl,
  });

  return session.url;
}
