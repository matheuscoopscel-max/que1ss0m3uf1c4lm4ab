// FILE: frontend/src/lib/pluginLoader.js — Patch #9
// Atualizado: usa sandbox via iframe (pluginSandbox.js) como camada primária.
// Fallback para Blob URL (Patch #2) em ambientes que bloqueiam iframes (Tauri CSP estrita).
//
// Hierarquia de isolamento:
//   1. Iframe sandbox (mais seguro)  — padrão em browser e Capacitor
//   2. Blob URL / import() dinâmico  — fallback para Tauri
//
// O objeto PluginInstance que o registry recebe é um proxy que
// roteia search/getDetails/getPagesOrStream para callSandboxMethod().

import {
  validatePluginContract,
  registerPlugin,
  unregisterPlugin,
  isPluginLoaded,
} from "./pluginRegistry.js";
import {
  mountSandbox,
  callSandboxMethod,
  unmountSandbox,
  isSandboxMounted,
} from "./pluginSandbox.js";
import { isTauri } from "./platform.js";

/** @typedef {'idle'|'loading'|'loaded'|'error'} PluginLoadStatus */

/**
 * @typedef {Object} LoadResult
 * @property {boolean} success
 * @property {string} slug
 * @property {string} [error]
 * @property {'sandbox'|'blob'} [method]
 */

// ── Estratégia 1: Sandbox via iframe ─────────────────────────────────────────

/**
 * Cria um proxy PluginInstance que delega todas as chamadas ao sandbox iframe.
 * @param {{ slug: string, name: string, version: string, mediaType: string }} meta
 * @returns {import('../types/plugin').PluginInstance}
 */
function createSandboxProxy(meta) {
  return {
    slug:       meta.slug,
    name:       meta.name,
    version:    meta.version ?? "0.0.0",
    mediaType:  meta.mediaType ?? "image-series",
    pluginSlug: meta.slug,

    search: (query) =>
      callSandboxMethod(meta.slug, "search", [query]),

    getDetails: (id) =>
      callSandboxMethod(meta.slug, "getDetails", [id]),

    getPagesOrStream: (id, chapterId) =>
      callSandboxMethod(meta.slug, "getPagesOrStream", [id, chapterId]),
  };
}

// ── Estratégia 2: Blob URL (fallback) ─────────────────────────────────────────

async function loadViaBlobUrl({ slug, scriptUrl, name }) {
  const response = await fetch(scriptUrl);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ao buscar script de "${name}".`);
  }
  const scriptText = await response.text();
  const blob = new Blob([scriptText], { type: "application/javascript" });
  const blobUrl = URL.createObjectURL(blob);

  let pluginModule;
  try {
    pluginModule = await import(/* @vite-ignore */ blobUrl);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }

  const instance = pluginModule.default ?? pluginModule;
  if (instance && typeof instance === "object") {
    instance.pluginSlug = slug;
  }
  return instance;
}

// ── Carregador principal ──────────────────────────────────────────────────────

/**
 * Carrega um plugin a partir da sua URL de script.
 * Tenta sandbox iframe primeiro; cai para Blob URL em Tauri.
 *
 * @param {{ slug: string, scriptUrl: string, name: string, version?: string, mediaType?: string }} pluginMeta
 * @returns {Promise<LoadResult>}
 */
export async function loadPlugin({ slug, scriptUrl, name, version, mediaType }) {
  if (isPluginLoaded(slug)) {
    return { success: true, slug, method: "cached" };
  }

  // ── Rota sandbox (browser / Capacitor) ────────────────────────────────────
  if (!isTauri) {
    try {
      if (!isSandboxMounted(slug)) {
        await mountSandbox({ slug, scriptUrl });
      }

      const proxy = createSandboxProxy({ slug, name, version, mediaType });
      const { valid, errors } = validatePluginContract(proxy, slug);
      if (!valid) throw new Error(errors.join(" | "));

      registerPlugin(slug, proxy);
      console.info(`[PluginLoader] ✓ "${name}" carregado via sandbox iframe.`);
      return { success: true, slug, method: "sandbox" };
    } catch (sandboxErr) {
      console.warn(
        `[PluginLoader] Sandbox falhou para "${name}", tentando Blob URL:`,
        sandboxErr.message
      );
      unmountSandbox(slug);
      // cai para Blob URL abaixo
    }
  }

  // ── Rota Blob URL (Tauri ou fallback) ─────────────────────────────────────
  try {
    const instance = await loadViaBlobUrl({ slug, scriptUrl, name });
    const { valid, errors } = validatePluginContract(instance, slug);
    if (!valid) throw new Error(errors.join(" | "));

    registerPlugin(slug, instance);
    console.info(`[PluginLoader] ✓ "${name}" carregado via Blob URL.`);
    return { success: true, slug, method: "blob" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[PluginLoader] ✗ Falha ao carregar "${name}" (${slug}): ${message}`);
    return { success: false, slug, error: message };
  }
}

/**
 * Carrega múltiplos plugins em paralelo.
 * @param {Array<{ slug: string, scriptUrl: string, name: string }>} plugins
 * @returns {Promise<LoadResult[]>}
 */
export async function loadPlugins(plugins) {
  const results = await Promise.allSettled(plugins.map((p) => loadPlugin(p)));
  return results.map((result, i) => {
    if (result.status === "fulfilled") return result.value;
    return {
      success: false,
      slug: plugins[i].slug,
      error: result.reason?.message ?? "Erro desconhecido",
    };
  });
}

/**
 * Remove um plugin do registry e destrói o sandbox associado.
 * @param {string} slug
 */
export function unloadPlugin(slug) {
  unregisterPlugin(slug);
  unmountSandbox(slug);
  console.info(`[PluginLoader] Plugin "${slug}" descarregado.`);
}
