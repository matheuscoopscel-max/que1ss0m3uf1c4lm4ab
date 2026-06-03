// FILE: backend/src/middleware/requireAdmin.js
// Middleware que verifica se o usuário autenticado tem is_admin = true.
// Deve ser usado APÓS authenticate.

import { query } from "../db/pool.js";

/**
 * Verifica is_admin diretamente no banco (não confia apenas no JWT).
 * O JWT pode estar desatualizado se o admin foi promovido/rebaixado após o login.
 */
export async function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Autenticação necessária." });
  }

  try {
    const rows = await query(
      "SELECT is_admin FROM users WHERE id = $1 AND is_active = true",
      [req.user.id]
    );

    if (!rows[0]?.is_admin) {
      return res.status(403).json({ success: false, message: "Acesso restrito a administradores." });
    }

    next();
  } catch (err) {
    next(err);
  }
}
