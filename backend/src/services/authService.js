// FILE: backend/src/services/authService.js
// Geração e verificação de tokens JWT + hashing de senhas com bcrypt.

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  ?? "dev_access_secret_change_in_production";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "dev_refresh_secret_change_in_production";
const ACCESS_EXP     = process.env.JWT_ACCESS_EXPIRES  ?? "15m";
const REFRESH_EXP    = process.env.JWT_REFRESH_EXPIRES ?? "7d";
const BCRYPT_ROUNDS  = parseInt(process.env.BCRYPT_ROUNDS ?? "12", 10);

// ── Senhas ────────────────────────────────────────────────────────────────────

/**
 * Gera o hash bcrypt de uma senha.
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compara senha com hash armazenado.
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ── Access Token (JWT de curta duração) ────────────────────────────────────────

/**
 * Gera um access token JWT para o usuário.
 * @param {{ id: string, email: string, username: string }} user
 * @returns {string}
 */
export function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, username: user.username },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXP }
  );
}

/**
 * Verifica e decodifica um access token.
 * @param {string} token
 * @returns {{ sub: string, email: string, username: string } | null}
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch {
    return null;
  }
}

// ── Refresh Token (string aleatória armazenada no banco) ──────────────────────

/**
 * Gera um refresh token opaco (não é JWT — apenas bytes aleatórios).
 * É armazenado no banco e enviado como httpOnly cookie.
 * @returns {string}
 */
export function generateRefreshToken() {
  return crypto.randomBytes(64).toString("hex");
}

/**
 * Calcula a data de expiração do refresh token.
 * @returns {Date}
 */
export function refreshTokenExpiresAt() {
  const days = parseInt(REFRESH_EXP, 10) || 7;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}
