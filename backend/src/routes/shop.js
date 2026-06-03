// FILE: backend/src/routes/shop.js
// Rotas da loja: itens, compra, equipar, inventário, saldo de OmniCoins.

import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authenticateOptional } from "../middleware/authenticate.js";
import {
  listShopItems, purchaseItem, equipItem,
  getUserInventory, getCoinsBalance, getTransactions,
} from "../models/Shop.js";

export const shopRouter = Router();

// GET /api/shop/items
shopRouter.get("/items", authenticateOptional, async (req, res, next) => {
  try {
    const items = await listShopItems(req.user?.id ?? null);
    res.json({ success: true, items });
  } catch (err) { next(err); }
});

// POST /api/shop/purchase
shopRouter.post("/purchase", authenticate, async (req, res, next) => {
  const { slug } = req.body;
  if (!slug) return res.status(400).json({ success: false, message: "slug obrigatório." });
  try {
    const item = await purchaseItem(req.user.id, slug);
    res.status(201).json({ success: true, item });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
});

// POST /api/shop/equip
shopRouter.post("/equip", authenticate, async (req, res, next) => {
  const { slug } = req.body;
  if (!slug) return res.status(400).json({ success: false, message: "slug obrigatório." });
  try {
    const result = await equipItem(req.user.id, slug);
    res.json({ success: true, ...result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
});

// GET /api/me/inventory
shopRouter.get("/me/inventory", authenticate, async (req, res, next) => {
  try {
    const inventory = await getUserInventory(req.user.id);
    res.json({ success: true, inventory });
  } catch (err) { next(err); }
});

// GET /api/me/coins
shopRouter.get("/me/coins", authenticate, async (req, res, next) => {
  try {
    const coins = await getCoinsBalance(req.user.id);
    res.json({ success: true, ...coins });
  } catch (err) { next(err); }
});

// GET /api/me/transactions
shopRouter.get("/me/transactions", authenticate, async (req, res, next) => {
  try {
    const txs = await getTransactions(req.user.id);
    res.json({ success: true, transactions: txs });
  } catch (err) { next(err); }
});
