// FILE: backend/src/routes/support.js
// Suporte ao usuário + endpoints LGPD (portabilidade, exclusão, anonimização).

import { Router } from "express";
import { body, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import { authenticate, authenticateOptional } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { query, queryOne } from "../db/pool.js";
import { logger } from "../services/logger.js";

export const supportRouter = Router();

// Rate limit específico para tickets (evita spam)
const ticketLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max:      5,
  message:  { success: false, message: "Você enviou muitas mensagens. Tente novamente em 1 hora." },
});

// ── POST /api/support/tickets — abre novo ticket ──────────────────────────────
supportRouter.post(
  "/tickets",
  ticketLimiter,
  authenticateOptional,
  [
    body("category").isIn(["bug","feature","account","privacy","billing","plugin","other"]),
    body("subject").trim().isLength({ min: 5, max: 200 }),
    body("message").trim().isLength({ min: 20, max: 5000 }),
    body("guestEmail").optional().isEmail().normalizeEmail(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { category, subject, message, guestEmail } = req.body;

    // Precisa de email se não estiver logado
    if (!req.user && !guestEmail) {
      return res.status(400).json({ success: false, message: "Email obrigatório para envio sem conta." });
    }

    try {
      const ticket = await queryOne(
        `INSERT INTO support_tickets (user_id, guest_email, category, subject, message, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, category, subject, status, created_at`,
        [
          req.user?.id ?? null,
          req.user ? null : guestEmail,
          category, subject, message,
          req.ip, req.headers["user-agent"] ?? null,
        ]
      );

      logger.info("[SUPPORT] Novo ticket", {
        ticketId: ticket.id, category, userId: req.user?.id,
      });

      res.status(201).json({ success: true, ticket });
    } catch (err) { next(err); }
  }
);

// ── GET /api/support/tickets — lista tickets do usuário ──────────────────────
supportRouter.get("/tickets", authenticate, async (req, res, next) => {
  try {
    const tickets = await query(
      `SELECT id, category, subject, status, admin_reply, created_at, updated_at
       FROM support_tickets WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json({ success: true, tickets });
  } catch (err) { next(err); }
});

// ── Admin: lista todos os tickets ─────────────────────────────────────────────
supportRouter.get("/admin/tickets", authenticate, requireAdmin, async (req, res, next) => {
  const status = req.query.status;
  try {
    const rows = await query(
      `SELECT t.*, u.username, u.email as user_email
       FROM support_tickets t
       LEFT JOIN users u ON u.id = t.user_id
       ${status ? "WHERE t.status = $1" : ""}
       ORDER BY t.created_at DESC LIMIT 50`,
      status ? [status] : []
    );
    res.json({ success: true, tickets: rows });
  } catch (err) { next(err); }
});

// ── Admin: responde ticket ────────────────────────────────────────────────────
supportRouter.patch(
  "/admin/tickets/:id",
  authenticate, requireAdmin,
  [body("reply").trim().notEmpty(), body("status").isIn(["open","in_progress","resolved","closed"])],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
      const ticket = await queryOne(
        `UPDATE support_tickets SET
           admin_reply = $1, status = $2,
           replied_by  = $3, replied_at = NOW(), updated_at = NOW()
         WHERE id = $4 RETURNING *`,
        [req.body.reply, req.body.status, req.user.id, req.params.id]
      );
      if (!ticket) return res.status(404).json({ success: false, message: "Ticket não encontrado." });
      res.json({ success: true, ticket });
    } catch (err) { next(err); }
  }
);

// ── LGPD: exporta dados do usuário (Art. 18, V) ───────────────────────────────
supportRouter.get("/privacy/export", authenticate, async (req, res, next) => {
  try {
    const result = await queryOne(
      "SELECT export_user_data($1) AS data",
      [req.user.id]
    );

    const data = result?.data ?? {};

    logger.info("[LGPD] Exportação de dados solicitada", { userId: req.user.id, ip: req.ip });

    // Retorna como download JSON
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="omnimedia-dados-${req.user.id.slice(0,8)}.json"`);
    res.send(JSON.stringify(data, null, 2));
  } catch (err) { next(err); }
});

// ── LGPD: solicita exclusão de conta (Art. 18, VI) ───────────────────────────
supportRouter.post("/privacy/delete-account", authenticate, async (req, res, next) => {
  try {
    const scheduled = await queryOne(
      "SELECT request_account_deletion($1) AS scheduled_at",
      [req.user.id]
    );

    logger.warn("[LGPD] Exclusão de conta solicitada", { userId: req.user.id, ip: req.ip });

    // Abre ticket automático de privacy para registro
    await query(
      `INSERT INTO support_tickets (user_id, category, subject, message, ip_address)
       VALUES ($1, 'privacy', 'Solicitação de exclusão de conta', 'Usuário solicitou exclusão permanente de sua conta e dados.', $2)`,
      [req.user.id, req.ip]
    );

    res.json({
      success:     true,
      message:     "Solicitação recebida. Sua conta será excluída em 30 dias. Você pode cancelar fazendo login até lá.",
      scheduledAt: scheduled?.scheduled_at,
    });
  } catch (err) { next(err); }
});

// ── LGPD: cancela solicitação de exclusão ─────────────────────────────────────
supportRouter.post("/privacy/cancel-deletion", authenticate, async (req, res, next) => {
  try {
    await query(
      `UPDATE users SET
         account_delete_requested_at = NULL,
         account_delete_scheduled_at = NULL,
         is_active = true
       WHERE id = $1`,
      [req.user.id]
    );
    logger.info("[LGPD] Exclusão de conta cancelada", { userId: req.user.id });
    res.json({ success: true, message: "Solicitação de exclusão cancelada. Sua conta está ativa." });
  } catch (err) { next(err); }
});

// ── GET /api/support/privacy/status — status LGPD do usuário ─────────────────
supportRouter.get("/privacy/status", authenticate, async (req, res, next) => {
  try {
    const user = await queryOne(
      "SELECT privacy_accepted_at, privacy_version, marketing_consent, account_delete_scheduled_at FROM users WHERE id = $1",
      [req.user.id]
    );
    res.json({ success: true, privacy: user });
  } catch (err) { next(err); }
});

// ── POST /api/support/privacy/consent — atualiza consentimento ───────────────
supportRouter.post("/privacy/consent", authenticate, async (req, res, next) => {
  const { marketing } = req.body;
  try {
    await query(
      "UPDATE users SET marketing_consent = $1, privacy_accepted_at = NOW(), privacy_version = '1.0' WHERE id = $2",
      [marketing ?? false, req.user.id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});
