// FILE: backend/src/models/Shop.js
// DAL para loja de cosméticos, inventário e OmniCoins.

import { query, queryOne } from "../db/pool.js";

function itemShape(r) {
  if (!r) return null;
  return { id: r.id, slug: r.slug, name: r.name, description: r.description,
           type: r.type, priceCoins: r.price_coins, previewUrl: r.preview_url,
           cssClass: r.css_class, isAvailable: r.is_available, isLimited: r.is_limited,
           sortOrder: r.sort_order, owned: r.owned ?? false, equipped: r.equipped ?? false };
}

export async function listShopItems(userId = null) {
  const rows = await query(
    `SELECT s.*,
            (ui.user_id IS NOT NULL)::boolean as owned,
            (ui.is_equipped)::boolean as equipped
     FROM shop_items s
     LEFT JOIN user_inventory ui ON ui.item_id = s.id AND ui.user_id = $1
     WHERE s.is_available = true
     ORDER BY s.sort_order, s.name`,
    [userId]
  );
  return rows.map(itemShape);
}

export async function purchaseItem(userId, itemSlug) {
  const item = await queryOne("SELECT * FROM shop_items WHERE slug = $1 AND is_available = true", [itemSlug]);
  if (!item) throw Object.assign(new Error("Item não encontrado."), { status: 404 });

  const alreadyOwned = await queryOne("SELECT 1 FROM user_inventory WHERE user_id=$1 AND item_id=$2", [userId, item.id]);
  if (alreadyOwned) throw Object.assign(new Error("Você já possui este item."), { status: 409 });

  // Verifica e debita saldo
  const coins = await queryOne("SELECT balance FROM omnicoins WHERE user_id = $1", [userId]);
  if (!coins || coins.balance < item.price_coins) {
    throw Object.assign(new Error("OmniCoins insuficientes."), { status: 402 });
  }

  await query("UPDATE omnicoins SET balance = balance - $2, updated_at = NOW() WHERE user_id = $1", [userId, item.price_coins]);
  await query("INSERT INTO transactions (user_id,type,amount,reason,item_id) VALUES ($1,'spend',$2,'shop_purchase',$3)", [userId, item.price_coins, item.id]);
  await query("INSERT INTO user_inventory (user_id,item_id) VALUES ($1,$2)", [userId, item.id]);

  return itemShape(item);
}

export async function equipItem(userId, itemSlug) {
  const item = await queryOne("SELECT id,type FROM shop_items WHERE slug = $1", [itemSlug]);
  if (!item) throw Object.assign(new Error("Item não encontrado."), { status: 404 });

  const owned = await queryOne("SELECT * FROM user_inventory WHERE user_id=$1 AND item_id=$2", [userId, item.id]);
  if (!owned) throw Object.assign(new Error("Você não possui este item."), { status: 403 });

  // Desequipa outros itens do mesmo tipo
  await query(
    `UPDATE user_inventory SET is_equipped = false
     WHERE user_id = $1 AND item_id IN (
       SELECT id FROM shop_items WHERE type = $2
     )`,
    [userId, item.type]
  );
  await query("UPDATE user_inventory SET is_equipped = true WHERE user_id=$1 AND item_id=$2", [userId, item.id]);

  // Atualiza perfil com o cosmético equipado
  if (item.type === "avatar_frame") {
    await query("UPDATE profiles SET avatar_frame = $1 WHERE user_id = $2", [itemSlug, userId]);
  } else if (item.type === "badge") {
    await query("UPDATE profiles SET badge_slug = $1 WHERE user_id = $2", [itemSlug, userId]);
  }

  return { equipped: true, slug: itemSlug };
}

export async function getUserInventory(userId) {
  const rows = await query(
    `SELECT s.*, ui.is_equipped as equipped, ui.acquired_at
     FROM user_inventory ui
     JOIN shop_items s ON s.id = ui.item_id
     WHERE ui.user_id = $1
     ORDER BY ui.acquired_at DESC`,
    [userId]
  );
  return rows.map((r) => ({ ...itemShape(r), acquiredAt: r.acquired_at }));
}

export async function getCoinsBalance(userId) {
  const row = await queryOne("SELECT balance, total_earned FROM omnicoins WHERE user_id = $1", [userId]);
  return { balance: row?.balance ?? 0, totalEarned: row?.total_earned ?? 0 };
}

export async function getTransactions(userId, limit = 20) {
  const rows = await query(
    `SELECT t.*, s.name as item_name FROM transactions t
     LEFT JOIN shop_items s ON s.id = t.item_id
     WHERE t.user_id = $1 ORDER BY t.created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows.map((r) => ({
    id: r.id, type: r.type, amount: r.amount, reason: r.reason,
    itemName: r.item_name, createdAt: r.created_at,
  }));
}
