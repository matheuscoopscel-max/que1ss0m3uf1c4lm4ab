// FILE: backend/src/models/Settings.js
// DAL para app_settings (configurações gerais) e api_keys (criptografadas).

import { query, queryOne } from "../db/pool.js";
import { encrypt, decrypt, maskSecret } from "../services/cryptoService.js";

// ── App Settings ──────────────────────────────────────────────────────────────

/**
 * Lista todas as configurações.
 * @param {{ publicOnly?: boolean }} opts
 */
export async function listSettings({ publicOnly = false } = {}) {
  const rows = await query(
    publicOnly
      ? "SELECT key, value, description FROM app_settings WHERE is_public = true ORDER BY key"
      : "SELECT key, value, description, is_public, updated_at FROM app_settings ORDER BY key"
  );
  return rows;
}

/**
 * Busca uma configuração pelo key.
 * @param {string} key
 * @returns {Promise<string|null>}
 */
export async function getSetting(key) {
  const row = await queryOne("SELECT value FROM app_settings WHERE key = $1", [key]);
  return row?.value ?? null;
}

/**
 * Atualiza uma configuração.
 * @param {string} key
 * @param {string} value
 * @param {string} updatedBy — userId do admin
 */
export async function setSetting(key, value, updatedBy) {
  await query(
    `INSERT INTO app_settings (key, value, updated_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()`,
    [key, String(value), updatedBy]
  );
}

/**
 * Atualiza múltiplas configurações de uma vez.
 * @param {Record<string, string>} settings
 * @param {string} updatedBy
 */
export async function bulkSetSettings(settings, updatedBy) {
  for (const [key, value] of Object.entries(settings)) {
    await setSetting(key, value, updatedBy);
  }
}

// ── API Keys ──────────────────────────────────────────────────────────────────

/**
 * Lista todas as API keys — valores sensíveis são mascarados.
 * Nunca retorna o valor plaintext pela API.
 */
export async function listApiKeys() {
  const rows = await query(
    "SELECT key, description, is_sensitive, updated_at FROM api_keys ORDER BY key"
  );

  // Para saber se a key já foi configurada, verifica se value_enc não é null
  const withStatus = await query(
    "SELECT key, (value_enc IS NOT NULL) as is_configured FROM api_keys"
  );
  const statusMap = Object.fromEntries(withStatus.map((r) => [r.key, r.is_configured]));

  return rows.map((r) => ({
    key:          r.key,
    description:  r.description,
    isSensitive:  r.is_sensitive,
    isConfigured: statusMap[r.key] ?? false,
    updatedAt:    r.updated_at,
  }));
}

/**
 * Salva (criptografa) o valor de uma API key.
 * @param {string} key
 * @param {string} plaintext
 * @param {string} updatedBy — userId do admin
 */
export async function setApiKey(key, plaintext, updatedBy) {
  const { enc, iv, authTag } = encrypt(plaintext);
  await query(
    `INSERT INTO api_keys (key, value_enc, iv, auth_tag, updated_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (key) DO UPDATE SET
       value_enc  = $2,
       iv         = $3,
       auth_tag   = $4,
       updated_by = $5,
       updated_at = NOW()`,
    [key, enc, iv, authTag, updatedBy]
  );
}

/**
 * Recupera o valor descriptografado de uma API key.
 * Uso INTERNO apenas — nunca exponha pela API REST.
 * @param {string} key
 * @returns {Promise<string>}
 */
export async function getApiKeyValue(key) {
  const row = await queryOne(
    "SELECT value_enc, iv, auth_tag FROM api_keys WHERE key = $1",
    [key]
  );
  if (!row || !row.value_enc) return "";
  return decrypt({ enc: row.value_enc, iv: row.iv, authTag: row.auth_tag });
}

/**
 * Helper para ler várias API keys de uma vez.
 * @param {string[]} keys
 * @returns {Promise<Record<string, string>>}
 */
export async function getApiKeyValues(keys) {
  const result = {};
  await Promise.all(keys.map(async (k) => {
    result[k] = await getApiKeyValue(k);
  }));
  return result;
}
