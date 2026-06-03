// FILE: backend/src/routes/auth.js — Patch #20
// Auth endurecida: lockout por conta, rotação de refresh token (token family),
// detecção de reutilização de token roubado, log de eventos de segurança,
// verificação de 2FA no login.

import { Router } from "express";
import { body, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import {
  hashPassword, verifyPassword,
  generateAccessToken, generateRefreshToken, refreshTokenExpiresAt,
} from "../services/authService.js";
import {
  createUser, findUserByEmail, checkUniqueness,
  createSession, findSession, touchSession, deleteSession, deleteAllSessions,
} from "../models/User.js";
import { authenticate } from "../middleware/authenticate.js";
import { authSlowDown } from "../middleware/security.js";
import { query, queryOne } from "../db/pool.js";
import { logger } from "../services/logger.js";
import { verifyTotpToken, useBackupCode } from "../services/twoFactorService.js";
import { v4 as uuidv4 } from "uuid";

export const authRouter = Router();

const IS_PROD     = process.env.NODE_ENV === "production";
const COOKIE_NAME = IS_PROD ? "__Host-omni_refresh" : "omni_refresh";

// Rate limiter mais restritivo para auth
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  message:         { success: false, message: "Muitas tentativas. Aguarde 15 minutos." },
  standardHeaders: true,
  legacyHeaders:   false,
  skipSuccessfulRequests: true,
});

function setRefreshCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: IS_PROD ? "strict" : "lax",
    maxAge:   7 * 24 * 60 * 60 * 1000,
    path:     "/api/auth",
    ...(IS_PROD ? { prefix: "__Host-" } : {}),
  });
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
authRouter.post(
  "/register",
  authLimiter,
  [
    body("email").isEmail().normalizeEmail(),
    body("username")
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_-]+$/),
    body("privacyAccepted").equals("true").withMessage("Você precisa aceitar a Política de Privacidade para criar uma conta."),
    body("password")
      .isLength({ min: 8 })
      .matches(/[A-Z]/).withMessage("Senha precisa de ao menos uma letra maiúscula.")
      .matches(/[0-9]/).withMessage("Senha precisa de ao menos um número."),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      const { email, username, password } = req.body;
      const { emailTaken, usernameTaken } = await checkUniqueness(email, username);
      if (emailTaken)    return res.status(409).json({ success: false, message: "Email já cadastrado." });
      if (usernameTaken) return res.status(409).json({ success: false, message: "Username já em uso." });

      const passwordHash  = await hashPassword(password);
      const user          = await createUser({ email, username, passwordHash });
      // Registra consentimento da Política de Privacidade (LGPD Art. 8)
      await query(
        "UPDATE users SET privacy_accepted_at = NOW(), privacy_version = '1.0' WHERE id = $1",
        [user.id]
      ).catch(() => {});
      const tokenFamily   = uuidv4();
      const refreshToken  = generateRefreshToken();

      await createSession({
        userId: user.id, refreshToken,
        expiresAt: refreshTokenExpiresAt(),
        userAgent: req.headers["user-agent"], ip: req.ip,
        tokenFamily,
      });

      // Cria registro de OmniCoins com bônus de boas-vindas e perfil
      await query("INSERT INTO omnicoins (user_id) VALUES ($1) ON CONFLICT DO NOTHING", [user.id]);
      await query("SELECT earn_omnicoins($1, 10, 'welcome_bonus')", [user.id]);
      await query("SELECT earn_xp($1, 50, 'register')", [user.id]).catch(() => {});
      await query("INSERT INTO profiles  (user_id) VALUES ($1) ON CONFLICT DO NOTHING", [user.id]);

      await query(
        "SELECT log_security_event($1,'login_success',$2,$3,$4,'info')",
        [user.id, req.ip, req.headers["user-agent"] ?? "", JSON.stringify({ action: "register" })]
      );

      const accessToken = generateAccessToken(user);
      setRefreshCookie(res, refreshToken);
      res.status(201).json({ success: true, accessToken, user: { id: user.id, email: user.email, username: user.username } });
    } catch (err) { next(err); }
  }
);

// ── POST /api/auth/login ──────────────────────────────────────────────────────
authRouter.post(
  "/login",
  authSlowDown,
  authLimiter,
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { email, password, totpToken, backupCode } = req.body;
      const user = await findUserByEmail(email);

      // Resposta genérica para não vazar se email existe
      const INVALID_MSG = "Email ou senha incorretos.";

      if (!user || !user.is_active) {
        logger.warn("[AUTH] Login falhou — usuário não encontrado ou inativo", { ip: req.ip, email });
        return res.status(401).json({ success: false, message: INVALID_MSG });
      }

      // Verifica bloqueio por tentativas excessivas
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const unlockIn = Math.ceil((new Date(user.locked_until) - Date.now()) / 60000);
        logger.warn("[AUTH] Login bloqueado por lockout", { ip: req.ip, userId: user.id });
        await query("SELECT log_security_event($1,'account_locked',$2,$3,'{}','warn')", [user.id, req.ip, req.headers["user-agent"] ?? ""]);
        return res.status(429).json({
          success: false,
          message: `Conta temporariamente bloqueada. Tente novamente em ${unlockIn} minuto(s).`,
        });
      }

      const passwordOk = await verifyPassword(password, user.password_hash);
      if (!passwordOk) {
        const wasLocked = await queryOne("SELECT record_failed_login($1) AS locked", [user.id]);
        await query("SELECT log_security_event($1,'login_failure',$2,$3,'{}','warn')", [user.id, req.ip, req.headers["user-agent"] ?? ""]);
        logger.warn("[AUTH] Login falhou — senha incorreta", { ip: req.ip, userId: user.id, locked: wasLocked?.locked });
        return res.status(401).json({ success: false, message: INVALID_MSG });
      }

      // ── 2FA ──────────────────────────────────────────────────────────────
      if (user.totp_enabled) {
        if (!totpToken && !backupCode) {
          // Senha OK mas 2FA necessário — retorna challenge
          return res.status(200).json({ success: false, requires2FA: true });
        }

        let twoFactorOk = false;

        if (totpToken) {
          twoFactorOk = verifyTotpToken(totpToken, user.totp_secret);
        } else if (backupCode) {
          const { valid, remainingHashes } = await useBackupCode(backupCode, user.totp_backup_codes ?? []);
          if (valid) {
            twoFactorOk = true;
            // Atualiza os códigos removendo o utilizado
            await query("UPDATE users SET totp_backup_codes = $1 WHERE id = $2", [remainingHashes, user.id]);
          }
        }

        if (!twoFactorOk) {
          await query("SELECT log_security_event($1,'2fa_failure',$2,$3,'{}','warn')", [user.id, req.ip, req.headers["user-agent"] ?? ""]);
          return res.status(401).json({ success: false, message: "Código 2FA inválido." });
        }
      }

      // ── Login bem-sucedido ────────────────────────────────────────────────
      await queryOne("SELECT record_successful_login($1, $2::inet)", [user.id, req.ip]);

      const tokenFamily  = uuidv4();
      const refreshToken = generateRefreshToken();
      await createSession({
        userId: user.id, refreshToken,
        expiresAt: refreshTokenExpiresAt(),
        userAgent: req.headers["user-agent"], ip: req.ip,
        tokenFamily,
      });

      await query("SELECT log_security_event($1,'login_success',$2,$3,'{}','info')", [user.id, req.ip, req.headers["user-agent"] ?? ""]);

      const accessToken = generateAccessToken(user);
      setRefreshCookie(res, refreshToken);
      res.json({ success: true, accessToken, user: { id: user.id, email: user.email, username: user.username } });
    } catch (err) { next(err); }
  }
);

// ── POST /api/auth/refresh (com rotação de token) ─────────────────────────────
authRouter.post("/refresh", async (req, res, next) => {
  const refreshToken = req.cookies?.[COOKIE_NAME];
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: "Refresh token não encontrado." });
  }

  try {
    const session = await findSession(refreshToken);

    if (!session) {
      // Token não encontrado — pode ser reutilização após rotação (token theft)
      // Tenta encontrar a família para revogar todas as sessões
      const stolen = await queryOne(
        "SELECT user_id, token_family FROM sessions WHERE refresh_token = $1 AND is_revoked = true LIMIT 1",
        [refreshToken]
      );

      if (stolen) {
        // Token revogado foi reutilizado — sinal de roubo, invalida toda a família
        logger.warn("[SECURITY] Token theft detectado — revogando família inteira", {
          ip: req.ip, userId: stolen.user_id, family: stolen.token_family,
        });
        await query(
          "UPDATE sessions SET is_revoked = true WHERE token_family = $1",
          [stolen.token_family]
        );
        await query("SELECT log_security_event($1,'token_reuse_detected',$2,$3,'{}','critical')", [stolen.user_id, req.ip, req.headers["user-agent"] ?? ""]);
      }

      res.clearCookie(COOKIE_NAME, { path: "/api/auth" });
      return res.status(401).json({ success: false, message: "Sessão inválida." });
    }

    if (!session.is_active || session.is_revoked) {
      res.clearCookie(COOKIE_NAME, { path: "/api/auth" });
      return res.status(401).json({ success: false, message: "Sessão expirada." });
    }

    // ── Rotação: revoga o token atual e gera um novo ──────────────────────
    await query(
      "UPDATE sessions SET is_revoked = true, rotation_count = rotation_count + 1 WHERE refresh_token = $1",
      [refreshToken]
    );

    const newRefreshToken = generateRefreshToken();
    await createSession({
      userId:      session.user_id,
      refreshToken: newRefreshToken,
      expiresAt:   refreshTokenExpiresAt(),
      userAgent:   req.headers["user-agent"],
      ip:          req.ip,
      tokenFamily: session.token_family, // mantém a mesma família
    });

    const accessToken = generateAccessToken({
      id: session.user_id, email: session.email, username: session.username,
    });

    setRefreshCookie(res, newRefreshToken);
    res.json({ success: true, accessToken, user: { id: session.user_id, email: session.email, username: session.username } });
  } catch (err) { next(err); }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
authRouter.post("/logout", async (req, res, next) => {
  const refreshToken = req.cookies?.[COOKIE_NAME];
  try {
    if (refreshToken) {
      await query("UPDATE sessions SET is_revoked = true WHERE refresh_token = $1", [refreshToken]);
      const session = await queryOne("SELECT user_id FROM sessions WHERE refresh_token = $1", [refreshToken]);
      if (session) {
        await query("SELECT log_security_event($1,'logout',$2,$3,'{}','info')", [session.user_id, req.ip, req.headers["user-agent"] ?? ""]);
      }
    }
    res.clearCookie(COOKIE_NAME, { path: "/api/auth" });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── POST /api/auth/logout-all ─────────────────────────────────────────────────
authRouter.post("/logout-all", authenticate, async (req, res, next) => {
  try {
    await query("UPDATE sessions SET is_revoked = true WHERE user_id = $1", [req.user.id]);
    res.clearCookie(COOKIE_NAME, { path: "/api/auth" });
    res.json({ success: true });
  } catch (err) { next(err); }
});
