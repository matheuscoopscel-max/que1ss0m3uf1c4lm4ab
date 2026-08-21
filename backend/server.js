// FILE: backend/server.js — Patch #20
// Pilha de segurança completa aplicada na ordem correta:
// requestId → helmet → sanitize → xss → csrfCheck → requestLogger → routes

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
dotenv.config();

// ── Validação obrigatória de variáveis de ambiente ────────────────────────────
const REQUIRED_ENV = ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[FATAL] Variáveis de ambiente ausentes: ${missing.join(", ")}`);
  process.exit(1);
}
if (!process.env.MASTER_KEY && process.env.NODE_ENV === "production") {
  console.error("[FATAL] MASTER_KEY não definida em produção.");
  process.exit(1);
}

import { logger } from "./src/services/logger.js";
import {
  requestId, helmetMiddleware, sanitizeInput,
  csrfOriginCheck, requestLogger,
} from "./src/middleware/security.js";
import { sanitizeXss } from "./src/middleware/inputSanitizer.js";
import rateLimit from "express-rate-limit";
import { apiLimiter }   from "./src/middleware/rateLimiter.js";
import { errorHandler } from "./src/middleware/errorHandler.js";

import { authRouter }                        from "./src/routes/auth.js";
import { meRouter }                          from "./src/routes/me.js";
import { libraryRouter }                     from "./src/routes/library.js";
import { profilesRouter, meProfileRouter }   from "./src/routes/profiles.js";
import { communityRouter }                   from "./src/routes/community.js";
import { shopRouter }                        from "./src/routes/shop.js";
import { adminRouter }                       from "./src/routes/admin.js";
import { stripeRouter, meSubscriptionRouter }from "./src/routes/stripe.js";
import { securityRouter }                    from "./src/routes/security.js";
import { rankingRouter }                     from "./src/routes/ranking.js";
import { supportRouter }                     from "./src/routes/support.js";
import { contentSourcesRouter }              from "./src/routes/contentSources.js";
import { testConnection }                    from "./src/db/pool.js";

const app  = express();
const PORT = process.env.PORT ?? 3001;
const IS_PROD = process.env.NODE_ENV === "production";

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:5173")
  .split(",").map((o) => o.trim());

app.use(cors({
  origin:         (origin, cb) => (!origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error(`Origem não permitida: ${origin}`))),
  methods:        ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  exposedHeaders: ["X-Request-Id"],
  credentials:    true,
}));

// ── 1. Request ID (primeiro de tudo) ─────────────────────────────────────────
app.use(requestId);

// ── 2. Helmet (headers de segurança) ─────────────────────────────────────────
app.use(helmetMiddleware);

// ── 3. Cookie Parser ─────────────────────────────────────────────────────────
app.use(cookieParser());

// ── 4. Body parsing — Stripe webhook ANTES do JSON global ────────────────────
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));

// ── 5. Sanitização de input ───────────────────────────────────────────────────
app.use(sanitizeInput);   // NoSQL / MongoDB injection
app.use(sanitizeXss);     // XSS em body/query/params

// ── 6. CSRF Origin Check ──────────────────────────────────────────────────────
app.use("/api", csrfOriginCheck);

// ── 7. Rate limiting global ───────────────────────────────────────────────────
app.use("/api", apiLimiter);

// ── 8. Request logger ────────────────────────────────────────────────────────
app.use(requestLogger);

// ── Serve uploads (avatars, banners) ─────────────────────────────────────────
app.use("/uploads", express.static("uploads"));

// ── Rotas ─────────────────────────────────────────────────────────────────────
app.use("/api/auth",              authRouter);
app.use("/api/me",                meRouter);
app.use("/api/me/library",        libraryRouter);
app.use("/api/me/profile",        meProfileRouter);
app.use("/api/me/subscription",   meSubscriptionRouter);
app.use("/api/profiles",          profilesRouter);
app.use("/api/community",         communityRouter);
app.use("/api/shop",              shopRouter);
app.use("/api/admin",             adminRouter);
app.use("/api/stripe",            stripeRouter);
app.use("/api/security",          securityRouter);
// Ranking, XP e conquistas — paths completos definidos dentro do router
app.use("/api",                   rankingRouter);
app.use("/api/support",           supportRouter);
app.use("/api",                   contentSourcesRouter);

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  const dbOk = await testConnection();
  res.status(dbOk ? 200 : 503).json({
    status:    dbOk ? "ok" : "degraded",
    version:   "5.0.0",
    db:        dbOk ? "connected" : "unavailable",
    timestamp: new Date().toISOString(),
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: "Rota não encontrada." }));

// ── Error handler (deve ser último) ──────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  logger.info(`[OmniMedia v5.0] Rodando na porta ${PORT} (${IS_PROD ? "production" : "development"})`);
  const dbOk = await testConnection();
  if (dbOk) logger.info("[OmniMedia v5.0] ✓ PostgreSQL conectado.");
  else       logger.warn("[OmniMedia v5.0] ⚠ Banco indisponível.");
});

export default app;

// ── Proxy de imagens — rate limit próprio (500/min, antes do apiLimiter global) ─
const proxyLimiter = rateLimit({ windowMs: 60_000, max: 500, standardHeaders: true, legacyHeaders: false });
app.get("/api/proxy/image", proxyLimiter, async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "url obrigatória" });

  // Permite apenas domínios conhecidos
  const allowed = [
    "uploads.mangadex.org",
    "cmdxd98ubmalmf.mangadex.network",
    "s2.mangadex.org",
    "s5.mangadex.org",
  ];

  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return res.status(400).json({ error: "URL inválida" });
  }

  const isAllowed = allowed.some((d) => hostname === d || hostname.endsWith("." + d));
  if (!isAllowed) return res.status(403).json({ error: "Domínio não permitido" });

  try {
    const response = await fetch(url, {
      headers: {
        "Referer":    "https://mangadex.org",
        "User-Agent": "Mozilla/5.0 (compatible; OmniMedia/1.0)",
      },
    });

    if (!response.ok) return res.status(response.status).end();

    // Repassa os headers de cache e content-type
    const ct = response.headers.get("content-type");
    if (ct) res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Stream direto da resposta para o cliente
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(502).json({ error: "Falha ao buscar imagem" });
  }
});
