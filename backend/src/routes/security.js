// FILE: backend/src/routes/security.js
// Rotas de segurança da conta:
//   GET  /api/security/status           — estado de segurança da conta
//   POST /api/security/2fa/setup        — gera QR code para configurar 2FA
//   POST /api/security/2fa/verify       — confirma código e ativa 2FA
//   POST /api/security/2fa/disable      — desativa 2FA (requer senha + código)
//   GET  /api/security/2fa/backup-codes — lista códigos de backup restantes
//   POST /api/security/2fa/backup-codes/regenerate — regenera códigos
//   GET  /api/security/events           — histórico de eventos (usuário)
//   POST /api/security/csp-report       — recebe violações de CSP do browser

import { Router } from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin }  from "../middleware/requireAdmin.js";
import { query, queryOne } from "../db/pool.js";
import { logger } from "../services/logger.js";
import {
  generateTotpSetup, verifyTotpToken,
  generateBackupCodes, useBackupCode,
} from "../services/twoFactorService.js";
import { verifyPassword } from "../services/authService.js";

export const securityRouter = Router();

// ── GET /api/security/status ──────────────────────────────────────────────────
securityRouter.get("/status", authenticate, async (req, res, next) => {
  try {
    const user = await queryOne(
      "SELECT totp_enabled, last_login_at, last_login_ip, failed_login_count, locked_until FROM users WHERE id = $1",
      [req.user.id]
    );
    const sessionCount = await queryOne(
      "SELECT COUNT(*)::int as count FROM sessions WHERE user_id = $1 AND is_revoked = false AND expires_at > NOW()",
      [req.user.id]
    );
    res.json({
      success: true,
      security: {
        twoFactorEnabled:  user?.totp_enabled ?? false,
        lastLoginAt:       user?.last_login_at,
        lastLoginIp:       user?.last_login_ip,
        failedLoginCount:  user?.failed_login_count ?? 0,
        isLocked:          user?.locked_until ? new Date(user.locked_until) > new Date() : false,
        activeSessions:    sessionCount?.count ?? 0,
      },
    });
  } catch (err) { next(err); }
});

// ── POST /api/security/2fa/setup ──────────────────────────────────────────────
// Gera QR code e segredo temporário. NÃO ativa ainda — o usuário precisa
// confirmar com um código TOTP válido via /2fa/verify.
securityRouter.post("/2fa/setup", authenticate, async (req, res, next) => {
  try {
    const user = await queryOne("SELECT username, totp_enabled FROM users WHERE id = $1", [req.user.id]);
    if (user?.totp_enabled) {
      return res.status(400).json({ success: false, message: "2FA já está ativo." });
    }

    const { secret, otpauthUrl, qrCodeDataUrl } = await generateTotpSetup(user.username);

    // Salva temporariamente o segredo (ainda não ativo)
    // Usa um campo separado para não sobrescrever um segredo ativo
    await query("UPDATE users SET totp_secret = $1 WHERE id = $2", [secret, req.user.id]);

    res.json({ success: true, qrCodeDataUrl, otpauthUrl, secret });
  } catch (err) { next(err); }
});

// ── POST /api/security/2fa/verify ────────────────────────────────────────────
securityRouter.post(
  "/2fa/verify",
  authenticate,
  [body("token").isLength({ min: 6, max: 8 }).isNumeric()],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const user = await queryOne(
        "SELECT totp_secret, totp_enabled FROM users WHERE id = $1",
        [req.user.id]
      );

      if (!user?.totp_secret) {
        return res.status(400).json({ success: false, message: "Execute /2fa/setup primeiro." });
      }
      if (user.totp_enabled) {
        return res.status(400).json({ success: false, message: "2FA já está ativo." });
      }

      const valid = verifyTotpToken(req.body.token, user.totp_secret);
      if (!valid) {
        await query("SELECT log_security_event($1,'2fa_failure',$2,$3,'{}','warn')", [req.user.id, req.ip, req.headers["user-agent"] ?? ""]);
        return res.status(400).json({ success: false, message: "Código inválido. Verifique o app autenticador." });
      }

      // Gera códigos de backup
      const { codes, hashes } = await generateBackupCodes();

      // Ativa 2FA
      await query(
        "UPDATE users SET totp_enabled = true, totp_backup_codes = $1 WHERE id = $2",
        [hashes, req.user.id]
      );

      await query("SELECT log_security_event($1,'2fa_enabled',$2,$3,'{}','info')", [req.user.id, req.ip, req.headers["user-agent"] ?? ""]);
      logger.info("[2FA] Ativado", { userId: req.user.id, ip: req.ip });

      res.json({
        success: true,
        message:     "2FA ativado com sucesso!",
        backupCodes: codes, // mostrar UMA VEZ ao usuário
      });
    } catch (err) { next(err); }
  }
);

// ── POST /api/security/2fa/disable ───────────────────────────────────────────
securityRouter.post(
  "/2fa/disable",
  authenticate,
  [
    body("password").notEmpty(),
    body("token").optional().isNumeric(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const user = await queryOne(
        "SELECT password_hash, totp_enabled, totp_secret FROM users WHERE id = $1",
        [req.user.id]
      );

      if (!user?.totp_enabled) {
        return res.status(400).json({ success: false, message: "2FA não está ativo." });
      }

      const passwordOk = await verifyPassword(req.body.password, user.password_hash);
      if (!passwordOk) {
        return res.status(401).json({ success: false, message: "Senha incorreta." });
      }

      if (req.body.token) {
        const tokenOk = verifyTotpToken(req.body.token, user.totp_secret);
        if (!tokenOk) {
          return res.status(400).json({ success: false, message: "Código 2FA inválido." });
        }
      }

      await query(
        "UPDATE users SET totp_enabled = false, totp_secret = NULL, totp_backup_codes = NULL WHERE id = $1",
        [req.user.id]
      );

      await query("SELECT log_security_event($1,'2fa_disabled',$2,$3,'{}','warn')", [req.user.id, req.ip, req.headers["user-agent"] ?? ""]);
      res.json({ success: true, message: "2FA desativado." });
    } catch (err) { next(err); }
  }
);

// ── POST /api/security/2fa/backup-codes/regenerate ───────────────────────────
securityRouter.post("/2fa/backup-codes/regenerate", authenticate, async (req, res, next) => {
  try {
    const user = await queryOne("SELECT totp_enabled FROM users WHERE id = $1", [req.user.id]);
    if (!user?.totp_enabled) {
      return res.status(400).json({ success: false, message: "2FA não está ativo." });
    }

    const { codes, hashes } = await generateBackupCodes();
    await query("UPDATE users SET totp_backup_codes = $1 WHERE id = $2", [hashes, req.user.id]);
    res.json({ success: true, backupCodes: codes });
  } catch (err) { next(err); }
});

// ── GET /api/security/events ──────────────────────────────────────────────────
securityRouter.get("/events", authenticate, async (req, res, next) => {
  try {
    const events = await query(
      `SELECT event_type, ip_address, severity, created_at
       FROM security_events WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ success: true, events });
  } catch (err) { next(err); }
});

// ── GET /api/admin/security/events (admin: todos os eventos críticos) ─────────
securityRouter.get("/admin/events", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const events = await query(
      `SELECT se.*, u.username
       FROM security_events se
       LEFT JOIN users u ON u.id = se.user_id
       WHERE se.severity IN ('warn','critical')
       ORDER BY se.created_at DESC LIMIT 100`
    );
    res.json({ success: true, events });
  } catch (err) { next(err); }
});

// ── POST /api/security/csp-report (recebe violações do browser) ───────────────
securityRouter.post("/csp-report", async (req, res) => {
  const report = req.body?.["csp-report"] ?? req.body;
  if (report) {
    await query(
      "INSERT INTO csp_violations (document_uri, violated_dir, blocked_uri, source_file, user_agent) VALUES ($1,$2,$3,$4,$5)",
      [report["document-uri"], report["violated-directive"], report["blocked-uri"], report["source-file"], req.headers["user-agent"] ?? ""]
    ).catch(() => {}); // silencioso
    logger.warn("[CSP] Violação reportada", {
      documentUri: report["document-uri"],
      violatedDir: report["violated-directive"],
      blockedUri:  report["blocked-uri"],
    });
  }
  res.status(204).end();
});
