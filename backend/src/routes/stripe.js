// FILE: backend/src/routes/stripe.js
// Rotas de pagamento Stripe:
//   POST /api/stripe/checkout/subscription  — cria sessão de checkout VIP
//   POST /api/stripe/checkout/coins         — cria sessão de checkout de OmniCoins
//   POST /api/stripe/webhook                — recebe eventos do Stripe (raw body)
//   GET  /api/stripe/packages               — lista pacotes de OmniCoins
//   GET  /api/me/subscription               — status da assinatura
//   POST /api/me/subscription/cancel        — cancela ao fim do período
//   POST /api/me/subscription/portal        — abre Customer Portal Stripe

import express, { Router } from "express";
import { authenticate }      from "../middleware/authenticate.js";
import { getApiKeyValue }    from "../models/Settings.js";
import { getSubscription, upsertSubscription, listCoinPackages, isVip } from "../models/Subscription.js";
import {
  createSubscriptionCheckout,
  createCoinPurchaseCheckout,
  cancelSubscription,
  createPortalSession,
  getStripe,
} from "../services/stripeService.js";
import { query } from "../db/pool.js";

export const stripeRouter = Router();

// ── Lista pacotes de OmniCoins (público) ──────────────────────────────────────
stripeRouter.get("/packages", async (_req, res, next) => {
  try {
    const packages = await listCoinPackages();
    res.json({ success: true, packages });
  } catch (err) { next(err); }
});

// ── Checkout: VIP (Subscription) ─────────────────────────────────────────────
stripeRouter.post("/checkout/subscription", authenticate, async (req, res, next) => {
  try {
    const base = `${req.protocol}://${req.get("host")}`;
    const session = await createSubscriptionCheckout(
      req.user,
      `${base}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}&type=vip`,
      `${base}/api/stripe/cancel`
    );
    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── Checkout: Compra de OmniCoins ─────────────────────────────────────────────
stripeRouter.post("/checkout/coins", authenticate, async (req, res, next) => {
  const { packageSlug } = req.body;
  if (!packageSlug) return res.status(400).json({ success: false, message: "packageSlug obrigatório." });

  try {
    const packages = await listCoinPackages();
    const pkg      = packages.find((p) => p.slug === packageSlug);
    if (!pkg) return res.status(404).json({ success: false, message: "Pacote não encontrado." });

    const base    = `${req.protocol}://${req.get("host")}`;
    const session = await createCoinPurchaseCheckout(
      req.user,
      pkg,
      `${base}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}&type=coins`,
      `${base}/api/stripe/cancel`
    );
    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── Rotas de sucesso/cancelamento (redirect do Stripe) ────────────────────────
stripeRouter.get("/success", (_req, res) => {
  // Redireciona para o frontend — o webhook já processou o pagamento
  res.redirect("/?payment=success");
});
stripeRouter.get("/cancel", (_req, res) => {
  res.redirect("/?payment=canceled");
});

// ── Webhook (raw body necessário para verificação da assinatura) ───────────────
stripeRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const webhookSecret = await getApiKeyValue("stripe_webhook_secret");
    const signature     = req.headers["stripe-signature"];

    if (!webhookSecret || !signature) {
      return res.status(400).json({ error: "Webhook secret ou assinatura ausente." });
    }

    let event;
    try {
      const stripe = await getStripe();
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (err) {
      console.error("[Stripe Webhook] Verificação falhou:", err.message);
      return res.status(400).json({ error: "Assinatura inválida." });
    }

    console.info(`[Stripe Webhook] Evento: ${event.type}`);

    try {
      await handleStripeEvent(event);
    } catch (err) {
      console.error("[Stripe Webhook] Erro ao processar evento:", err.message);
      // Retorna 200 para evitar retentativas do Stripe em erros internos
    }

    res.json({ received: true });
  }
);

// ── Processar eventos do Stripe ────────────────────────────────────────────────
async function handleStripeEvent(event) {
  const data = event.data.object;

  switch (event.type) {

    // ── Checkout completado ─────────────────────────────────────────────────
    case "checkout.session.completed": {
      const meta   = data.metadata ?? {};
      const userId = meta.omni_user_id;
      if (!userId) break;

      if (meta.type === "vip_subscription") {
        // Atualiza/cria subscription (será refinada pelo subscription.updated)
        await upsertSubscription({
          userId,
          stripeCustomerId:     data.customer,
          stripeSubscriptionId: data.subscription,
          status:               "active",
        });
        console.info(`[Stripe] VIP ativado para user ${userId}`);
      }

      if (meta.type === "coin_purchase" && data.payment_status === "paid") {
        const coins      = parseInt(meta.coins ?? "0");
        const bonusCoins = parseInt(meta.bonus_coins ?? "0");
        const total      = coins + bonusCoins;
        await query("SELECT earn_omnicoins($1, $2, 'coin_purchase')", [userId, total]);
        console.info(`[Stripe] ${total} OmniCoins creditados para user ${userId}`);
      }
      break;
    }

    // ── Subscription criada/atualizada ──────────────────────────────────────
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const userId = await getUserIdByCustomer(data.customer);
      if (!userId) break;

      await upsertSubscription({
        userId,
        stripeCustomerId:     data.customer,
        stripeSubscriptionId: data.id,
        stripePriceId:        data.items?.data?.[0]?.price?.id,
        status:               data.status,
        currentPeriodStart:   new Date(data.current_period_start  * 1000),
        currentPeriodEnd:     new Date(data.current_period_end    * 1000),
        cancelAtPeriodEnd:    data.cancel_at_period_end ?? false,
      });

      // Credita OmniCoins diários de VIP via tabela de configuração
      if (data.status === "active") {
        const dailyCoins = 10; // fallback — idealmente lê de getSetting
        await query("SELECT earn_omnicoins($1, $2, 'vip_daily_renewal')", [userId, dailyCoins]);
      }
      break;
    }

    // ── Subscription deletada/cancelada ────────────────────────────────────
    case "customer.subscription.deleted": {
      const userId = await getUserIdByCustomer(data.customer);
      if (!userId) break;
      await upsertSubscription({
        userId,
        stripeCustomerId:     data.customer,
        stripeSubscriptionId: data.id,
        status:               "canceled",
        cancelAtPeriodEnd:    false,
        currentPeriodEnd:     new Date(data.current_period_end * 1000),
      });
      console.info(`[Stripe] VIP cancelado para user ${userId}`);
      break;
    }

    // ── Pagamento de invoice falhou ─────────────────────────────────────────
    case "invoice.payment_failed": {
      const userId = await getUserIdByCustomer(data.customer);
      if (!userId) break;
      await query(
        "UPDATE subscriptions SET status = 'past_due' WHERE user_id = $1",
        [userId]
      );
      break;
    }
  }
}

/** Busca o user_id pelo stripe_customer_id */
async function getUserIdByCustomer(customerId) {
  const row = await query(
    "SELECT id FROM users WHERE stripe_customer_id = $1",
    [customerId]
  );
  return row[0]?.id ?? null;
}

// ── Rotas /api/me/subscription* ───────────────────────────────────────────────
export const meSubscriptionRouter = Router();
meSubscriptionRouter.use(authenticate);

// GET /api/me/subscription
meSubscriptionRouter.get("/", async (req, res, next) => {
  try {
    const [sub, vip] = await Promise.all([
      getSubscription(req.user.id),
      isVip(req.user.id),
    ]);
    res.json({ success: true, subscription: sub, isVip: vip });
  } catch (err) { next(err); }
});

// POST /api/me/subscription/cancel
meSubscriptionRouter.post("/cancel", async (req, res, next) => {
  try {
    await cancelSubscription(req.user.id);
    res.json({ success: true, message: "Assinatura cancelada ao fim do período atual." });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/me/subscription/portal
meSubscriptionRouter.post("/portal", async (req, res, next) => {
  try {
    const returnUrl = `${req.protocol}://${req.get("host")}/?tab=profile`;
    const url       = await createPortalSession(req.user.id, returnUrl);
    res.json({ success: true, url });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});
