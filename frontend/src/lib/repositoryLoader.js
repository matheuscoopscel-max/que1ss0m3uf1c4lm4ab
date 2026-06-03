// FILE: frontend/src/lib/repositoryLoader.js
// OmniMedia — Carregador de repositórios externos.
// Faz fetch do index.json de uma URL fornecida pelo usuário,
// valida o schema e retorna a lista de plugins disponíveis.
// O servidor OmniMedia nunca é envolvido — tudo é peer-to-peer.

const REQUIRED_PLUGIN_FIELDS = ["slug", "name", "version", "scriptUrl", "mediaTypes"];
const ALLOWED_MEDIA_TYPES     = ["image-series", "ebook", "video-stream"];
const ALLOWED_CONTENT_RATINGS = ["general", "restricted"];
const FETCH_TIMEOUT_MS        = 10_000;

/**
 * @typedef {Object} RepositoryPlugin
 * @property {string}   slug
 * @property {string}   name
 * @property {string}   version
 * @property {string}   [description]
 * @property {string}   [author]
 * @property {string}   [category]
 * @property {'general'|'restricted'} [contentRating]
 * @property {string[]} mediaTypes
 * @property {string}   scriptUrl
 * @property {string}   [iconUrl]
 * @property {string[]} [tags]
 * @property {string}   [language]
 * @property {string}   repositoryUrl   — injetado pelo loader
 * @property {string}   repositoryName  — injetado pelo loader
 */

/**
 * @typedef {Object} Repository
 * @property {string}             url
 * @property {string}             name
 * @property {string}             [description]
 * @property {string}             [author]
 * @property {string}             [version]
 * @property {string}             [website]
 * @property {RepositoryPlugin[]} plugins
 * @property {'idle'|'loading'|'success'|'error'} status
 * @property {string}             [error]
 * @property {number}             lastFetched   — timestamp
 */

/**
 * Valida um objeto de plugin do repositório.
 * @param {unknown} p
 * @param {string} repoUrl
 * @returns {{ valid: boolean, plugin: RepositoryPlugin|null, errors: string[] }}
 */
function validatePlugin(p, repoUrl) {
  if (!p || typeof p !== "object") {
    return { valid: false, plugin: null, errors: ["Item não é um objeto."] };
  }

  const errors = [];

  for (const field of REQUIRED_PLUGIN_FIELDS) {
    if (!p[field]) errors.push(`Campo obrigatório ausente: "${field}".`);
  }

  if (p.scriptUrl) {
    try {
      const u = new URL(p.scriptUrl);
      if (!["http:", "https:"].includes(u.protocol)) {
        errors.push("scriptUrl deve usar HTTP ou HTTPS.");
      }
    } catch {
      errors.push("scriptUrl inválida.");
    }
  }

  if (p.mediaTypes && Array.isArray(p.mediaTypes)) {
    const invalid = p.mediaTypes.filter((t) => !ALLOWED_MEDIA_TYPES.includes(t));
    if (invalid.length > 0) {
      errors.push(`mediaTypes inválidos: ${invalid.join(", ")}.`);
    }
  }

  if (p.contentRating && !ALLOWED_CONTENT_RATINGS.includes(p.contentRating)) {
    errors.push("contentRating deve ser 'general' ou 'restricted'.");
  }

  if (errors.length > 0) return { valid: false, plugin: null, errors };

  return {
    valid: true,
    errors: [],
    plugin: {
      slug:           String(p.slug).trim(),
      name:           String(p.name).trim(),
      version:        String(p.version ?? "0.0.1"),
      description:    p.description ?? "",
      author:         p.author ?? "community",
      category:       p.category ?? "other",
      contentRating:  p.contentRating ?? "general",
      mediaTypes:     p.mediaTypes,
      scriptUrl:      p.scriptUrl,
      iconUrl:        p.iconUrl ?? null,
      tags:           Array.isArray(p.tags) ? p.tags : [],
      language:       p.language ?? "pt-BR",
      repositoryUrl:  repoUrl,
      repositoryName: "", // preenchido pelo caller
      installCount:   0,
    },
  };
}

/**
 * Faz fetch do index.json de um repositório e retorna os dados validados.
 *
 * @param {string} url — URL do index.json
 * @returns {Promise<Repository>}
 */
export async function fetchRepository(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let raw;
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ao buscar o repositório.`);
    }

    raw = await res.json();
  } catch (err) {
    const message = err.name === "AbortError"
      ? "Timeout: o repositório demorou mais de 10s para responder."
      : err.message ?? "Erro desconhecido.";

    return {
      url,
      name: url,
      plugins: [],
      status: "error",
      error: message,
      lastFetched: Date.now(),
    };
  } finally {
    clearTimeout(timeout);
  }

  // Valida estrutura básica
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.plugins)) {
    return {
      url,
      name: url,
      plugins: [],
      status: "error",
      error: "Formato inválido: o index.json não contém um array 'plugins'.",
      lastFetched: Date.now(),
    };
  }

  // Valida cada plugin individualmente — descarta os inválidos com log
  const validPlugins = [];
  for (const p of raw.plugins) {
    const { valid, plugin, errors } = validatePlugin(p, url);
    if (valid && plugin) {
      plugin.repositoryName = raw.name ?? url;
      validPlugins.push(plugin);
    } else {
      console.warn(`[RepositoryLoader] Plugin ignorado (${p?.slug ?? "?"}):`, errors);
    }
  }

  return {
    url,
    name:        raw.name        ?? url,
    description: raw.description ?? "",
    author:      raw.author      ?? "",
    version:     raw.version     ?? "1.0.0",
    website:     raw.website     ?? null,
    plugins:     validPlugins,
    status:      "success",
    error:       null,
    lastFetched: Date.now(),
  };
}

/**
 * Re-faz fetch de um repositório já salvo (atualiza plugins).
 * @param {Repository} existing
 * @returns {Promise<Repository>}
 */
export async function refreshRepository(existing) {
  return fetchRepository(existing.url);
}
