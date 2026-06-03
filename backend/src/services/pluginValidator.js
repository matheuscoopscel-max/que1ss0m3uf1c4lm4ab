// FILE: backend/src/services/pluginValidator.js
// Valida submissões comunitárias de plugins:
// - Campos obrigatórios e formatos
// - Acessibilidade e content-type da scriptUrl
// - Slug único (verificado no banco antes de inserir)

import { query } from "../db/pool.js";

const ALLOWED_CATEGORIES = ["comics", "ebooks", "video", "audio", "books", "other"];
const ALLOWED_MEDIA_TYPES = ["image-series", "ebook", "video-stream"];
const ALLOWED_CONTENT_RATINGS = ["general", "restricted"];

/**
 * Verifica se um slug já existe no banco.
 * @param {string} slug
 * @returns {Promise<boolean>}
 */
export async function isSlugTaken(slug) {
  const rows = await query(
    "SELECT 1 FROM extensions WHERE slug = $1",
    [slug]
  );
  return rows.length > 0;
}

/**
 * Valida o conteúdo de uma submissão de plugin.
 * Retorna { valid: true } ou { valid: false, errors: string[] }.
 *
 * @param {object} body
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSubmissionBody(body) {
  const errors = [];

  // slug
  if (!body.slug || !/^[a-z0-9-]{3,100}$/.test(body.slug)) {
    errors.push("slug: obrigatório, apenas letras minúsculas, números e hífens (3–100 chars).");
  }

  // name
  if (!body.name || typeof body.name !== "string" || body.name.trim().length < 3) {
    errors.push("name: obrigatório, mínimo 3 caracteres.");
  }

  // scriptUrl
  if (!body.scriptUrl) {
    errors.push("scriptUrl: obrigatório.");
  } else {
    try {
      const u = new URL(body.scriptUrl);
      if (!["http:", "https:"].includes(u.protocol)) {
        errors.push("scriptUrl: deve usar protocolo HTTP ou HTTPS.");
      }
      if (!body.scriptUrl.endsWith(".js")) {
        errors.push("scriptUrl: deve apontar para um arquivo .js.");
      }
    } catch {
      errors.push("scriptUrl: URL inválida.");
    }
  }

  // category
  if (!ALLOWED_CATEGORIES.includes(body.category)) {
    errors.push(`category: deve ser um de [${ALLOWED_CATEGORIES.join(", ")}].`);
  }

  // mediaTypes
  if (!Array.isArray(body.mediaTypes) || body.mediaTypes.length === 0) {
    errors.push("mediaTypes: array não vazio obrigatório.");
  } else {
    const invalid = body.mediaTypes.filter((t) => !ALLOWED_MEDIA_TYPES.includes(t));
    if (invalid.length > 0) {
      errors.push(`mediaTypes: valores inválidos [${invalid.join(", ")}].`);
    }
  }

  // contentRating
  if (body.contentRating && !ALLOWED_CONTENT_RATINGS.includes(body.contentRating)) {
    errors.push(`contentRating: deve ser 'general' ou 'restricted'.`);
  }

  // repositoryUrl (opcional, mas se presente deve ser URL válida)
  if (body.repositoryUrl) {
    try {
      new URL(body.repositoryUrl);
    } catch {
      errors.push("repositoryUrl: URL inválida.");
    }
  }

  // tags (opcional, max 10)
  if (body.tags && (!Array.isArray(body.tags) || body.tags.length > 10)) {
    errors.push("tags: deve ser um array com no máximo 10 itens.");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Verifica se a scriptUrl está acessível e serve JavaScript.
 * Timeout de 5s para não bloquear a resposta.
 *
 * @param {string} url
 * @returns {Promise<{ accessible: boolean, reason?: string }>}
 */
export async function checkScriptAccessibility(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    });

    if (!res.ok) {
      return { accessible: false, reason: `HTTP ${res.status} ao acessar scriptUrl.` };
    }

    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("javascript") && !ct.includes("text/plain") && !ct.includes("application/octet-stream")) {
      // Aviso, mas não bloqueia — alguns CDNs retornam content-types inesperados
      console.warn(`[pluginValidator] scriptUrl retornou content-type inesperado: ${ct}`);
    }

    return { accessible: true };
  } catch (err) {
    const reason = err.name === "AbortError"
      ? "Timeout ao verificar scriptUrl (>5s)."
      : `Erro ao acessar scriptUrl: ${err.message}`;
    return { accessible: false, reason };
  } finally {
    clearTimeout(timeout);
  }
}
