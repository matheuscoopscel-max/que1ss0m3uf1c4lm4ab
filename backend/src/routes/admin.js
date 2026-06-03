// FILE: backend/src/routes/admin.js
// Rotas do painel admin — todas protegidas por authenticate + requireAdmin.
// GET  /api/admin/stats          — dashboard stats
// GET  /api/admin/users          — lista usuários
// PATCH /api/admin/users/:id     — banir/promover admin
// GET  /api/admin/posts          — lista posts (com opção de remover)
// DELETE /api/admin/posts/:id    — remove post
// GET  /api/admin/shop/items     — lista itens da loja
// POST /api/admin/shop/items     — cria item
// PATCH /api/admin/shop/items/:id — edita item
// GET  /api/admin/settings       — lista configurações
// POST /api/admin/settings       — atualiza configurações (bulk)
// GET  /api/admin/api-keys       — lista API keys (mascarado)
// POST /api/admin/api-keys       — salva API key criptografada

import { Router } from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin }  from "../middleware/requireAdmin.js";
import { query, queryOne } from "../db/pool.js";
import { listSettings, bulkSetSettings, listApiKeys, setApiKey } from "../models/Settings.js";

export const adminRouter = Router();
adminRouter.use(authenticate, requireAdmin);

// ── Dashboard Stats ───────────────────────────────────────────────────────────
adminRouter.get("/stats", async (_req, res, next) => {
  try {
    const [users, posts, txs, coins, subs] = await Promise.all([
      queryOne("SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE is_admin) ::int as admins, COUNT(*) FILTER (WHERE NOT is_active)::int as banned FROM users"),
      queryOne("SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int as today FROM posts"),
      queryOne("SELECT COUNT(*)::int as total, COALESCE(SUM(amount) FILTER (WHERE type = 'spend'), 0)::int as spent FROM transactions"),
      queryOne("SELECT COALESCE(SUM(balance),0)::int as in_circulation FROM omnicoins"),
      queryOne("SELECT COUNT(*)::int as active FROM subscriptions WHERE status = 'active'").catch(() => ({ active: 0 })),
    ]);
    res.json({ success: true, stats: { users, posts, transactions: txs, coins, subscriptions: subs } });
  } catch (err) { next(err); }
});

// ── Usuários ──────────────────────────────────────────────────────────────────
adminRouter.get("/users", async (req, res, next) => {
  const limit  = parseInt(req.query.limit  ?? "50");
  const offset = parseInt(req.query.offset ?? "0");
  const q      = req.query.q;
  try {
    const conditions = q ? ["(email ILIKE $3 OR username ILIKE $3)"] : [];
    const params = [limit, offset, ...(q ? [`%${q}%`] : [])];
    const rows = await query(
      `SELECT id, email, username, is_admin, is_active, is_verified, created_at
       FROM users ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
       ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      params
    );
    res.json({ success: true, users: rows });
  } catch (err) { next(err); }
});

adminRouter.patch("/users/:id", [
  body("isActive").optional().isBoolean(),
  body("isAdmin").optional().isBoolean(),
], async (req, res, next) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ success: false, errors: errs.array() });

  // Protege contra remoção do próprio admin
  if (req.params.id === req.user.id && req.body.isAdmin === false) {
    return res.status(400).json({ success: false, message: "Não é possível remover sua própria permissão de admin." });
  }

  try {
    const fields = [];
    const params = [];
    if (req.body.isActive !== undefined) { params.push(req.body.isActive); fields.push(`is_active = $${params.length}`); }
    if (req.body.isAdmin  !== undefined) { params.push(req.body.isAdmin);  fields.push(`is_admin  = $${params.length}`); }
    if (!fields.length) return res.status(400).json({ success: false, message: "Nada para atualizar." });

    params.push(req.params.id);
    const row = await queryOne(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${params.length} RETURNING id, email, username, is_admin, is_active`,
      params
    );
    if (!row) return res.status(404).json({ success: false, message: "Usuário não encontrado." });
    res.json({ success: true, user: row });
  } catch (err) { next(err); }
});

// ── Posts / Moderação ─────────────────────────────────────────────────────────
adminRouter.get("/posts", async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT p.*, u.username FROM posts p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC LIMIT 50 OFFSET $1`,
      [parseInt(req.query.offset ?? "0")]
    );
    res.json({ success: true, posts: rows });
  } catch (err) { next(err); }
});

adminRouter.delete("/posts/:id", async (req, res, next) => {
  try {
    await query("UPDATE posts SET is_hidden = true WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Loja ──────────────────────────────────────────────────────────────────────
adminRouter.get("/shop/items", async (_req, res, next) => {
  try {
    const rows = await query("SELECT * FROM shop_items ORDER BY sort_order, name");
    res.json({ success: true, items: rows });
  } catch (err) { next(err); }
});

adminRouter.post("/shop/items", [
  body("name").notEmpty(),
  body("type").isIn(["avatar_frame","banner","badge","title_decoration"]),
  body("priceCoins").isInt({ min: 0 }),
], async (req, res, next) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ success: false, errors: errs.array() });
  try {
    const slug = req.body.slug ?? req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const row = await queryOne(
      `INSERT INTO shop_items (slug,name,description,type,price_coins,preview_url,css_class,is_available,is_limited,sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [slug, req.body.name, req.body.description ?? null, req.body.type, req.body.priceCoins ?? 0,
       req.body.previewUrl ?? null, req.body.cssClass ?? null, req.body.isAvailable ?? true,
       req.body.isLimited ?? false, req.body.sortOrder ?? 0]
    );
    res.status(201).json({ success: true, item: row });
  } catch (err) { next(err); }
});

adminRouter.patch("/shop/items/:id", async (req, res, next) => {
  try {
    const fields = [], params = [];
    const map = {
      name: "name", description: "description", priceCoins: "price_coins",
      previewUrl: "preview_url", cssClass: "css_class",
      isAvailable: "is_available", isLimited: "is_limited", sortOrder: "sort_order",
    };
    for (const [jsKey, dbCol] of Object.entries(map)) {
      if (req.body[jsKey] !== undefined) { params.push(req.body[jsKey]); fields.push(`${dbCol} = $${params.length}`); }
    }
    if (!fields.length) return res.status(400).json({ success: false, message: "Nada para atualizar." });
    params.push(req.params.id);
    const row = await queryOne(`UPDATE shop_items SET ${fields.join(",")} WHERE id = $${params.length} RETURNING *`, params);
    if (!row) return res.status(404).json({ success: false, message: "Item não encontrado." });
    res.json({ success: true, item: row });
  } catch (err) { next(err); }
});

// ── Configurações gerais ──────────────────────────────────────────────────────
adminRouter.get("/settings", async (_req, res, next) => {
  try {
    const settings = await listSettings();
    res.json({ success: true, settings });
  } catch (err) { next(err); }
});

adminRouter.post("/settings", async (req, res, next) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== "object") {
    return res.status(400).json({ success: false, message: "Body deve conter { settings: { key: value } }." });
  }
  try {
    await bulkSetSettings(settings, req.user.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── API Keys ──────────────────────────────────────────────────────────────────
adminRouter.get("/api-keys", async (_req, res, next) => {
  try {
    const keys = await listApiKeys();
    res.json({ success: true, keys });
  } catch (err) { next(err); }
});

adminRouter.post("/api-keys", [
  body("key").notEmpty(),
  body("value").notEmpty().withMessage("Valor da API key não pode ser vazio."),
], async (req, res, next) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ success: false, errors: errs.array() });
  try {
    await setApiKey(req.body.key, req.body.value, req.user.id);
    res.json({ success: true, message: "API key salva com segurança." });
  } catch (err) { next(err); }
});
