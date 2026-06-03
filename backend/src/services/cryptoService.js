// FILE: backend/src/services/cryptoService.js
// Criptografia AES-256-GCM para API keys sensíveis armazenadas no banco.
// A chave mestra (MASTER_KEY) deve estar no .env — é a única chave que precisa
// ficar fora do banco.

import crypto from "crypto";

const ALGORITHM  = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH  = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits GCM auth tag

/**
 * Deriva a chave mestra a partir da variável de ambiente MASTER_KEY.
 * Se MASTER_KEY não estiver definida, usa uma chave de desenvolvimento
 * e emite um aviso — nunca use isso em produção.
 */
function getMasterKey() {
  const envKey = process.env.MASTER_KEY;

  if (!envKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[CryptoService] MASTER_KEY não definida em produção. Configure no .env.");
    }
    console.warn("[CryptoService] ⚠ MASTER_KEY não definida — usando chave de desenvolvimento. NÃO use em produção.");
    // Chave determinística de dev (32 bytes)
    return Buffer.from("omnimedia_dev_key_change_in_prod!", "utf8");
  }

  // Suporta tanto hex (64 chars) quanto string (derivada via SHA-256)
  if (/^[0-9a-fA-F]{64}$/.test(envKey)) {
    return Buffer.from(envKey, "hex");
  }
  return crypto.createHash("sha256").update(envKey).digest();
}

/**
 * Criptografa um valor sensível com AES-256-GCM.
 * @param {string} plaintext
 * @returns {{ enc: string, iv: string, authTag: string }}
 */
export function encrypt(plaintext) {
  const key    = getMasterKey();
  const iv     = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return {
    enc:     encrypted.toString("base64"),
    iv:      iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
  };
}

/**
 * Descriptografa um valor criptografado.
 * @param {{ enc: string, iv: string, authTag: string }} data
 * @returns {string} plaintext
 */
export function decrypt({ enc, iv, authTag }) {
  if (!enc || !iv || !authTag) return "";

  try {
    const key      = getMasterKey();
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(iv, "hex"),
      { authTagLength: TAG_LENGTH }
    );

    decipher.setAuthTag(Buffer.from(authTag, "hex"));

    return decipher.update(enc, "base64", "utf8") + decipher.final("utf8");
  } catch (err) {
    console.error("[CryptoService] Falha ao descriptografar:", err.message);
    return "";
  }
}

/**
 * Mascara um valor sensível para exibição no painel admin.
 * Ex: "sk_live_abc123def456" → "sk_live_abc•••••••••456"
 * @param {string} value
 * @returns {string}
 */
export function maskSecret(value) {
  if (!value || value.length < 8) return "•".repeat(Math.max(value?.length ?? 4, 4));
  const prefix = value.slice(0, 6);
  const suffix = value.slice(-4);
  return `${prefix}${"•".repeat(Math.max(value.length - 10, 6))}${suffix}`;
}
