// FILE: backend/src/middleware/security.js
// Conjunto de middlewares de segurança aplicados globalmente.
// Ordem importa: requestId → helmet → sanitize → csrfCheck → slowDown

import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import slowDown from "express-slow-down";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../services/logger.js";

const IS_PROD    = process.env.NODE_ENV === "production";
const SITE_ORIGIN = process.env.CORS_ORIGINS?.split(",")[0] ?? "http://localhost:5173";

// ── 1. Request ID ─────────────────────────────────────────────────────────────
// Injeta um UUID em cada requisição para rastreamento nos logs.
export function requestId(req, res, next) {
  const id = req.headers["x-request-id"] || uuidv4();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}

// ── 2. Helmet (Headers HTTP de segurança) ─────────────────────────────────────
// CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.
export const helmetMiddleware = helmet({
  // HSTS: obriga HTTPS por 1 ano (só em produção)
  hsts: IS_PROD
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,

  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'"],
      styleSrc:       ["'self'", "'unsafe-inline'"],  // necessário para alguns frameworks CSS
      imgSrc:         ["'self'", "data:", "blob:", "https:"],
      connectSrc:     ["'self'", SITE_ORIGIN],
      fontSrc:        ["'self'", "https://fonts.gstatic.com"],
      objectSrc:      ["'none'"],
      frameSrc:       ["'none'"],
      frameAncestors: ["'none'"],            // previne clickjacking
      upgradeInsecureRequests: IS_PROD ? [] : null,
      reportUri:      ["/api/security/csp-report"],  // endpoint de report
    },
    reportOnly: !IS_PROD,  // em dev só reporta, não bloqueia
  },

  // X-Frame-Options: previne clickjacking
  frameguard:          { action: "deny" },

  // X-Content-Type-Options: previne MIME sniffing
  noSniff:             true,

  // Referrer-Policy
  referrerPolicy:      { policy: "strict-origin-when-cross-origin" },

  // Permissions-Policy: desativa APIs desnecessárias
  permissionsPolicy: {
    features: {
      camera:      [],
      microphone:  [],
      geolocation: [],
      payment:     ["self", SITE_ORIGIN],  // necessário para Stripe
    },
  },

  // X-Powered-By: false (oculta Express)
  hidePoweredBy: true,
});

// ── 3. Sanitização de input ───────────────────────────────────────────────────
// Remove operadores MongoDB ($where, $gt, etc.) de inputs para prevenir injection.
export const sanitizeInput = mongoSanitize({
  replaceWith:    "_",
  onSanitize:     ({ req, key }) => {
    logger.warn("[SECURITY] Tentativa de injection bloqueada", {
      requestId: req.requestId,
      ip:        req.ip,
      key,
      path:      req.path,
    });
  },
});

// ── 4. CSRF: verifica origin/referer em mutações ──────────────────────────────
// Proteção simples baseada em Same-Origin check.
// O token httpOnly cookie do JWT já serve como proteção implícita,
// mas este middleware adiciona uma camada extra para rotas de mutação.
export function csrfOriginCheck(req, res, next) {
  // Só aplica em mutações (POST, PATCH, PUT, DELETE)
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) return next();

  // Exclui o webhook do Stripe (usa assinatura própria)
  if (req.path === "/webhook") return next();

  // Exclui requests de apps nativos (Tauri, Capacitor — sem origin)
  const origin  = req.headers.origin  ?? "";
  const referer = req.headers.referer ?? "";

  if (!origin && !referer) {
    // Request de app nativo ou curl de backend — permite
    return next();
  }

  const allowed = (process.env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());

  const requestOrigin = origin || new URL(referer).origin;

  if (!allowed.includes(requestOrigin)) {
    logger.warn("[SECURITY] CSRF check falhou", {
      requestId: req.requestId,
      ip:        req.ip,
      origin:    requestOrigin,
      path:      req.path,
    });
    return res.status(403).json({ success: false, message: "Origem não autorizada." });
  }

  next();
}

// ── 5. Slow Down (anti brute-force incremental) ───────────────────────────────
// Depois de N requests rápidos do mesmo IP, começa a atrasar as respostas.
// Complementa o rate limiter — rate limiter bloqueia, slow down atrasa.
export const authSlowDown = slowDown({
  windowMs:          15 * 60 * 1000, // 15 minutos
  delayAfter:        5,               // atrasar após 5 requests
  delayMs:           (hits) => hits * 500, // +500ms por request acima do limite
  maxDelayMs:        5000,            // máximo 5s de atraso
  skip:              (req) => req.ip === "127.0.0.1" || req.ip === "::1",
});

// ── 6. Middleware de log de requests ──────────────────────────────────────────
// Loga todas as requisições com duração — útil para auditoria e debug.
export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const level    = res.statusCode >= 500 ? "error"
                   : res.statusCode >= 400 ? "warn"
                   : "debug";

    logger.log(level, `${req.method} ${req.path} ${res.statusCode} ${duration}ms`, {
      requestId:  req.requestId,
      ip:         req.ip,
      userId:     req.user?.id,
      userAgent:  req.headers["user-agent"]?.slice(0, 100),
      statusCode: res.statusCode,
      duration,
    });
  });

  next();
}

// ── 7. Validação de payload size por rota ─────────────────────────────────────
export const payloadLimits = {
  default: "50kb",
  upload:  "6mb",   // avatars/banners
  post:    "20kb",  // posts da comunidade
};
