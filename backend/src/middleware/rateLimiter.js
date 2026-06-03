// FILE: backend/src/middleware/rateLimiter.js
// Rate limiters para proteger a API de abuso.
// Usa express-rate-limit com armazenamento em memória (adequado para instância única).
// Em cluster, substituir pelo store Redis: npm install rate-limit-redis

import rateLimit from "express-rate-limit";

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 10);

/**
 * Limiter geral: todas as rotas /api/*
 * Padrão: 100 req/min por IP
 */
export const apiLimiter = rateLimit({
  windowMs,
  max: parseInt(process.env.RATE_LIMIT_MAX ?? "100", 10),
  standardHeaders: true,    // Retorna headers RateLimit-*
  legacyHeaders: false,
  message: {
    success: false,
    message: "Muitas requisições. Tente novamente em alguns segundos.",
  },
  skip: (req) => req.ip === "127.0.0.1" || req.ip === "::1", // localhost sem limite
});

/**
 * Limiter para submissão de plugins: mais restritivo.
 * Padrão: 5 submissões/min por IP
 */
export const submitLimiter = rateLimit({
  windowMs,
  max: parseInt(process.env.SUBMIT_RATE_LIMIT_MAX ?? "5", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Limite de submissões atingido. Aguarde antes de submeter outro plugin.",
  },
});
