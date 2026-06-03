// FILE: backend/src/services/twoFactorService.js
// Autenticação de dois fatores (2FA) via TOTP (RFC 6238).
// Compatível com Google Authenticator, Authy, 1Password, etc.

import speakeasy from "speakeasy";
import QRCode    from "qrcode";
import crypto    from "crypto";
import { hashPassword, verifyPassword } from "./authService.js";

const APP_NAME = process.env.SITE_NAME ?? "OmniMedia";
const BACKUP_CODE_COUNT  = 8;
const BACKUP_CODE_LENGTH = 10; // chars

/**
 * Gera um novo segredo TOTP para o usuário.
 * @param {string} username
 * @returns {{ secret: string, otpauthUrl: string, qrCodeDataUrl: string }}
 */
export async function generateTotpSetup(username) {
  const secret = speakeasy.generateSecret({
    name:   `${APP_NAME} (${username})`,
    issuer: APP_NAME,
    length: 32,
  });

  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

  return {
    secret:       secret.base32,       // armazena no banco apenas após confirmação
    otpauthUrl:   secret.otpauth_url,
    qrCodeDataUrl,                     // exibe ao usuário para escanear
  };
}

/**
 * Verifica um token TOTP contra o segredo armazenado.
 * Aceita janela de ±1 período (30s) para tolerância de clock drift.
 *
 * @param {string} token   — código de 6 dígitos do app
 * @param {string} secret  — segredo base32 armazenado no banco
 * @returns {boolean}
 */
export function verifyTotpToken(token, secret) {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token:    token.replace(/\s/g, ""),
    window:   1,  // aceita token do período anterior e próximo
  });
}

/**
 * Gera N códigos de backup para recuperação de conta.
 * Retorna os códigos em plaintext (mostrar UMA vez ao usuário)
 * e os hashes para armazenar no banco.
 *
 * @returns {{ codes: string[], hashes: string[] }}
 */
export async function generateBackupCodes() {
  const codes = Array.from({ length: BACKUP_CODE_COUNT }, () =>
    crypto.randomBytes(BACKUP_CODE_LENGTH / 2).toString("hex").toUpperCase()
  );

  // Formata como XXXXX-XXXXX para legibilidade
  const formatted = codes.map((c) => `${c.slice(0, 5)}-${c.slice(5)}`);
  const hashes    = await Promise.all(formatted.map((c) => hashPassword(c)));

  return { codes: formatted, hashes };
}

/**
 * Tenta usar um código de backup para login.
 * Remove o código do array após uso (one-time use).
 *
 * @param {string} inputCode        — código inserido pelo usuário
 * @param {string[]} storedHashes   — hashes dos códigos armazenados
 * @returns {{ valid: boolean, remainingHashes: string[] }}
 */
export async function useBackupCode(inputCode, storedHashes) {
  const normalized = inputCode.replace(/\s/g, "").toUpperCase();

  for (let i = 0; i < storedHashes.length; i++) {
    const match = await verifyPassword(normalized, storedHashes[i]);
    if (match) {
      const remainingHashes = storedHashes.filter((_, idx) => idx !== i);
      return { valid: true, remainingHashes };
    }
  }

  return { valid: false, remainingHashes: storedHashes };
}
