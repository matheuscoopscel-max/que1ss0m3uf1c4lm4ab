// FILE: backend/src/models/User.js
// DAL para users, sessions e user_installations.

import { query, queryOne } from "../db/pool.js";

// ── Users ─────────────────────────────────────────────────────────────────────

/**
 * Cria um novo usuário.
 * @param {{ email: string, username: string, passwordHash: string }} data
 */
export async function createUser({ email, username, passwordHash }) {
  return queryOne(
    `INSERT INTO users (email, username, password_hash)
     VALUES ($1, $2, $3) RETURNING id, email, username, is_verified, created_at`,
    [email.toLowerCase(), username.toLowerCase(), passwordHash]
  );
}

/**
 * Busca usuário pelo email (inclui password_hash para autenticação).
 * @param {string} email
 */
export async function findUserByEmail(email) {
  return queryOne(
    "SELECT * FROM users WHERE email = $1 AND is_active = true",
    [email.toLowerCase()]
  );
}

/**
 * Busca usuário pelo ID (sem password_hash).
 * @param {string} id
 */
export async function findUserById(id) {
  return queryOne(
    "SELECT id, email, username, is_verified, is_active, created_at, updated_at FROM users WHERE id = $1",
    [id]
  );
}

/**
 * Verifica se email ou username já existem.
 * @param {string} email
 * @param {string} username
 * @returns {Promise<{ emailTaken: boolean, usernameTaken: boolean }>}
 */
export async function checkUniqueness(email, username) {
  const rows = await query(
    "SELECT email, username FROM users WHERE email = $1 OR username = $2",
    [email.toLowerCase(), username.toLowerCase()]
  );
  return {
    emailTaken:    rows.some((r) => r.email    === email.toLowerCase()),
    usernameTaken: rows.some((r) => r.username === username.toLowerCase()),
  };
}

// ── Sessions ──────────────────────────────────────────────────────────────────

/**
 * Cria uma nova sessão (refresh token).
 * @param {{ userId: string, refreshToken: string, expiresAt: Date, userAgent?: string, ip?: string }} data
 */
export async function createSession({ userId, refreshToken, expiresAt, userAgent, ip, tokenFamily }) {
  return queryOne(
    `INSERT INTO sessions (user_id, refresh_token, expires_at, user_agent, ip_address, token_family)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [userId, refreshToken, expiresAt, userAgent ?? null, ip ?? null, tokenFamily ?? null]
  );
}

/**
 * Busca sessão pelo refresh token (só sessões não expiradas).
 * @param {string} refreshToken
 */
export async function findSession(refreshToken) {
  return queryOne(
    `SELECT s.*, u.id as user_id, u.email, u.username, u.is_active
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.refresh_token = $1 AND s.expires_at > NOW() AND s.is_revoked = false`,
    [refreshToken]
  );
}

/**
 * Atualiza o last_used_at da sessão.
 * @param {string} refreshToken
 */
export async function touchSession(refreshToken) {
  await query(
    "UPDATE sessions SET last_used_at = NOW() WHERE refresh_token = $1",
    [refreshToken]
  );
}

/**
 * Remove uma sessão (logout).
 * @param {string} refreshToken
 */
export async function deleteSession(refreshToken) {
  await query("DELETE FROM sessions WHERE refresh_token = $1", [refreshToken]);
}

/**
 * Remove todas as sessões de um usuário (logout global).
 * @param {string} userId
 */
export async function deleteAllSessions(userId) {
  await query("DELETE FROM sessions WHERE user_id = $1", [userId]);
}

// ── User Installations ────────────────────────────────────────────────────────

/**
 * Retorna os plugins instalados de um usuário.
 * @param {string} userId
 */
export async function getUserInstallations(userId) {
  return query(
    "SELECT * FROM user_installations WHERE user_id = $1 ORDER BY installed_at DESC",
    [userId]
  );
}

/**
 * Adiciona ou atualiza uma instalação.
 * @param {{ userId: string, pluginSlug: string, repositoryUrl: string, pluginName?: string, pluginVersion?: string }} data
 */
export async function upsertInstallation({ userId, pluginSlug, repositoryUrl, pluginName, pluginVersion }) {
  return queryOne(
    `INSERT INTO user_installations (user_id, plugin_slug, repository_url, plugin_name, plugin_version)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, plugin_slug) DO UPDATE SET
       repository_url = EXCLUDED.repository_url,
       plugin_name    = EXCLUDED.plugin_name,
       plugin_version = EXCLUDED.plugin_version,
       installed_at   = NOW()
     RETURNING *`,
    [userId, pluginSlug, repositoryUrl, pluginName ?? null, pluginVersion ?? null]
  );
}

/**
 * Remove uma instalação.
 * @param {string} userId
 * @param {string} pluginSlug
 */
export async function removeInstallation(userId, pluginSlug) {
  await query(
    "DELETE FROM user_installations WHERE user_id = $1 AND plugin_slug = $2",
    [userId, pluginSlug]
  );
}
