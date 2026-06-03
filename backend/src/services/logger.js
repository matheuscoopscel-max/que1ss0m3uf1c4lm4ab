// FILE: backend/src/services/logger.js
// Logger estruturado com Winston.
// Saída: JSON em produção, colorido em dev.
// Rotação diária de arquivos de log, separados por nível.

import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import { fileURLToPath } from "url";

const __dir  = path.dirname(fileURLToPath(import.meta.url));
const IS_DEV = process.env.NODE_ENV !== "production";
const LOG_DIR = process.env.LOG_DIR ?? path.join(__dir, "../../logs");

// ── Formato base ──────────────────────────────────────────────────────────────
const baseFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }),
  winston.format.errors({ stack: true }),
  winston.format.splat()
);

const jsonFormat = winston.format.combine(
  baseFormat,
  winston.format.json()
);

const devFormat = winston.format.combine(
  baseFormat,
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, requestId, userId, ...rest }) => {
    const extra = Object.keys(rest).length
      ? " " + JSON.stringify(rest, null, 0).slice(0, 200)
      : "";
    const rid = requestId ? ` [${requestId.slice(0, 8)}]` : "";
    const uid = userId    ? ` user:${userId.slice(0, 8)}` : "";
    return `${timestamp} ${level}${rid}${uid}: ${message}${extra}`;
  })
);

// ── Transports ────────────────────────────────────────────────────────────────
const transports = [
  new winston.transports.Console({
    format: IS_DEV ? devFormat : jsonFormat,
    silent: process.env.NODE_ENV === "test",
  }),
];

if (!IS_DEV) {
  // Todos os logs (info+)
  transports.push(new DailyRotateFile({
    dirname:       LOG_DIR,
    filename:      "app-%DATE%.log",
    datePattern:   "YYYY-MM-DD",
    zippedArchive: true,
    maxSize:       "20m",
    maxFiles:      "30d",
    format:        jsonFormat,
  }));

  // Apenas erros
  transports.push(new DailyRotateFile({
    dirname:       LOG_DIR,
    filename:      "error-%DATE%.log",
    datePattern:   "YYYY-MM-DD",
    level:         "error",
    zippedArchive: true,
    maxSize:       "10m",
    maxFiles:      "90d",
    format:        jsonFormat,
  }));

  // Eventos de segurança (warn+)
  transports.push(new DailyRotateFile({
    dirname:       LOG_DIR,
    filename:      "security-%DATE%.log",
    datePattern:   "YYYY-MM-DD",
    level:         "warn",
    zippedArchive: true,
    maxSize:       "10m",
    maxFiles:      "90d",
    format:        jsonFormat,
  }));
}

export const logger = winston.createLogger({
  level:       process.env.LOG_LEVEL ?? (IS_DEV ? "debug" : "info"),
  transports,
  exitOnError: false,
});

// ── Helpers semânticos ────────────────────────────────────────────────────────

/**
 * Loga um evento de segurança com contexto de request.
 * @param {'info'|'warn'|'error'} level
 * @param {string} event
 * @param {object} meta
 */
export function logSecurity(level, event, meta = {}) {
  logger.log(level, `[SECURITY] ${event}`, { ...meta, category: "security" });
}

/**
 * Loga uma ação de admin.
 * @param {string} adminId
 * @param {string} action
 * @param {object} details
 */
export function logAdminAction(adminId, action, details = {}) {
  logger.warn(`[ADMIN] ${action}`, { adminId, ...details, category: "admin" });
}
